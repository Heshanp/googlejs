import React, { useEffect, useState } from 'react';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sparkles, Trash2, ArrowRight, RefreshCw, X, ChevronLeft, Save, Brain, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { AIDirectedFields } from './AIDirectedFields';
import { cn } from '../../../lib/utils';
import { FIELD_REGISTRY } from '../../../config/field-registry';
import { ShippingPaymentStep } from './ShippingPaymentStep';
import { LocationPicker } from './LocationPicker';
import { ExpirationPicker } from './ExpirationPicker';
import { DEFAULT_SHIPPING_OPTIONS, DEFAULT_PAYMENT_METHODS, DEFAULT_RETURNS_POLICY, Location } from '../../../types';
import { StudioVisuals } from './StudioVisuals';
import { StudioImageSlot } from '../../../types/studio-image.types';
import { normalizeCategory, supportsQuantityForCategory } from '../../../data/categories';

// Extended schema to include shipping and location
const listingSchema = z.object({
    title: z.string().min(5, "Title is too short"),
    subtitle: z.string().max(100, "Subtitle is too long").optional(),
    price: z.preprocess((val) => Number(val) || 0, z.number().min(0, "Price must be positive")),
    quantity: z.preprocess((val) => Number(val) || 1, z.number().min(1, "Quantity must be at least 1")),
    condition: z.string(),
    description: z.string().optional(),
    categoryFields: z.record(z.string(), z.any()).optional(),
    category: z.string().optional(),

    // Shipping & Location
    shippingOptions: z.any().optional(),
    paymentMethods: z.any().optional(),
    returnsPolicy: z.any().optional(),
    pickupLocation: z.string().optional(),
    viewingAvailability: z.array(z.string()).optional(),
    testDriveAvailable: z.boolean().optional(),
    transportAvailable: z.boolean().optional(),
    transportNotes: z.string().optional(),
    location: z.object({
        suburb: z.string().default(''),
        city: z.string().min(1, "City is required"),
        region: z.string().default(''),
    }).optional(),
    expiresAt: z.string().optional(),
});

// Define form data type explicitly to avoid zod inference issues
interface ListingFormData {
    title: string;
    subtitle?: string;
    price: number;
    quantity: number;
    condition: string;
    description?: string;
    categoryFields?: Record<string, any>;
    category?: string;

    shippingOptions?: any;
    paymentMethods?: any;
    returnsPolicy?: any;
    pickupLocation?: string;
    viewingAvailability?: string[];
    testDriveAvailable?: boolean;
    transportAvailable?: boolean;
    transportNotes?: string;
    location?: Location;
    expiresAt?: string;
    createdAt?: string; // Original creation date (for edit mode)
}

interface StudioFormProps {
    files: StudioImageSlot[];
    onAddFiles: (files: File[]) => void;
    onRemoveFile: (index: number) => void;
    onReorderFiles?: (newOrder: StudioImageSlot[]) => void;
    onEditFile?: (index: number, editedFile: File) => void;
    onGenerateProBackdrop?: (index: number) => void;
    onRestoreOriginal?: (index: number) => void;
    processingSlotIDs?: Set<string>;
    initialData?: Partial<ListingFormData>;
    relevantFields: string[];
    onSaveDraft: (data: ListingFormData) => void;
    onPublish: (data: ListingFormData) => void;
    aiConfidence?: number;
    itemType?: string;
    onDiscard: () => void;
    mode?: 'create' | 'edit';
    aiReasoning?: string;
    aiThinkingSummary?: string;
    fieldConfidence?: Record<string, number>;
    onDelete?: () => void;
    isPublishing?: boolean;
}

