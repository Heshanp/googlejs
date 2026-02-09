import { CategoryFieldsConfig, FieldType } from '../../types/category-fields.types';
import { VEHICLE_MAKES } from '../../data/vehicle-makes-models';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1989 }, (_, i) => ({
    label: (currentYear + 1 - i).toString(),
    value: (currentYear + 1 - i).toString()
}));

export const vehiclesFields: CategoryFieldsConfig = {
    categorySlug: 'vehicles',
    fields: [
        {
            id: 'make',
            label: 'Make',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 1,
            options: VEHICLE_MAKES.map(make => ({ label: make, value: make }))
        },
        {
            id: 'model',
            label: 'Model',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 2,
            dependsOn: 'make',
            options: [] // Populated dynamically
        },
        {
            id: 'year',
            label: 'Year',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 3,
            options: years
        },
        {
            id: 'body_type',
            label: 'Body Type',
            type: FieldType.SELECT,
            required: true,
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
                { label: 'Other', value: 'Other' }
            ]
        },
        {
            id: 'transmission',
            label: 'Transmission',
            type: FieldType.RADIO,
            required: true,
            filterable: true,
            displayPriority: 5,
            options: [
                { label: 'Automatic', value: 'Automatic' },
                { label: 'Manual', value: 'Manual' },
                { label: 'CVT', value: 'CVT' }
            ]
        },
        {
            id: 'fuel_type',
            label: 'Fuel Type',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 6,
            options: [
                { label: 'Petrol', value: 'Petrol' },
                { label: 'Diesel', value: 'Diesel' },
                { label: 'Hybrid', value: 'Hybrid' },
                { label: 'Electric', value: 'Electric' },
                { label: 'Plug-in Hybrid', value: 'Plug-in Hybrid' },
                { label: 'LPG', value: 'LPG' }
            ]
        },
        {
            id: 'mileage',
            label: 'Mileage',
            type: FieldType.NUMBER,
            required: true,
            filterable: true,
            displayPriority: 7,
            unit: 'km',
            placeholder: 'e.g., 85000',
            validation: { min: 0 }
        },
        {
            id: 'engine_size',
            label: 'Engine Size',
            type: FieldType.NUMBER,
            filterable: true,
            displayPriority: 8,
            unit: 'cc',
            validation: { min: 0, max: 10000 }
        },
        {
            id: 'color',
            label: 'Color',
            type: FieldType.SELECT,
            required: true,
            displayPriority: 9,
            options: [
                { label: 'White', value: 'White' },
                { label: 'Silver', value: 'Silver' },
                { label: 'Black', value: 'Black' },
                { label: 'Grey', value: 'Grey' },
                { label: 'Blue', value: 'Blue' },
                { label: 'Red', value: 'Red' },
                { label: 'Green', value: 'Green' },
                { label: 'Yellow', value: 'Yellow' },
                { label: 'Orange', value: 'Orange' },
                { label: 'Brown', value: 'Brown' },
                { label: 'Gold', value: 'Gold' },
                { label: 'Other', value: 'Other' }
            ]
        },
        {
            id: 'num_owners',
            label: 'Number of Owners',
            type: FieldType.SELECT,
            displayPriority: 10,
            options: [
                { label: '1', value: '1' },
                { label: '2', value: '2' },
                { label: '3', value: '3' },
                { label: '4', value: '4' },
                { label: '5+', value: '5+' }
            ]
        },
        {
            id: 'registration_expires',
            label: 'Registration Expires',
            type: FieldType.TEXT,
            placeholder: 'MM/YYYY',
            displayPriority: 11,
            validation: { pattern: '^(0[1-9]|1[0-2])\\/20[2-9][0-9]$' }
        },
        {
            id: 'wof_expires',
            label: 'WOF Expires',
            type: FieldType.TEXT,
            placeholder: 'MM/YYYY',
            helpText: 'Warrant of Fitness expiry',
            displayPriority: 12,
            validation: { pattern: '^(0[1-9]|1[0-2])\\/20[2-9][0-9]$' }
        },
        {
            id: 'import_history',
            label: 'Import History',
            type: FieldType.RADIO,
            displayPriority: 13,
            options: [
                { label: 'NZ New', value: 'NZ New' },
                { label: 'Imported', value: 'Imported' }
            ]
        },
        {
            id: 'features',
            label: 'Features',
            type: FieldType.MULTI_SELECT,
            displayPriority: 14,
            options: [
                { label: 'Air Conditioning', value: 'Air Conditioning' },
                { label: 'Bluetooth', value: 'Bluetooth' },
                { label: 'Cruise Control', value: 'Cruise Control' },
                { label: 'GPS Navigation', value: 'GPS Navigation' },
                { label: 'Parking Sensors', value: 'Parking Sensors' },
                { label: 'Reversing Camera', value: 'Reversing Camera' },
                { label: 'Sunroof', value: 'Sunroof' },
                { label: 'Leather Seats', value: 'Leather Seats' },
                { label: 'Heated Seats', value: 'Heated Seats' },
                { label: 'Apple CarPlay', value: 'Apple CarPlay' },
                { label: 'Android Auto', value: 'Android Auto' },
                { label: 'Keyless Entry', value: 'Keyless Entry' },
                { label: 'Alloy Wheels', value: 'Alloy Wheels' },
                { label: 'Tow Bar', value: 'Tow Bar' },
                { label: 'Roof Racks', value: 'Roof Racks' }
            ]
        }
    ],
    subcategoryOverrides: {
        'motorcycles': {
            remove: ['body_type', 'num_owners'],
            add: [
                {
                    id: 'motorcycle_type',
                    label: 'Motorcycle Type',
                    type: FieldType.SELECT,
                    required: true,
                    options: [
                        { label: 'Sport', value: 'Sport' },
                        { label: 'Cruiser', value: 'Cruiser' },
                        { label: 'Touring', value: 'Touring' },
                        { label: 'Adventure', value: 'Adventure' },
                        { label: 'Scooter', value: 'Scooter' },
                        { label: 'Dirt/Off-road', value: 'Dirt/Off-road' },
                        { label: 'Naked', value: 'Naked' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'license_type',
                    label: 'License Type',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Learner Approved', value: 'Learner Approved' },
                        { label: 'Full License Required', value: 'Full License Required' }
                    ]
                }
            ]
        },
        'boats': {
            remove: ['body_type', 'transmission', 'fuel_type', 'wof_expires', 'registration_expires', 'mileage'],
            add: [
                {
                    id: 'boat_type',
                    label: 'Boat Type',
                    type: FieldType.SELECT,
                    required: true,
                    options: [
                        { label: 'Yacht', value: 'Yacht' },
                        { label: 'Motor Boat', value: 'Motor Boat' },
                        { label: 'Fishing Boat', value: 'Fishing Boat' },
                        { label: 'Jet Ski', value: 'Jet Ski' },
                        { label: 'Kayak', value: 'Kayak' },
                        { label: 'Dinghy', value: 'Dinghy' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'length',
                    label: 'Length',
                    type: FieldType.NUMBER,
                    required: true,
                    unit: 'm'
                },
                {
                    id: 'hull_material',
                    label: 'Hull Material',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Fibreglass', value: 'Fibreglass' },
                        { label: 'Aluminium', value: 'Aluminium' },
                        { label: 'Wood', value: 'Wood' },
                        { label: 'Inflatable', value: 'Inflatable' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'engine_hours',
                    label: 'Engine Hours',
                    type: FieldType.NUMBER
                },
                {
                    id: 'trailer_included',
                    label: 'Trailer Included',
                    type: FieldType.CHECKBOX
                }
            ]
        },
        'parts': {
            remove: ['body_type', 'transmission', 'fuel_type', 'mileage', 'engine_size', 'color', 'num_owners', 'registration_expires', 'wof_expires', 'import_history', 'features'],
            modify: [
                { id: 'make', required: false },
                { id: 'model', required: false },
                { id: 'year', required: false }
            ],
            add: [
                {
                    id: 'part_type',
                    label: 'Part Type',
                    type: FieldType.TEXT,
                    required: true
                },
                {
                    id: 'part_condition',
                    label: 'Condition',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'New', value: 'New' },
                        { label: 'Used - Excellent', value: 'Used - Excellent' },
                        { label: 'Used - Good', value: 'Used - Good' },
                        { label: 'Used - Fair', value: 'Used - Fair' }
                    ]
                },
                {
                    id: 'fits_models',
                    label: 'Fits Models',
                    type: FieldType.TEXTAREA,
                    helpText: 'List compatible models'
                }
            ]
        }
    }
};
