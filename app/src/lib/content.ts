// 构建期数据访问层: 只在服务端组件里用, 直接读 content/ 静态 JSON (export-content.mjs 生成)。
// 静态导出 (output: 'export') 下所有调用发生在 next build 时, 不进入浏览器包。
import fs from 'node:fs'
import path from 'node:path'
import type {
  BookMeta, BoyPara, BoySectionMeta, Card, Highlight, LessonData, LessonMeta,
  OrigPara, VolumeMeta, YearRangeEntry,
} from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content')

function read<T>(rel: string): T {
  const p = path.join(CONTENT_DIR, rel)
  if (!fs.existsSync(p))
    throw new Error(`缺少 content/${rel} — 先运行 npm run content:export 生成静态数据`)
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T
}

// ---------- 原文通鉴
export function getVolumes(): VolumeMeta[] {
  return read<VolumeMeta[]>('volumes/index.json')
}
export function getVolume(num: number): { volume: VolumeMeta; paragraphs: OrigPara[] } {
  return read(`volumes/${num}.json`)
}
export function getVolumeNav(): Array<{ num: number; g: string; title: string }> {
  // 目录抽屉只需要卷号·分组·悬停标题, 单独瘦身避免每页内联完整卷目
  return read<VolumeMeta[]>('volumes/index.json').map((v) => ({ num: v.num, g: v.era_group, title: v.title }))
}

// ---------- 柏杨白话
export function getBooks(): BookMeta[] {
  return read<BookMeta[]>('boyang/books.json')
}
export function getBook(id: number): { book: BookMeta; sections: BoySectionMeta[] } {
  return read(`boyang/books/${id}.json`)
}
export function getSection(id: number): { section: { id: number; title: string; book_id: number }; paragraphs: BoyPara[]; highlights: Highlight[] } {
  return read(`boyang/sections/${id}.json`)
}
export function getYearIndex(): YearRangeEntry[] {
  return read<YearRangeEntry[]>('boyang/year-index.json')
}
export function findSectionByYear(year: number): YearRangeEntry | null {
  return getYearIndex().find((s) => s.y0 <= year && year <= s.y1) ?? null
}

// ---------- 课程
export function getLessons(): LessonMeta[] {
  return read<LessonMeta[]>('lessons/index.json').sort((a, b) => a.seq - b.seq)
}
export function getLesson(slug: string): LessonData {
  return read<LessonData>(`lessons/${slug}.json`)
}

// ---------- 复习卡片 (纯练习)
export function getCards(): Card[] {
  return read<Card[]>('cards.json')
}
