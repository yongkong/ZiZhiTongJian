'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { QuizItem } from '@/lib/types'

export function Quiz({ quiz, nextSlug, nextSeq }: { quiz: QuizItem[]; nextSlug: string | null; nextSeq: number | null }) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [finished, setFinished] = useState(false)

  const item = quiz[idx]

  const pick = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    if (i === item.answer) setCorrect((c) => c + 1)
  }

  const next = () => {
    if (idx + 1 < quiz.length) {
      setIdx(idx + 1)
      setPicked(null)
    } else {
      setFinished(true)
    }
  }

  const restart = () => {
    setIdx(0)
    setPicked(null)
    setCorrect(0)
    setFinished(false)
  }

  if (finished) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>本课测验完成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-classic text-3xl font-semibold">
            {correct} / {quiz.length}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {correct === quiz.length ? '全对！名分已定，礼崩不侵。' : correct >= quiz.length * 0.6 ? '扎实。' : '再来一遍会更好。'}
            </span>
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={restart}>再测一遍</Button>
            {nextSlug && (
              <Button asChild>
                <Link href={`/lessons/${nextSlug}`}>继续第 {nextSeq} 课 →</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/lessons">回课程列表</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            第 {idx + 1} 题 / 共 {quiz.length} 题
          </CardTitle>
          <span className="text-sm text-muted-foreground">已答对 {correct}</span>
        </div>
        <Progress value={((idx + (picked !== null ? 1 : 0)) / quiz.length) * 100} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="tj-classic text-lg font-medium">{item.q}</p>
        <div className="grid gap-2">
          {item.options.map((opt, i) => {
            const isAnswer = i === item.answer
            const isPicked = i === picked
            let cls = 'justify-start text-left whitespace-normal h-auto py-2.5 '
            if (picked === null) cls += ''
            else if (isAnswer) cls += 'border-green-600/50 bg-green-600/10 '
            else if (isPicked) cls += 'border-destructive/50 bg-destructive/10 '
            else cls += 'opacity-60 '
            return (
              <Button key={i} variant="outline" className={cls} onClick={() => pick(i)} disabled={picked !== null}>
                {opt}
              </Button>
            )
          })}
        </div>
        {picked !== null && (
          <Alert>
            <AlertTitle className="font-classic font-semibold">
              {picked === item.answer ? '对。' : '误。再想想——'}
            </AlertTitle>
            <AlertDescription className="tj-classic text-sm leading-7">{item.explain}</AlertDescription>
          </Alert>
        )}
        {picked !== null && (
          <Button onClick={next}>{idx + 1 < quiz.length ? '下一题' : '完成测验'}</Button>
        )}
      </CardContent>
    </Card>
  )
}
