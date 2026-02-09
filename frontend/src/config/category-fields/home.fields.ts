import { CategoryFieldsConfig, FieldType } from '../../types/category-fields.types';

export const homeFields: CategoryFieldsConfig = {
    categorySlug: 'home-living',
    fields: [], // Base fields empty, mostly subcategory specific
    subcategoryOverrides: {
        'furniture': {
            add: [
                {
                    id: 'furniture_type',
                    label: 'Type',
                    type: FieldType.SELECT,
                    required: true,
                    options: [
                        { label: 'Sofa', value: 'Sofa' },
                        { label: 'Bed', value: 'Bed' },
                        { label: 'Table', value: 'Table' },
                        { label: 'Chair', value: 'Chair' },
                        { label: 'Storage', value: 'Storage' },
                        { label: 'Desk', value: 'Desk' },
                        { label: 'Outdoor', value: 'Outdoor' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'material',
                    label: 'Material',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Wood', value: 'Wood' },
                        { label: 'Metal', value: 'Metal' },
                        { label: 'Fabric', value: 'Fabric' },
                        { label: 'Leather', value: 'Leather' },
                        { label: 'Glass', value: 'Glass' },
                        { label: 'Plastic', value: 'Plastic' },
                        { label: 'Rattan', value: 'Rattan' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'dimensions',
                    label: 'Dimensions',
                    type: FieldType.TEXT,
                    placeholder: 'L x W x H in cm'
                },
                {
                    id: 'assembly_required',
                    label: 'Assembly Required',
                    type: FieldType.CHECKBOX
                },
                {
                    id: 'delivery_available',
                    label: 'Delivery Available',
                    type: FieldType.CHECKBOX
                }
            ]
        },
        'appliances': {
            add: [
                {
                    id: 'appliance_type',
                    label: 'Type',
                    type: FieldType.SELECT,
                    required: true,
                    options: [
                        { label: 'Refrigerator', value: 'Refrigerator' },
                        { label: 'Washing Machine', value: 'Washing Machine' },
                        { label: 'Dryer', value: 'Dryer' },
                        { label: 'Dishwasher', value: 'Dishwasher' },
                        { label: 'Oven', value: 'Oven' },
                        { label: 'Microwave', value: 'Microwave' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'brand',
                    label: 'Brand',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Fisher & Paykel', value: 'Fisher & Paykel' },
                        { label: 'LG', value: 'LG' },
                        { label: 'Samsung', value: 'Samsung' },
                        { label: 'Bosch', value: 'Bosch' },
                        { label: 'Electrolux', value: 'Electrolux' },
                        { label: 'Haier', value: 'Haier' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'energy_rating',
                    label: 'Energy Rating',
                    type: FieldType.SELECT,
                    options: [
                        { label: '1 Star', value: '1 Star' },
                        { label: '2 Stars', value: '2 Stars' },
                        { label: '3 Stars', value: '3 Stars' },
                        { label: '4 Stars', value: '4 Stars' },
                        { label: '5 Stars', value: '5 Stars' },
                        { label: '6 Stars', value: '6 Stars' }
                    ]
                },
                {
                    id: 'age',
                    label: 'Age',
                    type: FieldType.SELECT,
                    options: [
                        { label: 'Less than 1 year', value: 'Less than 1 year' },
                        { label: '1-2 years', value: '1-2 years' },
                        { label: '2-5 years', value: '2-5 years' },
                        { label: '5+ years', value: '5+ years' }
                    ]
                },
                {
                    id: 'working_condition',
                    label: 'Working Condition',
                    type: FieldType.RADIO,
                    options: [
                        { label: 'Perfect', value: 'Perfect' },
                        { label: 'Minor Issues', value: 'Minor Issues' },
                        { label: 'Needs Repair', value: 'Needs Repair' }
                    ]
                }
            ]
        }
    }
};
