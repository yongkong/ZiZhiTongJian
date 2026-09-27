import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OrigParagraph, YearBadge } from '@/components/OrigParagraph'
import { ReaderFloat, VolumeNav, initOpen } from '@/components/ReaderNav'
import { useAuth } from '@/lib/auth'
import { api, type OrigPara, type Volume } from '@/lib/api'

export function VolumeList() {
  const [vols, setVols] = useState<Volume[] | null>(null)
  useEffect(() => { api.volumes().then(setVols) }, [])
  if (!vols) return null

  const groups: Array<[string, Volume[]]> = []
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
              <Link key={v.num} to={`/read/${v.num}`}
                className="rounded-lg border p-3 text-sm hover:border-primary/40 hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">卷第{cn(v.num)}</span>
                  {v.status === 'done' && <Badge className="text-xs">已读</Badge>}
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

const CN = '〇一二三四五六七八九'
function cn(n: number): string {
  if (n <= 10) return ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][n - 1] ?? String(n)
  if (n < 20) return '十' + CN[n % 10]
  if (n < 100) return CN[Math.floor(n / 10) - 1] + '十' + (n % 10 ? CN[n % 10] : '')
  return String(n)
}

export function VolumeView() {
  const { num } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const [data, setData] = useState<{ volume: Volume; paragraphs: OrigPara[] } | null>(null)
  const [boyLink, setBoyLink] = useState<{ id: number; title: string } | null>(null)
  const [markState, setMarkState] = useState('open')
  const [tocOpen, setTocOpen] = useState(initOpen)

  useEffect(() => {
    const n = Number(num)
    setData(null)
    setBoyLink(null)
    api.volume(n).then((r) => {
      setData(r)
      setMarkState(r.volume.status || 'open')
      const y = r.paragraphs.find((p) => p.tj_year)?.tj_year
      if (y) api.boyangByYear(y).then((xs) => { if (xs[0]) setBoyLink(xs[0]) })
    })
  }, [num])

  if (!data) return null
  const { volume, paragraphs } = data
  const n = Number(num)

  const mark = async (status: string) => {
    if (!user) {
      // 游客: 本页临时标记, 不写库, 不打断阅读
      setMarkState(status)
      toast('游客模式：本次浏览已标记，但不会保存到账号', {
        description: '登录/注册后，阅读进度与复习排期会自动保存。现在也可以继续阅读。',
      })
      return
    }
    await api.markReading(n, status)
    setMarkState(status)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ReaderFloat onToc={() => setTocOpen(true)} />
      <VolumeNav open={tocOpen} onOpenChange={setTocOpen} current={n} />
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Button variant="ghost" size="sm" asChild><Link to="/read">← 卷目</Link></Button>
          <Button variant="ghost" size="sm" disabled={n <= 1} onClick={() => nav(`/read/${n - 1}`)}>上一卷</Button>
          <Button variant="ghost" size="sm" disabled={n >= 294} onClick={() => nav(`/read/${n + 1}`)}>下一卷</Button>
          {boyLink && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/boyang/section/${boyLink.id}`}>📖 柏杨白话·{boyLink.title.split('（')[0]}</Link>
            </Button>
          )}
          <span className="ml-auto">
            {markState === 'done'
              ? <Badge>✓ 已读</Badge>
              : <Button size="sm" variant="outline" onClick={() => mark('done')}>标记已读</Button>}
          </span>
        </div>
        <h1 className="font-classic text-xl font-bold leading-relaxed">{volume.title}</h1>
      </div>

      <div className="space-y-5">
        {paragraphs.map((p) => {
          if (p.kind === 'title') return null
          return (
            <div key={p.seq} className="relative">
              {p.tj_year != null && (
                <div className="mb-2 flex items-center gap-2">
                  <YearBadge year={p.tj_year} />
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <OrigParagraph segments={p.segments} />
            </div>
          )
        })}
      </div>

      <div className="mt-10 flex justify-between border-t pt-4">
        <Button variant="outline" disabled={n <= 1} onClick={() => nav(`/read/${n - 1}`)}>← 卷第{cn(n - 1)}</Button>
        <Button variant="outline" disabled={n >= 294} onClick={() => nav(`/read/${n + 1}`)}>卷第{cn(n + 1)} →</Button>
      </div>
    </div>
  )
}
