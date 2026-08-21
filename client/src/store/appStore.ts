import { create } from 'zustand';

interface AppState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  currentSeason: string;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSeason: (season: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: (localStorage.getItem('tm-theme') as 'light' | 'dark') || 'light',
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  currentSeason: '2026',
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('tm-theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      return { theme: newTheme };
    }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSeason: (season) => set({ currentSeason: season }),
}));
