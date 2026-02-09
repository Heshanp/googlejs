import { CategoryFieldsConfig, FieldType } from '../../types/category-fields.types';

export const sportsFields: CategoryFieldsConfig = {
    categorySlug: 'sports',
    fields: [
        {
            id: 'sport_type',
            label: 'Sport/Activity',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 1,
            options: [
                { label: 'Cycling', value: 'Cycling' },
                { label: 'Fitness/Gym', value: 'Fitness/Gym' },
                { label: 'Camping/Hiking', value: 'Camping/Hiking' },
                { label: 'Water Sports', value: 'Water Sports' },
                { label: 'Golf', value: 'Golf' },
                { label: 'Fishing', value: 'Fishing' },
                { label: 'Snow Sports', value: 'Snow Sports' },
                { label: 'Team Sports', value: 'Team Sports' },
                { label: 'Racquet Sports', value: 'Racquet Sports' },
                { label: 'Running', value: 'Running' },
                { label: 'Martial Arts', value: 'Martial Arts' },
                { label: 'Other', value: 'Other' }
            ]
        },
        {
            id: 'condition',
            label: 'Condition',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 2,
            options: [
                { label: 'New', value: 'New' },
                { label: 'Like New', value: 'Like New' },
                { label: 'Good', value: 'Good' },
                { label: 'Fair', value: 'Fair' },
                { label: 'For Parts', value: 'For Parts' }
            ]
        },
        {
            id: 'brand',
            label: 'Brand',
            type: FieldType.TEXT,
            filterable: true,
            displayPriority: 3
        },
        {
            id: 'size',
            label: 'Size',
            type: FieldType.SELECT,
            filterable: true,
            displayPriority: 4,
            options: [
                { label: 'XS', value: 'XS' },
                { label: 'S', value: 'S' },
                { label: 'M', value: 'M' },
                { label: 'L', value: 'L' },
                { label: 'XL', value: 'XL' },
                { label: 'XXL', value: 'XXL' },
                { label: 'One Size', value: 'One Size' },
                { label: 'N/A', value: 'N/A' }
            ]
        }
    ],
    subcategoryOverrides: {
        'bicycles': {
            add: [
                {
                    id: 'bike_type',
                    label: 'Bike Type',
                    type: FieldType.SELECT,
                    required: true,
                    filterable: true,
                    displayPriority: 1,
                    options: [
                        { label: 'Road Bike', value: 'Road Bike' },
                        { label: 'Mountain Bike', value: 'Mountain Bike' },
                        { label: 'Hybrid', value: 'Hybrid' },
                        { label: 'Electric Bike', value: 'Electric Bike' },
                        { label: 'BMX', value: 'BMX' },
                        { label: 'Gravel', value: 'Gravel' },
                        { label: 'Cruiser', value: 'Cruiser' },
                        { label: 'Kids Bike', value: 'Kids Bike' },
                        { label: 'Folding', value: 'Folding' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'frame_size',
                    label: 'Frame Size',
                    type: FieldType.SELECT,
                    filterable: true,
                    displayPriority: 5,
                    options: [
                        { label: 'XS (< 50cm)', value: 'XS' },
                        { label: 'S (50-52cm)', value: 'S' },
                        { label: 'M (53-55cm)', value: 'M' },
                        { label: 'L (56-58cm)', value: 'L' },
                        { label: 'XL (59-61cm)', value: 'XL' },
                        { label: 'XXL (> 61cm)', value: 'XXL' }
                    ]
                },
                {
                    id: 'wheel_size',
                    label: 'Wheel Size',
                    type: FieldType.SELECT,
                    displayPriority: 6,
                    options: [
                        { label: '20"', value: '20"' },
                        { label: '24"', value: '24"' },
                        { label: '26"', value: '26"' },
                        { label: '27.5"', value: '27.5"' },
                        { label: '29"', value: '29"' },
                        { label: '700c', value: '700c' }
                    ]
                },
                {
                    id: 'frame_material',
                    label: 'Frame Material',
                    type: FieldType.SELECT,
                    displayPriority: 7,
                    options: [
                        { label: 'Aluminium', value: 'Aluminium' },
                        { label: 'Carbon', value: 'Carbon' },
                        { label: 'Steel', value: 'Steel' },
                        { label: 'Titanium', value: 'Titanium' }
                    ]
                },
                {
                    id: 'gears',
                    label: 'Gears',
                    type: FieldType.SELECT,
                    displayPriority: 8,
                    options: [
                        { label: 'Single Speed', value: 'Single Speed' },
                        { label: '7-10 Speed', value: '7-10 Speed' },
                        { label: '11-12 Speed', value: '11-12 Speed' },
                        { label: '18-21 Speed', value: '18-21 Speed' },
                        { label: '24+ Speed', value: '24+ Speed' }
                    ]
                }
            ]
        },
        'fitness': {
            add: [
                {
                    id: 'equipment_type',
                    label: 'Equipment Type',
                    type: FieldType.SELECT,
                    required: true,
                    filterable: true,
                    displayPriority: 1,
                    options: [
                        { label: 'Cardio Machine', value: 'Cardio Machine' },
                        { label: 'Free Weights', value: 'Free Weights' },
                        { label: 'Weight Machine', value: 'Weight Machine' },
                        { label: 'Yoga/Pilates', value: 'Yoga/Pilates' },
                        { label: 'Resistance Bands', value: 'Resistance Bands' },
                        { label: 'Accessories', value: 'Accessories' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'weight_capacity',
                    label: 'Max Weight Capacity',
                    type: FieldType.NUMBER,
                    unit: 'kg',
                    displayPriority: 6
                }
            ]
        },
        'camping': {
            add: [
                {
                    id: 'camping_item',
                    label: 'Item Type',
                    type: FieldType.SELECT,
                    required: true,
                    filterable: true,
                    displayPriority: 1,
                    options: [
                        { label: 'Tent', value: 'Tent' },
                        { label: 'Sleeping Bag', value: 'Sleeping Bag' },
                        { label: 'Sleeping Mat', value: 'Sleeping Mat' },
                        { label: 'Backpack', value: 'Backpack' },
                        { label: 'Cooking Gear', value: 'Cooking Gear' },
                        { label: 'Lighting', value: 'Lighting' },
                        { label: 'Furniture', value: 'Furniture' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'capacity',
                    label: 'Capacity (persons)',
                    type: FieldType.SELECT,
                    displayPriority: 5,
                    options: [
                        { label: '1 Person', value: '1' },
                        { label: '2 Person', value: '2' },
                        { label: '3-4 Person', value: '3-4' },
                        { label: '5-6 Person', value: '5-6' },
                        { label: '7+ Person', value: '7+' }
                    ]
                },
                {
                    id: 'season_rating',
                    label: 'Season Rating',
                    type: FieldType.SELECT,
                    displayPriority: 6,
                    options: [
                        { label: '2 Season (Summer)', value: '2 Season' },
                        { label: '3 Season', value: '3 Season' },
                        { label: '4 Season (Winter)', value: '4 Season' }
                    ]
                }
            ]
        },
        'golf': {
            add: [
                {
                    id: 'golf_item',
                    label: 'Item Type',
                    type: FieldType.SELECT,
                    required: true,
                    filterable: true,
                    displayPriority: 1,
                    options: [
                        { label: 'Full Set', value: 'Full Set' },
                        { label: 'Driver', value: 'Driver' },
                        { label: 'Woods', value: 'Woods' },
                        { label: 'Irons', value: 'Irons' },
                        { label: 'Putter', value: 'Putter' },
                        { label: 'Wedges', value: 'Wedges' },
                        { label: 'Golf Bag', value: 'Golf Bag' },
                        { label: 'Golf Cart', value: 'Golf Cart' },
                        { label: 'Accessories', value: 'Accessories' }
                    ]
                },
                {
                    id: 'hand',
                    label: 'Hand',
                    type: FieldType.RADIO,
                    filterable: true,
                    displayPriority: 5,
                    options: [
                        { label: 'Right Handed', value: 'Right' },
                        { label: 'Left Handed', value: 'Left' }
                    ]
                },
                {
                    id: 'flex',
                    label: 'Shaft Flex',
                    type: FieldType.SELECT,
                    displayPriority: 6,
                    options: [
                        { label: 'Ladies', value: 'Ladies' },
                        { label: 'Senior', value: 'Senior' },
                        { label: 'Regular', value: 'Regular' },
                        { label: 'Stiff', value: 'Stiff' },
                        { label: 'Extra Stiff', value: 'Extra Stiff' }
                    ]
                }
            ]
        }
    }
};
