// 清除用户所有数据（优先使用 Supabase；未配置时删除本地文件）
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const DATA_DIR = '/app/data';

// POST /api/storage/clear
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('user_settings')
        .delete()
        .eq('user_id', userId);
      if (error) {
        console.error('Supabase CLEAR error:', error);
        return NextResponse.json({ error: 'Storage operation failed' }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');

    try {
      const files = await fs.readdir(DATA_DIR);
      const userFiles = files.filter(file => file.startsWith(`${safeUserId}_`));

      await Promise.all(
        userFiles.map(file => fs.unlink(path.join(DATA_DIR, file)))
      );
    } catch {
      // 目录不存在或没有文件也算成功
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Storage CLEAR error:', error);
    return NextResponse.json({ error: 'Storage operation failed' }, { status: 500 });
  }
}
