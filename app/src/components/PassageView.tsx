import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BoyParagraph } from '@/components/BoyParagraph'
import { OrigParagraph } from '@/components/OrigParagraph'
import { api, type BoyPara, type Highlight, type OrigPara, type PassageRef } from '@/lib/api'

export function PassageView({ passage: p }: { passage: PassageRef }) {
  const [orig, setOrig] = useState<OrigPara[]>([])
  const [boy, setBoy] = useState<BoyPara[]>([])
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [origHighlights, setOrigHighlights] = useState<Highlight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api.passage(p).then((r) => {
      if (!alive) return
      setOrig(r.orig)
      setBoy(r.boy)
      setHighlights(r.highlights ?? [])
      setOrigHighlights(r.origHighlights ?? [])
      setLoading(false)
    })
    return () => { alive = false }
  }, [p])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  const n = Math.max(orig.length, boy.length)
  const pairs = Array.from({ length: n }, (_, i) => [orig[i], boy[i]] as const)

  return (
    <TooltipProvider delayDuration={150}>
      <Tabs defaultValue="both">
        <TabsList>
          <TabsTrigger value="both">文白对照</TabsTrigger>
          <TabsTrigger value="orig">原文</TabsTrigger>
          <TabsTrigger value="boy">柏杨白话</TabsTrigger>
        </TabsList>
        {(highlights.length > 0 || origHighlights.length > 0) && (
          <p className="mt-2 text-xs text-muted-foreground">
            🖍 黄色高亮为重点语句（原文 {origHighlights.length} 条 · 白话 {highlights.length} 条），悬停查看点评
          </p>
        )}
        <TabsContent value="both" className="space-y-6 mt-4">
          {pairs.map(([o, b], i) => (
            <div key={i} className="space-y-3">
              <div className="rounded-lg border border-primary/15 bg-card p-4">
                <div className="mb-2 text-xs font-medium text-primary/70">原文{o ? ` · 第 ${o.seq} 段` : ''}</div>
                {o ? <OrigParagraph segments={o.segments} highlights={origHighlights} /> : null}
              </div>
              <div className="rounded-lg bg-secondary/50 p-4">
                <div className="mb-2 text-xs font-medium text-muted-foreground">柏杨白话{b ? ` · 第 ${b.seq} 段` : ''}</div>
                {b ? <BoyParagraph p={{ ...b, by_year: null }} highlights={highlights} /> : null}
              </div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="orig" className="space-y-4 mt-4">
          {orig.map((o) => (
            <div key={o.seq} className="rounded-lg border border-primary/15 bg-card p-4">
              <OrigParagraph segments={o.segments} highlights={origHighlights} />
            </div>
          ))}
        </TabsContent>
        <TabsContent value="boy" className="space-y-4 mt-4">
          {boy.map((b) => (
            <div key={b.seq} className="rounded-lg bg-secondary/50 p-4">
              <BoyParagraph p={{ ...b, by_year: null }} highlights={highlights} />
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  )
}
