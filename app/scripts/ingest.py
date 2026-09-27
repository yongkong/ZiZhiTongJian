# -*- coding: utf-8 -*-
"""解析两本 EPUB 的解包内容，写入 app/data/tongjian.db。

用法: cd app && python scripts/ingest.py
数据源: ../../extract/husanxing/OEBPS/*.html (294卷原文+胡注)
        ../../extract/boyang/ (柏杨白话版 72 册, 依据 toc.ncx 划分)
"""
import html as ihtml
import json
import os
import re
import sqlite3
import xml.etree.ElementTree as ET

WS = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # D:\资治通鉴
HUS = os.path.join(WS, "extract", "husanxing", "OEBPS")
BOY = os.path.join(WS, "extract", "boyang")
DB = os.path.join(WS, "app", "data", "tongjian.db")

# 数字字符表 — 全部用 unicode 转义, 避免字面量码位歧义 (○ 有 U+25CB/U+3007/U+25EF 等多个同形码位)
Z0, Z1, Z2 = "\u3007", "\u25cb", "\u25ef"          # 〇 ○ ◯
CN_DIG = {"0": 0, "\u96f6": 0, Z0: 0, Z1: 0, Z2: 0}  # 0 零〇○◯ → 0
for _i, _c in enumerate("\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d"):  # 一二三四五六七八九
    CN_DIG[_c] = _i + 1
GAN = "\u7532\u4e59\u4e19\u4e01\u620a\u5df1\u5e9a\u8f9b\u58ec\u7678"  # 甲乙丙丁戊己庚辛壬癸
ZHI = "\u5b50\u4e11\u5bc5\u536f\u8fb0\u5df3\u5348\u672a\u7533\u9149\u620c\u4ea5"  # 子丑寅卯辰巳午未申酉戌亥
NUMCLS = "0-9" + Z0 + Z1 + Z2 + "\u96f6\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d"
CIRCLE2ZERO = str.maketrans({Z0: "0", Z1: "0", Z2: "0"})
LP, RP = "\uff08(", "\uff09)"        # 全角/半角圆括号
DUN, QIAN = "\u3001", "\u524d"       # 顿号, 前
NIAN, GY = "\u5e74", "\u516c\u5143"  # 年, 公元
DASH = "\u2014\u2013-"               # 破折号(年范围)


def cn2int(s):
    """中文数字 → 整数。支持位值式(四〇三)与累加式(二百九十四)。"""
    s = s.strip().translate(CIRCLE2ZERO)
    if not s:
        return None
    if all(c in "0123456789" for c in s):
        return int(s)
    # 位值式: 只含 〇一二三四五六七八九(零/○), 不含十百千
    if all(c in CN_DIG for c in s) and len(s) > 1:
        n = 0
        for c in s:
            n = n * 10 + CN_DIG[c]
        return n
    if s in CN_DIG:
        return CN_DIG[s]
    # 累加式: 含十百千
    UNITS = {"\u5341": 10, "\u767e": 100, "\u5343": 1000}  # 十百千
    total, num = 0, 0
    for c in s:
        if c in CN_DIG:
            num = num * 10 + CN_DIG[c]
        elif c in UNITS:
            total += (num if num else 1) * UNITS[c]
            num = 0
    return total + num


def year_from(prefix, digits):
    n = cn2int(digits)
    if n is None:
        return None
    return -n if prefix else n


YEAR_NOTE_RE = re.compile(
    "[" + LP + r"]\s*([" + GAN + r"])([" + ZHI + r"])\s*" + DUN + r"\s*(" + QIAN + r")?([" + NUMCLS + r"]{1,4})\s*[" + RP + r"]")
YEAR_H4_RE = re.compile(
    r"^(" + QIAN + "|" + GY + QIAN + "|" + GY + r")?\s*([" + NUMCLS + r"]{1,4})\s*" + NIAN +
    r"?\s*(?:[" + GAN + r"][" + ZHI + r"])?\s*$")
DECADE_RE = re.compile(
    "[" + LP + r"]\s*(" + QIAN + r")?([" + NUMCLS + r"]{1,4})\s*" + NIAN + r"?\s*[" + DASH +
    r"]\s*(" + QIAN + r")?([" + NUMCLS + r"]{1,4})\s*" + NIAN + r"?\s*[" + RP + r"]")


def note_year(note):
    m = YEAR_NOTE_RE.search(note.translate(CIRCLE2ZERO))
    if m:
        return year_from(m.group(3), m.group(4))
    return None


