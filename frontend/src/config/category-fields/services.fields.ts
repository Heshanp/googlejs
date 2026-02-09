import { CategoryFieldsConfig, FieldType } from '../../types/category-fields.types';

export const servicesFields: CategoryFieldsConfig = {
    categorySlug: 'services',
    fields: [
        {
            id: 'service_type',
            label: 'Service Type',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 1,
            options: [
                { label: 'Lessons/Tutoring', value: 'Lessons/Tutoring' },
                { label: 'Repairs', value: 'Repairs' },
                { label: 'Events', value: 'Events' },
                { label: 'Photography', value: 'Photography' },
                { label: 'Beauty', value: 'Beauty' },
                { label: 'Cleaning', value: 'Cleaning' },
                { label: 'Moving', value: 'Moving' },
                { label: 'Trades', value: 'Trades' },
                { label: 'Pet Services', value: 'Pet Services' },
                { label: 'Other', value: 'Other' }
            ]
        },
        {
            id: 'pricing_type',
            label: 'Pricing Type',
            type: FieldType.RADIO,
            required: true,
            displayPriority: 2,
            options: [
                { label: 'Fixed Price', value: 'Fixed Price' },
                { label: 'Hourly Rate', value: 'Hourly Rate' },
                { label: 'Quote Based', value: 'Quote Based' },
                { label: 'Free', value: 'Free' }
            ]
        },
        {
            id: 'availability',
            label: 'Availability',
            type: FieldType.MULTI_SELECT,
            displayPriority: 3,
            options: [
                { label: 'Weekdays', value: 'Weekdays' },
                { label: 'Weekends', value: 'Weekends' },
                { label: 'Evenings', value: 'Evenings' },
                { label: 'By Appointment', value: 'By Appointment' }
            ]
        },
        {
            id: 'service_area',
            label: 'Service Area',
            type: FieldType.MULTI_SELECT,
            displayPriority: 4,
            options: [
                { label: 'Auckland', value: 'Auckland' },
                { label: 'Wellington', value: 'Wellington' },
                { label: 'Christchurch', value: 'Christchurch' },
                { label: 'Hamilton', value: 'Hamilton' },
                { label: 'Tauranga', value: 'Tauranga' },
                { label: 'Nationwide', value: 'Nationwide' },
                { label: 'Online Only', value: 'Online Only' }
            ]
        },
        {
            id: 'qualifications',
            label: 'Qualifications',
            type: FieldType.TEXTAREA,
            helpText: 'Relevant qualifications or experience',
            displayPriority: 5
        },
        {
            id: 'insurance',
            label: 'I have liability insurance',
            type: FieldType.CHECKBOX,
            displayPriority: 6
        }
    ]
};
