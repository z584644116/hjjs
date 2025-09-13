// 健康检查 API（默认浅检查 200，?deep=true 进行存储读写自检）
import { NextRequest, NextResponse } from 'next/server';
import { checkStorageHealth } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deep = searchParams.get('deep');

    if (deep === '1' || deep === 'true') {
      const healthStatus = await checkStorageHealth();
      const statusCode = healthStatus.status === 'failed' ? 500 : 200;
      return NextResponse.json(healthStatus, { status: statusCode });
    }

    // 浅检查：仅表明服务已启动
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'failed',
        details: {
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Health check failed'
        }
      },
      { status: 500 }
    );
  }
}
