import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BoyParagraph } from '@/components/BoyParagraph'
import { BoyangNav, ReaderFloat, initOpen } from '@/components/ReaderNav'
import { api, type BoyPara, type Highlight } from '@/lib/api'

export function BoyangBooks() {
  const [books, setBooks] = useState<Array<{ id: number; title: string; box: string }> | null>(null)
  useEffect(() => { api.boyangBooks().then(setBooks) }, [])
  if (!books) return null

  const boxes = new Map<string, typeof books>()
  for (const b of books) {
    const key = b.box || '其他'
    if (!boxes.has(key)) boxes.set(key, [])
    boxes.get(key)!.push(b)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-classic text-2xl font-bold">柏杨白话版 · 全 72 册</h1>
        <p className="text-sm text-muted-foreground">现代人视角的白话通鉴，含「司马光曰」「柏杨曰」对照评论</p>
      </div>
      {[...boxes.entries()].map(([box, bs]) => (
        <section key={box}>
          <h2 className="font-classic mb-3 text-lg font-semibold">{box}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {bs!.map((b) => (
              <Link key={b.id} to={`/boyang/book/${b.id}`}
                className="rounded-lg border p-3 text-sm font-classic hover:border-primary/40 hover:bg-accent/50 transition-colors">
                {b.title}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function BoyangBook() {
  const { id } = useParams()
  const [data, setData] = useState<{
    book: { id: number; title: string; box: string }
    sections: Array<{ id: number; kind: string; title: string; y0: number | null; y1: number | null }>
  } | null>(null)
  useEffect(() => { if (id) api.boyangBook(Number(id)).then(setData) }, [id])
  if (!data) return null

  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="mb-4"><Link to="/boyang">← 72 册总目</Link></Button>
      <h1 className="font-classic mb-2 text-2xl font-bold">{data.book.title}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{data.book.box}</p>
      <div className="space-y-2">
        {data.sections.map((s) => (
          <Link key={s.id} to={`/boyang/section/${s.id}`}
            className={`block rounded-lg border p-3 text-sm hover:border-primary/40 hover:bg-accent/50 transition-colors ${s.kind === 'decade' ? 'ml-6' : ''}`}>
            {s.title}
          </Link>
        ))}
      </div>
    </div>
  )
}

export function BoyangSection() {
  const { id } = useParams()
  const [data, setData] = useState<{
    section: { id: number; title: string; book_id: number }
    paragraphs: BoyPara[]
    highlights: Highlight[]
  } | null>(null)
  const [tocOpen, setTocOpen] = useState(initOpen)
  useEffect(() => { if (id) api.boyangSection(Number(id)).then(setData) }, [id])
  if (!data) return null
  const hl = data.highlights ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <ReaderFloat onToc={() => setTocOpen(true)} />
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild><Link to={`/boyang/book/${data.section.book_id}`}>← 本册目录</Link></Button>
          <BoyangNav open={tocOpen} onOpenChange={setTocOpen} bookId={data.section.book_id} sectionId={data.section.id} />
        </div>
        <h1 className="font-classic mt-2 text-xl font-bold">{data.section.title}</h1>
        {hl.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            🖍 黄色高亮为本章重点语句，悬停可看点评（共 {hl.length} 处）
          </p>
        )}
      </div>
      <div className="space-y-3">
        {data.paragraphs.map((p) => <BoyParagraph key={p.seq} p={p} highlights={hl} />)}
      </div>
    </div>
  )
}
