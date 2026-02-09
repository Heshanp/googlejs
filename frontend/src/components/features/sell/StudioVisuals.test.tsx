import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StudioVisuals } from './StudioVisuals';
import { StudioImageSlot } from '../../../types/studio-image.types';

const baseSlot: StudioImageSlot = {
  slotId: 'slot-1',
  active: {
    kind: 'existing',
    imageId: 10,
    url: 'https://example.com/image.jpg',
  },
};

const baseProps = {
  images: [baseSlot],
  onAddImages: vi.fn(),
  onRemoveImage: vi.fn(),
  onEditImage: vi.fn(),
  onGenerateProBackdrop: vi.fn(),
  onRestoreOriginal: vi.fn(),
};

describe('StudioVisuals pro backdrop actions', () => {
  it('renders pro backdrop action beside thumbnail actions', () => {
    render(<StudioVisuals {...baseProps} mode="vertical" />);

    expect(screen.getByLabelText('Generate professional backdrop')).toBeTruthy();
  });

  it('shows processing overlay for a processing thumbnail', () => {
    render(
      <StudioVisuals
        {...baseProps}
        mode="vertical"
        processingSlotIDs={new Set(['slot-1'])}
      />
    );

    expect(screen.getByText('Processing')).toBeTruthy();
  });

  it('opens fullscreen carousel when tapping a thumbnail', () => {
    render(<StudioVisuals {...baseProps} mode="vertical" />);

    fireEvent.click(screen.getByAltText('Thumbnail 1'));

    expect(screen.getByLabelText('Close fullscreen')).toBeTruthy();
  });

  it('shows restore action and invokes restore callback', () => {
    const onRestoreOriginal = vi.fn();
    render(
      <StudioVisuals
        {...baseProps}
        mode="vertical"
        onRestoreOriginal={onRestoreOriginal}
        images={[
          {
            ...baseSlot,
            original: {
              kind: 'existing',
              imageId: 10,
              url: 'https://example.com/source.jpg',
            },
            variantMeta: {
              variantType: 'pro_backdrop',
              aiModel: 'gemini-test',
              aiPromptVersion: 'pro_backdrop_v1',
            },
          },
        ]}
      />
    );

    const restoreButton = screen.getByLabelText('Restore original');
    fireEvent.click(restoreButton);

    expect(onRestoreOriginal).toHaveBeenCalledTimes(1);
    expect(onRestoreOriginal).toHaveBeenCalledWith(0);
  });

  it('keeps blob preview URLs stable across rerenders and revokes on unmount', async () => {
    const file = new File(['image-bytes'], 'thumb.jpg', { type: 'image/jpeg' });
    const fileSlot: StudioImageSlot = {
      slotId: 'slot-file',
      active: {
        kind: 'file',
        file,
        clientId: 'client-1',
      },
    };

    const mutableURL = URL as unknown as {
      createObjectURL?: (obj: Blob) => string;
      revokeObjectURL?: (url: string) => void;
    };
    const originalCreate = mutableURL.createObjectURL;
    const originalRevoke = mutableURL.revokeObjectURL;

    const createMock = vi.fn(() => 'blob:http://localhost/mock-preview');
    const revokeMock = vi.fn();
    mutableURL.createObjectURL = createMock;
    mutableURL.revokeObjectURL = revokeMock;

    try {
      const { rerender, unmount } = render(
        <StudioVisuals
          {...baseProps}
          mode="vertical"
          images={[fileSlot]}
        />
      );

      await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
      expect(revokeMock).not.toHaveBeenCalled();

      rerender(
        <StudioVisuals
          {...baseProps}
          mode="vertical"
          images={[fileSlot]}
        />
      );

      await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
      expect(revokeMock).not.toHaveBeenCalled();

      unmount();

      expect(revokeMock).toHaveBeenCalledTimes(1);
      expect(revokeMock).toHaveBeenCalledWith('blob:http://localhost/mock-preview');
    } finally {
      mutableURL.createObjectURL = originalCreate;
      mutableURL.revokeObjectURL = originalRevoke;
    }
  });
});