def h4_year(text):
    m = YEAR_H4_RE.match(text.strip().translate(CIRCLE2ZERO))
    if m and m.group(2):
        return year_from(m.group(1), m.group(2))
    return None


def decade_years(label):
    m = DECADE_RE.search(label.translate(CIRCLE2ZERO))
    if m:
        a = year_from(m.group(1), m.group(2))
        b = year_from(m.group(3), m.group(4))
        return a, b
    return None, None


# ---------------------------------------------------------------- 胡三省注版
def split_notes(text):
    """把〔…〕胡注从原文中切出。返回 segments: [{'t': str} | {'n': str}]"""
    segs, buf, note, depth = [], "", "", 0
    for ch in text:
        if ch == "〔":
            depth += 1
            if depth == 1:
                if buf:
                    segs.append({"t": buf})
                    buf = ""
                note = ""
            else:
                note += ch
        elif ch == "〕":
            if depth > 0:
                depth -= 1
                if depth == 0:
                    segs.append({"n": note})
                    note = ""
                else:
                    note += ch
            else:
                buf += ch
        else:
            if depth > 0:
                note += ch
            else:
                buf += ch
    if buf:
        segs.append({"t": buf})
    if note and depth > 0:  # 未闭合, 兜底
        segs.append({"n": note})
    return segs


def ingest_husanxing(conn):
    files = sorted(f for f in os.listdir(HUS) if re.match(r"text0\d+\.html$", f))
    vols = []
    for f in files:
        raw = open(os.path.join(HUS, f), encoding="utf-8", errors="ignore").read()
        titles = re.findall(r"<h3>(.*?)</h3>", raw, re.S)
        if not titles:
            continue
        title = re.sub(r"\s+", "", ihtml.unescape(titles[0]))
        m = re.match(r"^卷第(.+?)【(.+?)】(.*)$", title)
        if not m:
            continue
        num = cn2int(m.group(1))
        era = m.group(2).replace("\u8bb0", "\u7eaa")  # 原书卷59「汉记五十一」: 记→纪 归一化
        title = title.replace("\u8bb0", "\u7eaa")
        era_group = re.match(r"^(.*纪)", era)
        vols.append({"num": num, "title": title, "era": era,
                     "era_group": era_group.group(1) if era_group else era,
                     "range_text": m.group(3), "file": f})

    conn.executemany(
        "INSERT INTO volumes(id,num,title,era,era_group,range_text) VALUES(?,?,?,?,?,?)",
        [(v["num"], v["num"], v["title"], v["era"], v["era_group"], v["range_text"]) for v in vols])

    para_rows = []
    for v in vols:
        raw = open(os.path.join(HUS, v["file"]), encoding="utf-8", errors="ignore").read()
        body = raw.split("<body>", 1)[1]
        body = body.split("</body>", 1)[0]
        parts = re.findall(r"<(h3|p)>(.*?)</\1>", body, re.S)
        seq = 0
        for tag, inner in parts:
            text = re.sub(r"<[^>]+>", "", inner)
            text = re.sub(r"\s+", "", ihtml.unescape(text))
            if not text:
                continue
            segs = split_notes(text)
            plain = "".join(s.get("t", "") for s in segs)
            if not plain and not any("n" in s for s in segs):
                continue
            year = None
            for s in segs:
                if "n" in s:
                    year = note_year(s["n"])
                    if year:
                        break
            kind = "title" if tag == "h3" else "text"
            para_rows.append((v["num"], seq, kind, json.dumps(segs, ensure_ascii=False), plain, year))
            seq += 1
    conn.executemany(
        "INSERT INTO paragraphs(volume_id,seq,kind,segments,plain,tj_year) VALUES(?,?,?,?,?,?)",
        para_rows)
    return len(vols), len(para_rows)


# ---------------------------------------------------------------- 柏杨版
NS = {"n": "http://www.daisy.org/z3986/2005/ncx/"}


def parse_ncx():
    tree = ET.parse(os.path.join(BOY, "toc.ncx"))
    navmap = tree.getroot().find("n:navMap", NS)
    out = []

    def walk(point, depth):
        for np in point.findall("n:navPoint", NS):
            label = np.find("n:navLabel/n:text", NS)
            src = np.find("n:content", NS)
            out.append({"depth": depth,
                        "label": (label.text or "").strip() if label is not None else "",
                        "src": (src.get("src") or "").split("#")[0].replace("text/", "") if src is not None else ""})
            walk(np, depth + 1)
    walk(navmap, 0)
    return out


def boy_file_key(name):
    return name