export const StudioForm: React.FC<StudioFormProps> = ({
    files,
    onAddFiles,
    onRemoveFile,
    onReorderFiles,
    onEditFile,
    onGenerateProBackdrop,
    onRestoreOriginal,
    processingSlotIDs,
    initialData,
    relevantFields,
    onSaveDraft,
    onPublish,
    aiConfidence,
    itemType,
    onDiscard,
    mode = 'create',
    aiReasoning,
    aiThinkingSummary,
    fieldConfidence,
    onDelete,
    isPublishing = false,
}) => {
    const [reasoningExpanded, setReasoningExpanded] = useState(false);
    // Map itemType to category slug for ShippingPaymentStep config
    const categorySlug = itemType === 'vehicle' ? 'vehicles' :
        itemType === 'phone' ? 'electronics' :
            itemType === 'computer' ? 'electronics' : 'other';
    const fallbackCategoryForQuantity = itemType === 'vehicle' ||
        itemType === 'bike' ||
        itemType === 'motorcycle' ||
        itemType === 'boat'
        ? 'vehicles'
        : 'general';

    const methods = useForm<ListingFormData>({
        resolver: zodResolver(listingSchema) as any,
        defaultValues: {
            title: '',
            subtitle: '',
            price: 0,
            quantity: 1,
            condition: 'Like New', // Default
            description: '',
            categoryFields: {},
            category: '',

            shippingOptions: DEFAULT_SHIPPING_OPTIONS,
            paymentMethods: DEFAULT_PAYMENT_METHODS,
            returnsPolicy: DEFAULT_RETURNS_POLICY,
            pickupLocation: '',
            viewingAvailability: [],
            testDriveAvailable: true,
            transportAvailable: false,
            transportNotes: '',
            location: { suburb: '', city: '', region: '' },
            ...initialData
        },
        mode: 'onBlur'
    });

    const { register, control, handleSubmit, formState: { errors, isValid }, reset, setValue, watch, getValues } = methods;

    // Auto-resize title textarea
    const titleRef = React.useRef<HTMLTextAreaElement | null>(null);
    const titleValue = watch('title');
    const quantityValue = watch('quantity');
    const selectedCategory = watch('category');
    const shouldShowQuantity = supportsQuantityForCategory(
        normalizeCategory(selectedCategory || fallbackCategoryForQuantity)
    );
    const { ref: titleRegisterRef, ...titleRest } = register('title');

    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
        }
    }, [titleValue]);

    // Force quantity to a neutral default for categories that do not use stock counts.
    useEffect(() => {
        if (!shouldShowQuantity && Number(quantityValue || 1) !== 1) {
            setValue('quantity', 1, { shouldValidate: true });
        }
    }, [shouldShowQuantity, quantityValue, setValue]);

    // Update form when initialData changes (e.g. after AI analysis)
    useEffect(() => {
        if (initialData) {
            // Ensure category is properly set (could come from AI analysis or existing listing)
            const categoryValue = initialData.category || '';

            reset({
                ...initialData, // Spread first so explicit fields can override
                title: initialData.title || '',
                price: initialData.price || 0,
                condition: initialData.condition || 'Like New',
                description: initialData.description || '',
                categoryFields: initialData.categoryFields || {},
                category: categoryValue,

                shippingOptions: initialData.shippingOptions || DEFAULT_SHIPPING_OPTIONS,
                paymentMethods: initialData.paymentMethods || DEFAULT_PAYMENT_METHODS,
                returnsPolicy: initialData.returnsPolicy || DEFAULT_RETURNS_POLICY,
                location: typeof initialData.location === 'string'
                    ? { suburb: '', city: initialData.location, region: '' }
                    : (initialData.location || { suburb: '', city: '', region: '' }),
            });
        }
    }, [initialData, reset]);

    const handlePublish = (data: ListingFormData) => {
        onPublish(data);
    };

    return (
        <FormProvider {...methods}>
            <div className="flex flex-col lg:flex-row min-h-screen w-full bg-slate-50 dark:bg-black p-phi-13 gap-phi-13">

                {/* COLUMN 1: Visuals Sidebar */}
                <div className="w-full lg:w-[280px] flex-shrink-0 bg-white dark:bg-neutral-900 border-app-color flex flex-col h-auto lg:h-full order-1 rounded-2xl border shadow-sm overflow-hidden self-start">
                    <div className="px-4 py-3 border-b border-app-color flex-shrink-0">
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Media</h3>
                    </div>
                    <div className="flex-1 p-0">
                        <StudioVisuals
                            key={files.map((slot) => slot.slotId).join(',')}
                            images={files}
                            onAddImages={onAddFiles}
                            onRemoveImage={onRemoveFile}
                            onReorderImages={onReorderFiles}
                            onEditImage={onEditFile}
                            onGenerateProBackdrop={onGenerateProBackdrop}
                            onRestoreOriginal={onRestoreOriginal}
                            processingSlotIDs={processingSlotIDs}
                            mode="vertical"
                        />
                    </div>
                </div>

                {/* COLUMN 2: Main Content */}
                <div className="w-full lg:flex-1 flex flex-col min-w-0 h-auto order-2 rounded-2xl border border-app-color shadow-sm overflow-hidden bg-white dark:bg-neutral-900">
                    {/* Compact Header */}
                    <div className="h-14 flex items-center justify-between px-6 bg-white dark:bg-neutral-900 border-b border-app-color z-10 flex-shrink-0 sticky top-0">
                        <div>
                            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Create Listing</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleSubmit(handlePublish)}
                                isLoading={isPublishing}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 h-8 text-xs font-medium"
                                aria-live="polite"
                            >
                                {isPublishing ? (mode === 'edit' ? 'Updating...' : 'Publishing...') : (mode === 'edit' ? 'Update' : 'Publish')}
                            </Button>
                            {mode === 'edit' && onDelete && (
                                <Button
                                    onClick={onDelete}
                                    variant="ghost"
                                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400 h-8 text-xs font-medium px-2 ml-2"
                                    title="Delete Listing"
                                    disabled={isPublishing}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>


                    <div className="w-full flex-1 bg-slate-50 dark:bg-black/50">
                        <div className="max-w-phi-content mx-auto px-phi-13 lg:px-phi-34 pt-phi-8 space-y-phi-21 pb-phi-34">



                            <div className="space-y-phi-13">
                                <input type="hidden" {...register('category')} />
                                <div>
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-1 block">Title</label>
                                    <div className="flex flex-col gap-0">
                                        <textarea
                                            {...titleRest}
                                            ref={(e) => {
                                                titleRegisterRef(e);
                                                titleRef.current = e;
                                            }}
                                            rows={1}
                                            className="w-full text-2xl font-semibold text-slate-900 dark:text-white bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-neutral-800 focus:border-indigo-500 focus:ring-0 rounded px-2 -mx-2 transition-all placeholder:text-slate-300 dark:placeholder:text-neutral-700 resize-none leading-tight overflow-hidden py-1"
                                            placeholder="Item Title"
                                        />
                                        <div className="px-2 -mx-2">
                                            <input
                                                {...register('subtitle')}
                                                type="text"
                                                maxLength={100}
                                                className="w-full text-sm text-slate-500 dark:text-slate-400 bg-transparent border-none p-0 focus:ring-0 placeholder:text-slate-300 dark:placeholder:text-neutral-600 h-6"
                                                placeholder="Add a short subtitle (optional)"
                                            />
                                        </div>
                                    </div>
                                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                                </div>

                                <div className={cn(
                                    "grid gap-4 bg-white dark:bg-neutral-900 p-4 rounded-lg border border-app-color shadow-sm",
                                    shouldShowQuantity ? "grid-cols-4" : "grid-cols-3"
                                )}>
                                    <div className="col-span-1">
                                        <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-1 block">Price</label>
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm text-slate-400 dark:text-neutral-600 font-medium">$</span>
                                            <input
                                                {...register('price')}
                                                type="number"
                                                className="w-full text-lg font-medium text-slate-900 dark:text-white border-none py-0 px-0 focus:ring-0 bg-transparent"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    {shouldShowQuantity && (
                                        <div className="col-span-1 border-l border-app-color pl-4">
                                            <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-1 block">Quantity</label>
                                            <input
                                                {...register('quantity')}
                                                type="number"
                                                min={1}
                                                className="w-full text-lg font-medium text-slate-900 dark:text-white border-none py-0 px-0 focus:ring-0 bg-transparent"
                                                placeholder="1"
                                            />
                                        </div>
                                    )}
                                    <div className="col-span-2 border-l border-app-color pl-4">
                                        <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-1 block">Condition</label>
                                        <select
                                            {...register('condition')}
                                            className="w-full bg-transparent border-none p-0 text-sm text-slate-900 dark:text-white font-medium focus:ring-0 cursor-pointer"
                                        >
                                            <option value="New">New</option>
                                            <option value="Like New">Like New</option>
                                            <option value="Good">Good</option>
                                            <option value="Fair">Fair</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-2 flex items-center justify-between">
                                        Description
                                        <button type="button" className="text-indigo-600 dark:text-indigo-400 normal-case text-[10px] hover:underline flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                                            <RefreshCw className="w-3 h-3" /> Regenerate with AI
                                        </button>
                                    </label>
                                    <textarea
                                        {...register('description')}
                                        rows={12}
                                        className="w-full bg-white dark:bg-neutral-900 border border-app-color rounded-lg p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none placeholder:text-slate-400 dark:placeholder:text-neutral-600 shadow-sm"
                                        placeholder="Describe your item in detail..."
                                    />
                                    {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                                </div>
                            </div>

                            {/* Dynamic Fields */}
                            {relevantFields.length > 0 && (
                                <div className="space-y-3">
                                    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-app-color p-4 shadow-sm">
                                        <Controller
                                            name="categoryFields"
                                            control={control}
                                            render={({ field }) => (
                                                <AIDirectedFields
                                                    relevantFields={relevantFields}
                                                    values={field.value || {}}
                                                    onChange={(key, value) => {
                                                        field.onChange({
                                                            ...field.value,
                                                            [key]: value
                                                        });
                                                    }}
                                                    errors={errors.categoryFields as any}
                                                />
                                            )}
                                        />
                                    </div>
                                </div>
                            )}


                        </div>
                    </div>
                </div>

                {/* COLUMN 3: Right Sidebar (Config) */}
                <div className="w-full lg:w-[340px] flex-shrink-0 bg-white dark:bg-neutral-900 border-app-color flex flex-col h-auto lg:h-full order-3 rounded-2xl border shadow-sm overflow-hidden self-start">
                    <div className="px-5 py-3 border-b border-app-color flex-shrink-0">
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Configuration</h3>
                    </div>
                    <div className="flex-1 px-5 py-4 space-y-5">

                        {/* Location */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wide flex items-center gap-2">
                                Location
                            </h4>
                            <Controller
                                name="location"
                                control={control}
                                render={({ field }) => (
                                    <LocationPicker
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors.location?.message as string}
                                    />
                                )}
                            />
                        </div>

                        <div className="border-t border-app-color"></div>

                        {/* Expiration */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wide flex items-center gap-2">
                                Expiration
                            </h4>
                            <Controller
                                name="expiresAt"
                                control={control}
                                render={({ field }) => (
                                    <ExpirationPicker
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors.expiresAt?.message as string}
                                        createdAt={initialData?.createdAt}
                                    />
                                )}
                            />
                        </div>

                        <div className="border-t border-app-color"></div>

                        {/* Shipping & Payment */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-neutral-300 uppercase tracking-wide flex items-center gap-2">
                                Fulfillment
                            </h4>
                            <ShippingPaymentStep categorySlug={categorySlug} />
                        </div>



                    </div>
                </div>

            </div>
        </FormProvider >
    );
};
