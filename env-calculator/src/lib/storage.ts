// 统一存储接口 - 支持本地开发和 ClawCloud Run 部署

// 环境配置
const isProduction = process.env.NODE_ENV === 'production';
const isServer = typeof window === 'undefined';
const isClawCloud = process.env.CLAW_CLOUD_RUN === 'true';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

// localStorage 适配器（开发环境 + 备用方案）
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

// 混合存储适配器（自动降级）
class HybridAdapter implements StorageAdapter {
  private primary: StorageAdapter;
  private fallback: StorageAdapter;

  constructor(primary: StorageAdapter, fallback: StorageAdapter) {
    this.primary = primary;
    this.fallback = fallback;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const value = await this.primary.getItem(key);
      return value;
    } catch (error) {
      console.warn('Primary storage failed, using fallback:', error);
      return await this.fallback.getItem(key);
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.primary.setItem(key, value);
      // 同时保存到备用存储
      await this.fallback.setItem(key, value);
    } catch (error) {
      console.warn('Primary storage failed, using fallback only:', error);
      await this.fallback.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.primary.removeItem(key);
      await this.fallback.removeItem(key);
    } catch (error) {
      console.warn('Primary storage failed:', error);
      await this.fallback.removeItem(key);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.primary.clear();
      await this.fallback.clear();
    } catch (error) {
      console.warn('Primary storage failed:', error);
      await this.fallback.clear();
    }
  }
}

// 存储工厂函数
export async function createStorageAdapter(userId?: string): Promise<StorageAdapter> {
  const localStorage = new LocalStorageAdapter();

  // ClawCloud Run 生产环境
  if (isClawCloud && isProduction && isServer) {
    try {
      const { ClawCloudAdapter } = await import('./storage-server');
      const clawStorage = new ClawCloudAdapter(userId);
      return new HybridAdapter(clawStorage, localStorage);
    } catch (error) {
      console.warn('Failed to load ClawCloud adapter, using localStorage:', error);
      return localStorage;
    }
  }

  // 开发环境使用 localStorage
  return localStorage;
}

// 服务器端存储适配器（用于 API 路由）
export async function createServerStorageAdapter(userId?: string): Promise<StorageAdapter> {
  if (isClawCloud && isServer) {
    try {
      const { ClawCloudAdapter } = await import('./storage-server');
      return new ClawCloudAdapter(userId);
    } catch (error) {
      console.warn('Failed to load ClawCloud adapter:', error);
    }
  }

  // 开发环境模拟
  return new LocalStorageAdapter();
}

// 默认存储实例 - 使用同步版本进行向后兼容
export const storage = new LocalStorageAdapter();

// 获取适当的存储实例（异步）
export async function getStorageAdapter(userId?: string): Promise<StorageAdapter> {
  return await createStorageAdapter(userId);
}

// 存储健康检查
export async function checkStorageHealth(userId?: string): Promise<{
  status: 'healthy' | 'degraded' | 'failed';
  details: Record<string, any>;
}> {
  const testKey = '__health_check__';
  const testValue = Date.now().toString();

  try {
    const storageAdapter = await getStorageAdapter(userId);
    await storageAdapter.setItem(testKey, testValue);
    const retrieved = await storageAdapter.getItem(testKey);
    await storageAdapter.removeItem(testKey);

    const isHealthy = retrieved === testValue;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      details: {
        timestamp: new Date().toISOString(),
        environment: {
          isProduction,
          isServer,
          isClawCloud,
        },
        test: {
          write: true,
          read: isHealthy,
          delete: true
        }
      }
    };
  } catch (error) {
    return {
      status: 'failed',
      details: {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        environment: {
          isProduction,
          isServer,
          isClawCloud
        }
      }
    };
  }
}
