import { CategoryFieldsConfig, FieldType } from '../../types/category-fields.types';

export const freeFields: CategoryFieldsConfig = {
    categorySlug: 'free',
    fields: [
        {
            id: 'item_type',
            label: 'Item Type',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 1,
            options: [
                { label: 'Furniture', value: 'Furniture' },
                { label: 'Clothing', value: 'Clothing' },
                { label: 'Electronics', value: 'Electronics' },
                { label: 'Books/Media', value: 'Books/Media' },
                { label: 'Kids/Baby Items', value: 'Kids/Baby Items' },
                { label: 'Kitchen/Home', value: 'Kitchen/Home' },
                { label: 'Garden', value: 'Garden' },
                { label: 'Sports/Outdoor', value: 'Sports/Outdoor' },
                { label: 'Building Materials', value: 'Building Materials' },
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
                { label: 'Good - Works perfectly', value: 'Good' },
                { label: 'Fair - Minor issues', value: 'Fair' },
                { label: 'For Parts/Repair', value: 'For Parts' }
            ]
        },
        {
            id: 'pickup_flexibility',
            label: 'Pickup',
            type: FieldType.SELECT,
            required: true,
            displayPriority: 3,
            options: [
                { label: 'Flexible times', value: 'Flexible' },
                { label: 'Weekdays only', value: 'Weekdays' },
                { label: 'Weekends only', value: 'Weekends' },
                { label: 'ASAP - must go today', value: 'ASAP' }
            ]
        },
        {
            id: 'curb_alert',
            label: 'Curb Alert (left outside)',
            type: FieldType.CHECKBOX,
            displayPriority: 4,
            helpText: 'Item is outside, first come first served'
        }
    ]
};
