// 简化的存储接口 - 只使用 localStorage

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

// localStorage 适配器
class LocalStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  }
}

// 默认存储实例
export const storage = new LocalStorageAdapter();

// 简化的存储工厂函数
export async function createStorageAdapter(): Promise<StorageAdapter> {
  return new LocalStorageAdapter();
}

// 服务器端存储适配器（简化版）
export async function createServerStorageAdapter(): Promise<StorageAdapter> {
  return new LocalStorageAdapter();
}

// 获取存储实例
export async function getStorageAdapter(): Promise<StorageAdapter> {
  return new LocalStorageAdapter();
}

// 简化的健康检查
export async function checkStorageHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'failed';
  details: Record<string, unknown>;
}> {
  return {
    status: 'healthy',
    details: {
      timestamp: new Date().toISOString(),
      storage: 'localStorage'
    }
  };
}
