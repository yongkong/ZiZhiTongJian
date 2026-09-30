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

function Brand() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap">
      <span className="tj-seal inline-flex size-7 items-center justify-center border border-primary/60 bg-primary/10 text-sm text-primary">
        鑑
      </span>
      <span className="font-classic text-lg font-bold tracking-wide">资治通鉴<span className="mx-1 text-primary">·</span>学堂</span>
    </Link>
  )
}

function ThemeToggle({ dark, toggle }: { dark: boolean | null; toggle: () => void }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={toggle}
            aria-label={dark ? '切换到亮色模式' : '切换到暗黑模式'}
          >
            {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{dark ? '亮色模式' : '暗黑模式'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const { dark, toggle } = useTheme()

  const navLinks = (extra?: string) =>
    NAV.map((n) => {
      const active = n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)
      return (
        <Link
          key={n.to}
          href={n.to}
          className={cn('whitespace-nowrap rounded-sm px-3 py-1.5 text-sm transition-colors',
            active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:text-foreground', extra)}
        >
          {n.label}
        </Link>
      )
    })

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95">
      {/* 桌面端: 单行布局 */}
      <div className="mx-auto hidden h-14 max-w-6xl items-center gap-6 px-4 md:flex">
        <Brand />
        <nav className="flex items-center gap-1">{navLinks()}</nav>
        <div className="ml-auto">
          <ThemeToggle dark={dark} toggle={toggle} />
        </div>
      </div>
      {/* 移动端: 品牌行 + 可横向滑动的导航行, 避免 CJK 文本挤压换行 */}
      <div className="md:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Brand />
          <ThemeToggle dark={dark} toggle={toggle} />
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 pb-2">
          {navLinks('shrink-0')}
        </nav>
      </div>
    </header>
  )
}
