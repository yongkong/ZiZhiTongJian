import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getLessons } from '@/lib/content'

export const metadata: Metadata = { title: '课程' }

export default function LessonList() {
  const lessons = getLessons()
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-classic text-2xl font-bold">课程</h1>
        <p className="text-sm text-muted-foreground">每课一个紧凑的学习单元：故事 → 文白对照 → 讲解 → 测验</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {lessons.map((l) => (
          <Link key={l.slug} href={`/lessons/${l.slug}`} className="group block h-full">
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardHeader className="pb-3">
                <CardTitle className="font-classic text-[15px] font-semibold leading-snug">{l.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">{l.subtitle}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
