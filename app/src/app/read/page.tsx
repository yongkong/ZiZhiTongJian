import type { Metadata } from 'next'
import Link from 'next/link'
import { getVolumes } from '@/lib/content'

export const metadata: Metadata = { title: '原文阅读器' }

const CN = '〇一二三四五六七八九'
export function cn(n: number): string {
  if (n <= 10) return ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][n - 1] ?? String(n)
  if (n < 20) return '十' + CN[n % 10]
  if (n < 100) return CN[Math.floor(n / 10) - 1] + '十' + (n % 10 ? CN[n % 10] : '')
  return String(n)
}

export default function VolumeList() {
  const vols = getVolumes()

  const groups: Array<[string, typeof vols]> = []
  for (const v of vols) {
    const last = groups[groups.length - 1]
    if (last && last[0] === v.era_group) last[1].push(v)
    else groups.push([v.era_group, [v]])
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-classic text-2xl font-bold">原文阅读器</h1>
        <p className="text-sm text-muted-foreground">司马光原文 · 胡三省音注（点击段落下方「胡注」展开）</p>
      </div>
      {groups.map(([g, vs]) => (
        <section key={g}>
          <h2 className="font-classic mb-3 text-lg font-semibold">{g}<span className="ml-2 text-sm font-normal text-muted-foreground">{vs.length} 卷</span></h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {vs.map((v) => (
              <Link key={v.num} href={`/read/${v.num}`}
                className="border p-3 text-sm transition-colors hover:border-rule-strong hover:bg-accent/50">
                <div className="flex items-center justify-between">
                  <span className="font-classic font-semibold">卷第{cn(v.num)}</span>
                </div>
                <p className="mt-1 truncate text-muted-foreground">{v.title.split('】')[1] ?? v.title}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
