import { CategoryFieldsConfig, FieldType } from '../../types/category-fields.types';

export const hobbiesFields: CategoryFieldsConfig = {
    categorySlug: 'hobbies',
    fields: [
        {
            id: 'hobby_type',
            label: 'Category',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 1,
            options: [
                { label: 'Musical Instruments', value: 'Musical Instruments' },
                { label: 'Toys & Games', value: 'Toys & Games' },
                { label: 'Collectibles', value: 'Collectibles' },
                { label: 'Art & Crafts', value: 'Art & Crafts' },
                { label: 'Books & Magazines', value: 'Books & Magazines' },
                { label: 'Movies & Music', value: 'Movies & Music' },
                { label: 'Photography', value: 'Photography' },
                { label: 'Models & Kits', value: 'Models & Kits' },
                { label: 'Antiques', value: 'Antiques' },
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
                { label: 'New/Sealed', value: 'New/Sealed' },
                { label: 'Like New', value: 'Like New' },
                { label: 'Good', value: 'Good' },
                { label: 'Fair', value: 'Fair' },
                { label: 'Vintage/Antique', value: 'Vintage/Antique' }
            ]
        },
        {
            id: 'brand',
            label: 'Brand/Maker',
            type: FieldType.TEXT,
            filterable: true,
            displayPriority: 3
        }
    ],
    subcategoryOverrides: {
        'instruments': {
            add: [
                {
                    id: 'instrument_type',
                    label: 'Instrument Type',
                    type: FieldType.SELECT,
                    required: true,
                    filterable: true,
                    displayPriority: 1,
                    options: [
                        { label: 'Guitar (Acoustic)', value: 'Guitar (Acoustic)' },
                        { label: 'Guitar (Electric)', value: 'Guitar (Electric)' },
                        { label: 'Guitar (Bass)', value: 'Guitar (Bass)' },
                        { label: 'Piano/Keyboard', value: 'Piano/Keyboard' },
                        { label: 'Drums', value: 'Drums' },
                        { label: 'Violin/Strings', value: 'Violin/Strings' },
                        { label: 'Wind/Brass', value: 'Wind/Brass' },
                        { label: 'DJ Equipment', value: 'DJ Equipment' },
                        { label: 'Recording Equipment', value: 'Recording Equipment' },
                        { label: 'Amplifier', value: 'Amplifier' },
                        { label: 'Accessories', value: 'Accessories' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'skill_level',
                    label: 'Suited For',
                    type: FieldType.SELECT,
                    displayPriority: 5,
                    options: [
                        { label: 'Beginner', value: 'Beginner' },
                        { label: 'Intermediate', value: 'Intermediate' },
                        { label: 'Professional', value: 'Professional' },
                        { label: 'All Levels', value: 'All Levels' }
                    ]
                },
                {
                    id: 'includes_case',
                    label: 'Includes Case',
                    type: FieldType.CHECKBOX,
                    displayPriority: 6
                }
            ]
        },
        'toys': {
            add: [
                {
                    id: 'toy_type',
                    label: 'Toy Type',
                    type: FieldType.SELECT,
                    required: true,
                    filterable: true,
                    displayPriority: 1,
                    options: [
                        { label: 'Action Figures', value: 'Action Figures' },
                        { label: 'Board Games', value: 'Board Games' },
                        { label: 'Building Sets (LEGO etc)', value: 'Building Sets' },
                        { label: 'Dolls', value: 'Dolls' },
                        { label: 'Educational', value: 'Educational' },
                        { label: 'Electronic Toys', value: 'Electronic Toys' },
                        { label: 'Outdoor Toys', value: 'Outdoor Toys' },
                        { label: 'Puzzles', value: 'Puzzles' },
                        { label: 'RC/Remote Control', value: 'RC/Remote Control' },
                        { label: 'Stuffed Animals', value: 'Stuffed Animals' },
                        { label: 'Trading Cards', value: 'Trading Cards' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'age_range',
                    label: 'Age Range',
                    type: FieldType.SELECT,
                    filterable: true,
                    displayPriority: 5,
                    options: [
                        { label: '0-2 years', value: '0-2' },
                        { label: '3-5 years', value: '3-5' },
                        { label: '6-8 years', value: '6-8' },
                        { label: '9-12 years', value: '9-12' },
                        { label: '13+ years', value: '13+' },
                        { label: 'All Ages', value: 'All Ages' }
                    ]
                },
                {
                    id: 'complete_set',
                    label: 'Complete Set',
                    type: FieldType.CHECKBOX,
                    displayPriority: 6
                }
            ]
        },
        'collectibles': {
            add: [
                {
                    id: 'collectible_type',
                    label: 'Collectible Type',
                    type: FieldType.SELECT,
                    required: true,
                    filterable: true,
                    displayPriority: 1,
                    options: [
                        { label: 'Coins & Currency', value: 'Coins & Currency' },
                        { label: 'Stamps', value: 'Stamps' },
                        { label: 'Sports Memorabilia', value: 'Sports Memorabilia' },
                        { label: 'Trading Cards', value: 'Trading Cards' },
                        { label: 'Figurines', value: 'Figurines' },
                        { label: 'Vintage Items', value: 'Vintage Items' },
                        { label: 'Movie/TV Memorabilia', value: 'Movie/TV Memorabilia' },
                        { label: 'Military', value: 'Military' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'era',
                    label: 'Era/Period',
                    type: FieldType.SELECT,
                    filterable: true,
                    displayPriority: 5,
                    options: [
                        { label: 'Pre-1900', value: 'Pre-1900' },
                        { label: '1900-1949', value: '1900-1949' },
                        { label: '1950-1979', value: '1950-1979' },
                        { label: '1980-1999', value: '1980-1999' },
                        { label: '2000-Present', value: '2000-Present' }
                    ]
                },
                {
                    id: 'authenticity',
                    label: 'Authenticity',
                    type: FieldType.SELECT,
                    displayPriority: 6,
                    options: [
                        { label: 'Authenticated/Certified', value: 'Authenticated' },
                        { label: 'Unverified', value: 'Unverified' },
                        { label: 'Reproduction', value: 'Reproduction' }
                    ]
                }
            ]
        },
        'books': {
            add: [
                {
                    id: 'book_type',
                    label: 'Type',
                    type: FieldType.SELECT,
                    required: true,
                    filterable: true,
                    displayPriority: 1,
                    options: [
                        { label: 'Fiction', value: 'Fiction' },
                        { label: 'Non-Fiction', value: 'Non-Fiction' },
                        { label: "Children's", value: 'Children' },
                        { label: 'Textbooks', value: 'Textbooks' },
                        { label: 'Comics/Graphic Novels', value: 'Comics' },
                        { label: 'Magazines', value: 'Magazines' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'format',
                    label: 'Format',
                    type: FieldType.SELECT,
                    displayPriority: 5,
                    options: [
                        { label: 'Hardcover', value: 'Hardcover' },
                        { label: 'Paperback', value: 'Paperback' },
                        { label: 'Audio Book', value: 'Audio Book' }
                    ]
                }
            ]
        },
        'art': {
            add: [
                {
                    id: 'art_type',
                    label: 'Art Type',
                    type: FieldType.SELECT,
                    required: true,
                    filterable: true,
                    displayPriority: 1,
                    options: [
                        { label: 'Painting', value: 'Painting' },
                        { label: 'Print', value: 'Print' },
                        { label: 'Sculpture', value: 'Sculpture' },
                        { label: 'Photography', value: 'Photography' },
                        { label: 'Drawing', value: 'Drawing' },
                        { label: 'Craft Supplies', value: 'Craft Supplies' },
                        { label: 'Other', value: 'Other' }
                    ]
                },
                {
                    id: 'framed',
                    label: 'Framed',
                    type: FieldType.CHECKBOX,
                    displayPriority: 5
                },
                {
                    id: 'signed',
                    label: 'Signed by Artist',
                    type: FieldType.CHECKBOX,
                    displayPriority: 6
                }
            ]
        }
    }
};
