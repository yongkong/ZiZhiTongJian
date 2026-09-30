'use client'

// 柏杨章节段落列表: 单个客户端边界 (批注悬停 tooltip 在内)
import { BoyParagraph } from '@/components/BoyParagraph'
import type { BoyPara, Highlight } from '@/lib/types'

export function BoyParagraphList({ paragraphs, highlights }: { paragraphs: BoyPara[]; highlights: Highlight[] }) {
  return (
    <div className="space-y-3">
      {paragraphs.map((p) => <BoyParagraph key={p.seq} p={p} highlights={highlights} />)}
    </div>
  )
}
