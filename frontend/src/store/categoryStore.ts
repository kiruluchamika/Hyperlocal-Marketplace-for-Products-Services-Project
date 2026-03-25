import { create } from 'zustand';
import { ICategory } from '@/types';
import { categoriesApi } from '@/api/categories';

interface CategoryState {
  categories: ICategory[];
  productCategories: ICategory[];
  serviceCategories: ICategory[];
  isLoading: boolean;
  fetchCategories: () => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  productCategories: [],
  serviceCategories: [],
  isLoading: false,

  fetchCategories: async () => {
    set({ isLoading: true });
    try {
      const { data } = await categoriesApi.getAll({ isActive: true, limit: 100 });
      const categories = data.data || [];
      set({
        categories,
        productCategories: categories.filter((c) => c.type === 'PRODUCT'),
        serviceCategories: categories.filter((c) => c.type === 'SERVICE'),
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));
