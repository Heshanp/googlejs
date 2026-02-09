import { CategoryFieldsConfig, FieldType } from '../../types/category-fields.types';

export const petsFields: CategoryFieldsConfig = {
    categorySlug: 'pets',
    fields: [
        {
            id: 'listing_type',
            label: 'Listing Type',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 1,
            options: [
                { label: 'Pet for Rehoming', value: 'Pet for Rehoming' },
                { label: 'Pet Supplies', value: 'Pet Supplies' },
                { label: 'Pet Services', value: 'Pet Services' },
                { label: 'Lost Pet', value: 'Lost Pet' },
                { label: 'Found Pet', value: 'Found Pet' }
            ]
        },
        {
            id: 'animal_type',
            label: 'Animal Type',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 2,
            options: [
                { label: 'Dog', value: 'Dog' },
                { label: 'Cat', value: 'Cat' },
                { label: 'Bird', value: 'Bird' },
                { label: 'Fish', value: 'Fish' },
                { label: 'Rabbit', value: 'Rabbit' },
                { label: 'Guinea Pig', value: 'Guinea Pig' },
                { label: 'Reptile', value: 'Reptile' },
                { label: 'Horse', value: 'Horse' },
                { label: 'Poultry', value: 'Poultry' },
                { label: 'Other', value: 'Other' }
            ]
        },
        {
            id: 'breed',
            label: 'Breed',
            type: FieldType.TEXT,
            filterable: true,
            displayPriority: 3,
            placeholder: 'e.g., Labrador, Siamese'
        }
    ],
    subcategoryOverrides: {
        'dogs': {
            add: [
                {
                    id: 'dog_size',
                    label: 'Size',
                    type: FieldType.SELECT,
                    filterable: true,
                    displayPriority: 4,
                    options: [
                        { label: 'Small (< 10kg)', value: 'Small' },
                        { label: 'Medium (10-25kg)', value: 'Medium' },
                        { label: 'Large (25-40kg)', value: 'Large' },
                        { label: 'Extra Large (> 40kg)', value: 'Extra Large' }
                    ]
                },
                {
                    id: 'age',
                    label: 'Age',
                    type: FieldType.SELECT,
                    filterable: true,
                    displayPriority: 5,
                    options: [
                        { label: 'Puppy (< 1 year)', value: 'Puppy' },
                        { label: 'Young (1-3 years)', value: 'Young' },
                        { label: 'Adult (3-7 years)', value: 'Adult' },
                        { label: 'Senior (7+ years)', value: 'Senior' }
                    ]
                },
                {
                    id: 'gender',
                    label: 'Gender',
                    type: FieldType.RADIO,
                    filterable: true,
                    displayPriority: 6,
                    options: [
                        { label: 'Male', value: 'Male' },
                        { label: 'Female', value: 'Female' }
                    ]
                },
                {
                    id: 'desexed',
                    label: 'Desexed',
                    type: FieldType.RADIO,
                    filterable: true,
                    displayPriority: 7,
                    options: [
                        { label: 'Yes', value: 'Yes' },
                        { label: 'No', value: 'No' }
                    ]
                },
                {
                    id: 'vaccinated',
                    label: 'Vaccinated',
                    type: FieldType.RADIO,
                    displayPriority: 8,
                    options: [
                        { label: 'Yes - Up to date', value: 'Yes' },
                        { label: 'Partially', value: 'Partially' },
                        { label: 'No', value: 'No' }
                    ]
                },
                {
                    id: 'microchipped',
                    label: 'Microchipped',
                    type: FieldType.CHECKBOX,
                    displayPriority: 9
                },
                {
                    id: 'good_with',
                    label: 'Good With',
                    type: FieldType.MULTI_SELECT,
                    displayPriority: 10,
                    options: [
                        { label: 'Children', value: 'Children' },
                        { label: 'Other Dogs', value: 'Other Dogs' },
                        { label: 'Cats', value: 'Cats' },
                        { label: 'First-time Owners', value: 'First-time Owners' }
                    ]
                }
            ]
        },
        'cats': {
            add: [
                {
                    id: 'age',
                    label: 'Age',
                    type: FieldType.SELECT,
                    filterable: true,
                    displayPriority: 4,
                    options: [
                        { label: 'Kitten (< 1 year)', value: 'Kitten' },
                        { label: 'Young (1-3 years)', value: 'Young' },
                        { label: 'Adult (3-10 years)', value: 'Adult' },
                        { label: 'Senior (10+ years)', value: 'Senior' }
                    ]
                },
                {
                    id: 'gender',
                    label: 'Gender',
                    type: FieldType.RADIO,
                    filterable: true,
                    displayPriority: 5,
                    options: [
                        { label: 'Male', value: 'Male' },
                        { label: 'Female', value: 'Female' }
                    ]
                },
                {
                    id: 'desexed',
                    label: 'Desexed',
                    type: FieldType.RADIO,
                    filterable: true,
                    displayPriority: 6,
                    options: [
                        { label: 'Yes', value: 'Yes' },
                        { label: 'No', value: 'No' }
                    ]
                },
                {
                    id: 'indoor_outdoor',
                    label: 'Indoor/Outdoor',
                    type: FieldType.SELECT,
                    displayPriority: 7,
                    options: [
                        { label: 'Indoor Only', value: 'Indoor Only' },
                        { label: 'Outdoor Only', value: 'Outdoor Only' },
                        { label: 'Both', value: 'Both' }
                    ]
                },
                {
                    id: 'vaccinated',
                    label: 'Vaccinated',
                    type: FieldType.RADIO,
                    displayPriority: 8,
                    options: [
                        { label: 'Yes - Up to date', value: 'Yes' },
                        { label: 'Partially', value: 'Partially' },
                        { label: 'No', value: 'No' }
                    ]
                },
                {
                    id: 'microchipped',
                    label: 'Microchipped',
                    type: FieldType.CHECKBOX,
                    displayPriority: 9
                }
            ]
        },
        'pet-supplies': {
            remove: ['breed'],
            add: [
                {
                    id: 'supply_type',
                    label: 'Supply Type',
                    type: FieldType.SELECT,
                    required: true,
                    filterable: true,
                    displayPriority: 3,
                    options: [
                        { label: 'Food & Treats', value: 'Food & Treats' },
                        { label: 'Beds & Furniture', value: 'Beds & Furniture' },
                        { label: 'Cages & Enclosures', value: 'Cages & Enclosures' },
                        { label: 'Bowls & Feeders', value: 'Bowls & Feeders' },
                        { label: 'Toys', value: 'Toys' },
                        { label: 'Collars & Leashes', value: 'Collars & Leashes' },
                        { label: 'Grooming', value: 'Grooming' },
                        { label: 'Health & Wellness', value: 'Health & Wellness' },
                        { label: 'Aquarium/Tank', value: 'Aquarium/Tank' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'condition',
                    label: 'Condition',
                    type: FieldType.SELECT,
                    filterable: true,
                    displayPriority: 4,
                    options: [
                        { label: 'New', value: 'New' },
                        { label: 'Like New', value: 'Like New' },
                        { label: 'Good', value: 'Good' },
                        { label: 'Fair', value: 'Fair' }
                    ]
                }
            ]
        },
        'horses': {
            add: [
                {
                    id: 'horse_type',
                    label: 'Type',
                    type: FieldType.SELECT,
                    filterable: true,
                    displayPriority: 4,
                    options: [
                        { label: 'Riding Horse', value: 'Riding Horse' },
                        { label: 'Pony', value: 'Pony' },
                        { label: 'Competition Horse', value: 'Competition Horse' },
                        { label: 'Broodmare', value: 'Broodmare' },
                        { label: 'Companion', value: 'Companion' }
                    ]
                },
                {
                    id: 'age_years',
                    label: 'Age (years)',
                    type: FieldType.NUMBER,
                    displayPriority: 5
                },
                {
                    id: 'height',
                    label: 'Height (hands)',
                    type: FieldType.NUMBER,
                    displayPriority: 6
                },
                {
                    id: 'gender',
                    label: 'Gender',
                    type: FieldType.SELECT,
                    filterable: true,
                    displayPriority: 7,
                    options: [
                        { label: 'Gelding', value: 'Gelding' },
                        { label: 'Mare', value: 'Mare' },
                        { label: 'Stallion', value: 'Stallion' },
                        { label: 'Colt', value: 'Colt' },
                        { label: 'Filly', value: 'Filly' }
                    ]
                },
                {
                    id: 'discipline',
                    label: 'Discipline',
                    type: FieldType.MULTI_SELECT,
                    displayPriority: 8,
                    options: [
                        { label: 'Dressage', value: 'Dressage' },
                        { label: 'Show Jumping', value: 'Show Jumping' },
                        { label: 'Eventing', value: 'Eventing' },
                        { label: 'Trail Riding', value: 'Trail Riding' },
                        { label: 'Western', value: 'Western' },
                        { label: 'Racing', value: 'Racing' }
                    ]
                }
            ]
        }
    }
};
