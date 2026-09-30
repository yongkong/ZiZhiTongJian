'use client'

// 卷正文段落列表: 单个客户端边界包住整卷 (每段可独立展开胡注), 避免数百个独立 client 组件的载荷开销
import { OrigParagraph, YearBadge } from '@/components/OrigParagraph'
import type { OrigPara } from '@/lib/types'

export function OrigParagraphList({ paragraphs }: { paragraphs: OrigPara[] }) {
  return (
    <div className="space-y-5">
      {paragraphs.map((p) => {
        if (p.kind === 'title') return null
        return (
          <div key={p.seq} className="relative">
            {p.tj_year != null && (
              <div className="mb-2 flex items-center gap-2">
                <YearBadge year={p.tj_year} />
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <OrigParagraph segments={p.segments} />
          </div>
        )
      })}
    </div>
  )
}
