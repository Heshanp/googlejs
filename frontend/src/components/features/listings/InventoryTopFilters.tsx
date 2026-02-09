import React, { useMemo } from 'react';
import { Select } from '../../ui/Select';
import { useListingFilters } from '../../../hooks/useListingFilters';
import { VEHICLE_DATA } from '../../../lib/vehicle-data';
import { ListingFilters as FilterType } from '../../../types';

interface InventoryTopFiltersProps {
  detectedCategory?: string | null;
}

const CONDITIONS = [
  { value: 'New', label: 'New' },
  { value: 'Like New', label: 'Like New' },
  { value: 'Good', label: 'Good' },
  { value: 'Fair', label: 'Fair' },
];

const VEHICLE_COLORS = [
  { value: 'White', label: 'White' },
  { value: 'Silver', label: 'Silver' },
  { value: 'Black', label: 'Black' },
  { value: 'Grey', label: 'Grey' },
  { value: 'Blue', label: 'Blue' },
  { value: 'Red', label: 'Red' },
  { value: 'Green', label: 'Green' },
  { value: 'Yellow', label: 'Yellow' },
  { value: 'Orange', label: 'Orange' },
  { value: 'Brown', label: 'Brown' },
  { value: 'Gold', label: 'Gold' },
];

const VEHICLE_SUBCATEGORIES = ['cars', 'motorbikes', 'caravans', 'boats'];
const VEHICLE_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'cars', label: 'Category: Cars' },
  { value: 'motorbikes', label: 'Category: Motorbikes' },
  { value: 'caravans', label: 'Category: Caravans' },
  { value: 'boats', label: 'Category: Boats' }
];

