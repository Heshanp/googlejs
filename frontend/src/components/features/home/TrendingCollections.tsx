'use client';

import React from 'react';

const COLLECTIONS = [
    {
        id: '1',
        title: 'Minimalist Home',
        count: '2.4k items',
        image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?q=80&w=800&auto=format&fit=crop'
    },
    {
        id: '2',
        title: 'Analog Tech',
        count: '850 items',
        image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=800&auto=format&fit=crop'
    },
    {
        id: '3',
        title: 'Sustainable Wear',
        count: '1.2k items',
        image: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800&auto=format&fit=crop'
    }
];

export const TrendingCollections: React.FC = () => {
    return (
        <div className="max-w-7xl mx-auto mt-32">
            <h2 className="text-2xl font-medium tracking-tight text-neutral-900 dark:text-white mb-8">Trending Collections</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {COLLECTIONS.map((collection) => (
                    <div key={collection.id} className="group cursor-pointer">
                        <div className="h-64 rounded-2xl bg-neutral-200 overflow-hidden relative">
                            <img src={collection.image} alt={collection.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90" />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                            <div className="absolute bottom-6 left-6 text-white">
                                <h3 className="text-lg font-medium tracking-tight">{collection.title}</h3>
                                <p className="text-xs text-white/80 mt-1">{collection.count}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
