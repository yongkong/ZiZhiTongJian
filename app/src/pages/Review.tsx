import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { api, type ReviewCard } from '@/lib/api'

export function Review() {
  const { user } = useAuth()
  const [queue, setQueue] = useState<ReviewCard[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(0)
  const [finished, setFinished] = useState(false)

  const load = () => { setQueue(null); setIdx(0); setShow(false); setDone(0); setFinished(false); api.reviewQueue().then(setQueue) }
  useEffect(load, [])

  if (!queue) return null

  if (finished || queue.length === 0) {
    return (
      <div className="mx-auto max-w-2xl pt-10">
        <Card>
          <CardHeader>
            <CardTitle>{queue.length === 0 ? '当前没有到期卡片' : `今日复习完成 · 共 ${done} 张`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {queue.length === 0
                ? '间隔重复算法（SM-2）会在合适的时间把卡片重新带回来。去学下一课或通读原文吧。'
                : '答过的卡片已按你的记忆情况排期：忘了的很快回来，熟练的间隔拉长。'}
            </p>
            {!user && (
              <p className="text-sm text-muted-foreground">
                游客练习不会记录排期，<Link className="text-primary underline" to="/login">登录/注册</Link>后卡片会按遗忘曲线自动安排复习。
              </p>
            )}
            <div className="flex gap-3">
              <Button asChild variant="outline"><Link to="/">回仪表盘</Link></Button>
              <Button asChild variant="outline"><Link to="/lessons">去课程</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const card = queue[idx]
  const grade = async (g: 0 | 1 | 2) => {
    if (user) await api.reviewAnswer(card.id, g)   // 游客只练习, 不写排期
    setDone((d) => d + 1)
    setShow(false)
    if (idx + 1 < queue.length) setIdx(idx + 1)
    else setFinished(true)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="font-classic text-2xl font-bold">复习</h1>
        <span className="text-sm text-muted-foreground">{idx + 1} / {queue.length}</span>
      </div>
      {!user && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/[0.05] px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          游客模式：卡片可以正常练习。想按遗忘曲线自动排期、长期保留，<Link className="underline" to="/login">登录/注册</Link>即可（不影响继续学习）。
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="tj-classic text-lg font-medium leading-relaxed">{card.front}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {show ? (
            <>
              <div className="tj-classic rounded-lg bg-secondary/60 p-4 leading-8">{card.back}</div>
              <div className="grid grid-cols-3 gap-3">
                <Button variant="outline" className="border-destructive/40 text-destructive" onClick={() => grade(0)}>忘了（重来）</Button>
                <Button variant="outline" onClick={() => grade(1)}>记得</Button>
                <Button variant="outline" className="border-green-600/40 text-green-700 dark:text-green-500" onClick={() => grade(2)}>很简单</Button>
              </div>
            </>
          ) : (
            <Button size="lg" className="w-full" onClick={() => setShow(true)}>回想一下，然后看答案</Button>
          )}
        </CardContent>
      </Card>
      <p className="text-center text-xs text-muted-foreground">
        先努力回想再看答案——提取练习比重复阅读记得牢。
      </p>
    </div>
  )
}
