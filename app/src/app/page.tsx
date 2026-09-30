import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getCards, getLessons } from '@/lib/content'

export default function Dashboard() {
  const lessons = getLessons()
  const first = lessons[0]
  const nCards = getCards().length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-classic text-3xl font-bold">资治通鉴 · 学堂</h1>
        <div className="tj-banzhu mt-3">
          <span className="shrink-0">鉴前世之兴衰 · 考当今之得失</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">每日 30–60 分钟，从头通读 294 卷 · 全部内容免费开放</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 items-start">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>从头开始</CardTitle>
            <CardDescription>第一课 · 战国—五代 1362 年</CardDescription>
          </CardHeader>
          <CardContent>
            {first && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="tj-seal">{first.focus}</Badge>
                </div>
                <p className="font-classic text-xl font-semibold">{first.title}</p>
                <p className="text-sm text-muted-foreground">{first.subtitle}</p>
                <Button asChild className="font-classic tracking-widest">
                  <Link href={`/lessons/${first.slug}`}>开始第一课 →</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">卡片练习</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{nCards} <span className="text-sm font-normal text-muted-foreground">张记忆卡片</span></p>
              <p className="mt-1 text-xs text-muted-foreground">随机抽取 · 提取练习比重复阅读记得牢</p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/review">开始练习</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">课程体系</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-classic text-3xl font-semibold">{lessons.length} <span className="text-sm font-normal text-muted-foreground">课精讲</span></p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link href="/lessons">浏览全部课程</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">原文通读</CardTitle>
            <CardDescription>294 卷 · 胡三省音注版</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">司马光原文，点击段落下方「胡注」展开注释，按纪分卷通读。</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/read">进入阅读器</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">柏杨白话版</CardTitle>
            <CardDescription>全 72 册 · 现代人视角的对照读本</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">含「司马光曰」「柏杨曰」对照评论，重点语句附批语。</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/boyang">浏览 72 册</Link>
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
          每课结构：故事 → 文白对照 → 讲解 → 测验。读不懂的地方，随时翻回文白对照细细揣摩。
        </CardContent>
      </Card>
    </div>
  )
}
