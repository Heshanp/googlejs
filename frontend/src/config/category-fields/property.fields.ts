import { CategoryFieldsConfig, FieldType } from '../../types/category-fields.types';

export const propertyFields: CategoryFieldsConfig = {
    categorySlug: 'property',
    fields: [
        {
            id: 'listing_type',
            label: 'Listing Type',
            type: FieldType.RADIO,
            required: true,
            filterable: true,
            displayPriority: 1,
            options: [
                { label: 'For Rent', value: 'For Rent' },
                { label: 'Flatmates Wanted', value: 'Flatmates Wanted' },
                { label: 'Parking Space', value: 'Parking Space' }
            ]
        },
        {
            id: 'property_type',
            label: 'Property Type',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 2,
            options: [
                { label: 'House', value: 'House' },
                { label: 'Apartment', value: 'Apartment' },
                { label: 'Unit', value: 'Unit' },
                { label: 'Townhouse', value: 'Townhouse' },
                { label: 'Studio', value: 'Studio' },
                { label: 'Room', value: 'Room' },
                { label: 'Other', value: 'Other' }
            ]
        },
        {
            id: 'bedrooms',
            label: 'Bedrooms',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 3,
            options: [
                { label: 'Studio', value: 'Studio' },
                { label: '1', value: '1' },
                { label: '2', value: '2' },
                { label: '3', value: '3' },
                { label: '4', value: '4' },
                { label: '5', value: '5' },
                { label: '6+', value: '6+' }
            ]
        },
        {
            id: 'bathrooms',
            label: 'Bathrooms',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 4,
            options: [
                { label: '1', value: '1' },
                { label: '2', value: '2' },
                { label: '3', value: '3' },
                { label: '4+', value: '4+' }
            ]
        },
        {
            id: 'parking',
            label: 'Parking Spaces',
            type: FieldType.SELECT,
            filterable: true,
            displayPriority: 5,
            options: [
                { label: 'None', value: 'None' },
                { label: '1', value: '1' },
                { label: '2', value: '2' },
                { label: '3+', value: '3+' },
                { label: 'Street Parking', value: 'Street Parking' }
            ]
        },
        {
            id: 'rent_period',
            label: 'Rent Period',
            type: FieldType.SELECT,
            required: true,
            displayPriority: 6,
            options: [
                { label: 'Per Week', value: 'Per Week' },
                { label: 'Per Fortnight', value: 'Per Fortnight' },
                { label: 'Per Month', value: 'Per Month' }
            ]
        },
        {
            id: 'bond',
            label: 'Bond',
            type: FieldType.NUMBER,
            unit: 'NZD',
            helpText: 'Bond amount required',
            displayPriority: 7
        },
        {
            id: 'available_from',
            label: 'Available From',
            type: FieldType.TEXT,
            required: true,
            placeholder: "DD/MM/YYYY or 'Now'",
            displayPriority: 8
        },
        {
            id: 'minimum_lease',
            label: 'Minimum Lease',
            type: FieldType.SELECT,
            displayPriority: 9,
            options: [
                { label: 'No minimum', value: 'No minimum' },
                { label: '3 months', value: '3 months' },
                { label: '6 months', value: '6 months' },
                { label: '12 months', value: '12 months' }
            ]
        },
        {
            id: 'furnished',
            label: 'Furnishing',
            type: FieldType.RADIO,
            required: true,
            filterable: true,
            displayPriority: 10,
            options: [
                { label: 'Furnished', value: 'Furnished' },
                { label: 'Partially Furnished', value: 'Partially Furnished' },
                { label: 'Unfurnished', value: 'Unfurnished' }
            ]
        },
        {
            id: 'pets_allowed',
            label: 'Pets Allowed',
            type: FieldType.RADIO,
            filterable: true,
            displayPriority: 11,
            options: [
                { label: 'Yes', value: 'Yes' },
                { label: 'No', value: 'No' },
                { label: 'Negotiable', value: 'Negotiable' }
            ]
        },
        {
            id: 'smokers_allowed',
            label: 'Smokers Allowed',
            type: FieldType.RADIO,
            displayPriority: 12,
            options: [
                { label: 'Yes', value: 'Yes' },
                { label: 'No', value: 'No' },
                { label: 'Outside Only', value: 'Outside Only' }
            ]
        },
        {
            id: 'floor_area',
            label: 'Floor Area',
            type: FieldType.NUMBER,
            unit: 'sqm',
            displayPriority: 13
        },
        {
            id: 'features',
            label: 'Features',
            type: FieldType.MULTI_SELECT,
            displayPriority: 14,
            options: [
                { label: 'Air Conditioning', value: 'Air Conditioning' },
                { label: 'Heat Pump', value: 'Heat Pump' },
                { label: 'Dishwasher', value: 'Dishwasher' },
                { label: 'Washing Machine', value: 'Washing Machine' },
                { label: 'Dryer', value: 'Dryer' },
                { label: 'Fireplace', value: 'Fireplace' },
                { label: 'Balcony', value: 'Balcony' },
                { label: 'Garden', value: 'Garden' },
                { label: 'Swimming Pool', value: 'Swimming Pool' },
                { label: 'Gym Access', value: 'Gym Access' },
                { label: 'Security System', value: 'Security System' },
                { label: 'Fibre Internet', value: 'Fibre Internet' },
                { label: 'Double Glazing', value: 'Double Glazing' },
                { label: 'Garage', value: 'Garage' },
                { label: 'Carport', value: 'Carport' }
            ]
        }
    ],
    subcategoryOverrides: {
        'flatmates': {
            remove: ['property_type'],
            add: [
                {
                    id: 'current_flatmates',
                    label: 'Current Flatmates',
                    type: FieldType.NUMBER,
                    required: true,
                    helpText: 'Number of current flatmates'
                },
                {
                    id: 'flatmate_preference',
                    label: 'Flatmate Preference',
                    type: FieldType.MULTI_SELECT,
                    options: [
                        { label: 'Male', value: 'Male' },
                        { label: 'Female', value: 'Female' },
                        { label: 'Couples OK', value: 'Couples OK' },
                        { label: 'Students OK', value: 'Students OK' },
                        { label: 'Professionals', value: 'Professionals' },
                        { label: 'LGBTQ+ Friendly', value: 'LGBTQ+ Friendly' }
                    ]
                },
                {
                    id: 'room_type',
                    label: 'Room Type',
                    type: FieldType.RADIO,
                    options: [
                        { label: 'Private Room', value: 'Private Room' },
                        { label: 'Shared Room', value: 'Shared Room' }
                    ]
                },
                {
                    id: 'bills_included',
                    label: 'Bills Included',
                    type: FieldType.CHECKBOX
                }
            ]
        },
        'parking': {
            remove: ['listing_type', 'property_type', 'bedrooms', 'bathrooms', 'parking', 'bond', 'minimum_lease', 'furnished', 'pets_allowed', 'smokers_allowed', 'floor_area', 'features'],
            add: [
                {
                    id: 'parking_type',
                    label: 'Parking Type',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Garage', value: 'Garage' },
                        { label: 'Carport', value: 'Carport' },
                        { label: 'Driveway', value: 'Driveway' },
                        { label: 'Street Permit', value: 'Street Permit' },
                        { label: 'Covered', value: 'Covered' },
                        { label: 'Uncovered', value: 'Uncovered' }
                    ]
                },
                {
                    id: 'vehicle_size',
                    label: 'Max Vehicle Size',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Motorcycle', value: 'Motorcycle' },
                        { label: 'Small Car', value: 'Small Car' },
                        { label: 'Standard Car', value: 'Standard Car' },
                        { label: 'Large Car/SUV', value: 'Large Car/SUV' },
                        { label: 'Van/Truck', value: 'Van/Truck' }
                    ]
                },
                {
                    id: 'security',
                    label: 'Security',
                    type: FieldType.MULTI_SELECT,
                    options: [
                        { label: 'Gated', value: 'Gated' },
                        { label: 'CCTV', value: 'CCTV' },
                        { label: 'Lighting', value: 'Lighting' },
                        { label: 'Covered', value: 'Covered' }
                    ]
                }
            ]
        }
    }
};
