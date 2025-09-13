// 服务器端存储适配器 - 仅在服务器端使用
import { promises as fs } from 'fs';
import path from 'path';
import type { StorageAdapter } from './storage';

// ClawCloud Run 持久化存储路径
const STORAGE_DIR = process.env.CLAW_STORAGE_PATH || '/app/data';
const BACKUP_DIR = process.env.CLAW_BACKUP_PATH || '/app/backups';


// 存储的标准记录类型
type StoredRecord = {
  key: string;
  value: string;
  timestamp: string;
  userId: string;
};

function hasErrnoCode(e: unknown): e is { code: string } {
  return typeof e === 'object' && e !== null && 'code' in e;
}

// ClawCloud Run 文件系统适配器（生产环境）
export class ClawCloudAdapter implements StorageAdapter {
  private userId: string;
  private userDir: string;

  constructor(userId: string = 'anonymous') {
    this.userId = userId;
    this.userDir = path.join(STORAGE_DIR, userId);
  }

  private async ensureUserDir(): Promise<void> {
    try {
      await fs.mkdir(this.userDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create user directory:', error);
    }
  }

  private getFilePath(key: string): string {
    // 安全的文件名处理
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.userDir, `${safeKey}.json`);
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const filePath = this.getFilePath(key);
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data) as Partial<StoredRecord>;
      return parsed.value ?? null;
    } catch (error) {
      if (!hasErrnoCode(error) || error.code !== 'ENOENT') {
        console.error('ClawCloud getItem error:', error);
      }
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.ensureUserDir();
      const filePath = this.getFilePath(key);
      const data = {
        key,
        value,
        timestamp: new Date().toISOString(),
        userId: this.userId
      };
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));

      // 创建备份
      await this.createBackup(key, data);
    } catch (error) {
      console.error('ClawCloud setItem error:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
    } catch (error) {
      if (!hasErrnoCode(error) || error.code !== 'ENOENT') {
        console.error('ClawCloud removeItem error:', error);
      }
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.userDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.userDir, file)))
      );
    } catch (error) {
      console.error('ClawCloud clear error:', error);
    }
  }

  private async createBackup(key: string, data: StoredRecord): Promise<void> {
    try {
      const backupDir = path.join(BACKUP_DIR, this.userId);
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `${key}_${timestamp}.json`);
      await fs.writeFile(backupFile, JSON.stringify(data, null, 2));

      // 保留最近10个备份
      await this.cleanupBackups(backupDir, key);
    } catch (error) {
      console.warn('Backup creation failed:', error);
    }
  }

  private async cleanupBackups(backupDir: string, key: string): Promise<void> {
    try {
      const files = await fs.readdir(backupDir);
      const keyBackups = files
        .filter(file => file.startsWith(`${key}_`))
        .sort()
        .reverse();

      if (keyBackups.length > 10) {
        const filesToDelete = keyBackups.slice(10);
        await Promise.all(
          filesToDelete.map(file =>
            fs.unlink(path.join(backupDir, file)).catch(() => {})
          )
        );
      }
    } catch (error) {
      console.warn('Backup cleanup failed:', error);
    }
  }
}