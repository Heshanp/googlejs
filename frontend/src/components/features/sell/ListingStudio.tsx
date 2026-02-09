'use client';

import React, { useEffect, useState } from 'react';
import { StudioUpload } from './StudioUpload';
import { StudioForm } from './StudioForm';
import { FreeListingModal } from './FreeListingModal';
import { ConfirmationModal } from '../../ui/ConfirmationModal';
import { Sparkles, Home } from 'lucide-react';
import { AnalysisService, ImageEnhancementService, ListingsService } from '../../../services';
import { useNavigation } from '../../../hooks/useNavigation';
import { useToast } from '../../ui/Toast';
import { cn } from '../../../lib/utils';
import { Listing } from '../../../types';
import { StudioExistingImageAsset, StudioFileImageAsset, StudioImageSlot } from '../../../types/studio-image.types';

type StudioView = 'upload' | 'loading' | 'editor' | 'unsupported';

interface ListingStudioProps {
  mode?: 'create' | 'edit';
  initialData?: Listing;
  listingId?: string;
}

const MAX_IMAGES = 5;

function createSlotId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `slot-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function createFileAsset(file: File): StudioFileImageAsset {
  return {
    kind: 'file',
    file,
    clientId: createSlotId(),
  };
}

function createSlotsFromFiles(files: File[]): StudioImageSlot[] {
  return files.map((file) => ({
    slotId: createSlotId(),
    active: createFileAsset(file),
  }));
}

function createSlotsFromListingImages(images: Listing['images'] | undefined): StudioImageSlot[] {
  if (!images || images.length === 0) {
    return [];
  }

  const sorted = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return sorted.map((image) => {
    const imageID = Number.parseInt(image.id, 10);
    const existingAsset: StudioExistingImageAsset = {
      kind: 'existing',
      imageId: Number.isNaN(imageID) ? 0 : imageID,
      url: image.url,
    };

    return {
      slotId: createSlotId(),
      active: existingAsset,
    };
  }).filter((slot) => slot.active.kind !== 'existing' || slot.active.imageId > 0);
}

export const ListingStudio: React.FC<ListingStudioProps> = ({
  mode = 'create',
  initialData,
  listingId,
}) => {
  const isEditMode = mode === 'edit';
  const effectiveListingID = listingId || initialData?.publicId;

  // In edit mode, skip upload and go directly to editor
  const [view, setView] = useState<StudioView>(isEditMode ? 'editor' : 'upload');
  const [imageSlots, setImageSlots] = useState<StudioImageSlot[]>(() => (
    isEditMode ? createSlotsFromListingImages(initialData?.images) : []
  ));
  const [processingSlotIDs, setProcessingSlotIDs] = useState<Set<string>>(new Set());
  const [loadingText, setLoadingText] = useState('Identifying brand...');

  // Form and Analysis State
  const [aiData, setAiData] = useState<any>(isEditMode ? {
    title: initialData?.title,
    description: initialData?.description,
    condition: initialData?.condition,
    category: initialData?.category,
    categoryFields: initialData?.categoryFields,
    price: initialData?.price,
    location: initialData?.location,
    shippingOptions: initialData?.shippingOptions,
    paymentMethods: initialData?.paymentMethods,
    returnsPolicy: initialData?.returnsPolicy,
  } : null);
  const [relevantFields, setRelevantFields] = useState<string[]>(
    isEditMode && initialData?.categoryFields ? Object.keys(initialData.categoryFields) : []
  );
  const [aiConfidence, setAiConfidence] = useState<number | undefined>(undefined);
  const [itemType, setItemType] = useState<string | undefined>(undefined);
  const [aiReasoning, setAiReasoning] = useState<string | undefined>(undefined);
  const [aiThinkingSummary, setAiThinkingSummary] = useState<string | undefined>(undefined);
  const [fieldConfidence, setFieldConfidence] = useState<Record<string, number> | undefined>(undefined);
  const [unsupportedType, setUnsupportedType] = useState<string | null>(null);

  // Free listing confirmation modal state
  const [showFreeListingModal, setShowFreeListingModal] = useState(false);
  const [pendingPublishData, setPendingPublishData] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { navigate } = useNavigation();
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (isEditMode) {
      setImageSlots(createSlotsFromListingImages(initialData?.images));
    }
  }, [isEditMode, initialData?.publicId]);

  const setSlotProcessing = (slotId: string, isProcessing: boolean) => {
    setProcessingSlotIDs((prev) => {
      const next = new Set(prev);
      if (isProcessing) {
        next.add(slotId);
      } else {
        next.delete(slotId);
      }
      return next;
    });
  };

  const performAIAnalysis = async (images: File[]) => {
    setLoadingText('Detecting object details...');
    try {
      const result = await AnalysisService.analyzeImages(images);

      if (result) {
        // Check for unsupported item types (property, job, etc.)
        const unsupportedTypes = ['property', 'job', 'unsupported'];
        if (unsupportedTypes.includes(result.itemType)) {
          setUnsupportedType(result.itemType);
          setAiReasoning(result.reasoning);
          setView('unsupported');
          return;
        }

        // Determine relevant fields based on AI result or fallback
        let fields: string[] = [];
        if (result.structuredFields && Object.keys(result.structuredFields).length > 0) {
          fields = Object.keys(result.structuredFields);
        } else {
          const type = result.itemType || 'general';
          if (type === 'vehicle') fields = ['make', 'model', 'year', 'body_type', 'transmission', 'fuel_type', 'mileage', 'color'];
          else if (type === 'phone') fields = ['brand', 'model_name', 'storage_capacity', 'color', 'screen_condition', 'battery_health'];
          else if (type === 'computer') fields = ['brand', 'processor', 'ram', 'storage_capacity'];
        }

        const category = result.category
          ? `cat_${result.category}`
          : result.itemType === 'vehicle' ? 'cat_vehicles'
            : result.itemType === 'phone' ? 'cat_phones'
              : result.itemType === 'computer' ? 'cat_computers'
                : 'cat_general';

        setAiData({
          title: result.title,
          description: result.description,
          condition: result.condition,
          category,
          categoryFields: result.structuredFields,
        });
        setRelevantFields(fields);
        setAiConfidence(result.confidence);
        setItemType(result.itemType);
        setAiReasoning(result.reasoning);
        setAiThinkingSummary(result.thinkingSummary);
        setFieldConfidence(result.fieldConfidence);
      }
      setView('editor');
    } catch (err) {
      toastError('AI analysis failed, but you can still list manually.');
      setView('editor');
    }
  };

  const handleUpload = (uploadedFiles: File[]) => {
    const limited = uploadedFiles.slice(0, MAX_IMAGES);
    setImageSlots(createSlotsFromFiles(limited));
    setView('loading');
    performAIAnalysis(limited);
  };

  const handleAddMoreImages = (newFiles: File[]) => {
    const remainingSlots = MAX_IMAGES - imageSlots.length;

    if (remainingSlots <= 0) {
      toastError(`You can only upload up to ${MAX_IMAGES} images.`);
      return;
    }

    const filesToAdd = newFiles.slice(0, remainingSlots);
    if (newFiles.length > remainingSlots) {
      toastError(`Only ${remainingSlots} image(s) added. Maximum limit is ${MAX_IMAGES}.`);
    }

    setImageSlots((prev) => [...prev, ...createSlotsFromFiles(filesToAdd)]);
  };

  const handleRemoveImage = (index: number) => {
    setImageSlots((prev) => {
      const slot = prev[index];
      if (slot) {
        setSlotProcessing(slot.slotId, false);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleReorderImages = (newOrder: StudioImageSlot[]) => {
    setImageSlots(newOrder);
  };

  const handleEditImage = (index: number, editedFile: File) => {
    setImageSlots((prev) => prev.map((slot, idx) => {
      if (idx !== index) return slot;

      return {
        ...slot,
        active: createFileAsset(editedFile),
        original: undefined,
        variantMeta: undefined,
      };
    }));
  };

  const handleGenerateProBackdrop = async (index: number) => {
    const slot = imageSlots[index];
    if (!slot) return;

    const source = slot.original || slot.active;
    if (source.kind === 'existing' && !effectiveListingID) {
      toastError('Missing listing ID required for image enhancement.');
      return;
    }

    setSlotProcessing(slot.slotId, true);
    try {
      const result = source.kind === 'existing'
        ? await ImageEnhancementService.generateProBackdropFromListingImage(effectiveListingID!, source.imageId)
        : await ImageEnhancementService.generateProBackdropFromFile(source.file);

      setImageSlots((prev) => prev.map((currentSlot, idx) => {
        if (idx !== index) return currentSlot;

        return {
          ...currentSlot,
          original: currentSlot.original || currentSlot.active,
          active: createFileAsset(result.file),
          variantMeta: {
            variantType: 'pro_backdrop',
            aiModel: result.model,
            aiPromptVersion: result.promptVersion,
          },
        };
      }));

      success('Professional backdrop generated.');
    } catch (err: any) {
      toastError(err?.message || 'Failed to generate professional backdrop');
    } finally {
      setSlotProcessing(slot.slotId, false);
    }
  };

  const handleRestoreOriginal = (index: number) => {
    setImageSlots((prev) => prev.map((slot, idx) => {
      if (idx !== index || !slot.original) return slot;

      return {
        ...slot,
        active: slot.original,
        original: undefined,
        variantMeta: undefined,
      };
    }));
  };

  const handleSaveDraft = async (_data: any) => {
    success('Draft saved!');
  };

  const handlePublish = async (data: any) => {
    if (isPublishing) return;

    const price = Number(data.price) || 0;
    if (price === 0 && !data._confirmedFree) {
      setPendingPublishData(data);
      setShowFreeListingModal(true);
      return;
    }

    await doPublish(data);
  };

  const handleConfirmFreeListig = async () => {
    setShowFreeListingModal(false);
    if (pendingPublishData) {
      await doPublish({ ...pendingPublishData, _confirmedFree: true });
    }
  };

  const handleSetPrice = () => {
    setShowFreeListingModal(false);
    setPendingPublishData(null);
  };

  const doPublish = async (data: any) => {
    if (isPublishing) return;
    setIsPublishing(true);

    try {
      const categoryFromItemType =
        itemType === 'vehicle' ? 'cat_vehicles'
          : itemType === 'phone' ? 'cat_phones'
            : itemType === 'computer' ? 'cat_computers'
              : itemType === 'bike' ? 'cat_vehicles'
                : itemType === 'motorcycle' ? 'cat_vehicles'
                  : itemType === 'boat' ? 'cat_vehicles'
                    : 'cat_general';

      const payload = {
        ...data,
        category: (data.category && data.category !== '') ? data.category : categoryFromItemType,
        imageSlots,
      };

      delete payload._confirmedFree;

      let response;
      if (isEditMode) {
        if (!effectiveListingID) {
          throw new Error('Missing listing public ID for edit mode');
        }
        response = await ListingsService.updateListing(effectiveListingID, payload);
      } else {
        response = await ListingsService.createListing(payload);
      }

      const resultListing = response?.data?.data;
      const status = resultListing?.status;
      const requiresReview = status === 'pending_review' || status === 'blocked';

      if (requiresReview) {
        success('Publishing is taking longer than usual. Your listing is pending review.');
        navigate('/profile?tab=listings');
        return;
      }

      if (isEditMode) {
        success('Listing updated successfully!');
      } else {
        success('Listing published successfully!');
      }

      const resultListingUrlId = resultListing?.publicId || effectiveListingID || initialData?.publicId;
      if (resultListingUrlId) {
        navigate(`/listing/${resultListingUrlId}`);
      } else {
        navigate('/profile');
      }
    } catch (err: any) {
      toastError(err.message || `Failed to ${isEditMode ? 'update' : 'publish'} listing`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const id = effectiveListingID;
      if (!id) {
        toastError('Cannot delete: Listing ID not found');
        setIsDeleting(false);
        setShowDeleteModal(false);
        return;
      }

      await ListingsService.deleteListing(id);
      success('Listing deleted successfully');
      navigate('/profile');
    } catch (err: any) {
      toastError(`Failed to delete listing: ${err.message || 'Unknown error'}`);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDiscard = () => {
    const message = isEditMode
      ? 'Are you sure you want to discard your changes?'
      : 'Are you sure you want to discard this listing?';
    if (confirm(message)) {
      if (isEditMode) {
        navigate(-1);
      } else {
        setImageSlots([]);
        setAiData(null);
        setRelevantFields([]);
        setView('upload');
      }
    }
  };

  return (
    <>
      <div
        className={cn(
          'flex-1 relative w-full flex',
          view !== 'editor'
            ? 'items-center justify-center pt-10 p-4 min-h-[calc(100vh-80px)]'
            : 'min-h-[calc(100vh-80px)]'
        )}
      >
        {view === 'upload' && !isEditMode && (
          <StudioUpload onUpload={handleUpload} />
        )}

        {view === 'loading' && (
          <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
            <div className="w-[60px] h-[60px] bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-8 animate-pulse shadow-[0_0_0_0_rgba(168,85,247,0.7)]">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Analyzing your item...</h2>
            <p className="text-slate-500 dark:text-slate-400 animate-pulse">{loadingText}</p>
          </div>
        )}

        {view === 'unsupported' && (
          <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-500 max-w-lg px-4">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-6">
              <Home className="text-amber-600 dark:text-amber-400 w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              {unsupportedType === 'property'
                ? 'Looks like a property listing!'
                : unsupportedType === 'job'
                  ? 'Looks like a job listing!'
                  : "We couldn't identify a sellable item"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-2">
              {unsupportedType === 'property'
                ? 'Property listings are coming soon! For now, JustSell supports general marketplace items like electronics, furniture, clothing, and more.'
                : unsupportedType === 'job'
                  ? 'Job listings are coming soon! For now, JustSell supports general marketplace items like electronics, furniture, clothing, and more.'
                  : "The image doesn't appear to show a physical item for sale. Try uploading a photo of the item you'd like to sell."}
            </p>

            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={() => {
                  setImageSlots([]);
                  setUnsupportedType(null);
                  setView('upload');
                }}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-medium transition-colors"
              >
                Try Different Photos
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnsupportedType(null);
                  setView('editor');
                }}
                className="px-6 py-2.5 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-slate-300 rounded-full font-medium hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
              >
                List Anyway
              </button>
            </div>
          </div>
        )}

        {view === 'editor' && (
          <div className="w-full h-full bg-white dark:bg-neutral-900 flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-8 duration-700">
            <StudioForm
              files={imageSlots}
              onAddFiles={handleAddMoreImages}
              onRemoveFile={handleRemoveImage}
              onReorderFiles={handleReorderImages}
              onEditFile={handleEditImage}
              onGenerateProBackdrop={handleGenerateProBackdrop}
              onRestoreOriginal={handleRestoreOriginal}
              processingSlotIDs={processingSlotIDs}
              initialData={aiData}
              relevantFields={relevantFields}
              onSaveDraft={handleSaveDraft}
              onPublish={handlePublish}
              aiConfidence={aiConfidence}
              itemType={itemType}
              aiReasoning={aiReasoning}
              aiThinkingSummary={aiThinkingSummary}
              fieldConfidence={fieldConfidence}
              onDiscard={handleDiscard}
              onDelete={isEditMode ? handleDeleteClick : undefined}
              mode={mode}
              isPublishing={isPublishing}
            />
          </div>
        )}
      </div>

      <FreeListingModal
        isOpen={showFreeListingModal}
        onClose={handleSetPrice}
        onConfirmFree={handleConfirmFreeListig}
        onSetPrice={handleSetPrice}
      />

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Listing"
        description="Are you sure you want to permanently delete this listing? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
};
