import { create } from 'zustand';

interface UIState {
  isMobileMenuOpen: boolean;
  searchQuery: string;
  selectedCity: string;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedCity: (city: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileMenuOpen: false,
  searchQuery: '',
  selectedCity: '',

  toggleMobileMenu: () =>
    set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

  closeMobileMenu: () =>
    set({ isMobileMenuOpen: false }),

  setSearchQuery: (query) =>
    set({ searchQuery: query }),

  setSelectedCity: (city) =>
    set({ selectedCity: city }),
}));
