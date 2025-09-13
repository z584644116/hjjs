// 双模式存储：访客模式用 localStorage，登录模式用云端存储

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

// localStorage 适配器（访客模式）
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

// 云端存储适配器（登录模式）
class CloudStorageAdapter implements StorageAdapter {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/storage?userId=${this.userId}&key=${key}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.value || null;
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId, key, value })
      });
    } catch (error) {
      console.error('Cloud storage setItem failed:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await fetch(`/api/storage?userId=${this.userId}&key=${key}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Cloud storage removeItem failed:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await fetch('/api/storage/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: this.userId })
      });
    } catch (error) {
      console.error('Cloud storage clear failed:', error);
    }
  }
}

// 存储工厂函数：根据用户状态选择存储方式
export function createStorageAdapter(userId?: string): StorageAdapter {
  if (userId) {
    // 登录模式：使用云端存储
    return new CloudStorageAdapter(userId);
  } else {
    // 访客模式：使用 localStorage
    return new LocalStorageAdapter();
  }
}

// 默认存储实例（访客模式）
export const storage = new LocalStorageAdapter();
