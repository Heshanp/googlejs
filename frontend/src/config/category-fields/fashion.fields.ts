import { CategoryFieldsConfig, FieldType } from '../../types/category-fields.types';

export const fashionFields: CategoryFieldsConfig = {
    categorySlug: 'fashion',
    fields: [
        {
            id: 'brand',
            label: 'Brand',
            type: FieldType.TEXT,
            filterable: true,
            displayPriority: 1
        },
        {
            id: 'size',
            label: 'Size',
            type: FieldType.SIZE_SELECTOR,
            required: true,
            filterable: true,
            displayPriority: 2
        },
        {
            id: 'color',
            label: 'Color',
            type: FieldType.COLOR_PICKER,
            required: true,
            filterable: true,
            displayPriority: 3
        },
        {
            id: 'condition_details',
            label: 'Condition Details',
            type: FieldType.SELECT,
            displayPriority: 4,
            options: [
                { label: 'Brand New with Tags', value: 'Brand New with Tags' },
                { label: 'Brand New without Tags', value: 'Brand New without Tags' },
                { label: 'Worn Once', value: 'Worn Once' },
                { label: 'Gently Used', value: 'Gently Used' },
                { label: 'Visible Wear', value: 'Visible Wear' }
            ]
        },
        {
            id: 'material',
            label: 'Material',
            type: FieldType.TEXT,
            placeholder: 'e.g., 100% Cotton',
            displayPriority: 5
        },
        {
            id: 'style',
            label: 'Style',
            type: FieldType.SELECT,
            displayPriority: 6,
            options: [] // Varies by subcategory
        }
    ],
    subcategoryOverrides: {
        'women': {
            add: [
                {
                    id: 'garment_type',
                    label: 'Type',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Tops', value: 'Tops' },
                        { label: 'Bottoms', value: 'Bottoms' },
                        { label: 'Dresses', value: 'Dresses' },
                        { label: 'Outerwear', value: 'Outerwear' },
                        { label: 'Activewear', value: 'Activewear' },
                        { label: 'Swimwear', value: 'Swimwear' },
                        { label: 'Suits', value: 'Suits' },
                        { label: 'Other', value: 'Other' }
                    ]
                }
            ]
        },
        'men': {
            add: [
                {
                    id: 'garment_type',
                    label: 'Type',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Tops', value: 'Tops' },
                        { label: 'Bottoms', value: 'Bottoms' },
                        { label: 'Outerwear', value: 'Outerwear' },
                        { label: 'Activewear', value: 'Activewear' },
                        { label: 'Swimwear', value: 'Swimwear' },
                        { label: 'Suits', value: 'Suits' },
                        { label: 'Other', value: 'Other' }
                    ]
                }
            ]
        },
        'shoes': {
            remove: ['size'],
            add: [
                {
                    id: 'shoe_size',
                    label: 'Size (NZ/US)',
                    type: FieldType.SELECT,
                    required: true,
                    options: [
                        { label: '4', value: '4' },
                        { label: '5', value: '5' },
                        { label: '6', value: '6' },
                        { label: '7', value: '7' },
                        { label: '8', value: '8' },
                        { label: '9', value: '9' },
                        { label: '10', value: '10' },
                        { label: '11', value: '11' },
                        { label: '12', value: '12' },
                        { label: '13', value: '13' }
                    ]
                },
                {
                    id: 'shoe_width',
                    label: 'Width',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Standard', value: 'Standard' },
                        { label: 'Wide', value: 'Wide' },
                        { label: 'Extra Wide', value: 'Extra Wide' }
                    ]
                },
                {
                    id: 'shoe_type',
                    label: 'Type',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Sneakers', value: 'Sneakers' },
                        { label: 'Heels', value: 'Heels' },
                        { label: 'Boots', value: 'Boots' },
                        { label: 'Sandals', value: 'Sandals' },
                        { label: 'Flats', value: 'Flats' },
                        { label: 'Formal', value: 'Formal' },
                        { label: 'Athletic', value: 'Athletic' },
                        { label: 'Other', value: 'Other' }
                    ]
                }
            ]
        },
        'bags': {
            remove: ['size'],
            add: [
                {
                    id: 'bag_type',
                    label: 'Type',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Handbag', value: 'Handbag' },
                        { label: 'Backpack', value: 'Backpack' },
                        { label: 'Clutch', value: 'Clutch' },
                        { label: 'Tote', value: 'Tote' },
                        { label: 'Crossbody', value: 'Crossbody' },
                        { label: 'Wallet', value: 'Wallet' },
                        { label: 'Travel Bag', value: 'Travel Bag' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'bag_size',
                    label: 'Size',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Small', value: 'Small' },
                        { label: 'Medium', value: 'Medium' },
                        { label: 'Large', value: 'Large' },
                        { label: 'Extra Large', value: 'Extra Large' }
                    ]
                }
            ]
        },
        'watches': {
            remove: ['size'],
            add: [
                {
                    id: 'watch_type',
                    label: 'Type',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Analog', value: 'Analog' },
                        { label: 'Digital', value: 'Digital' },
                        { label: 'Smart Watch', value: 'Smart Watch' },
                        { label: 'Luxury', value: 'Luxury' }
                    ]
                },
                {
                    id: 'case_size',
                    label: 'Case Size',
                    type: FieldType.NUMBER,
                    unit: 'mm'
                },
                {
                    id: 'band_material',
                    label: 'Band Material',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Leather', value: 'Leather' },
                        { label: 'Metal', value: 'Metal' },
                        { label: 'Silicone', value: 'Silicone' },
                        { label: 'Fabric', value: 'Fabric' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'water_resistance',
                    label: 'Water Resistance',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'None', value: 'None' },
                        { label: '30m', value: '30m' },
                        { label: '50m', value: '50m' },
                        { label: '100m', value: '100m' },
                        { label: '200m+', value: '200m+' }
                    ]
                }
            ]
        }
    }
};
