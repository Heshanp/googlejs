import React from 'react';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import { Checkbox } from '../../ui/Checkbox';
import { RangeSlider } from '../../ui/RangeSlider';
import { Input } from '../../ui/Input';
import { BottomSheet } from '../../ui/BottomSheet';
import { ListingFilters as FilterType } from '../../../types';
import { useListingFilters } from '../../../hooks/useListingFilters';
import { VEHICLE_DATA } from '../../../lib/vehicle-data';
import { getFilterableFields } from '../../../config/category-fields/index';
import { FieldType, FieldSchema } from '../../../types/category-fields.types';

interface ListingFiltersProps {
  mobileIsOpen?: boolean;
  mobileOnClose?: () => void;
  isMobile?: boolean;
  /** Auto-detected category from search results */
  detectedCategory?: string | null;
}

const LOCATIONS = [
  { value: 'auckland', label: 'Auckland' },
  { value: 'wellington', label: 'Wellington' },
  { value: 'christchurch', label: 'Christchurch' },
  { value: 'hamilton', label: 'Hamilton' },
  { value: 'tauranga', label: 'Tauranga' },
  { value: 'dunedin', label: 'Dunedin' },
  { value: 'palmerston north', label: 'Palmerston North' },
  { value: 'whangarei', label: 'Whangarei' },
  { value: 'nelson', label: 'Nelson' },
  { value: 'rotorua', label: 'Rotorua' },
  { value: 'new plymouth', label: 'New Plymouth' },
  { value: 'invercargill', label: 'Invercargill' }
];

const CONDITIONS = [
  { value: 'New', label: 'New' },
  { value: 'Like New', label: 'Like New' },
  { value: 'Good', label: 'Good' },
  { value: 'Fair', label: 'Fair' },
];

