// ClawCloud Run 存储 API 路由
import { NextRequest, NextResponse } from 'next/server';
import { createServerStorageAdapter } from '@/lib/storage';

// GET /api/storage?key=xxx&userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const userId = searchParams.get('userId') || 'anonymous';

    if (!key) {
      return NextResponse.json(
        { error: 'Missing key parameter' },
        { status: 400 }
      );
    }

    const storage = await createServerStorageAdapter(userId);
    const value = await storage.getItem(key);

    return NextResponse.json({
      success: true,
      data: { key, value },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Storage GET error:', error);
    return NextResponse.json(
      { 
        error: 'Storage operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/storage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, userId = 'anonymous' } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing key or value' },
        { status: 400 }
      );
    }

    const storage = await createServerStorageAdapter(userId);
    await storage.setItem(key, value);

    return NextResponse.json({
      success: true,
      data: { key, stored: true },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Storage POST error:', error);
    return NextResponse.json(
      { 
        error: 'Storage operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/storage?key=xxx&userId=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const userId = searchParams.get('userId') || 'anonymous';

    if (!key) {
      return NextResponse.json(
        { error: 'Missing key parameter' },
        { status: 400 }
      );
    }

    const storage = await createServerStorageAdapter(userId);
    await storage.removeItem(key);

    return NextResponse.json({
      success: true,
      data: { key, deleted: true },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Storage DELETE error:', error);
    return NextResponse.json(
      { 
        error: 'Storage operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/storage/clear
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 'anonymous' } = body;

    const storage = await createServerStorageAdapter(userId);
    await storage.clear();

    return NextResponse.json({
      success: true,
      data: { cleared: true },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Storage CLEAR error:', error);
    return NextResponse.json(
      { 
        error: 'Storage operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
