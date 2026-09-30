import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BoyParagraphList } from '@/components/BoyParagraphList'
import { BoyangToc } from '@/components/ReaderNav'
import { getBook, getBooks, getSection } from '@/lib/content'

export function generateStaticParams() {
  // 全部章节: 册页展开 (与 getSection 同源)
  const out: Array<{ id: string }> = []
  for (const b of getBooks()) out.push(...getBook(b.id).sections.map((s) => ({ id: String(s.id) })))
  return out
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  try {
    const { section } = getSection(Number(id))
    return { title: `柏杨版 · ${section.title}` }
  } catch {
    return {}
  }
}

export default async function BoyangSection({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params
  const id = Number(idStr)
  let data
  try {
    data = getSection(id)
  } catch {
    notFound()
  }
  const { section, paragraphs, highlights } = data
  const { book, sections } = getBook(section.book_id)
  const books = getBooks()

  return (
    <div className="mx-auto max-w-3xl">
      <BoyangToc books={books} sections={sections} bookId={book.id} sectionId={section.id} />
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild><Link href={`/boyang/book/${section.book_id}`}>← 本册目录</Link></Button>
        </div>
        <h1 className="font-classic mt-2 text-xl font-bold">{section.title}</h1>
        {highlights.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            藤黄标记为本章重点语句，悬停可看批语（共 {highlights.length} 处）
          </p>
        )}
      </div>
      <BoyParagraphList paragraphs={paragraphs} highlights={highlights} />
    </div>
  )
}
