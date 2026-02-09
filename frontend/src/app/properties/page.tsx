'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { cn } from '../../lib/utils';
import { NZ_LOCATIONS } from '../../lib/nz-locations';

export default function PropertiesPage() {
    const [activeTab, setActiveTab] = useState('sale');
    const [selectedRegion, setSelectedRegion] = useState('all');
    const [selectedDistrict, setSelectedDistrict] = useState('all');
    const [selectedSuburb, setSelectedSuburb] = useState('all');

    const [priceMin, setPriceMin] = useState('any');
    const [priceMax, setPriceMax] = useState('any');
    const [bedroomsMin, setBedroomsMin] = useState('any');
    const [bedroomsMax, setBedroomsMax] = useState('any');
    const [bathroomsMin, setBathroomsMin] = useState('any');
    const [bathroomsMax, setBathroomsMax] = useState('any');
    const [propertyType, setPropertyType] = useState('all');

    // New state for other tabs
    const [agentLocation, setAgentLocation] = useState('');
    const [agentName, setAgentName] = useState('');
    const [soldLocation, setSoldLocation] = useState('');
    const [recentlySoldOnly, setRecentlySoldOnly] = useState(false);
    const [existingFlatmatesMin, setExistingFlatmatesMin] = useState('any');
    const [existingFlatmatesMax, setExistingFlatmatesMax] = useState('any');

    const tabs = [
        { id: 'sale', label: 'For sale', icon: 'solar:home-2-bold-duotone' },
        { id: 'rent', label: 'For rent', icon: 'solar:key-bold-duotone' },
        { id: 'sold', label: 'Sold', icon: 'solar:tag-price-bold-duotone' },
        { id: 'flatmates', label: 'Flatmates', icon: 'solar:users-group-rounded-bold-duotone' },
        { id: 'retirement', label: 'Retirement villages', icon: 'solar:armchair-2-bold-duotone' },
        { id: 'agent', label: 'Find an agent', icon: 'solar:user-id-bold-duotone' },
    ];

    const getTitle = () => {
        switch (activeTab) {
            case 'sale': return "Search New Zealand's largest range of houses and properties for sale";
            case 'rent': return "Find your perfect rental property";
            case 'sold': return "Search recently sold houses and over 1.9m New Zealand properties";
            case 'flatmates': return "Flatmates Wanted in New Zealand";
            case 'retirement': return "Retirement villages in New Zealand";
            case 'agent': return "Find a real estate agent in New Zealand";
            default: return "Find your perfect place";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 pb-20">
            {/* Hero Search Section */}
            <div className="relative bg-white dark:bg-neutral-900 border-b border-app-color">
                <div className="absolute inset-0 bg-gradient-to-b from-primary-50/50 to-transparent dark:from-primary-900/10 pointer-events-none" />

                <div className="container mx-auto px-4 py-8 relative z-10">
                    <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-900 dark:text-white mb-8">
                        Find your perfect place
                    </h1>

                    {/* Tabs */}
                    <div className="flex flex-wrap justify-center gap-2 mb-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                                    activeTab === tab.id
                                        ? "bg-primary-600 text-white shadow"
                                        : "bg-white dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 border border-app-color"
                                )}
                            >
                                <Icon icon={tab.icon} className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search Card */}
                    <div className="max-w-5xl mx-auto bg-white dark:bg-neutral-800 rounded-[2rem] shadow border border-app-color p-6 md:p-8">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                            {getTitle()}
                        </h2>

                        <div className="space-y-6">
                            {/* SOLD TAB LAYOUT */}
                            {activeTab === 'sold' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-10">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
                                            <div className="relative">
                                                <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                                <Input
                                                    value={soldLocation}
                                                    onChange={(e) => setSoldLocation(e.target.value)}
                                                    placeholder="Search by address, district or suburb"
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 flex items-end">
                                            <Button className="w-full h-[42px] text-base" size="lg">
                                                Search
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap justify-between items-center pt-2 gap-4">
                                        <div className="flex flex-wrap gap-4 md:gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={recentlySoldOnly}
                                                    onChange={(e) => setRecentlySoldOnly(e.target.checked)}
                                                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Recently sold only</span>
                                            </label>
                                        </div>
                                        <button className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline whitespace-nowrap">
                                            Clear refinements
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* FIND AGENT TAB LAYOUT */}
                            {activeTab === 'agent' && (
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-5">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
                                        <Input
                                            value={agentLocation}
                                            onChange={(e) => setAgentLocation(e.target.value)}
                                            placeholder="Search by suburb, district or region"
                                        />
                                    </div>
                                    <div className="md:col-span-5">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
                                        <Input
                                            value={agentName}
                                            onChange={(e) => setAgentName(e.target.value)}
                                            placeholder="Search by agent name or agency"
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex items-end">
                                        <Button className="w-full h-[42px] text-base" size="lg">
                                            Search
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* STANDARD SEARCH LAYOUT (Sale, Rent, Flatmates, Retirement) */}
                            {['sale', 'rent', 'flatmates', 'retirement'].includes(activeTab) && (
                                <>
                                    {/* Location Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Region</label>
                                            <Select
                                                options={[
                                                    { value: 'all', label: 'All New Zealand' },
                                                    ...Object.entries(NZ_LOCATIONS).map(([key, region]) => ({
                                                        value: key,
                                                        label: region.label
                                                    }))
                                                ]}
                                                value={selectedRegion}
                                                onChange={(val) => {
                                                    setSelectedRegion(val as string);
                                                    setSelectedDistrict('all');
                                                    setSelectedSuburb('all');
                                                }}
                                                placeholder="All New Zealand"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">District</label>
                                            <Select
                                                options={[
                                                    { value: 'all', label: 'All districts' },
                                                    ...(selectedRegion !== 'all' && NZ_LOCATIONS[selectedRegion]
                                                        ? Object.entries(NZ_LOCATIONS[selectedRegion].districts).map(([key, district]) => ({
                                                            value: key,
                                                            label: district.label
                                                        }))
                                                        : [])
                                                ]}
                                                value={selectedDistrict}
                                                onChange={(val) => {
                                                    setSelectedDistrict(val as string);
                                                    setSelectedSuburb('all');
                                                }}
                                                placeholder="All districts"
                                                disabled={selectedRegion === 'all'}
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Suburb</label>
                                            <Select
                                                options={[
                                                    { value: 'all', label: 'All suburbs' },
                                                    ...(selectedRegion !== 'all' && selectedDistrict !== 'all' && NZ_LOCATIONS[selectedRegion]?.districts[selectedDistrict]
                                                        ? NZ_LOCATIONS[selectedRegion].districts[selectedDistrict].suburbs
                                                        : [])
                                                ]}
                                                value={selectedSuburb}
                                                onChange={(val) => setSelectedSuburb(val as string)}
                                                placeholder="All suburbs"
                                                disabled={selectedDistrict === 'all'}
                                            />
                                        </div>
                                        <div className="md:col-span-3 flex items-end">
                                            <Button className="w-full h-[42px] text-base" size="lg">
                                                Search
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-neutral-700" />

                                    {/* Filters Row 1 */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        {/* Price / Rent */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                {activeTab === 'flatmates' ? 'Rent per week' : 'Price'}
                                            </label>
                                            <div className="flex gap-2">
                                                <Select
                                                    options={activeTab === 'rent' || activeTab === 'flatmates' ? [
                                                        { value: 'any', label: 'Any' },
                                                        { value: '100', label: '$100' },
                                                        { value: '200', label: '$200' },
                                                        { value: '300', label: '$300' },
                                                        { value: '400', label: '$400' },
                                                        { value: '500', label: '$500' },
                                                        { value: '600', label: '$600' },
                                                        { value: '700', label: '$700' },
                                                        { value: '800', label: '$800' },
                                                        { value: '900', label: '$900' },
                                                        { value: '1000', label: '$1k' },
                                                    ] : [
                                                        { value: 'any', label: 'Any' },
                                                        { value: '100000', label: '$100k' },
                                                        { value: '200000', label: '$200k' },
                                                        { value: '300000', label: '$300k' },
                                                        { value: '400000', label: '$400k' },
                                                        { value: '500000', label: '$500k' },
                                                        { value: '600000', label: '$600k' },
                                                        { value: '700000', label: '$700k' },
                                                        { value: '800000', label: '$800k' },
                                                        { value: '900000', label: '$900k' },
                                                        { value: '1000000', label: '$1M+' },
                                                    ]}
                                                    value={priceMin}
                                                    onChange={(val) => setPriceMin(val as string)}
                                                    placeholder="Any"
                                                    className="w-full"
                                                />
                                                <span className="self-center text-gray-400">-</span>
                                                <Select
                                                    options={activeTab === 'rent' || activeTab === 'flatmates' ? [
                                                        { value: 'any', label: 'Any' },
                                                        { value: '100', label: '$100' },
                                                        { value: '200', label: '$200' },
                                                        { value: '300', label: '$300' },
                                                        { value: '400', label: '$400' },
                                                        { value: '500', label: '$500' },
                                                        { value: '600', label: '$600' },
                                                        { value: '700', label: '$700' },
                                                        { value: '800', label: '$800' },
                                                        { value: '900', label: '$900' },
                                                        { value: '1000', label: '$1k' },
                                                    ] : [
                                                        { value: 'any', label: 'Any' },
                                                        { value: '100000', label: '$100k' },
                                                        { value: '200000', label: '$200k' },
                                                        { value: '300000', label: '$300k' },
                                                        { value: '400000', label: '$400k' },
                                                        { value: '500000', label: '$500k' },
                                                        { value: '600000', label: '$600k' },
                                                        { value: '700000', label: '$700k' },
                                                        { value: '800000', label: '$800k' },
                                                        { value: '900000', label: '$900k' },
                                                        { value: '1000000', label: '$1M+' },
                                                    ]}
                                                    value={priceMax}
                                                    onChange={(val) => setPriceMax(val as string)}
                                                    placeholder="Any"
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>

                                        {/* Flatmates Specific: Existing Flatmates */}
                                        {activeTab === 'flatmates' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Existing flatmates</label>
                                                <div className="flex gap-2">
                                                    <Select
                                                        options={[
                                                            { value: 'any', label: 'Any' },
                                                            { value: '1', label: '1' },
                                                            { value: '2', label: '2' },
                                                            { value: '3', label: '3' },
                                                            { value: '4', label: '4' },
                                                            { value: '5', label: '5+' },
                                                        ]}
                                                        value={existingFlatmatesMin}
                                                        onChange={(val) => setExistingFlatmatesMin(val as string)}
                                                        placeholder="Any"
                                                        className="w-full"
                                                    />
                                                    <span className="self-center text-gray-400">-</span>
                                                    <Select
                                                        options={[
                                                            { value: 'any', label: 'Any' },
                                                            { value: '1', label: '1' },
                                                            { value: '2', label: '2' },
                                                            { value: '3', label: '3' },
                                                            { value: '4', label: '4' },
                                                            { value: '5', label: '5+' },
                                                        ]}
                                                        value={existingFlatmatesMax}
                                                        onChange={(val) => setExistingFlatmatesMax(val as string)}
                                                        placeholder="Any"
                                                        className="w-full"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Bedrooms (Not for Flatmates/Retirement) */}
                                        {activeTab !== 'flatmates' && activeTab !== 'retirement' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bedrooms</label>
                                                <div className="flex gap-2">
                                                    <Select
                                                        options={[
                                                            { value: 'any', label: 'Any' },
                                                            { value: '1', label: '1+' },
                                                            { value: '2', label: '2+' },
                                                            { value: '3', label: '3+' },
                                                            { value: '4', label: '4+' },
                                                            { value: '5', label: '5+' },
                                                        ]}
                                                        value={bedroomsMin}
                                                        onChange={(val) => setBedroomsMin(val as string)}
                                                        placeholder="Any"
                                                        className="w-full"
                                                    />
                                                    <span className="self-center text-gray-400">-</span>
                                                    <Select
                                                        options={[
                                                            { value: 'any', label: 'Any' },
                                                            { value: '1', label: '1+' },
                                                            { value: '2', label: '2+' },
                                                            { value: '3', label: '3+' },
                                                            { value: '4', label: '4+' },
                                                            { value: '5', label: '5+' },
                                                        ]}
                                                        value={bedroomsMax}
                                                        onChange={(val) => setBedroomsMax(val as string)}
                                                        placeholder="Any"
                                                        className="w-full"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Bathrooms (Sale, Rent, Flatmates) */}
                                        {activeTab !== 'retirement' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Bathrooms</label>
                                                <div className={activeTab === 'flatmates' ? "w-full" : "flex gap-2"}>
                                                    <Select
                                                        options={[
                                                            { value: 'any', label: 'Any' },
                                                            { value: '1', label: '1+' },
                                                            { value: '2', label: '2+' },
                                                            { value: '3', label: '3+' },
                                                        ]}
                                                        value={bathroomsMin}
                                                        onChange={(val) => setBathroomsMin(val as string)}
                                                        placeholder="Any"
                                                        className="w-full"
                                                    />
                                                    {activeTab !== 'flatmates' && (
                                                        <>
                                                            <span className="self-center text-gray-400">-</span>
                                                            <Select
                                                                options={[
                                                                    { value: 'any', label: 'Any' },
                                                                    { value: '1', label: '1+' },
                                                                    { value: '2', label: '2+' },
                                                                    { value: '3', label: '3+' },
                                                                ]}
                                                                value={bathroomsMax}
                                                                onChange={(val) => setBathroomsMax(val as string)}
                                                                placeholder="Any"
                                                                className="w-full"
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Property Type */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Property type</label>
                                            <Select
                                                options={[
                                                    { value: 'all', label: 'All' },
                                                    { value: 'house', label: 'House' },
                                                    { value: 'apartment', label: 'Apartment' },
                                                    { value: 'townhouse', label: 'Townhouse' },
                                                    { value: 'unit', label: 'Unit' },
                                                ]}
                                                value={propertyType}
                                                onChange={(val) => setPropertyType(val as string)}
                                                placeholder="All"
                                            />
                                        </div>
                                    </div>

                                    {/* Filters Row 2 */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-12">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Keywords</label>
                                            <Input
                                                placeholder="Keywords or Property ID#"
                                                className="bg-gray-50 dark:bg-neutral-900 border-app-color"
                                            />
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="flex flex-wrap justify-between items-center pt-2 gap-4">
                                        <div className="flex flex-wrap gap-4 md:gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Nearby suburbs</span>
                                            </label>

                                            {activeTab === 'rent' && (
                                                <>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Available now</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Pets OK</span>
                                                    </label>
                                                </>
                                            )}

                                            {activeTab === 'sale' && (
                                                <>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Open homes</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">New homes only</span>
                                                    </label>
                                                </>
                                            )}

                                            {activeTab === 'flatmates' && (
                                                <>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Available now</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Couples OK</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Pets OK</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">Smokers OK</span>
                                                    </label>
                                                </>
                                            )}
                                        </div>
                                        <button className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline whitespace-nowrap">
                                            Clear refinements
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
