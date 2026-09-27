import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { HighlightText } from '@/components/HighlightText'
import type { Highlight, Segment } from '@/lib/api'

export function OrigParagraph({ segments, highlights = [] }: { segments: Segment[]; highlights?: Highlight[] }) {
  const [open, setOpen] = useState(false)
  const notes = segments.filter((s) => s.n)
  const text = segments.map((s) => s.t ?? '').join('')
  const noteOnly = text.trim() === ''

  return (
    <div className="tj-classic tj-orig">
      {!noteOnly && (
        <p className="whitespace-pre-wrap">
          <HighlightText text={text} highlights={highlights} />
        </p>
      )}
      {notes.length > 0 && (
        <div className={noteOnly ? '' : 'mt-1'}>
          {!noteOnly ? (
            <button
              onClick={() => setOpen(!open)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <span className="inline-block size-1.5 rounded-full bg-primary/60" />
              胡注 {notes.length} 条（{open ? '收起' : '展开'}）
            </button>
          ) : null}
          {(open || noteOnly) && (
            <div className="tj-note mt-1.5 space-y-2 rounded-md bg-muted/60 p-3">
              {notes.map((s, i) => (
                <p key={i} className="tj-classic">〔注〕{s.n}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function YearBadge({ year }: { year: number }) {
  return (
    <Badge variant="outline" className="font-classic border-primary/30 bg-primary/5 text-primary shrink-0">
      {year < 0 ? `公元前 ${-year}` : `公元 ${year}`} 年
    </Badge>
  )
}
