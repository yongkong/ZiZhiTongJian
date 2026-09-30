import type { Metadata } from 'next'
import Link from 'next/link'
import { getBooks } from '@/lib/content'

export const metadata: Metadata = { title: '柏杨白话版' }

export default function BoyangBooks() {
  const books = getBooks()

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
              <Link key={b.id} href={`/boyang/book/${b.id}`}
                className="border p-3 text-sm font-classic transition-colors hover:border-rule-strong hover:bg-accent/50">
                {b.title}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
