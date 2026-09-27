import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PassageView } from '@/components/PassageView'
import { Quiz } from '@/components/Quiz'
import { LessonNav, ReaderFloat, initOpen, type LessonTocItem } from '@/components/ReaderNav'
import { api, type LessonSummary } from '@/lib/api'

export function LessonList() {
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null)
  useEffect(() => { api.lessons().then(setLessons) }, [])
  if (!lessons) return null
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-classic text-2xl font-bold">课程</h1>
        <p className="text-sm text-muted-foreground">每课一个紧凑的学习单元：故事 → 文白对照 → 讲解 → 测验 → 间隔复习</p>
      </div>
      <div className="space-y-3">
        {lessons.map((l) => (
          <Link key={l.slug} to={`/lessons/${l.slug}`}>
            <Card className="transition-colors hover:border-primary/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-classic text-lg">{l.title}</CardTitle>
                  {l.status === 'done'
                    ? <Badge>✓ 已完成 {l.best_score != null ? `· 最佳 ${l.best_score}` : ''}</Badge>
                    : l.status === 'new' ? <Badge variant="outline">未开始</Badge> : <Badge variant="secondary">进行中</Badge>}
                </div>
                <CardDescription>{l.subtitle}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

type LessonData = Awaited<ReturnType<typeof api.lesson>>

export function LessonDetail() {
  const { slug } = useParams()
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [tocOpen, setTocOpen] = useState(initOpen)
  useEffect(() => { if (slug) api.lesson(slug).then(setLesson) }, [slug])
  if (!lesson) return null

  const c = lesson.content
  const tocItems: LessonTocItem[] = c.blocks.map((b, i) => ({
    id: `blk-${i}`,
    title: b.title,
    kind: b.type,
  }))
  tocItems.push({ id: 'quiz', title: '检验理解', kind: 'quiz' })
  tocItems.push({ id: 'resources', title: '延伸资源', kind: 'resources' })

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <ReaderFloat onToc={() => setTocOpen(true)} />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild><Link to="/lessons">← 课程列表</Link></Button>
          <LessonNav open={tocOpen} onOpenChange={setTocOpen} items={tocItems} />
        </div>
        <h1 className="font-classic text-2xl font-bold leading-snug">{lesson.title}</h1>
        <p className="text-muted-foreground">{lesson.subtitle}</p>
        <Badge variant="outline">{lesson.focus}</Badge>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/[0.05]">
        <CardHeader className="pb-2">
          <CardTitle className="font-classic text-base text-amber-700 dark:text-amber-400">⚡ 本课速览 · 先记这三点</CardTitle>
          <CardDescription>30 秒抓住本课重点，再进入正文</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {(c.keyPoints ?? []).map((kp, i) => (
              <li key={i} className="tj-classic flex gap-3 text-[15px] leading-7">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {i + 1}
                </span>
                <span>{kp}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="tj-classic space-y-3 pt-6 text-[15px] leading-8">
          {c.intro.map((p, i) => <p key={i}>{p}</p>)}
        </CardContent>
      </Card>

      {c.blocks.map((b, i) => {
        if (b.type === 'narration') {
          return (
            <section key={i} id={`blk-${i}`} className="space-y-2 scroll-mt-20">
              <h2 className="font-classic text-lg font-semibold text-primary">{b.title}</h2>
              <p className="tj-classic leading-8 text-[15px]">{b.text}</p>
            </section>
          )
        }
        if (b.type === 'passage') {
          return (
            <div key={i} id={`blk-${i}`} className="scroll-mt-20">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-classic text-base">{b.title}</CardTitle>
                  <CardDescription>文白对照 · 点击「胡注」看注释 · 三种阅读模式</CardDescription>
                </CardHeader>
                <CardContent>
                  <PassageView passage={b} />
                </CardContent>
              </Card>
            </div>
          )
        }
        const tagCls: Record<string, string> = {
          管理: 'border-primary/40 bg-primary/5 text-primary',
          工作: 'border-sky-600/40 bg-sky-600/5 text-sky-700 dark:text-sky-400',
          生活: 'border-green-600/40 bg-green-600/5 text-green-700 dark:text-green-500',
          学习: 'border-amber-600/40 bg-amber-600/5 text-amber-700 dark:text-amber-500',
        }
        return (
          <div key={i} id={`blk-${i}`} className="scroll-mt-20">
            <Card className="border-primary/25 bg-primary/[0.03]">
            <CardHeader className="pb-2">
              <CardTitle className="font-classic text-base text-primary">{b.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {b.groups ? (
                <div className="space-y-3">
                  {b.groups.map((g) => (
                    <div key={g.tag + g.title} className="rounded-lg border bg-card p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={tagCls[g.tag] ?? ''}>{g.tag}</Badge>
                        <span className="font-classic text-sm font-semibold">{g.title}</span>
                      </div>
                      <p className="tj-classic mt-2 text-[15px] leading-8">{g.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-3">
                  {(b.items ?? []).map((it, j) => (
                    <li key={j} className="tj-classic flex gap-2 text-[15px] leading-8">
                      <span className="mt-0.5 text-primary">◆</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
            </Card>
          </div>
        )
      })}

      <section id="quiz" className="space-y-4 scroll-mt-20">
        <h2 className="font-classic text-lg font-semibold">检验理解</h2>
        <Quiz slug={lesson.slug} quiz={c.quiz} />
      </section>

      <div id="resources" className="scroll-mt-20">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">延伸资源</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {c.resources.map((r) => (
              <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="block text-primary underline underline-offset-4">
                {r.title}
              </a>
            ))}
            <p className="pt-2 text-muted-foreground">
              💡 读不懂的地方，随时回到 AI 对话中提问——你的老师随叫随到。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
