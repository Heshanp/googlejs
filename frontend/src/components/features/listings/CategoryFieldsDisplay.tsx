import React, { useState } from 'react';
import { FieldSchema, FieldType } from '../../../types/category-fields.types';
import { getFieldsForCategory } from '../../../config/category-fields';
import { cn } from '../../../lib/utils';
import { Check, List, ChevronDown, ChevronUp } from 'lucide-react';

interface CategoryFieldsDisplayProps {
  categorySlug: string;
  subcategorySlug?: string;
  fields: Record<string, any>;
  layout?: 'grid' | 'list' | 'compact';
}

export const CategoryFieldsDisplay: React.FC<CategoryFieldsDisplayProps> = ({
  categorySlug,
  subcategorySlug,
  fields: fieldValues,
  layout = 'grid'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const fieldSchemas = getFieldsForCategory(categorySlug, subcategorySlug);

  if (!fieldValues || Object.keys(fieldValues).length === 0) return null;

  // Filter out fields that have no value
  const activeFields = fieldSchemas.filter(schema => {
    const val = fieldValues[schema.id];
    return val !== undefined && val !== null && val !== '';
  });

  if (activeFields.length === 0) return null;

  // Separate features/tags from other fields
  const standardFields = activeFields.filter(f => f.type !== FieldType.MULTI_SELECT && f.type !== FieldType.CHECKBOX);
  const featureFields = activeFields.filter(f => f.type === FieldType.MULTI_SELECT);
  const booleanFields = activeFields.filter(f => f.type === FieldType.CHECKBOX);

  // Combine boolean fields into the main list if desired, or keep separate. 
  // Design shows a clean list. Let's append booleans to standard fields for the unified view if they are "key specs",
  // but usually "Features" are separate. The design requested strictly "Key Specs" list.
  // I'll stick to standard fields for the Key Specs list, and features separately or appended.
  // For the "Show All", we'll just expand the list.

  // Decide what to show in collapsed state: first 5 standard fields
  const INITIAL_item_COUNT = 5;
  const showExpandButton = activeFields.length > INITIAL_item_COUNT;

  const formatValue = (schema: FieldSchema, value: any) => {
    if (schema.unit) return `${value} ${schema.unit}`;
    if (schema.type === FieldType.COLOR_PICKER) {
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full border border-gray-200"
            style={{ background: value === 'Multi-color' ? 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)' : value }}
          />
          <span>{value}</span>
        </div>
      );
    }
    return value;
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 border border-app-color shadow-sm transition-all">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <List className="w-5 h-5 text-green-600 dark:text-green-400" /> Key Specs
        </h3>
        {showExpandButton && (
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:block">
            Expandable View
          </span>
        )}
      </div>

      <div className={cn("space-y-4", !isExpanded && "relative")}>
        {/* Standard Fields List */}
        <div className="space-y-3">
          {standardFields
            .slice(0, isExpanded ? undefined : INITIAL_item_COUNT)
            .map(field => (
              <div key={field.id} className="grid grid-cols-[140px_1fr] md:grid-cols-[200px_1fr] items-baseline gap-4 py-2 border-b border-app-color last:border-0">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{field.label}</dt>
                <dd className="text-sm font-medium text-neutral-900 dark:text-white">
                  {formatValue(field, fieldValues[field.id])}
                </dd>
              </div>
            ))}
        </div>

        {/* If expanded, show features/booleans too */}
        {isExpanded && (
          <div className="mt-6 pt-4 border-t border-app-color animate-in fade-in duration-300">
            {/* Boolean Fields */}
            {booleanFields.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Features</h4>
                <div className="grid grid-cols-2 gap-3">
                  {booleanFields.map(field => (
                    fieldValues[field.id] && (
                      <div key={field.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{field.label}</span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Multi-select Fields */}
            {featureFields.map(field => {
              const values = fieldValues[field.id] as string[];
              return values && values.length > 0 && (
                <div key={field.id} className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{field.label}</h4>
                  <div className="flex flex-wrap gap-2">
                    {values.map((val, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
                        {val}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showExpandButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-6 py-3 bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 text-green-700 dark:text-green-300 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          {isExpanded ? (
            <>Hide full specifications <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>Show all specifications <ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      )}
    </div>
  );
};
