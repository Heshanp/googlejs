import { CategoryFieldsConfig, FieldType } from '../../types/category-fields.types';

export const jewelryFields: CategoryFieldsConfig = {
    categorySlug: 'jewelry',
    fields: [
        {
            id: 'item_type',
            label: 'Item Type',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 1,
            options: [
                { label: 'Watch', value: 'Watch' },
                { label: 'Ring', value: 'Ring' },
                { label: 'Necklace', value: 'Necklace' },
                { label: 'Bracelet', value: 'Bracelet' },
                { label: 'Earrings', value: 'Earrings' },
                { label: 'Pendant', value: 'Pendant' },
                { label: 'Brooch', value: 'Brooch' },
                { label: 'Cufflinks', value: 'Cufflinks' },
                { label: 'Other', value: 'Other' },
            ]
        },
        {
            id: 'brand',
            label: 'Brand',
            type: FieldType.TEXT,
            filterable: true,
            displayPriority: 2,
            placeholder: 'e.g., Rolex, Cartier, Tiffany'
        },
        {
            id: 'metal_type',
            label: 'Metal Type',
            type: FieldType.SELECT,
            filterable: true,
            displayPriority: 3,
            options: [
                { label: 'Gold', value: 'Gold' },
                { label: 'White Gold', value: 'White Gold' },
                { label: 'Rose Gold', value: 'Rose Gold' },
                { label: 'Silver', value: 'Silver' },
                { label: 'Platinum', value: 'Platinum' },
                { label: 'Stainless Steel', value: 'Stainless Steel' },
                { label: 'Titanium', value: 'Titanium' },
                { label: 'Other', value: 'Other' },
            ]
        },
        {
            id: 'watch_type',
            label: 'Watch Type',
            type: FieldType.SELECT,
            filterable: true,
            displayPriority: 4,
            options: [
                { label: 'Analog', value: 'Analog' },
                { label: 'Digital', value: 'Digital' },
                { label: 'Smart Watch', value: 'Smart Watch' },
                { label: 'Chronograph', value: 'Chronograph' },
                { label: 'Automatic', value: 'Automatic' },
                { label: 'Quartz', value: 'Quartz' },
            ]
        },
        {
            id: 'case_size',
            label: 'Case Size',
            type: FieldType.NUMBER,
            filterable: true,
            displayPriority: 5,
            unit: 'mm',
            validation: { min: 20, max: 60 }
        },
        {
            id: 'band_material',
            label: 'Band Material',
            type: FieldType.SELECT,
            displayPriority: 6,
            options: [
                { label: 'Leather', value: 'Leather' },
                { label: 'Metal', value: 'Metal' },
                { label: 'Silicone', value: 'Silicone' },
                { label: 'Fabric', value: 'Fabric' },
                { label: 'Rubber', value: 'Rubber' },
                { label: 'Other', value: 'Other' },
            ]
        },
        {
            id: 'gemstone',
            label: 'Gemstone',
            type: FieldType.SELECT,
            filterable: true,
            displayPriority: 7,
            options: [
                { label: 'None', value: 'None' },
                { label: 'Diamond', value: 'Diamond' },
                { label: 'Ruby', value: 'Ruby' },
                { label: 'Sapphire', value: 'Sapphire' },
                { label: 'Emerald', value: 'Emerald' },
                { label: 'Pearl', value: 'Pearl' },
                { label: 'Other', value: 'Other' },
            ]
        },
        {
            id: 'carat',
            label: 'Carat',
            type: FieldType.NUMBER,
            displayPriority: 8,
            unit: 'ct',
            validation: { min: 0 }
        },
        {
            id: 'condition',
            label: 'Condition',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 9,
            options: [
                { label: 'New', value: 'New' },
                { label: 'Like New', value: 'Like New' },
                { label: 'Good', value: 'Good' },
                { label: 'Fair', value: 'Fair' },
            ]
        },
        {
            id: 'box_papers',
            label: 'Box & Papers',
            type: FieldType.SELECT,
            displayPriority: 10,
            options: [
                { label: 'Full Set (Box + Papers)', value: 'Full Set' },
                { label: 'Box Only', value: 'Box Only' },
                { label: 'Papers Only', value: 'Papers Only' },
                { label: 'None', value: 'None' },
            ]
        }
    ]
};
