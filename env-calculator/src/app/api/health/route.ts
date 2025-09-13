// 存储健康检查 API
import { NextResponse } from 'next/server';
import { checkStorageHealth } from '@/lib/storage';

export async function GET() {
  try {
    const healthStatus = await checkStorageHealth();
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 206 : 500;

    return NextResponse.json(healthStatus, { status: statusCode });
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
