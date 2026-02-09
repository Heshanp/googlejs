import { describe, expect, it } from 'vitest';
import { buildImageUploadPlan } from './listings.backend';
import { StudioImageSlot } from '../types/studio-image.types';

function makeFile(name: string): File {
  return new File(['image-bytes'], name, { type: 'image/jpeg' });
}

describe('buildImageUploadPlan', () => {
  it('keeps existing active images without uploads', () => {
    const slots: StudioImageSlot[] = [{
      slotId: 'slot-1',
      active: { kind: 'existing', imageId: 42, url: 'https://example.com/a.jpg' },
    }];

    const plan = buildImageUploadPlan(slots);

    expect(plan.keepImageIds).toEqual([42]);
    expect(plan.deactivateImageIds).toEqual([]);
    expect(plan.filesToUpload).toHaveLength(0);
    expect(plan.uploadEntries).toHaveLength(0);
  });

  it('uploads plain new files as active entries', () => {
    const file = makeFile('item.jpg');
    const slots: StudioImageSlot[] = [{
      slotId: 'slot-1',
      active: { kind: 'file', file, clientId: 'client-active' },
    }];

    const plan = buildImageUploadPlan(slots);

    expect(plan.keepImageIds).toEqual([]);
    expect(plan.deactivateImageIds).toEqual([]);
    expect(plan.filesToUpload).toHaveLength(1);
    expect(plan.uploadEntries[0]).toMatchObject({
      clientId: 'client-active',
      isActive: true,
      displayOrder: 0,
    });
  });

  it('marks existing source images for deactivation when variant is active file', () => {
    const variantFile = makeFile('variant.jpg');
    const slots: StudioImageSlot[] = [{
      slotId: 'slot-1',
      active: { kind: 'file', file: variantFile, clientId: 'variant-client' },
      original: { kind: 'existing', imageId: 88, url: 'https://example.com/source.jpg' },
      variantMeta: {
        variantType: 'pro_backdrop',
        aiModel: 'gemini-test',
        aiPromptVersion: 'pro_backdrop_v1',
      },
    }];

    const plan = buildImageUploadPlan(slots);

    expect(plan.keepImageIds).toEqual([]);
    expect(plan.deactivateImageIds).toEqual([88]);
    expect(plan.uploadEntries).toHaveLength(1);
    expect(plan.uploadEntries[0]).toMatchObject({
      clientId: 'variant-client',
      sourceImageId: 88,
      isActive: true,
      variantType: 'pro_backdrop',
      aiModel: 'gemini-test',
      aiPromptVersion: 'pro_backdrop_v1',
    });
  });

  it('uploads both source and variant when variant is derived from a new file', () => {
    const sourceFile = makeFile('source.jpg');
    const variantFile = makeFile('variant.jpg');

    const slots: StudioImageSlot[] = [{
      slotId: 'slot-1',
      active: { kind: 'file', file: variantFile, clientId: 'variant-client' },
      original: { kind: 'file', file: sourceFile, clientId: 'source-client' },
      variantMeta: {
        variantType: 'pro_backdrop',
        aiModel: 'gemini-test',
        aiPromptVersion: 'pro_backdrop_v1',
      },
    }];

    const plan = buildImageUploadPlan(slots);

    expect(plan.filesToUpload).toHaveLength(2);
    expect(plan.uploadEntries[0]).toMatchObject({
      clientId: 'source-client',
      isActive: false,
      displayOrder: 0,
    });
    expect(plan.uploadEntries[1]).toMatchObject({
      clientId: 'variant-client',
      sourceClientId: 'source-client',
      isActive: true,
      variantType: 'pro_backdrop',
      aiModel: 'gemini-test',
      aiPromptVersion: 'pro_backdrop_v1',
    });
  });
});
