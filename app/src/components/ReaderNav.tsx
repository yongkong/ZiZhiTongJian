import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUp, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { api, type Volume } from '@/lib/api'

export const initOpen = () => typeof window !== 'undefined' && window.location.hash === '#toc'

function useShowTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 480)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return show
}

/** 微信读书式悬浮导航球: 目录 + 回到顶部 */
export function ReaderFloat({ onToc }: { onToc: () => void }) {
  const showTop = useShowTop()
  return (
    <TooltipProvider delayDuration={200}>
      <div className="fixed right-4 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-3 sm:right-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-11 rounded-full bg-card/95 shadow-md backdrop-blur hover:bg-accent"
              onClick={onToc}
              aria-label="目录"
            >
              <List className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">目录</TooltipContent>
        </Tooltip>
        {showTop && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-11 rounded-full bg-card/95 shadow-md backdrop-blur hover:bg-accent"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label="回到顶部"
              >
                <ArrowUp className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">回到顶部</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

/** 原文阅读器目录抽屉: 294 卷按纪分组 */
export function VolumeNav({
  open,
  onOpenChange,
  current,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  current?: number
}) {
  const [vols, setVols] = useState<Volume[] | null>(null)
  const curRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    if (open && !vols) api.volumes().then(setVols)
  }, [open, vols])

  useEffect(() => {
    if (open && vols && curRef.current) curRef.current.scrollIntoView({ block: 'center' })
  }, [open, vols])

  const groups: Array<[string, Volume[]]> = []
  for (const v of vols ?? []) {
    const last = groups[groups.length - 1]
    if (last && last[0] === v.era_group) last[1].push(v)
    else groups.push([v.era_group, [v]])
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(true)} aria-expanded={open}>
        ☰ 章节目录
      </Button>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[22rem] p-0 sm:w-80">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="font-classic text-base">全 294 卷</SheetTitle>
            <SheetDescription className="text-xs">按纪分组 · 当前卷高亮</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-5rem)]">
            <div className="space-y-4 p-4">
              {!vols ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                groups.map(([g, vs]) => (
                  <div key={g}>
                    <div className="font-classic mb-1.5 text-sm font-semibold">
                      {g}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{vs.length} 卷</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {vs.map((v) => (
                        <Link
                          key={v.num}
                          to={`/read/${v.num}`}
                          onClick={() => onOpenChange(false)}
                          ref={v.num === current ? curRef : undefined}
                          className={cn(
                            'rounded-md border px-1 py-1 text-center text-xs transition-colors',
                            v.num === current
                              ? 'border-primary bg-primary text-primary-foreground'
                              : v.status === 'done'
                                ? 'border-primary/30 bg-primary/10 text-primary'
                                : 'hover:border-primary/40 hover:bg-accent/60',
                          )}
                          title={v.title}
                        >
                          {v.num}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}

interface BoySection {
  id: number
  kind: string
  title: string
}

/** 柏杨阅读器目录抽屉: 本册章节 + 全部 72 册 */
export function BoyangNav({
  open,
  onOpenChange,
  bookId,
  sectionId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  bookId: number
  sectionId: number
}) {
  const [books, setBooks] = useState<Array<{ id: number; title: string; box: string }> | null>(null)
  const [secs, setSecs] = useState<BoySection[] | null>(null)
  const curRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    setSecs(null)
  }, [bookId])

  useEffect(() => {
    if (open) {
      if (!books) api.boyangBooks().then(setBooks)
      if (!secs) api.boyangBook(bookId).then((r) => setSecs(r.sections))
    }
  }, [open, bookId, books, secs])

  useEffect(() => {
    if (open && secs && curRef.current) curRef.current.scrollIntoView({ block: 'center' })
  }, [open, secs])

  const boxes = new Map<string, Array<{ id: number; title: string; box: string }>>()
  for (const b of books ?? []) {
    const key = b.box || '其他'
    if (!boxes.has(key)) boxes.set(key, [])
    boxes.get(key)!.push(b)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(true)} aria-expanded={open}>
        ☰ 章节目录
      </Button>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[22rem] p-0 sm:w-80">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="font-classic text-base">柏杨白话版 · 目录</SheetTitle>
            <SheetDescription className="text-xs">本册章节 + 全部 72 册</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-5rem)]">
            <div className="space-y-5 p-4">
              <section>
                <div className="font-classic mb-1.5 text-sm font-semibold">本册章节</div>
                {!secs ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <div className="space-y-1">
                    {secs.map((s) => (
                      <Link
                        key={s.id}
                        to={`/boyang/section/${s.id}`}
                        onClick={() => onOpenChange(false)}
                        ref={s.id === sectionId ? curRef : undefined}
                        className={cn(
                          'block rounded-md px-2 py-1 text-sm transition-colors',
                          s.kind === 'decade' && 'ml-4',
                          s.id === sectionId
                            ? 'bg-primary font-medium text-primary-foreground'
                            : 'hover:bg-accent/60',
                        )}
                      >
                        {s.title}
                      </Link>
                    ))}
                  </div>
                )}
              </section>
              <section>
                <div className="font-classic mb-1.5 text-sm font-semibold">
                  全部 72 册
                  <span className="ml-2 text-xs font-normal text-muted-foreground">按盒组</span>
                </div>
                {!books ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <div className="space-y-2">
                    {[...boxes.entries()].map(([box, bs]) => (
                      <div key={box}>
                        <div className="mb-1 text-xs text-muted-foreground">{box}</div>
                        <div className="flex flex-wrap gap-1">
                          {bs.map((b) => (
                            <Link
                              key={b.id}
                              to={`/boyang/book/${b.id}`}
                              onClick={() => onOpenChange(false)}
                              className={cn(
                                'rounded-md border px-2 py-0.5 font-classic text-xs transition-colors',
                                b.id === bookId
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'hover:border-primary/40 hover:bg-accent/60',
                              )}
                            >
                              {b.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}

export interface LessonTocItem {
  id: string
  title: string
  kind: string
}

/** 课程页目录抽屉: 各小节锚点跳转 */
export function LessonNav({
  open,
  onOpenChange,
  items,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  items: LessonTocItem[]
}) {
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(true)} aria-expanded={open}>
        ☰ 本课目录
      </Button>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[22rem] p-0 sm:w-80">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="font-classic text-base">本课目录</SheetTitle>
            <SheetDescription className="text-xs">点击小节直达</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-5rem)]">
            <nav className="space-y-1 p-4">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => {
                    document.getElementById(it.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    onOpenChange(false)
                  }}
                  className={cn(
                    'font-classic block w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/60',
                    it.kind === 'passage' && 'pl-5 text-muted-foreground',
                    it.kind === 'quiz' || it.kind === 'resources' ? 'mt-2 border-t pt-2' : '',
                  )}
                >
                  {it.title}
                </button>
              ))}
            </nav>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}
