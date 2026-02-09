import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudioForm } from './StudioForm';

vi.mock('./StudioVisuals', () => ({
    StudioVisuals: () => <div data-testid="studio-visuals" />,
}));

vi.mock('./AIDirectedFields', () => ({
    AIDirectedFields: () => <div data-testid="ai-directed-fields" />,
}));

vi.mock('./LocationPicker', () => ({
    LocationPicker: () => <div data-testid="location-picker" />,
}));

vi.mock('./ExpirationPicker', () => ({
    ExpirationPicker: () => <div data-testid="expiration-picker" />,
}));

vi.mock('./ShippingPaymentStep', () => ({
    ShippingPaymentStep: () => <div data-testid="shipping-payment-step" />,
}));

const baseProps = {
    files: [],
    onAddFiles: vi.fn(),
    onRemoveFile: vi.fn(),
    relevantFields: [],
    onSaveDraft: vi.fn(),
    onPublish: vi.fn(),
    onDiscard: vi.fn(),
};

describe('StudioForm publish/update loader', () => {
    it('shows Publish label when create mode is idle', () => {
        render(<StudioForm {...baseProps} mode="create" isPublishing={false} />);

        const publishButton = screen.getByRole('button', { name: 'Publish' });
        expect(publishButton).toBeTruthy();
        expect((publishButton as HTMLButtonElement).disabled).toBe(false);
        expect(publishButton.getAttribute('aria-busy')).not.toBe('true');
    });

    it('shows Publishing loader state in create mode', () => {
        render(<StudioForm {...baseProps} mode="create" isPublishing />);

        const publishingButton = screen.getByRole('button', { name: 'Publishing...' });
        expect((publishingButton as HTMLButtonElement).disabled).toBe(true);
        expect(publishingButton.getAttribute('aria-busy')).toBe('true');
    });

    it('shows Update label when edit mode is idle', () => {
        render(<StudioForm {...baseProps} mode="edit" isPublishing={false} onDelete={vi.fn()} />);

        const updateButton = screen.getByRole('button', { name: 'Update' });
        expect(updateButton).toBeTruthy();
        expect((updateButton as HTMLButtonElement).disabled).toBe(false);
    });

    it('shows Updating loader state and disables delete action in edit mode', () => {
        render(<StudioForm {...baseProps} mode="edit" isPublishing onDelete={vi.fn()} />);

        const updatingButton = screen.getByRole('button', { name: 'Updating...' });
        const deleteButton = screen.getByTitle('Delete Listing');

        expect((updatingButton as HTMLButtonElement).disabled).toBe(true);
        expect(updatingButton.getAttribute('aria-busy')).toBe('true');
        expect((deleteButton as HTMLButtonElement).disabled).toBe(true);
    });
});
