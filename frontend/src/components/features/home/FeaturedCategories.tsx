'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { Category } from '../../../types';
import { cn } from '../../../lib/utils';
import { Skeleton } from '../../ui/Skeleton';
import { motion } from 'framer-motion';
import { useNavigation } from '../../../hooks/useNavigation';

interface FeaturedCategoriesProps {
  categories: Category[];
  loading?: boolean;
}

const IconMap: Record<string, string> = {
  'Car': 'solar:wheel-bold-duotone',
  'Smartphone': 'solar:smartphone-bold-duotone',
  'Sofa': 'solar:sofa-bold-duotone',
  'Shirt': 'solar:t-shirt-bold-duotone',
  'Dumbbell': 'solar:dumbbell-bold-duotone',
  'Home': 'solar:home-smile-bold-duotone',
  'Briefcase': 'solar:case-bold-duotone',
  'Gift': 'solar:gift-bold-duotone',
  'Wrench': 'solar:wrench-bold-duotone',
  'Bike': 'solar:bicycle-bold-duotone',
  'Utensils': 'solar:chef-hat-bold-duotone',
  'Laptop': 'solar:laptop-bold-duotone',
  'Camera': 'solar:camera-bold-duotone',
  'Gamepad2': 'solar:gamepad-bold-duotone',
  'Ship': 'solar:sailboat-bold-duotone',
  'Headphones': 'solar:headphones-round-bold-duotone',
};

// Pastel color palette for category icons
const PASTEL_COLORS = [
  'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300',
  'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300',
  'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300',
  'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
  'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-300',
  'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300',
  'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',
];

export const FeaturedCategories: React.FC<FeaturedCategoriesProps> = ({ categories, loading }) => {
  const { navigate } = useNavigation();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-4 overflow-hidden justify-center">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-36 shrink-0 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  const topLevelCategories = categories.filter(c => !c.parentId);

  return (
    <section className="py-2">
      <div className="container mx-auto px-4">
        <div className="flex overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 snap-x snap-mandatory justify-center">
          <div className="flex gap-3">
            {topLevelCategories.map((cat, i) => {
              // Cycle through pastel colors based on index
              const colorClass = PASTEL_COLORS[i % PASTEL_COLORS.length];
              const iconName = IconMap[cat.icon] || 'solar:gift-bold-duotone';

              return (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  key={cat.id}
                  onClick={() => navigate(`/category/${cat.slug}`)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "snap-start shrink-0 flex items-center gap-3 pl-1.5 pr-6 py-1.5 rounded-full border transition-all duration-300",
                    "bg-gray-50 dark:bg-neutral-900 border-transparent hover:bg-white dark:hover:bg-neutral-800 hover:border-gray-200 dark:hover:border-neutral-700 hover:shadow",
                    "group"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
                    colorClass
                  )}>
                    <Icon icon={iconName} className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                    {cat.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
