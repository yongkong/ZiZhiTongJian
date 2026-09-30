import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="font-classic text-6xl font-bold text-primary">四〇四</p>
      <p className="tj-classic mt-4 text-muted-foreground">此页不在二百九十四卷之中。</p>
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild variant="outline"><Link href="/">回首页</Link></Button>
        <Button asChild variant="outline"><Link href="/read">去通读</Link></Button>
      </div>
    </div>
  )
}
