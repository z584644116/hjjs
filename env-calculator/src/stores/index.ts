import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { User, AuthMode } from '@/types';
import { STORAGE_KEYS } from '@/constants';

interface AuthStore {
  authMode: AuthMode;
  currentUser: User | null;
  isAuthenticated: boolean;
  
  // Actions
  setAuthMode: (mode: AuthMode) => void;
  login: (user: User) => void;
  logout: () => void;
  register: (username: string, password: string) => Promise<{ user: User; recoveryKey: string }>;
}



export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      authMode: 'guest' as AuthMode,
      currentUser: null,
      isAuthenticated: false,
      
      setAuthMode: (mode) => {
        set({ authMode: mode });
        if (mode === 'guest') {
          set({ currentUser: null, isAuthenticated: false });
        }
      },
      
      login: (user) => {
        set({ currentUser: user, isAuthenticated: true });
      },
      
      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },
      
      register: async (username, password) => {
        // 生成唯一恢复密钥
        const recoveryKey = uuidv4();
        
        const user: User = {
          id: uuidv4(),
          username,
          createdAt: new Date().toISOString(),
        };
        
        // 在实际应用中，这里应该调用后端API
        // 目前先存储在localStorage中
        const userData = { ...user, password, recoveryKey };
        localStorage.setItem(`${STORAGE_KEYS.USER_DATA}_${username}`, JSON.stringify(userData));
        
        return { user, recoveryKey };
      },
    }),
    {
      name: STORAGE_KEYS.CURRENT_USER,
    }
  )
);

