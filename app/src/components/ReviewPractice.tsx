'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Card as ReviewCard } from '@/lib/types'

const BATCH = 20

function pickBatch(cards: ReviewCard[]): ReviewCard[] {
  return [...cards].sort(() => Math.random() - 0.5).slice(0, BATCH)
}

/** 纯练习模式: 随机抽卡, 不记录排期。抽卡在挂载后进行, 避免与服务端预渲染的随机结果水合不一致 */
export function ReviewPractice({ cards }: { cards: ReviewCard[] }) {
  const [queue, setQueue] = useState<ReviewCard[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(0)
  const [hits, setHits] = useState(0)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    setQueue(pickBatch(cards))
  }, [cards])

  const restart = () => {
    setQueue(pickBatch(cards))
    setIdx(0)
    setShow(false)
    setDone(0)
    setHits(0)
    setFinished(false)
  }

  if (!queue) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pt-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (finished || queue.length === 0) {
    return (
      <div className="mx-auto max-w-2xl pt-10">
        <Card>
          <CardHeader>
            <CardTitle>{queue.length === 0 ? '没有可用卡片' : `本轮练习完成 · 共 ${done} 张`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {queue.length === 0
                ? '课程测验的题目会自动进入卡片库，先去上几课吧。'
                : `自评记得 ${hits} 张 / ${done} 张。提取练习比重复阅读记得牢——隔几天再来一轮。`}
            </p>
            <div className="flex flex-wrap gap-3">
              {cards.length > 0 && (
                <Button variant="outline" onClick={restart}>再来一轮</Button>
              )}
              <Button asChild variant="outline"><Link href="/lessons">去课程</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const card = queue[idx]
  const grade = (remembered: boolean) => {
    if (remembered) setHits((h) => h + 1)
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
      <Card>
        <CardHeader>
          <CardTitle className="tj-classic text-lg font-medium leading-relaxed">{card.front}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {show ? (
            <>
              <div className="tj-classic rounded-lg bg-secondary/60 p-4 leading-8">{card.back}</div>
              <div className="grid grid-cols-3 gap-3">
                <Button variant="outline" className="border-destructive/40 text-destructive" onClick={() => grade(false)}>忘了</Button>
                <Button variant="outline" onClick={() => grade(true)}>记得</Button>
                <Button variant="outline" className="border-green-600/40 text-green-700 dark:text-green-500" onClick={() => grade(true)}>很简单</Button>
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
