import { CategoryFieldsConfig, FieldType } from '../../types/category-fields.types';

export const gamingFields: CategoryFieldsConfig = {
    categorySlug: 'gaming',
    fields: [
        {
            id: 'platform',
            label: 'Platform',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 1,
            options: [
                { label: 'PlayStation', value: 'PlayStation' },
                { label: 'Xbox', value: 'Xbox' },
                { label: 'Nintendo', value: 'Nintendo' },
                { label: 'PC', value: 'PC' },
                { label: 'Retro', value: 'Retro' },
                { label: 'VR', value: 'VR' },
                { label: 'Other', value: 'Other' },
            ]
        },
        {
            id: 'console_model',
            label: 'Console/Model',
            type: FieldType.SELECT,
            filterable: true,
            displayPriority: 2,
            options: [
                // PlayStation
                { label: 'PS5', value: 'PS5' },
                { label: 'PS5 Digital', value: 'PS5 Digital' },
                { label: 'PS4 Pro', value: 'PS4 Pro' },
                { label: 'PS4', value: 'PS4' },
                { label: 'PS3', value: 'PS3' },
                // Xbox
                { label: 'Xbox Series X', value: 'Xbox Series X' },
                { label: 'Xbox Series S', value: 'Xbox Series S' },
                { label: 'Xbox One X', value: 'Xbox One X' },
                { label: 'Xbox One S', value: 'Xbox One S' },
                { label: 'Xbox One', value: 'Xbox One' },
                // Nintendo
                { label: 'Nintendo Switch OLED', value: 'Switch OLED' },
                { label: 'Nintendo Switch', value: 'Switch' },
                { label: 'Nintendo Switch Lite', value: 'Switch Lite' },
                { label: 'Nintendo 3DS', value: '3DS' },
                // VR
                { label: 'Meta Quest 3', value: 'Quest 3' },
                { label: 'Meta Quest 2', value: 'Quest 2' },
                { label: 'PSVR2', value: 'PSVR2' },
                { label: 'PSVR', value: 'PSVR' },
                // Other
                { label: 'Steam Deck', value: 'Steam Deck' },
                { label: 'Other', value: 'Other' },
            ]
        },
        {
            id: 'item_type',
            label: 'Item Type',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 3,
            options: [
                { label: 'Console', value: 'Console' },
                { label: 'Game', value: 'Game' },
                { label: 'Controller', value: 'Controller' },
                { label: 'Headset', value: 'Headset' },
                { label: 'Accessory', value: 'Accessory' },
                { label: 'Bundle', value: 'Bundle' },
            ]
        },
        {
            id: 'controllers_included',
            label: 'Controllers Included',
            type: FieldType.NUMBER,
            displayPriority: 4,
            validation: { min: 0, max: 10 },
        },
        {
            id: 'games_included',
            label: 'Games Included',
            type: FieldType.NUMBER,
            displayPriority: 5,
            validation: { min: 0 },
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
        },
        {
            id: 'original_box',
            label: 'Original Box',
            type: FieldType.CHECKBOX,
            displayPriority: 7,
        }
    ]
};
