// 清除用户所有数据（默认关闭，仅在显式开启且携带服务端令牌时可访问）
import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const STORAGE_API_ENABLED = process.env.ENABLE_STORAGE_API === 'true';
const STORAGE_API_TOKEN = process.env.STORAGE_API_TOKEN;
const SAFE_IDENTIFIER = /^[a-zA-Z0-9_-]{1,64}$/;

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function ensureStorageApiEnabled() {
  if (!STORAGE_API_ENABLED) {
    return jsonResponse({ error: 'Not found' }, 404);
  }

  if (!STORAGE_API_TOKEN) {
    return jsonResponse({ error: 'Storage API is not configured securely' }, 503);
  }

  if (!isSupabaseConfigured() || !supabase) {
    return jsonResponse({ error: 'Storage backend is unavailable' }, 503);
  }

  return null;
}

function extractToken(request: NextRequest) {
  const bearerToken = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  return request.headers.get('x-storage-api-token') ?? bearerToken ?? null;
}

function ensureAuthorized(request: NextRequest) {
  const token = extractToken(request);

  if (!token || token !== STORAGE_API_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  return null;
}

// POST /api/storage/clear
export async function POST(request: NextRequest) {
  try {
    const availabilityError = ensureStorageApiEnabled();
    if (availabilityError) {
      return availabilityError;
    }

    const authorizationError = ensureAuthorized(request);
    if (authorizationError) {
      return authorizationError;
    }

    const { userId } = await request.json();

    if (!userId || !SAFE_IDENTIFIER.test(userId)) {
      return jsonResponse({ error: 'Invalid userId' }, 400);
    }

    const { error } = await supabase!
      .from('user_settings')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase CLEAR error:', error.message);
      return jsonResponse({ error: 'Storage operation failed' }, 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Storage CLEAR error:', error);
    return jsonResponse({ error: 'Storage operation failed' }, 500);
  }
}