/**
 * Master Field Registry
 * 
 * A flat pool of all possible listing fields.
 * AI determines which fields are relevant for each item.
 * This replaces the category-based field lookup system.
 */

import { FieldType, FieldSchema } from '../types/category-fields.types';
import { VEHICLE_MAKES } from '../data/vehicle-makes-models';

/**
 * Master registry of all listing fields.
 * Each field has a unique ID that the AI uses to select relevant fields.
 */
export const FIELD_REGISTRY: Record<string, FieldSchema> = {
    // =========================================================================
    // VEHICLE FIELDS
    // =========================================================================
    make: {
        id: 'make',
        label: 'Make',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 1,
        options: VEHICLE_MAKES.map(make => ({ label: make, value: make })),
    },
    model: {
        id: 'model',
        label: 'Model',
        type: FieldType.TEXT,
        required: false,
        placeholder: 'e.g., Corolla, Civic, F-150',
        displayPriority: 2,
    },
    year: {
        id: 'year',
        label: 'Year',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 3,
        options: Array.from({ length: 35 }, (_, i) => {
            const year = new Date().getFullYear() - i;
            return { label: String(year), value: String(year) };
        }),
    },
    body_type: {
        id: 'body_type',
        label: 'Body Type',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 4,
        options: [
            { label: 'Sedan', value: 'Sedan' },
            { label: 'Hatchback', value: 'Hatchback' },
            { label: 'SUV', value: 'SUV' },
            { label: 'Wagon', value: 'Wagon' },
            { label: 'Ute', value: 'Ute' },
            { label: 'Van', value: 'Van' },
            { label: 'Coupe', value: 'Coupe' },
            { label: 'Convertible', value: 'Convertible' },
        ],
    },
    transmission: {
        id: 'transmission',
        label: 'Transmission',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 5,
        options: [
            { label: 'Automatic', value: 'Automatic' },
            { label: 'Manual', value: 'Manual' },
            { label: 'CVT', value: 'CVT' },
        ],
    },
    fuel_type: {
        id: 'fuel_type',
        label: 'Fuel Type',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 6,
        options: [
            { label: 'Petrol', value: 'Petrol' },
            { label: 'Diesel', value: 'Diesel' },
            { label: 'Hybrid', value: 'Hybrid' },
            { label: 'Electric', value: 'Electric' },
            { label: 'Plug-in Hybrid', value: 'Plug-in Hybrid' },
        ],
    },
    mileage: {
        id: 'mileage',
        label: 'Mileage (km)',
        type: FieldType.NUMBER,
        required: false,
        placeholder: 'e.g., 85000',
        helpText: 'Odometer reading in kilometers',
        displayPriority: 7,
        unit: 'km',
    },
    engine_size: {
        id: 'engine_size',
        label: 'Engine Size',
        type: FieldType.TEXT,
        required: false,
        placeholder: 'e.g., 2.0L, 3.5L',
        displayPriority: 8,
    },
    drive_type: {
        id: 'drive_type',
        label: 'Drive Type',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 9,
        options: [
            { label: 'Front-Wheel Drive (FWD)', value: 'FWD' },
            { label: 'Rear-Wheel Drive (RWD)', value: 'RWD' },
            { label: 'All-Wheel Drive (AWD)', value: 'AWD' },
            { label: 'Four-Wheel Drive (4WD)', value: '4WD' },
        ],
    },

    // =========================================================================
    // PHONE/TABLET FIELDS
    // =========================================================================
    brand: {
        id: 'brand',
        label: 'Brand',
        type: FieldType.TEXT,
        required: false,
        placeholder: 'e.g., Apple, Samsung, Sony',
        filterable: true,
        displayPriority: 1,
    },
    model_name: {
        id: 'model_name',
        label: 'Model',
        type: FieldType.TEXT,
        required: false,
        placeholder: 'e.g., iPhone 15 Pro, Galaxy S24',
        displayPriority: 2,
    },
    storage_capacity: {
        id: 'storage_capacity',
        label: 'Storage',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 3,
        options: [
            { label: '32GB', value: '32GB' },
            { label: '64GB', value: '64GB' },
            { label: '128GB', value: '128GB' },
            { label: '256GB', value: '256GB' },
            { label: '512GB', value: '512GB' },
            { label: '1TB', value: '1TB' },
            { label: '2TB', value: '2TB' },
        ],
    },
    screen_condition: {
        id: 'screen_condition',
        label: 'Screen Condition',
        type: FieldType.SELECT,
        required: false,
        displayPriority: 4,
        options: [
            { label: 'Perfect', value: 'Perfect' },
            { label: 'Minor Scratches', value: 'Minor Scratches' },
            { label: 'Cracked', value: 'Cracked' },
        ],
    },
    battery_health: {
        id: 'battery_health',
        label: 'Battery Health',
        type: FieldType.SELECT,
        required: false,
        displayPriority: 5,
        options: [
            { label: '90-100%', value: '90-100%' },
            { label: '80-89%', value: '80-89%' },
            { label: '70-79%', value: '70-79%' },
            { label: 'Below 70%', value: 'Below 70%' },
            { label: 'Unknown', value: 'Unknown' },
        ],
    },

    // =========================================================================
    // COMPUTER FIELDS
    // =========================================================================
    computer_type: {
        id: 'computer_type',
        label: 'Type',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 1,
        options: [
            { label: 'Laptop', value: 'Laptop' },
            { label: 'Desktop', value: 'Desktop' },
            { label: 'All-in-One', value: 'All-in-One' },
            { label: 'Tablet', value: 'Tablet' },
        ],
    },
    processor: {
        id: 'processor',
        label: 'Processor',
        type: FieldType.TEXT,
        required: false,
        placeholder: 'e.g., Intel i7-12700, M3 Pro, Ryzen 7',
        displayPriority: 2,
    },
    ram: {
        id: 'ram',
        label: 'RAM',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 3,
        options: [
            { label: '4GB', value: '4GB' },
            { label: '8GB', value: '8GB' },
            { label: '16GB', value: '16GB' },
            { label: '32GB', value: '32GB' },
            { label: '64GB', value: '64GB' },
        ],
    },
    storage_type: {
        id: 'storage_type',
        label: 'Storage Type',
        type: FieldType.SELECT,
        required: false,
        displayPriority: 4,
        options: [
            { label: 'SSD', value: 'SSD' },
            { label: 'HDD', value: 'HDD' },
            { label: 'NVMe', value: 'NVMe' },
        ],
    },
    screen_size: {
        id: 'screen_size',
        label: 'Screen Size',
        type: FieldType.NUMBER,
        required: false,
        placeholder: 'e.g., 15.6',
        helpText: 'Display size in inches',
        displayPriority: 5,
        unit: 'inches',
    },
    graphics_card: {
        id: 'graphics_card',
        label: 'Graphics Card',
        type: FieldType.TEXT,
        required: false,
        placeholder: 'e.g., RTX 4080, M3 Pro GPU',
        displayPriority: 6,
    },

    // =========================================================================
    // AUDIO/ELECTRONICS FIELDS
    // =========================================================================
    audio_type: {
        id: 'audio_type',
        label: 'Type',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 1,
        options: [
            { label: 'Headphones', value: 'Headphones' },
            { label: 'Earbuds', value: 'Earbuds' },
            { label: 'Speaker', value: 'Speaker' },
            { label: 'Soundbar', value: 'Soundbar' },
            { label: 'Turntable', value: 'Turntable' },
            { label: 'Receiver', value: 'Receiver' },
            { label: 'Other', value: 'Other' },
        ],
    },
    wireless: {
        id: 'wireless',
        label: 'Wireless',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 2,
        options: [
            { label: 'Yes', value: 'true' },
            { label: 'No', value: 'false' },
        ],
    },
    connectivity: {
        id: 'connectivity',
        label: 'Connectivity',
        type: FieldType.SELECT,
        required: false,
        displayPriority: 3,
        options: [
            { label: 'Bluetooth', value: 'Bluetooth' },
            { label: 'Wired', value: 'Wired' },
            { label: 'Both', value: 'Both' },
        ],
    },

    // =========================================================================
    // FASHION FIELDS
    // =========================================================================
    size: {
        id: 'size',
        label: 'Size',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 1,
        options: [
            { label: 'XS', value: 'XS' },
            { label: 'S', value: 'S' },
            { label: 'M', value: 'M' },
            { label: 'L', value: 'L' },
            { label: 'XL', value: 'XL' },
            { label: 'XXL', value: 'XXL' },
            { label: 'Other', value: 'Other' },
        ],
    },
    color: {
        id: 'color',
        label: 'Color',
        type: FieldType.TEXT,
        required: false,
        placeholder: 'e.g., Black, Navy Blue, Red',
        displayPriority: 2,
    },
    material: {
        id: 'material',
        label: 'Material',
        type: FieldType.SELECT,
        required: false,
        displayPriority: 3,
        options: [
            { label: 'Cotton', value: 'Cotton' },
            { label: 'Wool', value: 'Wool' },
            { label: 'Polyester', value: 'Polyester' },
            { label: 'Leather', value: 'Leather' },
            { label: 'Denim', value: 'Denim' },
            { label: 'Silk', value: 'Silk' },
            { label: 'Wood', value: 'Wood' },
            { label: 'Metal', value: 'Metal' },
            { label: 'Fabric', value: 'Fabric' },
            { label: 'Glass', value: 'Glass' },
            { label: 'Plastic', value: 'Plastic' },
            { label: 'Other', value: 'Other' },
        ],
    },
    gender: {
        id: 'gender',
        label: 'Gender',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 4,
        options: [
            { label: 'Men', value: 'Men' },
            { label: 'Women', value: 'Women' },
            { label: 'Unisex', value: 'Unisex' },
            { label: 'Kids', value: 'Kids' },
        ],
    },
    style: {
        id: 'style',
        label: 'Style',
        type: FieldType.SELECT,
        required: false,
        displayPriority: 5,
        options: [
            { label: 'Casual', value: 'Casual' },
            { label: 'Formal', value: 'Formal' },
            { label: 'Sport', value: 'Sport' },
            { label: 'Vintage', value: 'Vintage' },
            { label: 'Modern', value: 'Modern' },
            { label: 'Traditional', value: 'Traditional' },
            { label: 'Scandinavian', value: 'Scandinavian' },
            { label: 'Industrial', value: 'Industrial' },
            { label: 'Mid-Century', value: 'Mid-Century' },
        ],
    },

    // =========================================================================
    // FURNITURE FIELDS
    // =========================================================================
    dimensions: {
        id: 'dimensions',
        label: 'Dimensions',
        type: FieldType.TEXT,
        required: false,
        placeholder: 'e.g., 120cm x 60cm x 75cm',
        helpText: 'Length x Width x Height',
        displayPriority: 3,
    },

    // =========================================================================
    // INSTRUMENT FIELDS
    // =========================================================================
    instrument_type: {
        id: 'instrument_type',
        label: 'Instrument Type',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 1,
        options: [
            { label: 'Guitar', value: 'Guitar' },
            { label: 'Bass', value: 'Bass' },
            { label: 'Keyboard/Piano', value: 'Keyboard' },
            { label: 'Drums', value: 'Drums' },
            { label: 'Violin/Strings', value: 'Violin' },
            { label: 'Wind Instrument', value: 'Wind' },
            { label: 'DJ Equipment', value: 'DJ Equipment' },
            { label: 'Other', value: 'Other' },
        ],
    },
    includes: {
        id: 'includes',
        label: 'Includes',
        type: FieldType.TEXT,
        required: false,
        placeholder: 'e.g., Case, Amp, Stand, Cables',
        displayPriority: 2,
    },

    // =========================================================================
    // SPORTS/OUTDOOR FIELDS
    // =========================================================================
    sport_type: {
        id: 'sport_type',
        label: 'Sport Type',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 1,
        options: [
            { label: 'Cycling', value: 'Cycling' },
            { label: 'Camping', value: 'Camping' },
            { label: 'Fitness', value: 'Fitness' },
            { label: 'Running', value: 'Running' },
            { label: 'Team Sports', value: 'Team Sports' },
            { label: 'Water Sports', value: 'Water Sports' },
            { label: 'Winter Sports', value: 'Winter Sports' },
            { label: 'Other', value: 'Other' },
        ],
    },

    // =========================================================================
    // PET FIELDS
    // =========================================================================
    pet_type: {
        id: 'pet_type',
        label: 'Pet Type',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 1,
        options: [
            { label: 'Dog', value: 'Dog' },
            { label: 'Cat', value: 'Cat' },
            { label: 'Bird', value: 'Bird' },
            { label: 'Fish', value: 'Fish' },
            { label: 'Rabbit', value: 'Rabbit' },
            { label: 'Reptile', value: 'Reptile' },
            { label: 'Pet Supplies', value: 'Pet Supplies' },
            { label: 'Other', value: 'Other' },
        ],
    },
    breed: {
        id: 'breed',
        label: 'Breed',
        type: FieldType.TEXT,
        required: false,
        placeholder: 'e.g., Golden Retriever, Persian',
        displayPriority: 2,
    },
    age: {
        id: 'age',
        label: 'Age',
        type: FieldType.TEXT,
        required: false,
        placeholder: 'e.g., 2 years, 6 months',
        displayPriority: 3,
    },
    vaccinated: {
        id: 'vaccinated',
        label: 'Vaccinated',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 4,
        options: [
            { label: 'Yes', value: 'Yes' },
            { label: 'No', value: 'No' },
            { label: 'Unknown', value: 'Unknown' },
        ],
    },

    // =========================================================================
    // HOME/GARDEN FIELDS
    // =========================================================================
    appliance_type: {
        id: 'appliance_type',
        label: 'Type',
        type: FieldType.TEXT,
        required: false,
        placeholder: 'e.g., Blender, Vacuum, Lawn Mower',
        displayPriority: 1,
    },
    power_source: {
        id: 'power_source',
        label: 'Power Source',
        type: FieldType.SELECT,
        required: false,
        displayPriority: 2,
        options: [
            { label: 'Electric', value: 'Electric' },
            { label: 'Battery', value: 'Battery' },
            { label: 'Manual', value: 'Manual' },
            { label: 'Gas', value: 'Gas' },
        ],
    },

    // =========================================================================
    // GENERIC FIELDS (can apply to any item)
    // =========================================================================
    condition: {
        id: 'condition',
        label: 'Condition',
        type: FieldType.SELECT,
        required: false,
        filterable: true,
        displayPriority: 10,
        options: [
            { label: 'New', value: 'New' },
            { label: 'Like New', value: 'Like New' },
            { label: 'Good', value: 'Good' },
            { label: 'Fair', value: 'Fair' },
        ],
    },
};

/**
 * Get a field schema by its ID
 */
export function getFieldById(id: string): FieldSchema | undefined {
    return FIELD_REGISTRY[id];
}

/**
 * Get multiple field schemas by their IDs
 * Returns fields in the order specified, filtering out any unknown IDs
 */
export function getFieldsByIds(ids: string[]): FieldSchema[] {
    return ids
        .map(id => FIELD_REGISTRY[id])
        .filter((field): field is FieldSchema => field !== undefined)
        .sort((a, b) => (a.displayPriority || 99) - (b.displayPriority || 99));
}

/**
 * Get all available field IDs
 */
export function getAllFieldIds(): string[] {
    return Object.keys(FIELD_REGISTRY);
}

/**
 * Get all filterable fields
 */
export function getFilterableFields(): FieldSchema[] {
    return Object.values(FIELD_REGISTRY).filter(field => field.filterable);
}

/**
 * Default fallback fields when AI returns no suggestions
 */
export const DEFAULT_FALLBACK_FIELDS = ['condition'];
