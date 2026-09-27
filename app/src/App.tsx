import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { LogOut, Moon, Sun } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: '仪表盘' },
  { to: '/lessons', label: '课程' },
  { to: '/read', label: '原文通读' },
  { to: '/boyang', label: '柏杨白话' },
  { to: '/review', label: '复习' },
]

function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('tj-theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('tj-theme', dark ? 'dark' : 'light')
  }, [dark])

  return { dark, toggle: () => setDark((d) => !d) }
}

export default function App() {
  const { dark, toggle } = useTheme()
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <NavLink to="/" className="font-classic text-lg font-bold tracking-wide">
            资治通鉴<span className="mx-1 text-primary">·</span>学堂
          </NavLink>
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                className={({ isActive }) =>
                  cn('rounded-md px-3 py-1.5 text-sm transition-colors',
                    isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:text-foreground')
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground">{user.name}</span>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9"
                        onClick={() => logout()}
                        aria-label="退出登录"
                      >
                        <LogOut className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">退出登录</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link to="/login">登录 / 注册</Link>
              </Button>
            )}
          </div>
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
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        底本：胡三省音注《资治通鉴》 · 柏杨白话版（全 72 册） —— 个人学习用途
      </footer>
      <Toaster position="top-center" />
    </div>
  )
}
