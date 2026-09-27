import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth'

export function Login() {
  const { user, login, register } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      await (mode === 'login' ? login : register)(name.trim(), password)
      const from = (loc.state as { from?: string } | null)?.from ?? '/'
      nav(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-classic text-2xl">资治通鉴 · 学堂</CardTitle>
          <CardDescription>注册/登录只用于保存学习进度 —— 内容全部免费开放</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Tabs value={mode} onValueChange={(v) => { setMode(v as 'login' | 'register'); setError('') }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">登录</TabsTrigger>
                <TabsTrigger value="register">注册</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="用户名"
              autoComplete="username"
              maxLength={30}
              required
            />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? '密码（至少 6 位）' : '密码'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy || !name || !password} className="w-full">
              {busy ? '请稍候…' : mode === 'login' ? '登录' : '注册并开始学习'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            不注册也可以
            <Link to="/" className="mx-1 text-primary underline underline-offset-4">随便逛逛、免费试学</Link>
            ，进度只在登录后保存。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
