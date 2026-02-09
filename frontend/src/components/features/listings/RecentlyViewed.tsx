import React from 'react';
import { useRecentlyViewed } from '../../../hooks/useRecentlyViewed';
import Link from 'next/link';
import { formatCurrency } from '../../../lib/utils';
import { Button } from '../../ui/Button';
import { Clock } from 'lucide-react';

export const RecentlyViewed: React.FC = () => {
  const { recentItems, clearRecentlyViewed } = useRecentlyViewed();

  if (recentItems.length === 0) return null;

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-app-color shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" /> Recently Viewed
            </h2>
            <Button variant="ghost" size="sm" onClick={clearRecentlyViewed} className="text-gray-500 hover:text-red-500">
              Clear
            </Button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
            {recentItems.map((item) => (
              <Link
                key={item.id}
                href={`/listing/${item.id}`}
                className="snap-start shrink-0 w-36 sm:w-44 group"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-neutral-800 border border-app-color mb-2 relative">
                  <img
                    src={item.image || 'https://via.placeholder.com/150'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 rounded">
                    {item.condition}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</h3>
                <p className="text-sm font-bold text-primary-600 dark:text-primary-400">{formatCurrency(item.price)}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};