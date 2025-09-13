// 简化的存储 API 路由
import { NextResponse } from 'next/server';

// 简单的健康检查，不依赖复杂存储
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Storage API is working',
    timestamp: new Date().toISOString()
  });
}
