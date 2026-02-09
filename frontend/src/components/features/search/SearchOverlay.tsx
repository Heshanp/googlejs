'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../../../hooks/useNavigation';
import { Search, X, Clock, ArrowUpRight, TrendingUp } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceSearchButton } from './VoiceSearchButton';
import { VisionSearchButton } from './VisionSearchButton';
import { buildSearchUrlFromQuery } from '../../../lib/search/build-search-url';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const POPULAR_SEARCHES = ['iPhone 15', 'PlayStation 5', 'Toyota Aqua', 'Sofa', 'Flatmates'];

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigate } = useNavigation();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Load recent searches
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      setRecentSearches(recent);
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    onClose();
    navigate(buildSearchUrlFromQuery(searchTerm));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch(query);
    if (e.key === 'Escape') onClose();
  };

  const removeRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] bg-white dark:bg-neutral-950 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-app-color">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search Justsell..."
                className="w-full h-11 pl-10 pr-20 bg-gray-100 dark:bg-neutral-900 rounded-xl outline-none text-base text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500/20"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <VoiceSearchButton
                  onTranscript={(text) => {
                    setQuery(text);
                    handleSearch(text);
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
                    handleSearch(text);
                  }}
                />
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Cancel
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Recent Searches */}
            {recentSearches.length > 0 && !query && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 px-2">Recent</h3>
                <div className="space-y-1">
                  {recentSearches.map((term, i) => (
                    <div
                      key={i}
                      onClick={() => handleSearch(term)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-900 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-200">{term}</span>
                      </div>
                      <button
                        onClick={(e) => removeRecent(term, e)}
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Popular/Trending */}
            {!query && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 px-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Trending Now
                </h3>
                <div className="flex flex-wrap gap-2 px-1">
                  {POPULAR_SEARCHES.map(term => (
                    <button
                      key={term}
                      onClick={() => handleSearch(term)}
                      className="px-4 py-2 bg-gray-100 dark:bg-neutral-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Suggestions */}
            {query && (
              <div className="space-y-1">
                {[...recentSearches, ...POPULAR_SEARCHES]
                  .filter(s => s.toLowerCase().includes(query.toLowerCase()))
                  .map((term, i) => (
                    <div
                      key={`sug-${i}`}
                      onClick={() => handleSearch(term)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-900 cursor-pointer"
                    >
                      <Search className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900 dark:text-white flex-1">
                        {term}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                {/* Always show the exact query option */}
                <div
                  onClick={() => handleSearch(query)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-900 cursor-pointer text-primary-600"
                >
                  <Search className="w-4 h-4" />
                  <span className="font-medium">
                    Search for "{query}"
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
