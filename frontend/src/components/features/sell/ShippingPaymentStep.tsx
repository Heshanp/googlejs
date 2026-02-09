'use client';

import React, { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import {
    ShippingMethod,
    NZ_SHIPPING_PRESETS,
} from '../../../types';
import { getSectionsForCategory } from '../../../config/category-sections.config';
import { Checkbox } from '../../ui/Checkbox';
import { Input } from '../../ui/Input';
import { TextArea } from '../../ui/TextArea';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';
import {
    Truck,
    CreditCard,
    RotateCcw,
    Check,
    ChevronDown,
    ChevronUp,
    MapPin,
    Clock,
    DollarSign,
    Package,

    Car,
    Eye,
    Calendar,
    Phone,
} from 'lucide-react';

interface ShippingPaymentStepProps {
    categorySlug?: string;
    onSaveAsDefaults?: () => void;
}

/**
 * Category-aware Shipping/Pickup/Viewing step
 * Adapts sections based on detected category:
 * - Vehicles: Pickup, Viewing, Transport quote
 * - Electronics: Shipping, Returns
 * - Property: Viewing only
 */
export const ShippingPaymentStep: React.FC<ShippingPaymentStepProps> = ({
    categorySlug = 'other',
    onSaveAsDefaults,
}) => {
    const { control, watch, setValue } = useFormContext();
    const config = getSectionsForCategory(categorySlug);

    const [expandedSections, setExpandedSections] = useState({
        shipping: true,
        pickup: true,
        viewing: true,
        payment: true,
        returns: false,
        transport: false,
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Watch values
    const shippingOptions = watch('shippingOptions');
    const returnsPolicy = watch('returnsPolicy');


    // Simplified expanding logic: just keep shipping open by default, others follow.
    // Actually for dense layout, we might just show them all sequentially or minimal toggles.
    // Let's keep them all open but formatted simply.

    return (
        <div className="space-y-5">
            {/* Dynamic Helper - Minimal */}


            {/* ===================== SHIPPING & PICKUP ===================== */}
            {(config.hasShipping || config.hasPickup) && (
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Delivery</h3>

                    {/* 1. Pickup Options */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Pick-up</label>
                        <Controller
                            name="shippingOptions.pickupOption"
                            control={control}
                            defaultValue="allowed"
                            render={({ field }) => (
                                <div className="space-y-1">
                                    {[
                                        { value: 'no_pickup', label: 'No pick-up' },
                                        { value: 'allowed', label: 'Pick-up available' },
                                        { value: 'must_pickup', label: 'Buyer must pick-up' },
                                    ].map((option) => (
                                        <label
                                            key={option.value}
                                            className="flex items-center gap-2 cursor-pointer group py-1"
                                        >
                                            <input
                                                type="radio"
                                                className="w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                                checked={field.value === option.value}
                                                onChange={() => field.onChange(option.value)}
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                {option.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        />
                    </div>

                    {/* 2. Shipping Options */}
                    {shippingOptions?.pickupOption !== 'must_pickup' && (
                        <div className="space-y-2 pt-2">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Shipping</label>
                            <Controller
                                name="shippingOptions.shippingType"
                                control={control}
                                defaultValue="custom"
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 cursor-pointer py-0.5">
                                            <input
                                                type="radio"
                                                className="w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                                checked={field.value === 'free'}
                                                onChange={() => field.onChange('free')}
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">Free shipping</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer py-0.5">
                                            <input
                                                type="radio"
                                                className="w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                                checked={field.value === 'custom'}
                                                onChange={() => field.onChange('custom')}
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">Custom costs</span>
                                        </label>

                                        {/* Dynamic Cost List */}
                                        {field.value === 'custom' && (
                                            <div className="pl-6 space-y-2 py-1">
                                                <Controller
                                                    name="shippingOptions.customCosts"
                                                    control={control}
                                                    defaultValue={[{ cost: '', description: '' }]}
                                                    render={({ field: costsField }) => {
                                                        const costs = costsField.value || [{ cost: '', description: '' }];
                                                        return (
                                                            <div className="space-y-2">
                                                                {costs.map((item: any, index: number) => (
                                                                    <div key={index} className="grid grid-cols-[80px_1fr] gap-2 items-center">
                                                                        <div className="relative">
                                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                                                                            <input
                                                                                type="number"
                                                                                placeholder="0.00"
                                                                                className="w-full text-xs pl-5 py-1.5 rounded border-app-color bg-white dark:bg-neutral-800"
                                                                                value={item.cost}
                                                                                onChange={(e) => {
                                                                                    const newCosts = [...costs];
                                                                                    newCosts[index].cost = e.target.value;
                                                                                    costsField.onChange(newCosts);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <input
                                                                            placeholder="e.g. Nationwide"
                                                                            className="w-full text-xs py-1.5 rounded border-app-color bg-white dark:bg-neutral-800"
                                                                            value={item.description}
                                                                            onChange={(e) => {
                                                                                const newCosts = [...costs];
                                                                                newCosts[index].description = e.target.value;
                                                                                costsField.onChange(newCosts);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => costsField.onChange([...costs, { cost: '', description: '' }])}
                                                                    className="text-[10px] text-indigo-600 hover:underline font-medium"
                                                                >
                                                                    + Add option
                                                                </button>
                                                            </div>
                                                        );
                                                    }}
                                                />
                                            </div>
                                        )}

                                        <label className="flex items-center gap-2 cursor-pointer py-0.5">
                                            <input
                                                type="radio"
                                                className="w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                                checked={field.value === 'undecided'}
                                                onChange={() => field.onChange('undecided')}
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">I don't know yet</span>
                                        </label>
                                    </div>
                                )}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ===================== VIEWING SECTION ===================== */}
            {config.hasViewing && (
                <div className="space-y-4 border-t border-app-color pt-4">
                    <h3 className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Viewing</h3>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Availability</label>
                        <Controller
                            name="viewingAvailability"
                            control={control}
                            render={({ field }) => (
                                <div className="flex flex-wrap gap-1.5">
                                    {['Weekdays', 'Evenings', 'Weekends', 'By Appt.'].map(option => {
                                        const values = field.value || [];
                                        const isSelected = values.includes(option);
                                        return (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        field.onChange(values.filter((v: string) => v !== option));
                                                    } else {
                                                        field.onChange([...values, option]);
                                                    }
                                                }}
                                                className={cn(
                                                    "px-2 py-1 rounded text-xs font-medium transition-colors border",
                                                    isSelected
                                                        ? "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300"
                                                        : "bg-white dark:bg-neutral-900 border-app-color text-slate-600 dark:text-slate-400 hover:border-slate-300"
                                                )}
                                            >
                                                {option}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        />
                    </div>

                    {categorySlug === 'vehicles' && (
                        <Controller
                            name="testDriveAvailable"
                            control={control}
                            render={({ field }) => (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={field.value ?? true}
                                        onChange={(e) => field.onChange(e.target.checked)}
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Test drives allowed</span>
                                </label>
                            )}
                        />
                    )}
                </div>
            )}

            {/* ===================== PAYMENT SECTION ===================== */}
            <div className="space-y-4 border-t border-app-color pt-4">
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Payment</h3>
                <div className="space-y-2">
                    <Controller
                        name="paymentMethods.acceptsBankTransfer"
                        control={control}
                        render={({ field }) => (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-green-600 focus:ring-green-500"
                                    checked={field.value}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Bank Transfer</span>
                            </label>
                        )}
                    />
                    <Controller
                        name="paymentMethods.acceptsCash"
                        control={control}
                        render={({ field }) => (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-green-600 focus:ring-green-500"
                                    checked={field.value}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Cash</span>
                            </label>
                        )}
                    />
                    <Controller
                        name="paymentMethods.acceptsOther"
                        control={control}
                        render={({ field }) => (
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-green-600 focus:ring-green-500"
                                        checked={field.value}
                                        onChange={(e) => field.onChange(e.target.checked)}
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Other</span>
                                </label>
                                {field.value && (
                                    <Controller
                                        name="paymentMethods.otherPaymentDetails"
                                        control={control}
                                        defaultValue=""
                                        render={({ field: inputField }) => (
                                            <Input
                                                {...inputField}
                                                placeholder="e.g. Crypto, Barter"
                                                className="h-8 text-xs ml-6 w-[80%]"
                                            />
                                        )}
                                    />
                                )}
                            </div>
                        )}
                    />
                </div>
            </div>

            {/* ===================== RETURNS ===================== */}
            {config.hasReturns && (
                <div className="space-y-4 border-t border-app-color pt-4">
                    <h3 className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">Returns</h3>
                    <Controller
                        name="returnsPolicy.acceptsReturns"
                        control={control}
                        render={({ field }) => (
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                        checked={field.value ?? false}
                                        onChange={(e) => field.onChange(e.target.checked)}
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">Accept Returns</span>
                                </label>

                                {field.value && (
                                    <div className="ml-6 space-y-3">
                                        <Controller
                                            name="returnsPolicy.returnWindow"
                                            control={control}
                                            render={({ field }) => (
                                                <div className="flex gap-1.5">
                                                    {[7, 14, 30].map(days => (
                                                        <button
                                                            key={days}
                                                            type="button"
                                                            onClick={() => field.onChange(days)}
                                                            className={cn(
                                                                "px-2 py-1 rounded text-[10px] font-medium transition-colors border",
                                                                field.value === days
                                                                    ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-300"
                                                                    : "bg-white dark:bg-neutral-900 border-app-color text-slate-500 hover:border-slate-300"
                                                            )}
                                                        >
                                                            {days} days
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        />
                                        <Controller
                                            name="returnsPolicy.buyerPaysReturn"
                                            control={control}
                                            render={({ field }) => (
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-3 h-3 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                                                        checked={field.value ?? true}
                                                        onChange={(e) => field.onChange(e.target.checked)}
                                                    />
                                                    <span className="text-xs text-slate-500">Buyer pays shipping</span>
                                                </label>
                                            )}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    />
                </div>
            )}

            {/* Save as Defaults */}
            {onSaveAsDefaults && (
                <div className="border-t border-app-color pt-4">
                    <button
                        type="button"
                        onClick={onSaveAsDefaults}
                        className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1.5"
                    >
                        <Package className="w-3 h-3" />
                        Save as default settings
                    </button>
                </div>
            )}
        </div>
    );
};
