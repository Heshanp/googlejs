import React from 'react';
import { cn } from '../../lib/utils';

export interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pill';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ 
  tabs, 
  activeTab, 
  onChange, 
  variant = 'pill', 
  className 
}) => {
  return (
    <div className={cn("w-full overflow-x-auto no-scrollbar", className)}>
      <div className={cn(
        "flex min-w-full w-max gap-1 p-1",
        variant === 'pill' ? "bg-gray-100 dark:bg-neutral-800 rounded-xl" : "border-b border-app-color"
      )}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          if (variant === 'pill') {
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
                  isActive 
                    ? "bg-white dark:bg-neutral-700 text-gray-900 dark:text-white shadow-sm" 
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px]",
                    isActive ? "bg-gray-100 dark:bg-neutral-600" : "bg-gray-200 dark:bg-neutral-800"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                isActive ? "text-primary-600 dark:text-primary-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                 <span className="bg-gray-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full text-[10px] text-gray-500">
                   {tab.count}
                 </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
