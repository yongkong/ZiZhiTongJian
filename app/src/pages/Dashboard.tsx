import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/lib/auth'
import { api, type LessonSummary, type Stats } from '@/lib/api'

export function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [lessons, setLessons] = useState<LessonSummary[]>([])

  useEffect(() => {
    api.stats().then(setStats)
    api.lessons().then(setLessons)
  }, [])

  if (!stats) return null
  const next = lessons.find((l) => l.slug === stats.nextLesson)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-classic text-3xl font-bold">资治通鉴 · 学堂</h1>
        <p className="mt-1 text-muted-foreground">
          鉴前世之兴衰，考当今之得失 —— 每日 30–60 分钟，从头通读 294 卷
        </p>
      </div>

      {!user && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.05] px-4 py-3 text-sm">
          <span className="text-amber-700 dark:text-amber-400">
            游客模式：全部课程与阅读器免费开放，随时可学。注册后进度、测验成绩与复习排期会自动保存。
          </span>
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link to="/login">登录 / 注册</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3 items-start">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>继续学习</CardTitle>
            <CardDescription>从头通读 · 下一课</CardDescription>
          </CardHeader>
          <CardContent>
            {next ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge>{next.focus}</Badge>
                </div>
                <p className="font-classic text-xl font-semibold">{next.title}</p>
                <p className="text-sm text-muted-foreground">{next.subtitle}</p>
                <Button asChild>
                  <Link to={`/lessons/${next.slug}`}>开始这一课 →</Link>
                </Button>
              </div>
            ) : (
              <p>所有课程已完成，去 <Link className="text-primary underline" to="/read">阅读器</Link> 继续通读。</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">今日复习</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stats.due} <span className="text-sm font-normal text-muted-foreground">张卡片到期</span></p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/review">开始复习</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">学习连续</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stats.streak} <span className="text-sm font-normal text-muted-foreground">天 🔥</span></p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">通读进度</CardTitle>
            <CardDescription>294 卷 · 原文（胡三省注版）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={(stats.done / stats.vols) * 100} />
            <p className="text-sm text-muted-foreground">已读 {stats.done} 卷 / 共 {stats.vols} 卷</p>
            <Button asChild variant="outline" size="sm">
              <Link to="/read">进入阅读器</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">柏杨白话版</CardTitle>
            <CardDescription>全 72 册 · 现代人视角的对照读本</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/boyang">浏览 72 册</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">学堂宗旨</CardTitle>
        </CardHeader>
        <CardContent className="tj-classic text-sm leading-7 text-muted-foreground">
          以兴趣修身为本，打通战国至五代一千三百六十二年历史脉络，把书中的用人、决策、兴衰案例内化为自己的判断力。
          每课结构：故事 → 文白对照 → 讲解 → 测验（间隔重复复习）。有任何读不懂的地方，随时回到对话里问你的老师（AI 助教）。
        </CardContent>
      </Card>
    </div>
  )
}
