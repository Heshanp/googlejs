import { CategoryFieldsConfig, FieldSchema, FieldType } from '../../types/category-fields.types';
import { vehiclesFields } from './vehicles.fields';
import { electronicsFields } from './electronics.fields';
import { fashionFields } from './fashion.fields';
import { homeFields } from './home.fields';
import { gamingFields } from './gaming.fields';
import { jewelryFields } from './jewelry.fields';
import { babyFields } from './baby.fields';
import { sportsFields } from './sports.fields';
import { hobbiesFields } from './hobbies.fields';
import { petsFields } from './pets.fields';
import { propertyFields } from './property.fields';
import { jobsFields } from './jobs.fields';
import { servicesFields } from './services.fields';
import { freeFields } from './free.fields';
import { normalizeCategory } from '../../data/categories';

/**
 * Category fields configuration
 * Each category has specific filterable fields for better search and discovery
 */
export const CATEGORY_FIELDS_CONFIG: Record<string, CategoryFieldsConfig> = {
    // Product categories
    'vehicles': vehiclesFields,
    'phones': electronicsFields,
    'computers': electronicsFields,
    'gaming': gamingFields,
    'fashion': fashionFields,
    'furniture': homeFields,
    'jewelry': jewelryFields,
    'baby': babyFields,
    'sports': sportsFields,
    'hobbies': hobbiesFields,
    'pets': petsFields,

    // Non-product categories
    'property': propertyFields,
    'jobs': jobsFields,
    'services': servicesFields,
    'free': freeFields,

    // Catch-all
    'general': {
        categorySlug: 'general',
        fields: [
            {
                id: 'condition',
                label: 'Condition',
                type: FieldType.SELECT,
                required: false,
                filterable: true,
                displayPriority: 1,
                options: [
                    { label: 'New', value: 'New' },
                    { label: 'Like New', value: 'Like New' },
                    { label: 'Good', value: 'Good' },
                    { label: 'Fair', value: 'Fair' },
                ]
            }
        ]
    }
};

/**
 * Get fields for a category, with legacy slug support
 */
export const getFieldsForCategory = (categorySlug: string, subcategorySlug?: string): FieldSchema[] => {
    // Normalize to new category system (handles legacy slugs)
    const normalizedSlug = normalizeCategory(categorySlug);

    const config = CATEGORY_FIELDS_CONFIG[normalizedSlug];
    if (!config) return [];

    let fields = [...config.fields];

    // Apply subcategory overrides if present (for backward compatibility)
    if (subcategorySlug && config.subcategoryOverrides && config.subcategoryOverrides[subcategorySlug]) {
        const overrides = config.subcategoryOverrides[subcategorySlug];

        if (overrides.remove) {
            fields = fields.filter(f => !overrides.remove?.includes(f.id));
        }

        if (overrides.modify) {
            fields = fields.map(f => {
                const modification = overrides.modify?.find(m => m.id === f.id);
                return modification ? { ...f, ...modification } : f;
            });
        }

        if (overrides.add) {
            fields = [...fields, ...overrides.add];
        }
    }

    return fields.sort((a, b) => (a.displayPriority || 99) - (b.displayPriority || 99));
};

export const getFilterableFields = (categorySlug: string): FieldSchema[] => {
    const normalizedSlug = normalizeCategory(categorySlug);
    const config = CATEGORY_FIELDS_CONFIG[normalizedSlug];
    if (!config) return [];

    let allFields = [...config.fields];
    if (config.subcategoryOverrides) {
        Object.values(config.subcategoryOverrides).forEach(override => {
            if (override.add) {
                allFields = [...allFields, ...override.add];
            }
        });
    }

    return allFields.filter(f => f.filterable);
};

export const getRequiredFields = (categorySlug: string, subcategorySlug?: string): string[] => {
    const fields = getFieldsForCategory(categorySlug, subcategorySlug);
    return fields.filter(f => f.required).map(f => f.id);
};
