import React from 'react';
import { Icon } from '@iconify/react';
import { cn } from '../../../lib/utils';

interface Category {
    id: string;
    label: string;
    icon: string;
    color: string;
    description?: string;
}

interface VisualCategorySelectorProps {
    activeTab: string;
    onTabChange: (id: string) => void;
}

export const CATEGORIES: Category[] = [
    { id: 'cars', label: 'Cars', icon: 'solar:wheel-bold-duotone', color: 'text-blue-500', description: 'Sedans, SUVs, EVs & more' },
    { id: 'motorbikes', label: 'Motorbikes', icon: 'solar:bicycling-bold-duotone', color: 'text-purple-500', description: 'Cruisers, Sport, Dirt bikes' },
    { id: 'caravans', label: 'Caravans', icon: 'solar:bus-bold-duotone', color: 'text-green-500', description: 'Motorhomes & Campervans' },
    { id: 'boats', label: 'Boats', icon: 'solar:water-bold-duotone', color: 'text-cyan-500', description: 'Yachts, Motorboats, Jetskis' },
    { id: 'parts', label: 'Parts', icon: 'solar:tuning-2-bold-duotone', color: 'text-orange-500', description: 'Accessories & Spares' },
    { id: 'all', label: 'All', icon: 'solar:list-bold-duotone', color: 'text-gray-500', description: 'Browse everything' },
];

export function VisualCategorySelector({ activeTab, onTabChange }: VisualCategorySelectorProps) {
    return (
        <div className="flex flex-wrap justify-center gap-4 mb-12">
            {CATEGORIES.map((category) => (
                <button
                    key={category.id}
                    onClick={() => onTabChange(category.id)}
                    className={cn(
                        "group relative flex flex-col items-center justify-center w-28 h-28 md:w-32 md:h-32 rounded-2xl transition-all duration-300",
                        "border border-transparent hover:border-gray-200 dark:hover:border-neutral-700",
                        activeTab === category.id
                            ? "bg-white dark:bg-neutral-800 shadow-xl scale-105 ring-2 ring-primary-500/20"
                            : "bg-gray-50/50 dark:bg-neutral-900/50 hover:bg-white dark:hover:bg-neutral-800 hover:shadow-lg hover:-translate-y-1"
                    )}
                >
                    <div className={cn(
                        "p-3 rounded-full mb-2 transition-colors duration-300",
                        activeTab === category.id ? "bg-primary-50 dark:bg-primary-900/20" : "bg-white dark:bg-neutral-800 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20"
                    )}>
                        <Icon
                            icon={category.icon}
                            className={cn(
                                "w-8 h-8 transition-colors duration-300",
                                activeTab === category.id ? "text-primary-600 dark:text-primary-400" : "text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400"
                            )}
                        />
                    </div>
                    <span className={cn(
                        "text-sm font-semibold transition-colors duration-300",
                        activeTab === category.id ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                    )}>
                        {category.label}
                    </span>
                </button>
            ))}
        </div>
    );
}
