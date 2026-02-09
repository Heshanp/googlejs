import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { Input } from '../../ui/Input';
import { Location } from '../../../types';
import { LocationsService, NZLocation } from '../../../services/locations.service';

interface LocationPickerProps {
  value?: Location;
  onChange: (location: Location) => void;
  error?: string;
}

// Convert NZLocation to simple location format
function toLocationSuggestion(loc: NZLocation) {
  return {
    suburb: loc.name,
    city: loc.city,
    region: loc.region,
    population: loc.population
  };
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange, error }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ReturnType<typeof toLocationSuggestion>[]>([]);
  const [recentLocations, setRecentLocations] = useState<Location[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const requestSeq = useRef(0);

  // Check if we have a valid location with suburb or city
  const hasValidLocation = value && (
    (value.suburb && value.suburb.trim() !== '') ||
    (value.city && value.city.trim() !== '')
  );

  useEffect(() => {
    const stored = localStorage.getItem('recentLocations');
    if (stored) {
      setRecentLocations(JSON.parse(stored));
    }
  }, []);

  // If no valid location on mount, show editing mode
  useEffect(() => {
    if (!hasValidLocation) {
      setIsEditing(true);
    }
  }, []);

  useEffect(() => {
    const q = query.trim();
    const reqId = ++requestSeq.current;

    setIsLoading(false);

    if (q.length <= 1) {
      setSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsLoading(true);
      LocationsService.searchLocations(q, 20)
        .then(results => {
          if (reqId !== requestSeq.current) return;
          setSuggestions(results.map(toLocationSuggestion));
        })
        .catch(() => {
          if (reqId !== requestSeq.current) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (reqId !== requestSeq.current) return;
          setIsLoading(false);
        });
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSelect = (loc: any) => {
    const location: Location = {
      suburb: loc.suburb,
      city: loc.city,
      region: loc.region
    };
    onChange(location);
    setQuery('');
    setSuggestions([]);
    setIsEditing(false);

    // Save to recent
    const updated = [location, ...recentLocations.filter(l => l.suburb !== location.suburb)].slice(0, 3);
    setRecentLocations(updated);
    localStorage.setItem('recentLocations', JSON.stringify(updated));
  };

  const handleChange = () => {
    setIsEditing(true);
    setQuery('');
  };

  return (
    <div className="space-y-2">
      {/* Selected Value Display */}
      {hasValidLocation && !isEditing && (
        <div className="group flex items-center justify-between py-1 px-1 -ml-1 rounded hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer" onClick={handleChange}>
          <div className="flex items-center gap-2 overflow-hidden">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div className="truncate">
              <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {value?.suburb || value?.city || 'Unknown'}
              </span>
              {(value?.suburb && value?.city) && (
                <span className="text-xs text-slate-500 ml-1.5 truncate opacity-80 font-normal">
                  {value?.city}{value?.region && `, ${value?.region}`}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all px-1"
          >
            Change
          </button>
        </div>
      )}

      {(!hasValidLocation || isEditing) && (
        <div className="relative">
          <Input
            placeholder="Search suburb..."
            leftIcon={<MapPin className="w-3.5 h-3.5" />}
            value={query}
            onChange={handleSearch}
            className="h-8 text-sm bg-white dark:bg-neutral-900 border-app-color focus:ring-1 focus:ring-indigo-500 rounded"
            autoFocus={isEditing}
          />

          {/* Suggestions Dropdown */}
          {(isLoading || suggestions.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-app-color z-50 overflow-hidden max-h-60 overflow-y-auto">
              {isLoading && suggestions.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                  Searching...
                </div>
              )}
              {suggestions.map((loc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-slate-50 dark:hover:bg-neutral-700 text-left transition-colors border-b border-app-color last:border-0"
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <div className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900 dark:text-white truncate">{loc.suburb}</span>
                    <span className="block text-[10px] text-slate-500 truncate">{loc.city}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Locations */}
      {!query && (!hasValidLocation || isEditing) && recentLocations.length > 0 && (
        <div className="pt-1">
          <h4 className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Recents</h4>
          <div className="space-y-0.5">
            {recentLocations.map((loc, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(loc)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors text-left group"
              >
                <Clock className="w-3 h-3 text-slate-300 group-hover:text-slate-500" />
                <div className="min-w-0 flex items-baseline gap-1.5">
                  <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{loc.suburb}</span>
                  <span className="text-[10px] text-slate-400 truncate opacity-70">{loc.city}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
};
