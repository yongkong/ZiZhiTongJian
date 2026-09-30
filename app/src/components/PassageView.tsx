'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BoyParagraph } from '@/components/BoyParagraph'
import { OrigParagraph } from '@/components/OrigParagraph'
import type { PassageBlock } from '@/lib/types'

/** 文白对照: 段落与批注在构建期已烘焙进 block, 此处纯展示 */
export function PassageView({ block: b }: { block: PassageBlock }) {
  const { paras: orig } = b.orig
  const { paras: boy } = b.boy
  const { highlights, origHighlights } = b

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
            藤黄标记为重点语句（原文 {origHighlights.length} 处 · 白话 {highlights.length} 处），悬停可看批语
          </p>
        )}
        <TabsContent value="both" className="space-y-6 mt-4">
          {pairs.map(([o, b2], i) => (
            <div key={i} className="space-y-3">
              <div className="border border-rule-strong/45 bg-card p-4">
                <div className="mb-2 font-classic text-xs font-medium text-primary/80">原文{o ? ` · 第 ${o.seq} 段` : ''}</div>
                {o ? <OrigParagraph segments={o.segments} highlights={origHighlights} /> : null}
              </div>
              <div className="bg-secondary/50 p-4">
                <div className="mb-2 text-xs font-medium text-muted-foreground">柏杨白话{b2 ? ` · 第 ${b2.seq} 段` : ''}</div>
                {b2 ? <BoyParagraph p={{ ...b2, by_year: null }} highlights={highlights} /> : null}
              </div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="orig" className="space-y-4 mt-4">
          {orig.map((o) => (
            <div key={o.seq} className="border border-rule-strong/45 bg-card p-4">
              <OrigParagraph segments={o.segments} highlights={origHighlights} />
            </div>
          ))}
        </TabsContent>
        <TabsContent value="boy" className="space-y-4 mt-4">
          {boy.map((p) => (
            <div key={p.seq} className="rounded-lg bg-secondary/50 p-4">
              <BoyParagraph p={{ ...p, by_year: null }} highlights={highlights} />
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  )
}
