// 云端存储 API 路由（默认关闭，仅在显式开启且携带服务端令牌时可访问）
import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const STORAGE_API_ENABLED = process.env.ENABLE_STORAGE_API === 'true';
const STORAGE_API_TOKEN = process.env.STORAGE_API_TOKEN;
const SAFE_IDENTIFIER = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_VALUE_BYTES = 32 * 1024;

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

function isSafeIdentifier(value: string | null) {
  return Boolean(value && SAFE_IDENTIFIER.test(value));
}

function validateStorageKey(userId: string | null, key: string | null) {
  if (!isSafeIdentifier(userId) || !isSafeIdentifier(key)) {
    return jsonResponse({ error: 'Invalid userId or key' }, 400);
  }

  return null;
}

function validateStoredValue(value: unknown) {
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    return jsonResponse({ error: 'Invalid value' }, 400);
  }

  const size = new TextEncoder().encode(serialized).length;
  if (size > MAX_VALUE_BYTES) {
    return jsonResponse({ error: 'Value is too large' }, 413);
  }

  return null;
}

// GET /api/storage?userId=xxx&key=xxx
export async function GET(request: NextRequest) {
  try {
    const availabilityError = ensureStorageApiEnabled();
    if (availabilityError) {
      return availabilityError;
    }

    const authorizationError = ensureAuthorized(request);
    if (authorizationError) {
      return authorizationError;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const key = searchParams.get('key');

    const validationError = validateStorageKey(userId, key);
    if (validationError) {
      return validationError;
    }

    const { data, error } = await supabase!
      .from('user_settings')
      .select('value')
      .eq('user_id', userId!)
      .eq('key', key!)
      .maybeSingle();

    if (error) {
      console.error('Supabase GET error:', error.message);
      return jsonResponse({ error: 'Storage operation failed' }, 500);
    }

    return jsonResponse({ value: data?.value ?? null });
  } catch (error) {
    console.error('Storage GET error:', error);
    return jsonResponse({ error: 'Storage operation failed' }, 500);
  }
}

// POST /api/storage
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

    const { userId, key, value } = await request.json();

    const validationError = validateStorageKey(userId, key);
    if (validationError) {
      return validationError;
    }

    const valueError = validateStoredValue(value);
    if (valueError) {
      return valueError;
    }

    const { error } = await supabase!
      .from('user_settings')
      .upsert({ user_id: userId, key, value }, { onConflict: 'user_id,key' });

    if (error) {
      console.error('Supabase POST error:', error.message);
      return jsonResponse({ error: 'Storage operation failed' }, 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Storage POST error:', error);
    return jsonResponse({ error: 'Storage operation failed' }, 500);
  }
}

// DELETE /api/storage?userId=xxx&key=xxx
export async function DELETE(request: NextRequest) {
  try {
    const availabilityError = ensureStorageApiEnabled();
    if (availabilityError) {
      return availabilityError;
    }

    const authorizationError = ensureAuthorized(request);
    if (authorizationError) {
      return authorizationError;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const key = searchParams.get('key');

    const validationError = validateStorageKey(userId, key);
    if (validationError) {
      return validationError;
    }

    const { error } = await supabase!
      .from('user_settings')
      .delete()
      .eq('user_id', userId!)
      .eq('key', key!);

    if (error) {
      console.error('Supabase DELETE error:', error.message);
      return jsonResponse({ error: 'Storage operation failed' }, 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Storage DELETE error:', error);
    return jsonResponse({ error: 'Storage operation failed' }, 500);
  }
}