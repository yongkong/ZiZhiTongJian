import { HighlightText } from '@/components/HighlightText'
import type { BoyPara, Highlight } from '@/lib/api'

export function BoyParagraph({ p, highlights = [] }: { p: BoyPara; highlights?: Highlight[] }) {
  const body = <HighlightText text={p.text} highlights={highlights} />
  switch (p.kind) {
    case 'year':
      return (
        <h3 className="font-classic mt-8 mb-3 border-b border-border pb-2 text-lg font-semibold tracking-wide first:mt-0">
          {p.text}
        </h3>
      )
    case 'ruler':
      return <p className="text-sm text-muted-foreground">{p.text}</p>
    case 'sima_mark':
      return <p className="font-classic mt-4 font-semibold text-primary">司马光曰：</p>
    case 'boyang_mark':
      return <p className="font-classic mt-4 font-semibold text-amber-700 dark:text-amber-500">柏杨曰：</p>
    case 'sima':
      return <p className="tj-classic tj-boy tj-sima">{body}</p>
    case 'boyang':
      return <p className="tj-classic tj-boy tj-boyang">{body}</p>
    case 'image':
      return (
        <figure className="my-6">
          <img
            src={`/boyang-img/${p.file}`}
            alt={p.text}
            loading="lazy"
            className="mx-auto max-w-full rounded-lg border bg-card"
          />
          {p.text && (
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">{p.text}</figcaption>
          )}
        </figure>
      )
    default:
      return <p className="tj-classic tj-boy">{body}</p>
  }
}
