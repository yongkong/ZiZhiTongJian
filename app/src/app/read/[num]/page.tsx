import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { OrigParagraphList } from '@/components/OrigParagraphList'
import { VolumeToc } from '@/components/ReaderNav'
import { findSectionByYear, getVolume, getVolumeNav } from '@/lib/content'

export function generateStaticParams() {
  return getVolumeNav().map((v) => ({ num: String(v.num) }))
}

export async function generateMetadata({ params }: { params: Promise<{ num: string }> }): Promise<Metadata> {
  const { num } = await params
  try {
    const { volume } = getVolume(Number(num))
    return { title: volume.title, description: volume.range_text }
  } catch {
    return {}
  }
}

const CN = '〇一二三四五六七八九'
function cn(n: number): string {
  if (n <= 10) return ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][n - 1] ?? String(n)
  if (n < 20) return '十' + CN[n % 10]
  if (n < 100) return CN[Math.floor(n / 10) - 1] + '十' + (n % 10 ? CN[n % 10] : '')
  return String(n)
}

export default async function VolumeView({ params }: { params: Promise<{ num: string }> }) {
  const { num: numStr } = await params
  const n = Number(numStr)
  if (!Number.isInteger(n) || n < 1 || n > 294) notFound()

  let data
  try {
    data = getVolume(n)
  } catch {
    notFound()
  }
  const { volume, paragraphs } = data

  const y = paragraphs.find((p) => p.tj_year)?.tj_year
  const boyLink = y != null ? findSectionByYear(y) : null
  const vols = getVolumeNav()

  return (
    <div className="mx-auto max-w-3xl">
      <VolumeToc vols={vols} current={n} />
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Button variant="ghost" size="sm" asChild><Link href="/read">← 卷目</Link></Button>
          {n > 1 && (
            <Button variant="ghost" size="sm" asChild><Link href={`/read/${n - 1}`}>上一卷</Link></Button>
          )}
          {n < 294 && (
            <Button variant="ghost" size="sm" asChild><Link href={`/read/${n + 1}`}>下一卷</Link></Button>
          )}
          {boyLink && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/boyang/section/${boyLink.id}`}>柏杨白话 · {boyLink.title.split('（')[0]}</Link>
            </Button>
          )}
        </div>
        <h1 className="font-classic text-xl font-bold leading-relaxed">{volume.title}</h1>
      </div>

      <OrigParagraphList paragraphs={paragraphs} />

      <div className="mt-10 flex justify-between border-t pt-4">
        {n > 1 ? (
          <Button variant="outline" asChild><Link href={`/read/${n - 1}`}>← 卷第{cn(n - 1)}</Link></Button>
        ) : <span />}
        {n < 294 ? (
          <Button variant="outline" asChild><Link href={`/read/${n + 1}`}>卷第{cn(n + 1)} →</Link></Button>
        ) : <span />}
      </div>
    </div>
  )
}
