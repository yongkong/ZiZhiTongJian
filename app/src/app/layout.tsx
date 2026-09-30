import type { Metadata } from 'next'
import './globals.css'
import { SiteHeader } from '@/components/SiteHeader'

export const metadata: Metadata = {
  title: {
    default: '资治通鉴 · 学堂',
    template: '%s · 资治通鉴学堂',
  },
  description:
    '鉴前世之兴衰，考当今之得失——294 卷原文通读、柏杨白话对照与 48 课精讲的免费学习站。',
  icons: { icon: '/favicon.svg' },
}

// 首帧前定主题, 避免闪烁; 与 SiteHeader 的切换共用 tj-theme 键
const themeInit = `(() => {try{const s=localStorage.getItem('tj-theme');const d=s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="px-4 pb-8 pt-2">
          <div className="tj-banzhu mx-auto max-w-3xl">
            胡三省音注本 · 柏杨白话版 · 个人学习用途
          </div>
        </footer>
      </body>
    </html>
  )
}
