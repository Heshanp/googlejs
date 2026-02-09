'use client';

import React from 'react';
import { Icon } from '@iconify/react';

export const AIFeatures: React.FC = () => {
    return (
        <div className="max-w-7xl mx-auto mt-32">
            <h2 className="text-2xl font-medium tracking-tight text-neutral-900 dark:text-white mb-8">Why use Justsell?</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-96">

                {/* Feature 1 */}
                <div className="col-span-1 md:col-span-2 bg-white dark:bg-neutral-900 border border-app-color rounded-3xl p-8 relative overflow-hidden group hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors shadow-sm">
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex items-center justify-center mb-4 border border-app-color">
                                <Icon icon="lucide:sparkles" className="w-5 h-5 text-neutral-900 dark:text-white" />
                            </div>
                            <h3 className="text-xl font-medium text-neutral-900 dark:text-white tracking-tight">Semantic Intelligence</h3>
                            <p className="text-neutral-500 dark:text-neutral-300 mt-2 max-w-sm leading-relaxed text-sm">Our search engine understands context, material, and sentiment. Stop filtering by "Brown" and "Leather". Just ask for it.</p>
                        </div>

                        {/* Visual representation of search */}
                        <div className="mt-8 bg-neutral-50 dark:bg-neutral-950/40 rounded-xl p-4 border border-app-color w-full md:w-2/3 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">Processing query...</span>
                            </div>
                            <div className="space-y-2">
                                <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full w-3/4"></div>
                                <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full w-1/2"></div>
                            </div>
                        </div>
                    </div>

                    {/* Decorative BG */}
                    <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-neutral-50 dark:from-neutral-800/40 to-transparent opacity-50"></div>
                </div>

                {/* Feature 2 */}
                <div className="bg-neutral-900 dark:bg-neutral-950 rounded-3xl p-8 text-white relative overflow-hidden group">
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <div>
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-4 backdrop-blur-md">
                                <Icon icon="lucide:shield-check" className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xl font-medium text-white tracking-tight">Verified Humans</h3>
                            <p className="text-neutral-400 mt-2 leading-relaxed text-sm">Every seller is ID-verified. No bots, no scams, just people.</p>
                        </div>

                        <div className="mt-8 flex -space-x-3">
                            <div className="w-10 h-10 rounded-full border-2 border-neutral-900 bg-neutral-800 flex items-center justify-center text-xs">AB</div>
                            <div className="w-10 h-10 rounded-full border-2 border-neutral-900 bg-neutral-700 flex items-center justify-center text-xs">JD</div>
                            <div className="w-10 h-10 rounded-full border-2 border-neutral-900 bg-neutral-600 flex items-center justify-center text-xs">+4k</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
