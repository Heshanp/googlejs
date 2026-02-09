import React, { useState, useEffect } from 'react';
import { CATEGORIES, getCategoryBySlug } from '../../../data/categories';
import { Category } from '../../../types';
import { Search, Check } from 'lucide-react';
import { Input } from '../../ui/Input';
import { cn } from '../../../lib/utils';
import * as Icons from 'lucide-react';

interface CategorySelectorProps {
  value?: string;
  onChange: (categoryId: string) => void;
  error?: string;
}

/**
 * Simplified CategorySelector - flat grid of 10 categories
 * AI auto-assigns category, user can easily confirm or adjust
 */
export const CategorySelector: React.FC<CategorySelectorProps> = ({ value, onChange, error }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const getIcon = (name: string) => {
    const Icon = (Icons as any)[name] || Icons.Package;
    return <Icon className="w-5 h-5" />;
  };

  // Filter categories by search term
  const filteredCategories = searchTerm
    ? CATEGORIES.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : CATEGORIES;

  // Get selected category name for display
  const selectedCategory = value ? getCategoryBySlug(value) || CATEGORIES.find(c => c.id === value) : null;

  return (
    <div className="space-y-4">
      {/* Selected category indicator */}
      {selectedCategory && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center text-primary-600 dark:text-primary-400">
            {getIcon(selectedCategory.icon)}
          </div>
          <div>
            <p className="text-sm font-medium text-primary-900 dark:text-primary-100">
              {selectedCategory.name}
            </p>
            <p className="text-xs text-primary-600 dark:text-primary-400">
              Selected category • Click below to change
            </p>
          </div>
        </div>
      )}

      {/* Search (optional, since we only have 10 categories) */}
      <Input
        leftIcon={<Search className="w-4 h-4" />}
        placeholder="Filter categories..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="bg-white dark:bg-neutral-800"
      />

      {/* Simple grid - all 10 categories visible at once */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {filteredCategories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all hover:shadow-sm",
              value === cat.id || value === cat.slug
                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500"
                : "border-app-color bg-white dark:bg-neutral-800 hover:border-primary-300"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              value === cat.id || value === cat.slug
                ? "bg-primary-100 dark:bg-primary-900/40 text-primary-600"
                : "bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-300"
            )}>
              {getIcon(cat.icon)}
            </div>
            <span className="font-medium text-xs text-center text-gray-900 dark:text-gray-100 line-clamp-2">
              {cat.name}
            </span>
            {(value === cat.id || value === cat.slug) && (
              <Check className="w-4 h-4 text-primary-500 absolute top-2 right-2" />
            )}
          </button>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-4">
          No categories match "{searchTerm}"
        </p>
      )}

      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};