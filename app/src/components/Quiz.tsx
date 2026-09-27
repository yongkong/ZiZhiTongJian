import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/lib/auth'
import { api, type QuizItem } from '@/lib/api'

export function Quiz({ slug, quiz }: { slug: string; quiz: QuizItem[] }) {
  const { user } = useAuth()
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [finished, setFinished] = useState(false)
  const [saved, setSaved] = useState(false)

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

  const save = async () => {
    await api.completeLesson(slug, correct)
    setSaved(true)
  }

  if (finished) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>本课测验完成</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-3xl font-semibold">
            {correct} / {quiz.length}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {correct === quiz.length ? '全对！名分已定，礼崩不侵。' : correct >= quiz.length * 0.6 ? (user ? '扎实。错题已进入复习队列。' : '扎实！') : (user ? '再来一遍会更好，错题会自动安排复习。' : '再来一遍会更好。')}
            </span>
          </p>
          {!user ? (
            <>
              <p className="text-sm text-muted-foreground">
                测验本身不需要账号。想记录成绩、并让错题按遗忘曲线自动安排复习，
                <Link className="text-primary underline" to="/login">登录/注册</Link>即可——不注册也可以继续学后面的内容。
              </p>
              <div className="flex gap-3">
                <Button asChild variant="outline">
                  <Link to="/lessons">继续下一课 →</Link>
                </Button>
              </div>
            </>
          ) : !saved ? (
            <Button onClick={save}>记录成绩并生成复习卡片</Button>
          ) : (
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link to="/review">去复习</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">回到仪表盘</Link>
              </Button>
            </div>
          )}
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
            <AlertTitle>{picked === item.answer ? '✓ 正确' : '✗ 再想想'}</AlertTitle>
            <AlertDescription>{item.explain}</AlertDescription>
          </Alert>
        )}
        {picked !== null && (
          <Button onClick={next}>{idx + 1 < quiz.length ? '下一题' : '完成测验'}</Button>
        )}
      </CardContent>
    </Card>
  )
}