def ingest_boyang(conn):
    outline = parse_ncx()
    all_files = sorted(
        os.path.relpath(os.path.join(dp, f), BOY).replace("\\", "/").replace("text/", "")
        for dp, _, fs in os.walk(os.path.join(BOY, "text")) for f in fs if f.endswith(".html"))

    # 册 = depth-1 节点; 盒组 = depth-0; 跳过「目录」与后记
    skip_books = {"目录", "出版人王荣文后记"}
    box, books = None, []
    for o in outline:
        if o["depth"] == 0:
            if o["label"] != "总目录":
                box = o["label"]
        elif o["depth"] == 1:
            if o["label"] not in skip_books and o["src"]:
                books.append({"title": o["label"], "box": box or "", "src": o["src"], "outline": []})
        elif o["depth"] >= 2 and books:
            books[-1]["outline"].append(o)

    # 每册的文件范围 (同一起点文件只取第一册)
    starts = {}
    for i, b in enumerate(books):
        starts.setdefault(b["src"], i)
    bounds = [(f, starts[f]) for f in all_files if f in starts]
    for bi, b in enumerate(books):
        cur = [bf for bf, si in bounds if si == bi][0]
        nxt = next((bf for bf, si in bounds if si == bi + 1), None)
        b["files"] = all_files[all_files.index(cur): all_files.index(nxt)] if nxt else \
            all_files[all_files.index(cur):]

    # 册内章节: front(序/表) + 导读 + 世纪 + 年代, 按 src 顺序切片
    sec_pat = re.compile(r"(导读|柏杨序|柏杨再序|^[^（]*表$)|世纪$|年代[（(]|年[（(]")
    conn.execute("INSERT INTO boyang_books(id,title,box) VALUES(?,?,?)", (0, "柏杨白话版·总览", ""))
    for bi, b in enumerate(books):
        book_id = bi + 1
        conn.execute("INSERT INTO boyang_books(id,title,box) VALUES(?,?,?)", (book_id, b["title"], b["box"]))

        secs = []
        for o in b["outline"]:
            lbl = o["label"]
            is_sec = ("导读" in lbl or "序" in lbl or "表" in lbl or "世纪" in lbl
                      or re.search(r"年代[（(]", lbl) or re.search(r"十年[（(]", lbl))
            if is_sec and o["src"]:
                kind = ("intro" if ("导读" in lbl or "序" in lbl or "表" in lbl)
                        else "century" if "世纪" in lbl else "decade")
                a, z = decade_years(lbl) if kind == "decade" else (None, None)
                secs.append({"title": lbl, "kind": kind, "src": o["src"], "y0": a, "y1": z})
        if not secs:
            continue
        # 文件 → 章节
        sec_of_file, cur = {}, None
        for f in b["files"]:
            hit = next((s for s in secs if s["src"] == f), None)
            if hit:
                cur = hit
            if cur:
                sec_of_file[f] = cur

        para_rows, sec_rows = [], []
        for si, s in enumerate(secs):
            sid = book_id * 1000 + si
            sec_rows.append((sid, book_id, s["kind"], s["title"], si, s["y0"], s["y1"]))
            seq = 0
            mode = None  # sima | boyang
            pending_caption = ""
            for f in b["files"]:
                if sec_of_file.get(f) is not s:
                    continue
                raw = open(os.path.join(BOY, "text", f), encoding="utf-8", errors="ignore").read()
                body = raw.split("<body", 1)[1]
                body = body.split("</body>", 1)[0]
                for m in re.finditer(
                        r"<(h4|p)[^>]*class=\"([^\"]*)\"[^>]*>(.*?)</\1>|<img[^>]*src=\"[^\"]*/([^/\"]+)\"[^>]*>",
                        body, re.S):
                    if m.group(4):  # <img> 地图/插图
                        para_rows.append((sid, seq, "image", pending_caption, None, m.group(4)))
                        pending_caption = ""
                        seq += 1
                        continue
                    tag, cls, inner = m.group(1), m.group(2), m.group(3)
                    text = re.sub(r"\s+", "", ihtml.unescape(re.sub(r"<br[^>]*/?>", "\n", re.sub(r"<[^>]+>", "", inner))))
                    if not text or text == "未知":
                        continue
                    if tag == "h4" or "fourthtitle" in cls:
                        y = h4_year(text)
                        para_rows.append((sid, seq, "year", text, y, None))
                        seq += 1
                        mode = None
                        continue
                    if "imgtitle" in cls:
                        pending_caption = text
                        continue
                    if "content3" in cls:
                        para_rows.append((sid, seq, "ruler", text, None, None))
                        seq += 1
                        continue
                    if "content_1" in cls or re.match(r"^(司马光\s*曰|柏杨曰)[:：]?$", text):
                        if text.startswith("柏杨"):
                            mode = "boyang"
                            para_rows.append((sid, seq, "boyang_mark", "柏杨曰：", None, None))
                        elif "司马" in text:
                            mode = "sima"
                            para_rows.append((sid, seq, "sima_mark", "司马光曰：", None, None))
                        else:
                            para_rows.append((sid, seq, "text", text, None, None))
                        seq += 1
                        continue
                    if "quotation" in cls:
                        para_rows.append((sid, seq, mode or "quotation", text, None, None))
                        seq += 1
                        continue
                    kind = "boyang" if mode == "boyang" else "text"
                    para_rows.append((sid, seq, kind, text, None, None))
                    seq += 1
        conn.executemany(
            "INSERT OR REPLACE INTO boyang_sections(id,book_id,kind,title,seq,y0,y1) VALUES(?,?,?,?,?,?,?)",
            sec_rows)
        conn.executemany(
            "INSERT INTO boyang_paragraphs(section_id,seq,kind,text,by_year,file) VALUES(?,?,?,?,?,?)",
            para_rows)
    return len(books)


