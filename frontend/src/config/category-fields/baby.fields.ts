import { CategoryFieldsConfig, FieldType } from '../../types/category-fields.types';

export const babyFields: CategoryFieldsConfig = {
    categorySlug: 'baby',
    fields: [
        {
            id: 'item_type',
            label: 'Item Type',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 1,
            options: [
                { label: 'Stroller/Pram', value: 'Stroller' },
                { label: 'Car Seat', value: 'Car Seat' },
                { label: 'Crib/Cot', value: 'Crib' },
                { label: 'High Chair', value: 'High Chair' },
                { label: 'Baby Carrier', value: 'Carrier' },
                { label: 'Toys', value: 'Toys' },
                { label: 'Clothing', value: 'Clothing' },
                { label: 'Feeding', value: 'Feeding' },
                { label: 'Bath', value: 'Bath' },
                { label: 'Safety', value: 'Safety' },
                { label: 'Other', value: 'Other' },
            ]
        },
        {
            id: 'age_range',
            label: 'Age Range',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 2,
            options: [
                { label: 'Newborn (0-3 months)', value: '0-3m' },
                { label: 'Infant (3-6 months)', value: '3-6m' },
                { label: 'Baby (6-12 months)', value: '6-12m' },
                { label: 'Toddler (1-2 years)', value: '1-2y' },
                { label: 'Preschool (2-4 years)', value: '2-4y' },
                { label: 'Kids (4-8 years)', value: '4-8y' },
                { label: 'All Ages', value: 'All' },
            ]
        },
        {
            id: 'brand',
            label: 'Brand',
            type: FieldType.SELECT,
            filterable: true,
            displayPriority: 3,
            options: [
                { label: 'Bugaboo', value: 'Bugaboo' },
                { label: 'Uppababy', value: 'Uppababy' },
                { label: 'Cybex', value: 'Cybex' },
                { label: 'Maxi-Cosi', value: 'Maxi-Cosi' },
                { label: 'Baby Bjorn', value: 'Baby Bjorn' },
                { label: 'Fisher-Price', value: 'Fisher-Price' },
                { label: 'Graco', value: 'Graco' },
                { label: 'Chicco', value: 'Chicco' },
                { label: 'Ergobaby', value: 'Ergobaby' },
                { label: 'Other', value: 'Other' },
            ]
        },
        {
            id: 'gender',
            label: 'Gender',
            type: FieldType.SELECT,
            filterable: true,
            displayPriority: 4,
            options: [
                { label: 'Unisex', value: 'Unisex' },
                { label: 'Boy', value: 'Boy' },
                { label: 'Girl', value: 'Girl' },
            ]
        },
        {
            id: 'safety_certified',
            label: 'Safety Certified',
            type: FieldType.CHECKBOX,
            displayPriority: 5,
            helpText: 'Meets safety standards'
        },
        {
            id: 'condition',
            label: 'Condition',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 6,
            options: [
                { label: 'New', value: 'New' },
                { label: 'Like New', value: 'Like New' },
                { label: 'Good', value: 'Good' },
                { label: 'Fair', value: 'Fair' },
            ]
        }
    ]
};