export const ListingFilters: React.FC<ListingFiltersProps> = ({
  mobileIsOpen,
  mobileOnClose,
  isMobile = false,
  detectedCategory
}) => {
  const { filters, setFilter, setFilters, clearFilters } = useListingFilters();

  // Determine effective category for displaying filters
  const getEffectiveCategory = (): string | null => {
    // First check explicit category from URL/filters
    if (filters.category) {
      return filters.category.toLowerCase();
    }

    // Then check auto-detected category from search results
    if (detectedCategory) {
      return detectedCategory.toLowerCase();
    }

    // No category detected - show general filters only
    return null;
  };

  const effectiveCategory = getEffectiveCategory();
  const isVehicle = effectiveCategory === 'vehicles';

  // Get the vehicle subcategory for vehicle-specific behavior
  const getVehicleSubcategory = (): string => {
    if (['cars', 'motorbikes', 'caravans', 'boats'].includes(filters.subcategory || '')) {
      return filters.subcategory || 'cars';
    }
    return 'cars';
  };

  const vehicleCategory = isVehicle ? getVehicleSubcategory() : null;

  // Get filterable fields for the current category
  const filterableFields = effectiveCategory ? getFilterableFields(effectiveCategory) : [];

  // Fields to skip - handled separately (make/model for vehicles, condition for all)
  const skipFields = ['make', 'model', 'condition'];

  // Filter out fields we handle separately
  const dynamicFields = filterableFields.filter(f => !skipFields.includes(f.id));

  // Helper to get vehicle options safely
  const getVehicleOptions = (key: string, field: string) => {
    // @ts-ignore
    return VEHICLE_DATA[key]?.[field] || [];
  };

  // Render a single filter field based on its schema
  const renderFilterField = (field: FieldSchema) => {
    const value = filters[field.id];

    switch (field.type) {
      case FieldType.SELECT:
      case FieldType.RADIO:
        return (
          <div key={field.id} className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
            <Select
              options={[
                { value: 'all', label: `Any ${field.label}` },
                ...(field.options?.map(opt => ({ ...opt, value: String(opt.value) })) || [])
              ]}
              value={value || 'all'}
              onChange={(val) => setFilter(field.id as keyof FilterType, val === 'all' ? null : val)}
              placeholder={`Any ${field.label}`}
            />
          </div>
        );

      case FieldType.MULTI_SELECT:
        // Use single select for simplicity in filters
        return (
          <div key={field.id} className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
            <Select
              options={[
                { value: 'all', label: `Any ${field.label}` },
                ...(field.options?.map(opt => ({ ...opt, value: String(opt.value) })) || [])
              ]}
              value={value || 'all'}
              onChange={(val) => setFilter(field.id as keyof FilterType, val === 'all' ? null : val)}
              placeholder={`Any ${field.label}`}
            />
          </div>
        );

      case FieldType.NUMBER:
      case FieldType.RANGE:
        // For number fields, create a range input (min/max)
        const minKey = `${field.id}Min` as keyof FilterType;
        const maxKey = `${field.id}Max` as keyof FilterType;
        const minVal = filters[minKey];
        const maxVal = filters[maxKey];

        // Determine sensible defaults based on field
        let rangeMin = 0;
        let rangeMax = 100000;
        let step = 1000;
        let formatFn = (val: number) => val.toLocaleString();

        if (field.id === 'mileage') {
          rangeMax = 300000;
          step = 5000;
          formatFn = (val) => `${val.toLocaleString()}km`;
        } else if (field.id === 'engine_size') {
          rangeMax = 6000;
          step = 100;
          formatFn = (val) => `${val}cc`;
        } else if (field.id === 'year') {
          rangeMin = 1990;
          rangeMax = new Date().getFullYear() + 1;
          step = 1;
          formatFn = (val) => String(val);
        }

        return (
          <div key={field.id} className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {field.label}{field.unit ? ` (${field.unit})` : ''}
            </label>
            <RangeSlider
              aria-label={`${field.label} range`}
              min={rangeMin}
              max={rangeMax}
              step={step}
              value={[
                typeof minVal === 'number' ? minVal : rangeMin,
                typeof maxVal === 'number' ? maxVal : rangeMax
              ]}
              onChange={(val) => {
                setFilters({
                  [minKey]: val[0] === rangeMin ? null : val[0],
                  [maxKey]: val[1] === rangeMax ? null : val[1],
                } as Partial<FilterType>);
              }}
              formatLabel={formatFn}
            />
          </div>
        );

      case FieldType.CHECKBOX:
        return (
          <div key={field.id} className="pt-2">
            <Checkbox
              label={field.label}
              checked={!!value}
              onChange={(e) => setFilter(field.id as keyof FilterType, e.target.checked || null)}
            />
          </div>
        );

      case FieldType.COLOR_PICKER:
      case FieldType.SIZE_SELECTOR:
        // For color and size, use a select dropdown
        if (field.options && field.options.length > 0) {
          return (
            <div key={field.id} className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
              <Select
                options={[
                  { value: 'all', label: `Any ${field.label}` },
                  ...(field.options?.map(opt => ({ ...opt, value: String(opt.value) })) || [])
                ]}
                value={value || 'all'}
                onChange={(val) => setFilter(field.id as keyof FilterType, val === 'all' ? null : val)}
                placeholder={`Any ${field.label}`}
              />
            </div>
          );
        }
        return null;

      default:
        return null;
    }
  };

  const Content = (
    <div className="space-y-6">

      {/* Vehicle Make & Model (special handling due to dependency) */}
      {isVehicle && (vehicleCategory === 'cars' || vehicleCategory === 'motorbikes') && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Make</label>
            <Select
              options={[{ value: 'all', label: 'Any make' }, ...getVehicleOptions(vehicleCategory, 'makes')]}
              value={filters.make || 'all'}
              onChange={(val) => {
                const selectedMake = Array.isArray(val) ? val[0] ?? 'all' : val;
                setFilters({
                  make: selectedMake === 'all' ? null : selectedMake,
                  model: null, // Reset model when make changes
                });
              }}
              placeholder="Any make"
            />
          </div>

          {vehicleCategory === 'cars' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
              <Select
                options={[
                  { value: 'all', label: 'Any model' },
                  ...(filters.make && filters.make !== 'all' ? (getVehicleOptions('cars', 'models') as any)[filters.make] || [] : [])
                ]}
                value={filters.model || 'all'}
                onChange={(val) => setFilter('model', val === 'all' ? null : val)}
                placeholder="Any model"
                disabled={!filters.make || filters.make === 'all'}
              />
            </div>
          )}

          {vehicleCategory === 'motorbikes' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Style</label>
              <Select
                options={[{ value: 'any', label: 'Any style' }, ...getVehicleOptions('motorbikes', 'styles')]}
                value={filters.style || 'any'}
                onChange={(val) => setFilter('style', val === 'any' ? null : val)}
                placeholder="Any style"
              />
            </div>
          )}
        </div>
      )}

      {/* Boat Specifics */}
      {isVehicle && vehicleCategory === 'boats' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hull Type</label>
            <Select
              options={[{ value: 'any', label: 'Any hull type' }, ...getVehicleOptions('boats', 'hullTypes')]}
              value={filters.hullType || 'any'}
              onChange={(val) => setFilter('hullType', val === 'any' ? null : val)}
              placeholder="Any hull type"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Engine Type</label>
            <Select
              options={[{ value: 'any', label: 'Any engine type' }, ...getVehicleOptions('boats', 'engineTypes')]}
              value={filters.engineType || 'any'}
              onChange={(val) => setFilter('engineType', val === 'any' ? null : val)}
              placeholder="Any engine type"
            />
          </div>
        </div>
      )}

      {/* Caravan Specifics */}
      {isVehicle && vehicleCategory === 'caravans' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Layout</label>
            <Select
              options={[{ value: 'any', label: 'Any layout' }, ...getVehicleOptions('caravans', 'layouts')]}
              value={filters.layout || 'any'}
              onChange={(val) => setFilter('layout', val === 'any' ? null : val)}
              placeholder="Any layout"
            />
          </div>
          <div className="flex items-center pt-2">
            <Checkbox
              label="Self-contained"
              checked={!!filters.selfContained}
              onChange={(e) => setFilter('selfContained', e.target.checked || null)}
            />
          </div>
        </div>
      )}

      {/* Dynamic Category-Specific Filters */}
      {dynamicFields.length > 0 && (
        <>
          {(isVehicle || effectiveCategory) && <div className="h-px bg-gray-100 dark:bg-neutral-800" />}
          <div className="space-y-4">
            {dynamicFields.map(field => renderFilterField(field))}
          </div>
        </>
      )}

      <div className="h-px bg-gray-100 dark:bg-neutral-800" />

      {/* Price Range */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Price Range</label>
        <RangeSlider
          aria-label="Price range"
          min={0}
          max={vehicleCategory === 'boats' ? 500000 : vehicleCategory === 'caravans' ? 200000 : 100000}
          step={vehicleCategory === 'boats' ? 5000 : 1000}
          value={[filters.priceMin || 0, filters.priceMax || (vehicleCategory === 'boats' ? 500000 : vehicleCategory === 'caravans' ? 200000 : 100000)]}
          onChange={(val) => {
            setFilters({
              priceMin: val[0] === 0 ? null : val[0],
              priceMax: val[1] === (vehicleCategory === 'boats' ? 500000 : vehicleCategory === 'caravans' ? 200000 : 100000) ? null : val[1],
            });
          }}
          formatLabel={(val) => `$${val.toLocaleString()}`}
        />
      </div>

      {/* Year Range (Vehicles Only) */}
      {isVehicle && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year</label>
          <RangeSlider
            aria-label="Year range"
            min={1990}
            max={2025}
            value={[filters.yearMin || 1990, filters.yearMax || 2025]}
            onChange={(val) => {
              setFilters({
                yearMin: val[0] === 1990 ? null : val[0],
                yearMax: val[1] === 2025 ? null : val[1],
              });
            }}
          />
        </div>
      )}

      {/* Odometer (Vehicles Only - not boats) */}
      {isVehicle && vehicleCategory !== 'boats' && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Odometer</label>
          <RangeSlider
            aria-label="Odometer range"
            min={0}
            max={vehicleCategory === 'motorbikes' ? 100000 : 200000}
            step={1000}
            value={[filters.odometerMin || 0, filters.odometerMax || (vehicleCategory === 'motorbikes' ? 100000 : 200000)]}
            onChange={(val) => {
              setFilters({
                odometerMin: val[0] === 0 ? null : val[0],
                odometerMax: val[1] === (vehicleCategory === 'motorbikes' ? 100000 : 200000) ? null : val[1],
              });
            }}
            formatLabel={(val) => `${val.toLocaleString()}km`}
          />
        </div>
      )}

      <div className="h-px bg-gray-100 dark:bg-neutral-800" />

      {/* Location */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
        <Select
          options={[{ value: 'all', label: 'Any Location' }, ...LOCATIONS]}
          value={filters.location || 'all'}
          onChange={(val) => setFilter('location', val === 'all' ? null : val)}
          placeholder="Anywhere in NZ"
          searchable
        />
      </div>

      <div className="h-px bg-gray-100 dark:bg-neutral-800" />

      {/* Condition */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Condition</label>
        <div className="space-y-2">
          {CONDITIONS.map((cond) => {
            const isChecked = filters.condition?.includes(cond.value as any);
            return (
              <Checkbox
                key={cond.value}
                label={cond.label}
                checked={isChecked}
                onChange={(e) => {
                  const current = filters.condition || [];
                  const next = e.target.checked
                    ? [...current, cond.value]
                    : current.filter(c => c !== cond.value);
                  setFilter('condition', next.length ? next : null);
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="h-px bg-gray-100 dark:bg-neutral-800" />

      {/* Actions */}
      <div className="pt-2">
        <Button
          variant="ghost"
          className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={clearFilters}
        >
          Clear All Filters
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={!!mobileIsOpen}
        onClose={mobileOnClose || (() => { })}
        title="Filters"
      >
        <div className="pb-8">
          {Content}
          <div className="mt-6">
            <Button className="w-full" size="lg" onClick={mobileOnClose}>
              Show Results
            </Button>
          </div>
        </div>
      </BottomSheet>
    );
  }

  return (
    <div className="w-64 shrink-0 hidden lg:block">
      <div className="sticky top-24 pr-4 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar pb-32">
        {Content}
      </div>
    </div>
  );
};
