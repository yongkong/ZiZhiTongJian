'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUp, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { BookMeta, BoySectionMeta, LessonMeta } from '@/lib/types'

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
              className="size-11 rounded-sm border-rule-strong/60 bg-card hover:border-rule-strong hover:bg-accent"
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
                className="size-11 rounded-sm border-rule-strong/60 bg-card hover:border-rule-strong hover:bg-accent"
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

// ---------------------------------------------------------------- 原文阅读器

export interface VolumeNavItem {
  num: number
  g: string
  title: string
}

/** 原文阅读器目录抽屉: 294 卷按纪分组 (受控) */
export function VolumeNav({
  open,
  onOpenChange,
  vols,
  current,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  vols: VolumeNavItem[]
  current?: number
}) {
  const curRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    if (open && curRef.current) curRef.current.scrollIntoView({ block: 'center' })
  }, [open])

  const groups: Array<[string, VolumeNavItem[]]> = []
  for (const v of vols) {
    const last = groups[groups.length - 1]
    if (last && last[0] === v.g) last[1].push(v)
    else groups.push([v.g, [v]])
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(true)} aria-expanded={open}>
        <List className="size-3.5" /> 章节目录
      </Button>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[22rem] p-0 sm:w-80">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="font-classic text-base">全 294 卷</SheetTitle>
            <SheetDescription className="text-xs">按纪分组 · 当前卷高亮</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-5rem)]">
            <div className="space-y-4 p-4">
              {groups.map(([g, vs]) => (
                <div key={g}>
                  <div className="font-classic mb-1.5 text-sm font-semibold">
                    {g}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{vs.length} 卷</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {vs.map((v) => (
                      <Link
                        key={v.num}
                        href={`/read/${v.num}`}
                        onClick={() => onOpenChange(false)}
                        ref={v.num === current ? curRef : undefined}
                        className={cn(
                          'rounded-md border px-1 py-1 text-center text-xs transition-colors',
                          v.num === current
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'hover:border-primary/40 hover:bg-accent/60',
                        )}
                        title={v.title}
                      >
                        {v.num}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}

/** 卷页目录组合: 悬浮球 + 章节目录按钮/抽屉 */
export function VolumeToc({ vols, current }: { vols: VolumeNavItem[]; current: number }) {
  const [open, setOpen] = useState(initOpen)
  return (
    <>
      <ReaderFloat onToc={() => setOpen(true)} />
      <VolumeNav open={open} onOpenChange={setOpen} vols={vols} current={current} />
    </>
  )
}

// ---------------------------------------------------------------- 柏杨阅读器

/** 柏杨阅读器目录抽屉: 本册章节 + 全部 72 册 (受控) */
export function BoyangNav({
  open,
  onOpenChange,
  books,
  sections,
  bookId,
  sectionId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  books: BookMeta[]
  sections: BoySectionMeta[]
  bookId: number
  sectionId: number
}) {
  const curSec = useRef<HTMLAnchorElement | null>(null)
  const curBook = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    if (open) {
      // 等抽屉内容挂载后再定位
      requestAnimationFrame(() => {
        curSec.current?.scrollIntoView({ block: 'center' })
        curBook.current?.scrollIntoView({ block: 'center' })
      })
    }
  }, [open])

  const boxes = new Map<string, BookMeta[]>()
  for (const b of books) {
    const key = b.box || '其他'
    if (!boxes.has(key)) boxes.set(key, [])
    boxes.get(key)!.push(b)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(true)} aria-expanded={open}>
        <List className="size-3.5" /> 章节目录
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
                <div className="space-y-1">
                  {sections.map((s) => (
                    <Link
                      key={s.id}
                      href={`/boyang/section/${s.id}`}
                      onClick={() => onOpenChange(false)}
                      ref={s.id === sectionId ? curSec : undefined}
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
              </section>
              <section>
                <div className="font-classic mb-1.5 text-sm font-semibold">
                  全部 72 册
                  <span className="ml-2 text-xs font-normal text-muted-foreground">按盒组</span>
                </div>
                <div className="space-y-2">
                  {[...boxes.entries()].map(([box, bs]) => (
                    <div key={box}>
                      <div className="mb-1 text-xs text-muted-foreground">{box}</div>
                      <div className="flex flex-wrap gap-1">
                        {bs.map((b) => (
                          <Link
                            key={b.id}
                            href={`/boyang/book/${b.id}`}
                            onClick={() => onOpenChange(false)}
                            ref={b.id === bookId ? curBook : undefined}
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
              </section>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}

/** 柏杨章节页目录组合: 悬浮球 + 章节目录按钮/抽屉 */
export function BoyangToc({
  books,
  sections,
  bookId,
  sectionId,
}: {
  books: BookMeta[]
  sections: BoySectionMeta[]
  bookId: number
  sectionId: number
}) {
  const [open, setOpen] = useState(initOpen)
  return (
    <>
      <ReaderFloat onToc={() => setOpen(true)} />
      <BoyangNav open={open} onOpenChange={setOpen} books={books} sections={sections} bookId={bookId} sectionId={sectionId} />
    </>
  )
}

// ---------------------------------------------------------------- 课程页

export interface LessonTocItem {
  id: string
  title: string
  kind: string
}

/** 课程页目录抽屉: 各小节锚点跳转 (受控) */
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
        <List className="size-3.5" /> 本课目录
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

/** 课程页全部课程抽屉: 全部课按 seq 编号网格, 当前课高亮 (受控) */
export function AllLessonsNav({
  open,
  onOpenChange,
  lessons,
  currentSlug,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  lessons: LessonMeta[]
  currentSlug: string
}) {
  const curRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    if (open && curRef.current) curRef.current.scrollIntoView({ block: 'center' })
  }, [open])

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(true)} aria-expanded={open}>
        <List className="size-3.5" /> 全部课程
      </Button>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[22rem] p-0 sm:w-80">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="font-classic text-base">全部课程</SheetTitle>
            <SheetDescription className="text-xs">{lessons.length} 课按顺序学习 · 当前课高亮</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-5rem)]">
            <div className="grid grid-cols-8 gap-1 p-4">
              {lessons.map((l) => (
                <Link
                  key={l.slug}
                  href={`/lessons/${l.slug}`}
                  onClick={() => onOpenChange(false)}
                  ref={l.slug === currentSlug ? curRef : undefined}
                  className={cn(
                    'rounded-md border px-1 py-1 text-center text-xs transition-colors',
                    l.slug === currentSlug
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:border-primary/40 hover:bg-accent/60',
                  )}
                  title={`${l.title} — ${l.subtitle}`}
                >
                  {l.seq}
                </Link>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}

/** 课程页目录组合: 悬浮球 + 本课目录 + 全部课程 */
export function LessonToc({
  items,
  lessons,
  currentSlug,
}: {
  items: LessonTocItem[]
  lessons: LessonMeta[]
  currentSlug: string
}) {
  const [tocOpen, setTocOpen] = useState(initOpen)
  const [allOpen, setAllOpen] = useState(false)
  return (
    <>
      <ReaderFloat onToc={() => setTocOpen(true)} />
      <LessonNav open={tocOpen} onOpenChange={setTocOpen} items={items} />
      <AllLessonsNav open={allOpen} onOpenChange={setAllOpen} lessons={lessons} currentSlug={currentSlug} />
    </>
  )
}
