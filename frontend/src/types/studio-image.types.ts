export interface StudioExistingImageAsset {
  kind: 'existing';
  imageId: number;
  url: string;
  filename?: string;
}

export interface StudioFileImageAsset {
  kind: 'file';
  file: File;
  clientId: string;
}

export type StudioImageAsset = StudioExistingImageAsset | StudioFileImageAsset;

export interface StudioImageVariantMeta {
  variantType: 'pro_backdrop';
  aiModel?: string;
  aiPromptVersion?: string;
}

export interface StudioImageSlot {
  slotId: string;
  active: StudioImageAsset;
  original?: StudioImageAsset;
  variantMeta?: StudioImageVariantMeta;
}
