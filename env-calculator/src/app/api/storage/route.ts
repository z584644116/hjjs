// 云端存储 API 路由
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = '/app/data';

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create data directory:', error);
  }
}

// 获取用户数据文件路径
function getUserDataPath(userId: string, key: string): string {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${safeUserId}_${safeKey}.json`);
}

// GET /api/storage?userId=xxx&key=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const key = searchParams.get('key');

    if (!userId || !key) {
      return NextResponse.json({ error: 'Missing userId or key' }, { status: 400 });
    }

    await ensureDataDir();
    const filePath = getUserDataPath(userId, key);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      return NextResponse.json({ value: parsed.value });
    } catch {
      return NextResponse.json({ value: null });
    }
  } catch (error) {
    console.error('Storage GET error:', error);
    return NextResponse.json({ error: 'Storage operation failed' }, { status: 500 });
  }
}

// POST /api/storage
export async function POST(request: NextRequest) {
  try {
    const { userId, key, value } = await request.json();

    if (!userId || !key || value === undefined) {
      return NextResponse.json({ error: 'Missing userId, key, or value' }, { status: 400 });
    }

    await ensureDataDir();
    const filePath = getUserDataPath(userId, key);
    const data = {
      userId,
      key,
      value,
      timestamp: new Date().toISOString()
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Storage POST error:', error);
    return NextResponse.json({ error: 'Storage operation failed' }, { status: 500 });
  }
}

// DELETE /api/storage?userId=xxx&key=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const key = searchParams.get('key');

    if (!userId || !key) {
      return NextResponse.json({ error: 'Missing userId or key' }, { status: 400 });
    }

    const filePath = getUserDataPath(userId, key);
    try {
      await fs.unlink(filePath);
    } catch {
      // 文件不存在也算成功
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Storage DELETE error:', error);
    return NextResponse.json({ error: 'Storage operation failed' }, { status: 500 });
  }
}
