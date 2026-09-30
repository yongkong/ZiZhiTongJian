# 压缩柏杨版插图到 public/boyang-img/(只处理语料库实际引用的文件, Vercel 静态托管用)
# 用法: python scripts/compress-boyang-img.py [--force]
import sqlite3
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / 'data' / 'tongjian.db'
SRC_DIR = ROOT.parent / 'extract' / 'boyang' / 'images'
DST_DIR = ROOT / 'public' / 'boyang-img'
MAX_W = 1000
QUALITY = 78

force = '--force' in sys.argv

db = sqlite3.connect(f'file:{DB}?mode=ro', uri=True)
files = [
    r[0]
    for r in db.execute(
        "SELECT DISTINCT file FROM boyang_paragraphs WHERE kind='image' AND file IS NOT NULL AND file != ''"
    )
]
DST_DIR.mkdir(parents=True, exist_ok=True)

total = 0
done = 0
for name in files:
    dst = DST_DIR / name
    if dst.exists() and not force:
        total += dst.stat().st_size
        continue
    im = Image.open(SRC_DIR / name)
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    im.convert('RGB').save(dst, 'JPEG', quality=QUALITY, optimize=True)
    total += dst.stat().st_size
    done += 1

print(f'{len(files)} referenced images -> {DST_DIR} (compressed {done}, total {total / 1048576:.1f} MB)')