export const InventoryTopFilters: React.FC<InventoryTopFiltersProps> = ({
  detectedCategory
}) => {
  type SelectOption = { value: string; label: string };

  const { filters, setFilter, setFilters } = useListingFilters();

  const hasVehicleFilterSignals = useMemo(() => {
    const hasNumericVehicleRange =
      typeof filters.yearMin === 'number' ||
      typeof filters.yearMax === 'number' ||
      typeof filters.odometerMin === 'number' ||
      typeof filters.odometerMax === 'number';

    const hasVehicleFacet =
      !!filters.make ||
      !!filters.model ||
      !!filters.bodyStyle ||
      !!filters.fuelType ||
      !!filters.transmission ||
      !!filters.engineSizeMin ||
      !!filters.engineSizeMax ||
      !!filters.style ||
      !!filters.hullType ||
      !!filters.engineType ||
      !!filters.layout ||
      !!filters.selfContained;

    const hasVehicleSubcategory =
      typeof filters.subcategory === 'string' &&
      VEHICLE_SUBCATEGORIES.includes(filters.subcategory);

    return hasNumericVehicleRange || hasVehicleFacet || hasVehicleSubcategory;
  }, [
    filters.yearMin,
    filters.yearMax,
    filters.odometerMin,
    filters.odometerMax,
    filters.make,
    filters.model,
    filters.bodyStyle,
    filters.fuelType,
    filters.transmission,
    filters.engineSizeMin,
    filters.engineSizeMax,
    filters.style,
    filters.hullType,
    filters.engineType,
    filters.layout,
    filters.selfContained,
    filters.subcategory,
  ]);

  const effectiveCategory = useMemo(() => {
    if (filters.category) return filters.category.toLowerCase();
    if (hasVehicleFilterSignals) return 'vehicles';
    if (detectedCategory) return detectedCategory.toLowerCase();
    return null;
  }, [filters.category, hasVehicleFilterSignals, detectedCategory]);

  const isVehicle = effectiveCategory === 'vehicles';
  const vehicleCategory = VEHICLE_SUBCATEGORIES.includes(filters.subcategory || '')
    ? (filters.subcategory as string)
    : 'cars';

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear() + 1;
    const years: { value: string; label: string }[] = [];
    for (let year = currentYear; year >= 1990; year -= 1) {
      years.push({ value: String(year), label: String(year) });
    }
    return years;
  }, []);

  const selectedYear = typeof filters.yearMin === 'number' && filters.yearMin === filters.yearMax
    ? String(filters.yearMin)
    : 'all';

  const selectedCondition = filters.condition && filters.condition.length === 1
    ? filters.condition[0]
    : 'all';

  type VehicleDataKey = keyof typeof VEHICLE_DATA;
  const vehicleDataKey = vehicleCategory as VehicleDataKey;
  const currentVehicleData = VEHICLE_DATA[vehicleDataKey] || VEHICLE_DATA.cars;
  const makeOptions: SelectOption[] = isVehicle && 'makes' in currentVehicleData
    ? (currentVehicleData.makes as SelectOption[])
    : [];
  const selectedMake = typeof filters.make === 'string' ? filters.make : null;

  const modelOptions = vehicleCategory === 'cars' && selectedMake && selectedMake !== 'all'
    ? (VEHICLE_DATA.cars.models[selectedMake] || [])
    : [];

  const generalPriceOptions = [
    { value: 'any', label: 'Any price' },
    { value: '0-1000', label: 'Up to $1,000' },
    { value: '0-5000', label: 'Up to $5,000' },
    { value: '0-10000', label: 'Up to $10,000' },
    { value: '0-25000', label: 'Up to $25,000' },
    { value: '0-50000', label: 'Up to $50,000' },
    { value: '50000-100000', label: '$50,000 - $100,000' },
    { value: '100000+', label: '$100,000+' },
  ];

  const vehiclePriceOptions = useMemo(() => {
    if (!isVehicle) return generalPriceOptions;
    const ranges = 'priceRanges' in currentVehicleData ? currentVehicleData.priceRanges : [];
    return [
      { value: 'any', label: 'Any price' },
      ...ranges.map((r: { value: string; label: string }) => ({
        value: `0-${r.value}`,
        label: `Up to ${r.label}`,
      })),
    ];
  }, [currentVehicleData, isVehicle]);

  const selectedPrice = useMemo(() => {
    if (filters.priceMin === undefined && filters.priceMax === undefined) return 'any';
    if (typeof filters.priceMin === 'number' && typeof filters.priceMax === 'number') {
      return `${filters.priceMin}-${filters.priceMax}`;
    }
    if (typeof filters.priceMin === 'number' && filters.priceMax === undefined) {
      return `${filters.priceMin}+`;
    }
    if (filters.priceMin === undefined && typeof filters.priceMax === 'number') {
      return `0-${filters.priceMax}`;
    }
    return 'any';
  }, [filters.priceMin, filters.priceMax]);

  const odometerOptions = [
    { value: 'any', label: 'Any odometer' },
    { value: '0-25000', label: 'Under 25,000 km' },
    { value: '25000-50000', label: '25,000 - 50,000 km' },
    { value: '50000-100000', label: '50,000 - 100,000 km' },
    { value: '100000-150000', label: '100,000 - 150,000 km' },
    { value: '150000+', label: '150,000+ km' },
  ];

  const selectedOdometer = useMemo(() => {
    if (filters.odometerMin === undefined && filters.odometerMax === undefined) return 'any';
    if (typeof filters.odometerMin === 'number' && typeof filters.odometerMax === 'number') {
      return `${filters.odometerMin}-${filters.odometerMax}`;
    }
    if (typeof filters.odometerMin === 'number' && filters.odometerMax === undefined) {
      return `${filters.odometerMin}+`;
    }
    if (filters.odometerMin === undefined && typeof filters.odometerMax === 'number') {
      return `0-${filters.odometerMax}`;
    }
    return 'any';
  }, [filters.odometerMin, filters.odometerMax]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isVehicle && (
        <div className="min-w-[180px] flex-1 sm:flex-none">
          <Select
            placeholder="Category"
            options={VEHICLE_CATEGORY_OPTIONS}
            value={vehicleCategory}
            onChange={(val) => {
              setFilters({
                subcategory: val,
                make: null,
                model: null,
                style: null,
                body_style: null,
              } as Partial<FilterType>);
            }}
          />
        </div>
      )}

      {isVehicle ? (
        <>
          <div className="min-w-[160px] flex-1 sm:flex-none">
            <Select
              placeholder="Make"
              options={[{ value: 'all', label: 'Any make' }, ...makeOptions]}
              value={filters.make || 'all'}
              onChange={(val) => {
                const selectedMake = Array.isArray(val) ? val[0] ?? 'all' : val;
                setFilters({
                  make: selectedMake === 'all' ? null : selectedMake,
                  model: null,
                });
              }}
            />
          </div>

          <div className="min-w-[160px] flex-1 sm:flex-none">
            <Select
              placeholder="Model"
              options={[{ value: 'all', label: 'Any model' }, ...modelOptions]}
              value={filters.model || 'all'}
              onChange={(val) => setFilter('model', val === 'all' ? null : val)}
              disabled={!filters.make || filters.make === 'all'}
            />
          </div>

          <div className="min-w-[140px] flex-1 sm:flex-none">
            <Select
              placeholder="Year"
              options={[{ value: 'all', label: 'Any year' }, ...yearOptions]}
              value={selectedYear}
              onChange={(val) => {
                if (val === 'all') {
                  setFilters({
                    yearMin: null,
                    yearMax: null,
                  });
                  return;
                }
                const parsed = Number(val);
                setFilters({
                  yearMin: parsed,
                  yearMax: parsed,
                });
              }}
            />
          </div>

          {vehicleCategory === 'cars' && (
            <div className="min-w-[170px] flex-1 sm:flex-none">
              <Select
                placeholder="Body Type"
                options={[{ value: 'all', label: 'Any body type' }, ...VEHICLE_DATA.cars.bodyStyles]}
                value={filters.bodyStyle || 'all'}
                onChange={(val) => setFilter('body_style' as keyof FilterType, val === 'all' ? null : val)}
              />
            </div>
          )}

          {vehicleCategory === 'motorbikes' && (
            <div className="min-w-[170px] flex-1 sm:flex-none">
              <Select
                placeholder="Style"
                options={[{ value: 'any', label: 'Any style' }, ...VEHICLE_DATA.motorbikes.styles]}
                value={filters.style || 'any'}
                onChange={(val) => setFilter('style', val === 'any' ? null : val)}
              />
            </div>
          )}

          {vehicleCategory === 'caravans' && (
            <div className="min-w-[170px] flex-1 sm:flex-none">
              <Select
                placeholder="Layout"
                options={[{ value: 'any', label: 'Any layout' }, ...VEHICLE_DATA.caravans.layouts]}
                value={filters.layout || 'any'}
                onChange={(val) => setFilter('layout', val === 'any' ? null : val)}
              />
            </div>
          )}

          {vehicleCategory === 'boats' && (
            <>
              <div className="min-w-[170px] flex-1 sm:flex-none">
                <Select
                  placeholder="Hull Type"
                  options={[{ value: 'any', label: 'Any hull type' }, ...VEHICLE_DATA.boats.hullTypes]}
                  value={filters.hullType || 'any'}
                  onChange={(val) => setFilter('hullType', val === 'any' ? null : val)}
                />
              </div>
              <div className="min-w-[170px] flex-1 sm:flex-none">
                <Select
                  placeholder="Engine Type"
                  options={[{ value: 'any', label: 'Any engine type' }, ...VEHICLE_DATA.boats.engineTypes]}
                  value={filters.engineType || 'any'}
                  onChange={(val) => setFilter('engineType', val === 'any' ? null : val)}
                />
              </div>
            </>
          )}
        </>
      ) : (
        <></>
      )}

      <div className="min-w-[170px] flex-1 sm:flex-none">
        <Select
          placeholder="Condition"
          options={[{ value: 'all', label: 'Any condition' }, ...CONDITIONS]}
          value={selectedCondition}
          onChange={(val) => setFilter('condition', val === 'all' ? null : [val])}
        />
      </div>

      {isVehicle && (
        <div className="min-w-[170px] flex-1 sm:flex-none">
          <Select
            placeholder="Color"
            options={[{ value: 'all', label: 'Any color' }, ...VEHICLE_COLORS]}
            value={filters.color || 'all'}
            onChange={(val) => setFilter('color', val === 'all' ? null : val)}
          />
        </div>
      )}

      <div className="min-w-[180px] flex-1 sm:flex-none">
        <Select
          placeholder="Price"
          options={isVehicle ? vehiclePriceOptions : generalPriceOptions}
          value={selectedPrice}
          onChange={(val) => {
            if (val === 'any') {
              setFilters({
                priceMin: null,
                priceMax: null,
              });
              return;
            }

            if (typeof val === 'string' && val.includes('+')) {
              const min = Number(val.replace('+', ''));
              setFilters({
                priceMin: min,
                priceMax: null,
              });
              return;
            }

            const [minStr, maxStr] = String(val).split('-');
            const min = Number(minStr);
            const max = Number(maxStr);
            setFilters({
              priceMin: Number.isNaN(min) ? null : min,
              priceMax: Number.isNaN(max) ? null : max,
            });
          }}
        />
      </div>

      {isVehicle && vehicleCategory !== 'boats' && (
        <div className="min-w-[180px] flex-1 sm:flex-none">
          <Select
            placeholder="Odometer"
            options={odometerOptions}
            value={selectedOdometer}
            onChange={(val) => {
              if (val === 'any') {
                setFilters({
                  odometerMin: null,
                  odometerMax: null,
                });
                return;
              }

              if (typeof val === 'string' && val.includes('+')) {
                const min = Number(val.replace('+', ''));
                setFilters({
                  odometerMin: min,
                  odometerMax: null,
                });
                return;
              }

              const [minStr, maxStr] = String(val).split('-');
              const min = Number(minStr);
              const max = Number(maxStr);
              setFilters({
                odometerMin: Number.isNaN(min) ? null : min,
                odometerMax: Number.isNaN(max) ? null : max,
              });
            }}
          />
        </div>
      )}
    </div>
  );
};
