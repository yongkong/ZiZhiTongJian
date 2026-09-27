import { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Highlight } from '@/lib/api'

/**
 * 把 text 中所有 highlights.pattern 命中的片段包成黄色 <mark>。
 * pattern 之间的重叠取最先命中的; 全部逐字匹配库内原文, 无正则。
 */
export function HighlightText({ text, highlights }: { text: string; highlights: Highlight[] }) {
  const parts = useMemo(() => {
    if (!highlights.length) return [{ s: text, hl: null as Highlight | null }]
    const marks: Array<{ start: number; end: number; hl: Highlight }> = []
    for (const hl of highlights) {
      let from = 0
      for (;;) {
        const i = text.indexOf(hl.pattern, from)
        if (i === -1) break
        const overlapping = marks.some((m) => i < m.end && m.start < i + hl.pattern.length)
        if (!overlapping) marks.push({ start: i, end: i + hl.pattern.length, hl })
        from = i + 1
      }
    }
    if (!marks.length) return [{ s: text, hl: null }]
    marks.sort((a, b) => a.start - b.start)
    const out: Array<{ s: string; hl: Highlight | null }> = []
    let pos = 0
    for (const m of marks) {
      if (m.start < pos) continue // 理论上不会发生(已排重叠), 防御
      if (m.start > pos) out.push({ s: text.slice(pos, m.start), hl: null })
      out.push({ s: text.slice(m.start, m.end), hl: m.hl })
      pos = m.end
    }
    if (pos < text.length) out.push({ s: text.slice(pos), hl: null })
    return out
  }, [text, highlights])

  if (!highlights.length) return <>{text}</>

  return (
    <TooltipProvider delayDuration={150}>
      {parts.map((p, i) =>
        p.hl ? (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <mark className="rounded-sm bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-400/30">
                {p.s}
              </mark>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-72 font-classic text-xs leading-6">
              {p.hl.note}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span key={i}>{p.s}</span>
        ),
      )}
    </TooltipProvider>
  )
}
