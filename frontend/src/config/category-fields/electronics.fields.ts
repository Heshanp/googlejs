import { CategoryFieldsConfig, FieldType } from '../../types/category-fields.types';

export const electronicsFields: CategoryFieldsConfig = {
    categorySlug: 'electronics',
    fields: [
        {
            id: 'brand',
            label: 'Brand',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 1,
            options: [
                { label: 'Apple', value: 'Apple' },
                { label: 'Samsung', value: 'Samsung' },
                { label: 'Sony', value: 'Sony' },
                { label: 'LG', value: 'LG' },
                { label: 'Panasonic', value: 'Panasonic' },
                { label: 'Other', value: 'Other' }
            ]
        },
        {
            id: 'model_name',
            label: 'Model Name',
            type: FieldType.TEXT,
            displayPriority: 2
        },
        {
            id: 'storage_capacity',
            label: 'Storage Capacity',
            type: FieldType.SELECT,
            filterable: true,
            displayPriority: 3,
            options: [
                { label: '16GB', value: '16GB' },
                { label: '32GB', value: '32GB' },
                { label: '64GB', value: '64GB' },
                { label: '128GB', value: '128GB' },
                { label: '256GB', value: '256GB' },
                { label: '512GB', value: '512GB' },
                { label: '1TB', value: '1TB' },
                { label: '2TB+', value: '2TB+' }
            ]
        },
        {
            id: 'color',
            label: 'Color',
            type: FieldType.SELECT,
            displayPriority: 4,
            options: [
                { label: 'Black', value: 'Black' },
                { label: 'White', value: 'White' },
                { label: 'Silver', value: 'Silver' },
                { label: 'Grey', value: 'Grey' },
                { label: 'Gold', value: 'Gold' },
                { label: 'Blue', value: 'Blue' },
                { label: 'Red', value: 'Red' },
                { label: 'Other', value: 'Other' }
            ]
        },
        {
            id: 'warranty_status',
            label: 'Warranty Status',
            type: FieldType.RADIO,
            displayPriority: 5,
            options: [
                { label: 'Under Warranty', value: 'Under Warranty' },
                { label: 'No Warranty', value: 'No Warranty' },
                { label: 'Extended Warranty', value: 'Extended Warranty' }
            ]
        },
        {
            id: 'purchase_date',
            label: 'Purchase Date',
            type: FieldType.TEXT,
            placeholder: 'MM/YYYY',
            displayPriority: 6,
            validation: { pattern: '^(0[1-9]|1[0-2])\\/20[1-2][0-9]$' }
        },
        {
            id: 'includes_accessories',
            label: 'Includes Accessories',
            type: FieldType.MULTI_SELECT,
            displayPriority: 7,
            options: [
                { label: 'Charger', value: 'Charger' },
                { label: 'Cable', value: 'Cable' },
                { label: 'Case', value: 'Case' },
                { label: 'Headphones', value: 'Headphones' },
                { label: 'Original Box', value: 'Original Box' }
            ]
        },
        {
            id: 'original_packaging',
            label: 'Original Packaging',
            type: FieldType.CHECKBOX,
            displayPriority: 8
        }
    ],
    subcategoryOverrides: {
        'phones': {
            modify: [
                {
                    id: 'brand',
                    options: [
                        { label: 'Apple', value: 'Apple' },
                        { label: 'Samsung', value: 'Samsung' },
                        { label: 'Google', value: 'Google' },
                        { label: 'OnePlus', value: 'OnePlus' },
                        { label: 'Xiaomi', value: 'Xiaomi' },
                        { label: 'Oppo', value: 'Oppo' },
                        { label: 'Huawei', value: 'Huawei' },
                        { label: 'Sony', value: 'Sony' },
                        { label: 'Other', value: 'Other' }
                    ]
                }
            ],
            add: [
                {
                    id: 'screen_condition',
                    label: 'Screen Condition',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Perfect', value: 'Perfect' },
                        { label: 'Minor Scratches', value: 'Minor Scratches' },
                        { label: 'Cracked', value: 'Cracked' },
                        { label: 'Broken', value: 'Broken' }
                    ]
                },
                {
                    id: 'battery_health',
                    label: 'Battery Health',
                    type: FieldType.SELECT,
                    options: [
                        { label: '90-100%', value: '90-100%' },
                        { label: '80-89%', value: '80-89%' },
                        { label: '70-79%', value: '70-79%' },
                        { label: 'Below 70%', value: 'Below 70%' },
                        { label: 'Unknown', value: 'Unknown' }
                    ]
                },
                {
                    id: 'network_lock',
                    label: 'Network Lock',
                    type: FieldType.RADIO,
                    options: [
                        { label: 'Unlocked', value: 'Unlocked' },
                        { label: 'Locked to Carrier', value: 'Locked to Carrier' }
                    ]
                },
                {
                    id: 'carrier',
                    label: 'Carrier',
                    type: FieldType.SELECT,
                    dependsOn: 'network_lock',
                    options: [
                        { label: 'Spark', value: 'Spark' },
                        { label: 'Vodafone', value: 'Vodafone' },
                        { label: '2degrees', value: '2degrees' },
                        { label: 'Other', value: 'Other' }
                    ]
                }
            ]
        },
        'computers': {
            modify: [
                {
                    id: 'brand',
                    options: [
                        { label: 'Apple', value: 'Apple' },
                        { label: 'Dell', value: 'Dell' },
                        { label: 'HP', value: 'HP' },
                        { label: 'Lenovo', value: 'Lenovo' },
                        { label: 'Asus', value: 'Asus' },
                        { label: 'Acer', value: 'Acer' },
                        { label: 'Microsoft', value: 'Microsoft' },
                        { label: 'Custom Built', value: 'Custom Built' },
                        { label: 'Other', value: 'Other' }
                    ]
                }
            ],
            add: [
                {
                    id: 'computer_type',
                    label: 'Type',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Laptop', value: 'Laptop' },
                        { label: 'Desktop', value: 'Desktop' },
                        { label: 'All-in-One', value: 'All-in-One' },
                        { label: 'Mini PC', value: 'Mini PC' }
                    ]
                },
                {
                    id: 'processor',
                    label: 'Processor',
                    type: FieldType.TEXT,
                    placeholder: 'e.g., Intel i7-12700'
                },
                {
                    id: 'ram',
                    label: 'RAM',
                    type: FieldType.SELECT,
                    options: [
                        { label: '4GB', value: '4GB' },
                        { label: '8GB', value: '8GB' },
                        { label: '16GB', value: '16GB' },
                        { label: '32GB', value: '32GB' },
                        { label: '64GB+', value: '64GB+' }
                    ]
                },
                {
                    id: 'graphics',
                    label: 'Graphics Card',
                    type: FieldType.TEXT,
                    placeholder: 'e.g., RTX 3070'
                },
                {
                    id: 'screen_size',
                    label: 'Screen Size',
                    type: FieldType.NUMBER,
                    unit: 'inches'
                }
            ]
        },
        'gaming': {
            remove: ['storage_capacity', 'warranty_status', 'purchase_date'],
            add: [
                {
                    id: 'platform',
                    label: 'Platform',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'PlayStation', value: 'PlayStation' },
                        { label: 'Xbox', value: 'Xbox' },
                        { label: 'Nintendo', value: 'Nintendo' },
                        { label: 'PC', value: 'PC' },
                        { label: 'Retro', value: 'Retro' }
                    ]
                },
                {
                    id: 'console_model',
                    label: 'Console Model',
                    type: FieldType.SELECT,
                    dependsOn: 'platform',
                    options: [] // Would be dynamic in real app
                },
                {
                    id: 'includes_games',
                    label: 'Games Included',
                    type: FieldType.NUMBER
                },
                {
                    id: 'controllers_included',
                    label: 'Controllers Included',
                    type: FieldType.NUMBER
                }
            ]
        }
    }
};
