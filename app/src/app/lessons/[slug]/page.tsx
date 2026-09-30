import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PassageView } from '@/components/PassageView'
import { Quiz } from '@/components/Quiz'
import { LessonToc, type LessonTocItem } from '@/components/ReaderNav'
import { getLesson, getLessons } from '@/lib/content'

export function generateStaticParams() {
  return getLessons().map((l) => ({ slug: l.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  try {
    const l = getLesson(slug)
    return { title: l.title, description: l.subtitle }
  } catch {
    return {}
  }
}

export default async function LessonDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let lesson
  try {
    lesson = getLesson(slug)
  } catch {
    notFound()
  }
  const allLessons = getLessons()
  const idx = allLessons.findIndex((l) => l.slug === lesson.slug)
  const prev = idx > 0 ? allLessons[idx - 1] : null
  const next = idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : null

  const c = lesson.content
  const tocItems: LessonTocItem[] = c.blocks.map((b, i) => ({
    id: `blk-${i}`,
    title: b.title,
    kind: b.type,
  }))
  tocItems.push({ id: 'quiz', title: '检验理解', kind: 'quiz' })
  tocItems.push({ id: 'resources', title: '延伸资源', kind: 'resources' })

  const tagCls: Record<string, string> = {
    管理: 'border-primary/40 bg-primary/5 text-primary',
    工作: 'border-sky-600/40 bg-sky-600/5 text-sky-700 dark:text-sky-400',
    生活: 'border-green-600/40 bg-green-600/5 text-green-700 dark:text-green-500',
    学习: 'border-amber-600/40 bg-amber-600/5 text-amber-700 dark:text-amber-500',
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild><Link href="/lessons">← 课程列表</Link></Button>
          <LessonToc items={tocItems} lessons={allLessons} currentSlug={lesson.slug} />
        </div>
        <h1 className="font-classic text-2xl font-bold leading-snug">{lesson.title}</h1>
        <p className="text-muted-foreground">{lesson.subtitle}</p>
        <Badge variant="outline">{lesson.focus}</Badge>
      </div>

      <Card className="border-rule-strong/50 bg-secondary/40">
        <CardHeader className="pb-2">
          <CardTitle className="font-classic text-base text-primary">本课速览 · 先记这三点</CardTitle>
          <CardDescription>30 秒抓住本课重点，再进入正文</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {(c.keyPoints ?? []).map((kp, i) => (
              <li key={i} className="tj-classic flex gap-3 text-[15px] leading-7">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm border border-primary/30 bg-primary/10 font-classic text-sm font-semibold text-primary">
                  {['一', '二', '三', '四', '五'][i] ?? i + 1}
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
              <Card className="tj-framed">
                <CardHeader className="pb-2">
                  <CardTitle className="font-classic text-base">{b.title}</CardTitle>
                  <CardDescription>文白对照 · 展开胡注看注释 · 三种阅读模式</CardDescription>
                </CardHeader>
                <CardContent>
                  <PassageView block={b} />
                </CardContent>
              </Card>
            </div>
          )
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
        <Quiz quiz={c.quiz} nextSlug={next?.slug ?? null} nextSeq={next?.seq ?? null} />
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
              读不懂的地方，随时翻回文白对照——原文与白话并排，一句一句对过去。
            </p>
          </CardContent>
        </Card>
      </div>

      {(prev || next) && (
        <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
          {prev ? (
            <Link href={`/lessons/${prev.slug}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">← 上一课 · 第 {prev.seq} 课</div>
                  <div className="font-classic mt-1 text-sm font-semibold leading-snug">
                    {prev.title.replace(/^第 \d+ 课 · /, '')}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <div className="hidden sm:block" />
          )}
          {next && (
            <Link href={`/lessons/${next.slug}`} className="group sm:text-right">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">下一课 · 第 {next.seq} 课 →</div>
                  <div className="font-classic mt-1 text-sm font-semibold leading-snug">
                    {next.title.replace(/^第 \d+ 课 · /, '')}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
