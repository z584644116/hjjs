import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/constants';

interface FavoritesState {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  clearFavorites: () => void;
}

/**
 * 工具收藏 store — 纯客户端,localStorage 持久化。
 * 数据结构是 `navigation.ts` 中 `CalculatorNavItem.id` 的数组。
 */
export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      isFavorite: (id) => get().favorites.includes(id),
      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((x) => x !== id)
            : [...state.favorites, id],
        })),
      addFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites
            : [...state.favorites, id],
        })),
      removeFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.filter((x) => x !== id),
        })),
      clearFavorites: () => set({ favorites: [] }),
    }),
    {
      name: STORAGE_KEYS.FAVORITES,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
