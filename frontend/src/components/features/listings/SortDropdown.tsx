import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Select } from '../../ui/Select';

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest Listed' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
];

export const SortDropdown: React.FC<SortDropdownProps> = ({ value, onChange }) => {
  return (
    <div className="min-w-[180px]">
      <Select
        options={SORT_OPTIONS}
        value={value || 'newest'}
        onChange={(val) => onChange(val as string)}
        className="w-full"
      />
    </div>
  );
};