'use client';

import React, { useState } from 'react';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { useNavigation } from '../../../hooks/useNavigation';
import { ROUTES } from '../../../lib/routes';
import { buildSearchUrlFromQuery } from '../../../lib/search/build-search-url';
import { VoiceSearchButton } from '../search/VoiceSearchButton';
import { VisionSearchButton } from '../search/VisionSearchButton';

export const HeroSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const { navigate } = useNavigation();

    const handleSearch = (e?: React.FormEvent, searchText?: string) => {
        e?.preventDefault();
        const text = searchText || query;
        if (!text.trim()) return;

        navigate(buildSearchUrlFromQuery(text, { searchPath: ROUTES.SEARCH }));
    };

    const suggestions = [
        "Toyota Corolla 2018-2022 under 30k in Auckland",
        "iPhone 15 Pro like new",
        "MacBook Pro M3 under $3000",
        "Vintage mid-century chair under $400",
    ];

    return (
        <div className="max-w-3xl mx-auto text-center mt-4 mb-12 relative z-10">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-medium tracking-tight text-neutral-900 dark:text-white mb-6 leading-tight">
                What are you looking for?
            </h1>
            <p className="text-lg text-neutral-500 dark:text-neutral-300 mb-10 font-normal max-w-lg mx-auto leading-relaxed">
                Describe it in your own words. No categories, no filters. <br className="hidden sm:block" />AI-powered search that understands what you mean.
            </p>

            {/* The Search Component */}
            <form onSubmit={handleSearch} className="relative group max-w-2xl mx-auto">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Vintage mid-century chair under $400 nearby..."
                    className="w-full h-14 pl-14 pr-40 rounded-full search-shadow text-base transition-all duration-300 bg-white/90 border border-app-color text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/5 dark:bg-neutral-900/60 dark:text-white dark:placeholder:text-neutral-500 dark:focus:ring-white/10"
                />
                <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                    <VoiceSearchButton
                        onTranscript={(text) => {
                            setQuery(text);
                            handleSearch(undefined, text);
                        }}
                        onInterim={(text) => setQuery(text)}
                        size="sm"
                        variant="default"
                    />
                    <VisionSearchButton
                        size="sm"
                        variant="default"
                        onDetectedQuery={(text) => {
                            setQuery(text);
                            handleSearch(undefined, text);
                        }}
                    />
                    <button
                        type="submit"
                        className="w-10 h-10 flex items-center justify-center bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </form>

            {/* Gemini 3 Badge */}
            <div className="mt-4 flex items-center justify-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                    <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-xs font-medium text-neutral-400 dark:text-neutral-400">Powered by Gemini 3</span>
            </div>

            {/* Suggestion Pills */}
            <div className="mt-5 flex flex-wrap justify-center gap-3">
                {suggestions.map((suggestion) => (
                    <button
                        key={suggestion}
                        onClick={() => {
                            setQuery(suggestion);
                            // Optional: auto-search on click
                            // navigate(`${ROUTES.SEARCH}?q=${encodeURIComponent(suggestion)}`);
                        }}
                        className="px-4 py-1.5 rounded-full bg-white/90 dark:bg-neutral-900/60 border border-app-color text-sm text-neutral-600 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-900 dark:hover:text-white transition-all"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        </div>
    );
};
