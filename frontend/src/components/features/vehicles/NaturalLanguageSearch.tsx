import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';
import { VoiceSearchButton } from '../search/VoiceSearchButton';

interface NaturalLanguageSearchProps {
    onSearch: (query: string) => void;
    placeholder?: string;
}

export function NaturalLanguageSearch({ onSearch, placeholder = "Try '2020 Toyota Corolla under $20k in Auckland'" }: NaturalLanguageSearchProps) {
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(query);
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-3xl mx-auto mb-12">
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center bg-white dark:bg-neutral-800 rounded-full shadow-lg border border-app-color p-2 transition-all duration-300 focus-within:shadow-xl focus-within:border-primary-500/50 focus-within:ring-4 focus-within:ring-primary-500/10">
                    <Icon icon="solar:magnifer-linear" className="w-6 h-6 text-gray-400 ml-4" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-lg text-gray-900 dark:text-white placeholder:text-gray-400 px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 rounded-lg"
                    />
                    <VoiceSearchButton
                        onTranscript={(text) => {
                            setQuery(text);
                            onSearch(text);
                        }}
                        onInterim={(text) => setQuery(text)}
                        size="md"
                        variant="default"
                        className="mr-2"
                    />
                    <Button
                        type="submit"
                        className="rounded-full px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white shadow transition-all duration-300 hover:scale-105"
                    >
                        Search
                    </Button>
                </div>
            </div>
        </form>
    );
}
