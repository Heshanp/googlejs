import { CategoryTree, Category } from '../types';
import { CATEGORIES, CATEGORY_TREE } from '../data/categories';

export const CategoriesService = {
  async getCategories() {
    // Return static categories data
    return {
      data: {
        data: CATEGORY_TREE
      }
    };
  },

  async getCategoryBySlug(slug: string) {
    const category = CATEGORIES.find(c => c.slug === slug);
    if (!category) {
      throw new Error('Category not found');
    }
    return {
      data: {
        data: category
      }
    };
  },

  async getFlattenedCategories() {
    return {
      data: {
        data: CATEGORIES
      }
    };
  }
};
