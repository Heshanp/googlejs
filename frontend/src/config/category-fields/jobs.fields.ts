import { CategoryFieldsConfig, FieldType } from '../../types/category-fields.types';

export const jobsFields: CategoryFieldsConfig = {
    categorySlug: 'jobs',
    fields: [
        {
            id: 'job_type',
            label: 'Job Type',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 1,
            options: [
                { label: 'Full-time', value: 'Full-time' },
                { label: 'Part-time', value: 'Part-time' },
                { label: 'Contract', value: 'Contract' },
                { label: 'Casual', value: 'Casual' },
                { label: 'Internship', value: 'Internship' },
                { label: 'Volunteer', value: 'Volunteer' }
            ]
        },
        {
            id: 'salary_type',
            label: 'Salary Type',
            type: FieldType.RADIO,
            required: true,
            displayPriority: 2,
            options: [
                { label: 'Hourly Rate', value: 'Hourly Rate' },
                { label: 'Annual Salary', value: 'Annual Salary' },
                { label: 'Fixed Price', value: 'Fixed Price' }
            ]
        },
        {
            id: 'salary_range',
            label: 'Salary Range',
            type: FieldType.RANGE,
            filterable: true,
            displayPriority: 3
        },
        {
            id: 'industry',
            label: 'Industry',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 4,
            options: [
                { label: 'Hospitality', value: 'Hospitality' },
                { label: 'Retail', value: 'Retail' },
                { label: 'IT', value: 'IT' },
                { label: 'Healthcare', value: 'Healthcare' },
                { label: 'Education', value: 'Education' },
                { label: 'Construction', value: 'Construction' },
                { label: 'Admin', value: 'Admin' },
                { label: 'Marketing', value: 'Marketing' },
                { label: 'Finance', value: 'Finance' },
                { label: 'Other', value: 'Other' }
            ]
        },
        {
            id: 'experience_level',
            label: 'Experience Level',
            type: FieldType.SELECT,
            required: true,
            filterable: true,
            displayPriority: 5,
            options: [
                { label: 'Entry Level', value: 'Entry Level' },
                { label: '1-2 Years', value: '1-2 Years' },
                { label: '3-5 Years', value: '3-5 Years' },
                { label: '5+ Years', value: '5+ Years' },
                { label: 'Not Specified', value: 'Not Specified' }
            ]
        },
        {
            id: 'work_arrangement',
            label: 'Work Arrangement',
            type: FieldType.MULTI_SELECT,
            filterable: true,
            displayPriority: 6,
            options: [
                { label: 'On-site', value: 'On-site' },
                { label: 'Remote', value: 'Remote' },
                { label: 'Hybrid', value: 'Hybrid' },
                { label: 'Flexible Hours', value: 'Flexible Hours' }
            ]
        },
        {
            id: 'start_date',
            label: 'Start Date',
            type: FieldType.TEXT,
            placeholder: 'ASAP or date',
            displayPriority: 7
        },
        {
            id: 'qualifications',
            label: 'Qualifications',
            type: FieldType.TEXTAREA,
            displayPriority: 8
        },
        {
            id: 'benefits',
            label: 'Benefits',
            type: FieldType.MULTI_SELECT,
            displayPriority: 9,
            options: [
                { label: 'Health Insurance', value: 'Health Insurance' },
                { label: 'KiwiSaver', value: 'KiwiSaver' },
                { label: 'Staff Discount', value: 'Staff Discount' },
                { label: 'Training', value: 'Training' },
                { label: 'Flexible Hours', value: 'Flexible Hours' },
                { label: 'Work From Home', value: 'Work From Home' }
            ]
        }
    ]
};
