'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CategoriesService } from '../../services';
import { CategoryTree } from '../../types';
import { Skeleton } from '../../components/ui/Skeleton';
import { ChevronRight, Gift } from 'lucide-react';
import { PageShell } from '../../components/layout/PageShell';




export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await CategoriesService.getCategories();
        setCategories(res.data.data);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchCats();
  }, []);

  const getIcon = (_name: string) => {
    // const Icon = (Icons as any)[name] || Gift;
    return <Gift className="w-6 h-6" />;
  };

  return (
    <PageShell>
      <div className="bg-white dark:bg-neutral-900 border-b border-app-color py-8 mb-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">All Categories</h1>
          <p className="text-gray-500 mt-2">Explore thousands of items listed by your community</p>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white dark:bg-neutral-800 rounded-2xl border border-app-color p-6 hover:shadow-lg transition-shadow"
              >
                <Link href={`/category/${cat.slug}`} className="flex items-center gap-4 mb-4 group">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {getIcon(cat.icon)}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">
                    {cat.name}
                  </h2>
                </Link>

                {cat.children && cat.children.length > 0 && (
                  <ul className="space-y-2 pl-2 border-l-2 border-app-color">
                    {cat.children.slice(0, 5).map(sub => (
                      <li key={sub.id}>
                        <Link
                          href={`/category/${sub.slug}`}
                          className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 py-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-neutral-600 mr-3" />
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                    {cat.children.length > 5 && (
                      <li>
                        <Link
                          href={`/category/${cat.slug}`}
                          className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 py-1 gap-1"
                        >
                          View all {cat.children.length} subcategories <ChevronRight className="w-3 h-3" />
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
