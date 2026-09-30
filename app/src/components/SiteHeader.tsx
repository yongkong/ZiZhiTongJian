'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: '首页' },
  { to: '/lessons', label: '课程' },
  { to: '/read', label: '原文通读' },
  { to: '/boyang', label: '柏杨白话' },
  { to: '/review', label: '复习' },
]

function useTheme() {
  const [dark, setDark] = useState<boolean | null>(null)

  useEffect(() => {
    // 首帧主题已由 layout 内联脚本定好, 这里只同步状态
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  useEffect(() => {
    if (dark === null) return
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('tj-theme', dark ? 'dark' : 'light')
  }, [dark])

  return { dark, toggle: () => setDark((d) => !d) }
}

export function SiteHeader() {
  const pathname = usePathname()
  const { dark, toggle } = useTheme()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="tj-seal inline-flex size-7 items-center justify-center border border-primary/60 bg-primary/10 text-sm text-primary">
            鑑
          </span>
          <span className="font-classic text-lg font-bold tracking-wide">资治通鉴<span className="mx-1 text-primary">·</span>学堂</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((n) => {
            const active = n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)
            return (
              <Link
                key={n.to}
                href={n.to}
                className={cn('rounded-sm px-3 py-1.5 text-sm transition-colors',
                  active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:text-foreground')}
              >
                {n.label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  onClick={toggle}
                  aria-label={dark ? '切换到亮色模式' : '切换到暗黑模式'}
                >
                  {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{dark ? '亮色模式' : '暗黑模式'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  )
}