def main():
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    conn = sqlite3.connect(DB)
    # 只重建内容表, 保留学习进度(reading_state/lessons/cards/study_log 等)
    for t in ("volumes", "paragraphs", "boyang_books", "boyang_sections", "boyang_paragraphs"):
        conn.execute(f"DROP TABLE IF EXISTS {t}")
    conn.executescript("""
    CREATE TABLE volumes(
      id INTEGER PRIMARY KEY, num INTEGER, title TEXT, era TEXT,
      era_group TEXT, range_text TEXT);
    CREATE TABLE paragraphs(
      id INTEGER PRIMARY KEY, volume_id INTEGER NOT NULL, seq INTEGER NOT NULL,
      kind TEXT NOT NULL, segments TEXT NOT NULL, plain TEXT NOT NULL, tj_year INTEGER);
    CREATE INDEX idx_para_vol ON paragraphs(volume_id, seq);
    CREATE INDEX idx_para_year ON paragraphs(tj_year);
    CREATE TABLE boyang_books(id INTEGER PRIMARY KEY, title TEXT, box TEXT);
    CREATE TABLE boyang_sections(
      id INTEGER PRIMARY KEY, book_id INTEGER, kind TEXT, title TEXT,
      seq INTEGER, y0 INTEGER, y1 INTEGER);
    CREATE TABLE boyang_paragraphs(
      id INTEGER PRIMARY KEY, section_id INTEGER NOT NULL, seq INTEGER NOT NULL,
      kind TEXT NOT NULL, text TEXT NOT NULL, by_year INTEGER, file TEXT);
    CREATE INDEX idx_bysec_book ON boyang_sections(book_id, seq);
    CREATE INDEX idx_bypara_sec ON boyang_paragraphs(section_id, seq);
    CREATE INDEX idx_bypara_year ON boyang_paragraphs(by_year);
    """)

    nv, np_ = ingest_husanxing(conn)
    print(f"胡三省注版: {nv} 卷, {np_} 段")
    nb = ingest_boyang(conn)
    ns = conn.execute("SELECT COUNT(*) FROM boyang_sections").fetchone()[0]
    nby = conn.execute("SELECT COUNT(*) FROM boyang_paragraphs").fetchone()[0]
    print(f"柏杨版: {nb} 册, {ns} 章节, {nby} 段")
    conn.commit()

    # 年份覆盖自检
    r = conn.execute("SELECT MIN(tj_year), MAX(tj_year) FROM paragraphs WHERE tj_year IS NOT NULL").fetchone()
    print(f"原文年份锚点: {r[0]} .. {r[1]}")
    r = conn.execute("SELECT COUNT(*) FROM paragraphs WHERE tj_year IS NOT NULL").fetchone()[0]
    print(f"原文年份锚点段数: {r}")
    r = conn.execute("SELECT COUNT(*) FROM boyang_paragraphs WHERE by_year IS NOT NULL").fetchone()[0]
    print(f"柏杨年份锚点段数: {r}")
    r = conn.execute("SELECT COUNT(*) FROM boyang_paragraphs WHERE kind='image'").fetchone()[0]
    print(f"柏杨图片段数: {r}")
    conn.close()
    print("DB:", DB)


if __name__ == "__main__":
    main()
