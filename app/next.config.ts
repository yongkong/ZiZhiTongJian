import type { NextConfig } from 'next'

// 纯内容静态站: 构建期从 content/ 读数据, 全量预渲染, out/ 可部署到任意静态托管 (Cloudflare Pages 等)
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
}

export default nextConfig
