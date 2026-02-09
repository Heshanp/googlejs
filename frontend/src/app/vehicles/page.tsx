'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { cn } from '../../lib/utils';
import { VEHICLE_DATA } from '../../lib/vehicle-data';
import { VisualCategorySelector } from '../../components/features/vehicles/VisualCategorySelector';
import { NaturalLanguageSearch } from '../../components/features/vehicles/NaturalLanguageSearch';
import { RangeSlider } from '../../components/ui/RangeSlider';

export default function VehiclesPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('cars');
    const [subTab, setSubTab] = useState(''); // For Caravans/Motorhomes, Boats/Yachts
    const [showFilters, setShowFilters] = useState(false);

    // Common State
    const [make, setMake] = useState('all');
    const [model, setModel] = useState('all');
    const [yearRange, setYearRange] = useState<[number, number]>([2010, 2025]);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
    const [odometerRange, setOdometerRange] = useState<[number, number]>([0, 200000]);
    const [location, setLocation] = useState('all');

    // Specific State
    const [condition, setCondition] = useState('all');
    const [bodyStyle, setBodyStyle] = useState('any');
    const [fuelType, setFuelType] = useState('any');
    const [style, setStyle] = useState('any');
    const [engineSizeMin, setEngineSizeMin] = useState('any');
    const [engineSizeMax, setEngineSizeMax] = useState('any');
    const [lengthMin, setLengthMin] = useState('any');
    const [lengthMax, setLengthMax] = useState('any');
    const [berthsMin, setBerthsMin] = useState('any');
    const [berthsMax, setBerthsMax] = useState('any');
    const [layout, setLayout] = useState('any');
    const [selfContained, setSelfContained] = useState(false);
    const [hullType, setHullType] = useState('any');
    const [engineType, setEngineType] = useState('any');

    // Reset filters when tab changes
    useEffect(() => {
        setMake('all');
        setModel('all');
        setYearRange([2010, 2025]);
        setPriceRange([0, 100000]);
        setOdometerRange([0, 200000]);
        setLocation('all');
        setCondition('all');
        setBodyStyle('any');
        setFuelType('any');
        setStyle('any');
        setStyle('any');
        setEngineSizeMin('any');
        setEngineSizeMax('any');
        setLengthMin('any');
        setLengthMax('any');
        setBerthsMin('any');
        setBerthsMax('any');
        setLayout('any');
        setSelfContained(false);
        setHullType('any');
        setEngineType('any');

        // Set default sub-tab
        if (activeTab === 'caravans') setSubTab('caravans');
        else if (activeTab === 'boats') setSubTab('motorboats');
        else setSubTab('');
    }, [activeTab]);

    // const tabs = [
    //     { id: 'cars', label: 'Cars', icon: 'solar:wheel-bold-duotone', color: 'text-blue-600' },
    //     { id: 'motorbikes', label: 'Motorbikes', icon: 'solar:bicycling-bold-duotone', color: 'text-purple-600' },
    //     { id: 'caravans', label: 'Caravans & motorhomes', icon: 'solar:bus-bold-duotone', color: 'text-green-600' },
    //     { id: 'boats', label: 'Boats', icon: 'solar:water-bold-duotone', color: 'text-cyan-600' },
    //     { id: 'parts', label: 'Car parts & accessories', icon: 'solar:tuning-2-bold-duotone', color: 'text-orange-600' },
    //     { id: 'all', label: 'All categories', icon: 'solar:list-bold-duotone', color: 'text-gray-600' },
    // ];

    const getTitle = () => {
        switch (activeTab) {
            case 'cars': return "Cars for sale NZ";
            case 'motorbikes': return "Motorbikes for sale NZ";
            case 'caravans': return "Caravans for sale NZ";
            case 'boats': return "Boats for sale NZ";
            case 'parts': return "Auto parts";
            default: return "Find your perfect ride";
        }
    };

    const getBrowseLink = () => {
        switch (activeTab) {
            case 'cars': return "Browse all cars";
            case 'motorbikes': return "Browse all motorbikes, clothing & parts";
            case 'caravans': return "Browse all caravans, motorhomes and parts";
            case 'boats': return "Browse all boats & marine";
            case 'parts': return "Browse all car parts & accessories";
            default: return "";
        }
    };

    const renderSubTabs = () => {
        if (activeTab === 'caravans') {
            return (
                <div className="flex mb-6 border border-app-color rounded-md overflow-hidden w-fit">
                    <button
                        onClick={() => setSubTab('caravans')}
                        className={cn("px-6 py-2 text-sm font-medium transition-colors", subTab === 'caravans' ? "bg-white dark:bg-neutral-800 text-gray-900 dark:text-white" : "bg-gray-50 dark:bg-neutral-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800")}
                    >
                        Caravans
                    </button>
                    <div className="w-px bg-gray-300 dark:bg-neutral-700" />
                    <button
                        onClick={() => setSubTab('motorhomes')}
                        className={cn("px-6 py-2 text-sm font-medium transition-colors", subTab === 'motorhomes' ? "bg-white dark:bg-neutral-800 text-gray-900 dark:text-white" : "bg-gray-50 dark:bg-neutral-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800")}
                    >
                        Motorhomes
                    </button>
                </div>
            );
        }
        if (activeTab === 'boats') {
            return (
                <div className="flex mb-6 border border-app-color rounded-md overflow-hidden w-fit">
                    <button
                        onClick={() => setSubTab('motorboats')}
                        className={cn("px-6 py-2 text-sm font-medium transition-colors", subTab === 'motorboats' ? "bg-white dark:bg-neutral-800 text-gray-900 dark:text-white" : "bg-gray-50 dark:bg-neutral-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800")}
                    >
                        Motorboats
                    </button>
                    <div className="w-px bg-gray-300 dark:bg-neutral-700" />
                    <button
                        onClick={() => setSubTab('yachts')}
                        className={cn("px-6 py-2 text-sm font-medium transition-colors", subTab === 'yachts' ? "bg-white dark:bg-neutral-800 text-gray-900 dark:text-white" : "bg-gray-50 dark:bg-neutral-900 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800")}
                    >
                        Yachts
                    </button>
                </div>
            );
        }
        return null;
    };

    // Helper to get options safely
    const getOptions = (key: string, field: string) => {
        // @ts-ignore
        return VEHICLE_DATA[key]?.[field] || [];
    };

    const handleSearch = (query: string) => {
        const lowerQuery = query.toLowerCase();

        // Reset filters
        setMake('all');
        setModel('all');
        setYearRange([1990, 2025]);
        setPriceRange([0, 200000]);
        setLocation('all');

        // 1. Extract Price (e.g., "under 20k", "$20000")
        const priceMatch = lowerQuery.match(/(?:under|below|<|max)\s?\$?(\d+)(k?)/);
        if (priceMatch) {
            let price = parseInt(priceMatch[1]);
            if (priceMatch[2] === 'k') price *= 1000;
            setPriceRange([0, price]);
        }

        // 2. Extract Year (e.g., "2020", "2015-2020")
        const yearMatch = lowerQuery.match(/\b(19|20)\d{2}\b/g);
        if (yearMatch) {
            const years = yearMatch.map(y => parseInt(y)).sort();
            if (years.length === 1) {
                // If single year, assume min year
                setYearRange([years[0], 2025]);
            } else if (years.length >= 2) {
                setYearRange([years[0], years[years.length - 1]]);
            }
        }

        // 3. Extract Make & Model
        // Simple check against car makes/models
        if (activeTab === 'cars') {
            const makes = VEHICLE_DATA.cars.makes;
            const foundMake = makes.find(m => lowerQuery.includes(m.label.toLowerCase()));

            if (foundMake) {
                setMake(foundMake.value);

                // Check for models of this make
                // @ts-ignore
                const models = VEHICLE_DATA.cars.models[foundMake.value] || [];
                // @ts-ignore
                const foundModel = models.find(m => lowerQuery.includes(m.label.toLowerCase()));
                if (foundModel) {
                    setModel(foundModel.value);
                }
            }
        }

        // 4. Extract Location
        const locations = ['auckland', 'wellington', 'christchurch', 'hamilton', 'tauranga', 'dunedin', 'palmerston north', 'whangarei', 'nelson', 'rotorua', 'new plymouth', 'invercargill'];
        const foundLocation = locations.find(l => lowerQuery.includes(l));
        if (foundLocation) {
            // Capitalize first letter for simple matching if needed, or map to value
            // Assuming values are lowercase based on 'all' default
            setLocation(foundLocation); // This might need mapping to exact select values
        }

        // Show filters to let user see what happened
        setShowFilters(true);
    };

    const handleViewListings = () => {
        const params = new URLSearchParams();

        // Base category
        params.set('category', 'vehicles');
        params.set('subcategory', activeTab === 'all' ? '' : activeTab);

        // Common filters
        if (make !== 'all') params.set('make', make);
        if (model !== 'all') params.set('model', model);
        if (location !== 'all') params.set('location', location);

        // Ranges
        params.set('year_min', yearRange[0].toString());
        params.set('year_max', yearRange[1].toString());
        params.set('price_min', priceRange[0].toString());
        params.set('price_max', priceRange[1].toString());

        // Specifics based on tab
        if (activeTab === 'cars') {
            if (condition !== 'all') params.set('condition', condition);
            if (bodyStyle !== 'any') params.set('body_style', bodyStyle);
            if (fuelType !== 'any') params.set('fuel_type', fuelType);
        } else if (activeTab === 'motorbikes') {
            if (style !== 'any') params.set('style', style);
            if (engineSizeMin !== 'any') params.set('engine_size_min', engineSizeMin);
            if (engineSizeMax !== 'any') params.set('engine_size_max', engineSizeMax);
            params.set('odometer_min', odometerRange[0].toString());
            params.set('odometer_max', odometerRange[1].toString());
        }

        // Navigate to search page with params
        router.push(`/search?${params.toString()}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 pb-20">
            {/* Hero Search Section */}
            <div className="relative bg-gray-50 dark:bg-neutral-950 border-b border-app-color overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-primary-500/20 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute top-20 right-0 w-96 h-96 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute top-40 left-0 w-72 h-72 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none" />

                <div className="container mx-auto px-4 py-12 relative z-10">
                    <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-8">
                        Find your perfect ride
                    </h1>

                    {/* Visual Category Selector */}
                    <VisualCategorySelector activeTab={activeTab} onTabChange={setActiveTab} />

                    {/* Natural Language Search */}
                    <NaturalLanguageSearch onSearch={handleSearch} />

                    {/* Advanced Filters Toggle */}
                    <div className="flex justify-center mb-8">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors bg-white/50 dark:bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 dark:border-white/10"
                        >
                            <Icon icon="solar:tuning-2-bold-duotone" className="w-4 h-4" />
                            {showFilters ? 'Hide advanced filters' : 'Show advanced filters'}
                            <Icon icon="solar:alt-arrow-down-linear" className={cn("w-4 h-4 transition-transform duration-300", showFilters ? "rotate-180" : "")} />
                        </button>
                    </div>

                    {/* Search Card */}
                    <div className={cn(
                        "max-w-5xl mx-auto bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/20 dark:border-neutral-700/50 rounded-[2rem] shadow p-6 md:p-8 relative overflow-hidden transition-all duration-500 ease-in-out origin-top",
                        showFilters ? "opacity-100 scale-100 max-h-[2000px]" : "opacity-0 scale-95 max-h-0 py-0 overflow-hidden border-none shadow-none"
                    )}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 pointer-events-none" />
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                {getTitle()}
                            </h2>

                            {renderSubTabs()}

                            <div className="space-y-6">

                                {/* CARS LAYOUT */}
                                {activeTab === 'cars' && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New & Used</label>
                                                <Select
                                                    options={[
                                                        { value: 'all', label: 'All cars' },
                                                        { value: 'new', label: 'New cars' },
                                                        { value: 'used', label: 'Used cars' },
                                                    ]}
                                                    value={condition}
                                                    onChange={(val) => setCondition(val as string)}
                                                    placeholder="All cars"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Make</label>
                                                <Select
                                                    options={[{ value: 'all', label: 'Any make' }, ...getOptions('cars', 'makes')]}
                                                    value={make}
                                                    onChange={(val) => setMake(val as string)}
                                                    placeholder="Any make"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Model</label>
                                                <Select
                                                    options={[
                                                        { value: 'all', label: 'Any model' },
                                                        ...(make !== 'all' ? (getOptions('cars', 'models') as any)[make] || [] : [])
                                                    ]}
                                                    value={model}
                                                    onChange={(val) => setModel(val as string)}
                                                    placeholder="Any model"
                                                    disabled={make === 'all'}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
                                                <Select
                                                    options={[
                                                        { value: 'all', label: 'Any Location' },
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
                                                    ]}
                                                    value={location}
                                                    onChange={(val) => setLocation(val as string)}
                                                    placeholder="Any Location"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Year</label>
                                                <RangeSlider
                                                    min={1990}
                                                    max={2025}
                                                    value={yearRange}
                                                    onChange={setYearRange}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price</label>
                                                <RangeSlider
                                                    min={0}
                                                    max={200000}
                                                    step={1000}
                                                    value={priceRange}
                                                    onChange={setPriceRange}
                                                    formatLabel={(val) => `$${val.toLocaleString()}`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Body style</label>
                                                <Select
                                                    options={[{ value: 'any', label: 'Any body style' }, ...getOptions('cars', 'bodyStyles')]}
                                                    value={bodyStyle}
                                                    onChange={(val) => setBodyStyle(val as string)}
                                                    placeholder="Any body style"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fuel Type</label>
                                                <Select
                                                    options={[{ value: 'any', label: 'Any fuel type' }, ...getOptions('cars', 'fuelTypes')]}
                                                    value={fuelType}
                                                    onChange={(val) => setFuelType(val as string)}
                                                    placeholder="Any fuel type"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-4">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Keywords</label>
                                                <div className="relative max-w-md">
                                                    <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <Input placeholder="Search using keywords" className="pl-10" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-6">
                                                <button className="text-sm font-medium text-primary-600 hover:underline flex items-center gap-1">
                                                    More options
                                                    <Icon icon="solar:alt-arrow-down-linear" className="w-4 h-4" />
                                                </button>
                                                <Button
                                                    className="w-40 bg-primary-600 hover:bg-primary-700 text-white"
                                                    onClick={handleViewListings}
                                                >
                                                    View listings
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* MOTORBIKES LAYOUT */}
                                {activeTab === 'motorbikes' && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Keywords</label>
                                                <div className="relative">
                                                    <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <Input placeholder="Search using keywords" className="pl-10" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Style</label>
                                                <Select options={[{ value: 'any', label: 'Any style' }, ...getOptions('motorbikes', 'styles')]} value={style} onChange={(val) => setStyle(val as string)} placeholder="Any style" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Make</label>
                                                <Select options={[{ value: 'any', label: 'Any make' }, ...getOptions('motorbikes', 'makes')]} value={make} onChange={(val) => setMake(val as string)} placeholder="Any make" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Engine Size</label>
                                                <div className="flex gap-2">
                                                    <Select options={[{ value: 'any', label: 'Any' }, ...getOptions('motorbikes', 'engineSizes')]} value={engineSizeMin} onChange={(val) => setEngineSizeMin(val as string)} placeholder="Any" className="w-full" />
                                                    <span className="self-center text-gray-400">-</span>
                                                    <Select options={[{ value: 'any', label: 'Any' }, ...getOptions('motorbikes', 'engineSizes')]} value={engineSizeMax} onChange={(val) => setEngineSizeMax(val as string)} placeholder="Any" className="w-full" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Odometer</label>
                                                <RangeSlider
                                                    min={0}
                                                    max={100000}
                                                    step={1000}
                                                    value={odometerRange}
                                                    onChange={setOdometerRange}
                                                    formatLabel={(val) => `${val.toLocaleString()}km`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Year</label>
                                                <RangeSlider
                                                    min={1990}
                                                    max={2025}
                                                    value={yearRange}
                                                    onChange={setYearRange}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price</label>
                                                <RangeSlider
                                                    min={0}
                                                    max={50000}
                                                    step={500}
                                                    value={priceRange}
                                                    onChange={setPriceRange}
                                                    formatLabel={(val) => `$${val.toLocaleString()}`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
                                                <Select
                                                    options={[
                                                        { value: 'all', label: 'Any Location' },
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
                                                    ]}
                                                    value={location}
                                                    onChange={(val) => setLocation(val as string)}
                                                    placeholder="Any Location"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-4">
                                            <a href="#" className="text-sm font-medium text-primary-600 hover:underline">{getBrowseLink()}</a>
                                            <div className="flex items-center gap-4">
                                                <button className="text-sm font-medium text-primary-600 hover:underline">More options</button>
                                                <Button
                                                    className="w-32 bg-primary-600 hover:bg-primary-700 text-white"
                                                    onClick={handleViewListings}
                                                >
                                                    Search
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* CARAVANS LAYOUT */}
                                {activeTab === 'caravans' && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Keywords</label>
                                                <div className="relative">
                                                    <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <Input placeholder="Search using keywords" className="pl-10" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Length</label>
                                                <Select options={[{ value: 'any', label: 'Any length' }]} value={lengthMin} onChange={(val) => setLengthMin(val as string)} placeholder="Any length" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Berths</label>
                                                <div className="flex gap-2">
                                                    <Select options={[{ value: 'any', label: 'Any' }, ...getOptions('caravans', 'berths')]} value={berthsMin} onChange={(val) => setBerthsMin(val as string)} placeholder="Any" className="w-full" />
                                                    <span className="self-center text-gray-400">-</span>
                                                    <Select options={[{ value: 'any', label: 'Any' }, ...getOptions('caravans', 'berths')]} value={berthsMax} onChange={(val) => setBerthsMax(val as string)} placeholder="Any" className="w-full" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price</label>
                                                <RangeSlider
                                                    min={0}
                                                    max={200000}
                                                    step={1000}
                                                    value={priceRange}
                                                    onChange={setPriceRange}
                                                    formatLabel={(val) => `$${val.toLocaleString()}`}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Layout</label>
                                                <Select options={[{ value: 'any', label: 'Any layout' }, ...getOptions('caravans', 'layouts')]} value={layout} onChange={(val) => setLayout(val as string)} placeholder="Any layout" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
                                                <Select
                                                    options={[
                                                        { value: 'all', label: 'Any Location' },
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
                                                    ]}
                                                    value={location}
                                                    onChange={(val) => setLocation(val as string)}
                                                    placeholder="Any Location"
                                                />
                                            </div>
                                            <div className="flex items-center pt-6">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={selfContained} onChange={(e) => setSelfContained(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Self-contained</span>
                                                </label>
                                            </div>
                                            <div className="flex items-end">
                                                <Button
                                                    className="w-full bg-primary-600 hover:bg-primary-700 text-white"
                                                    onClick={handleViewListings}
                                                >
                                                    Search
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="pt-4">
                                            <a href="#" className="text-sm font-medium text-primary-600 hover:underline">{getBrowseLink()}</a>
                                        </div>
                                    </>
                                )}

                                {/* BOATS LAYOUT */}
                                {activeTab === 'boats' && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Keywords</label>
                                                <div className="relative">
                                                    <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <Input placeholder="Search using keywords" className="pl-10" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Hull type</label>
                                                <Select options={[{ value: 'any', label: 'Any hull type' }, ...getOptions('boats', 'hullTypes')]} value={hullType} onChange={(val) => setHullType(val as string)} placeholder="Any hull type" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Engine type</label>
                                                <Select options={[{ value: 'any', label: 'Any engine type' }, ...getOptions('boats', 'engineTypes')]} value={engineType} onChange={(val) => setEngineType(val as string)} placeholder="Any engine type" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Length</label>
                                                <div className="flex gap-2">
                                                    <Select options={[{ value: 'any', label: 'Any' }]} value={lengthMin} onChange={(val) => setLengthMin(val as string)} placeholder="Any" className="w-full" />
                                                    <span className="self-center text-gray-400">-</span>
                                                    <Select options={[{ value: 'any', label: 'Any' }]} value={lengthMax} onChange={(val) => setLengthMax(val as string)} placeholder="Any" className="w-full" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price</label>
                                                <RangeSlider
                                                    min={0}
                                                    max={500000}
                                                    step={5000}
                                                    value={priceRange}
                                                    onChange={setPriceRange}
                                                    formatLabel={(val) => `$${val.toLocaleString()}`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
                                                <Select
                                                    options={[
                                                        { value: 'all', label: 'Any Location' },
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
                                                    ]}
                                                    value={location}
                                                    onChange={(val) => setLocation(val as string)}
                                                    placeholder="Any Location"
                                                />
                                            </div>
                                            <div className="col-span-2 flex justify-end items-end">
                                                <Button
                                                    className="w-40 bg-primary-600 hover:bg-primary-700 text-white"
                                                    onClick={handleViewListings}
                                                >
                                                    Search
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="pt-4">
                                            <a href="#" className="text-sm font-medium text-primary-600 hover:underline">{getBrowseLink()}</a>
                                        </div>
                                    </>
                                )}

                                {/* PARTS LAYOUT */}
                                {activeTab === 'parts' && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                            <div className="md:col-span-10">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Keywords</label>
                                                <div className="relative">
                                                    <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                    <Input placeholder="Search using keywords" className="pl-10" />
                                                </div>
                                            </div>
                                            <div className="md:col-span-2 flex items-end">
                                                <Button
                                                    className="w-full bg-primary-600 hover:bg-primary-700 text-white"
                                                    onClick={handleViewListings}
                                                >
                                                    Search
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="pt-4">
                                            <a href="#" className="text-sm font-medium text-primary-600 hover:underline">{getBrowseLink()}</a>
                                        </div>
                                    </>
                                )}

                                {/* ALL CATEGORIES LAYOUT */}
                                {activeTab === 'all' && (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                        {/* Column 1: Cars */}
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Cars</h3>
                                            <ul className="space-y-2">
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Used cars</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Electric cars</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">New cars</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Classic cars</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Specialist cars</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Parts & accessories</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Car stereos</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Wrecked cars</a></li>
                                            </ul>
                                        </div>

                                        {/* Column 2: Motorbikes & Caravans */}
                                        <div className="space-y-8">
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Motorbikes</h3>
                                                <ul className="space-y-2">
                                                    <li><a href="#" className="text-sm text-primary-600 hover:underline">Motorbikes</a></li>
                                                    <li><a href="#" className="text-sm text-primary-600 hover:underline">Motorbike parts</a></li>
                                                    <li><a href="#" className="text-sm text-primary-600 hover:underline">Helmets & gear</a></li>
                                                </ul>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Caravans & motorhomes</h3>
                                                <ul className="space-y-2">
                                                    <li><a href="#" className="text-sm text-primary-600 hover:underline">Caravans</a></li>
                                                    <li><a href="#" className="text-sm text-primary-600 hover:underline">Motorhomes</a></li>
                                                    <li><a href="#" className="text-sm text-primary-600 hover:underline">Parts & accessories</a></li>
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Column 3: Boats */}
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Boats & marine</h3>
                                            <ul className="space-y-2">
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Motorboats</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Yachts</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Parts & accessories</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Dinghies & rowboats</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Jetskies</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Marina berths</a></li>
                                            </ul>
                                        </div>

                                        {/* Column 4: Other */}
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Other</h3>
                                            <ul className="space-y-2">
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Aircraft</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Buses</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Diggers & excavators</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Horse floats</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Trailers</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Trucks</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Tractors</a></li>
                                                <li><a href="#" className="text-sm text-primary-600 hover:underline">Automotive services</a></li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
