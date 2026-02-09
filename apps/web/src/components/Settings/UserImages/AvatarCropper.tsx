import { Button } from '@repo/ui/components/button';
import { DialogFooter, DialogTitle } from '@repo/ui/components/dialog';
import { Slider } from '@repo/ui/components/slider';
import Cropper from 'react-easy-crop';
import React, { useCallback, useState } from 'react';
import { Minus, Plus, RotateCw } from '@repo/ui/components/icons';
import { useChangeAvatarMutation, useUpdateAvatarMetadataMutation } from '@/queries/profile';
import { useSelector } from '@/store';

interface AvatarCropperProps {
  image: string | null;
  isNewUpload: boolean;
  onBack?: () => void;
  onClose: () => void;
}

export default function AvatarCropper({ image, isNewUpload, onBack, onClose }: AvatarCropperProps) {
  const user = useSelector((state) => state.user);

  // Use image from props for new uploads, or from user data for edits
  const imageSource =
    image || `${import.meta.env.VITE_BACKEND_URL ?? ''}/${user?.avatar_image?.url ?? ''}` || null;
  const { mutate: changeAvatar, isPending: isUploadingAvatar } = useChangeAvatarMutation();
  const { mutate: updateAvatarMetadata, isPending: isUpdatingAvatar } =
    useUpdateAvatarMetadataMutation();

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [sizeRatio, setSizeRatio] = useState(0.7);
  const prevSizeRatioRef = React.useRef(0.7);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [mediaSize, setMediaSize] = useState<{
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
  } | null>(null);

  const effectiveCropSize = React.useMemo(() => {
    if (!containerSize || !mediaSize) return null;

    const containerAspect = containerSize.width / containerSize.height;
    const imageAspect = mediaSize.naturalWidth / mediaSize.naturalHeight;

    let displayedImageWidth, displayedImageHeight;
    if (imageAspect > containerAspect) {
      displayedImageWidth = containerSize.width;
      displayedImageHeight = containerSize.width / imageAspect;
    } else {
      displayedImageHeight = containerSize.height;
      displayedImageWidth = containerSize.height * imageAspect;
    }

    // Crop size is a percentage of the smaller displayed image dimension
    const maxDisplayedImageSide = Math.min(displayedImageWidth, displayedImageHeight);

    let size = Math.ceil(maxDisplayedImageSide * sizeRatio);
    size = Math.max(50, size); // Keep a sensible minimum to avoid a too-small handle

    return { width: size, height: size } as const;
  }, [containerSize, sizeRatio, mediaSize]);

  const cropContainerRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });
  }, []);

  const handleMediaLoaded = useCallback(
    (ms: { width: number; height: number; naturalWidth: number; naturalHeight: number }) => {
      setMediaSize(ms);
    },
    [],
  );

  const onCropComplete = useCallback((_: any, areaPixels: any) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  React.useEffect(() => {
    if (imageSource) {
      setCrop({ x: 0, y: 0 });
    }
  }, [imageSource]);

  // Auto-reposition crop when size changes to keep it within image boundaries
  React.useEffect(() => {
    if (!containerSize || !mediaSize || !effectiveCropSize) return;

    // Only reposition if size ratio actually changed
    if (prevSizeRatioRef.current === sizeRatio) return;
    prevSizeRatioRef.current = sizeRatio;

    // Use the actual rendered dimensions from react-easy-crop
    const displayedImageWidth = mediaSize.width;
    const displayedImageHeight = mediaSize.height;

    const cropSize = effectiveCropSize.width;
    const halfCropSize = cropSize / 2;

    // Boundaries are relative to the displayed image itself (not container offsets)
    // The crop center can move from halfCropSize to (imageWidth - halfCropSize)
    const minX = halfCropSize;
    const maxX = displayedImageWidth - halfCropSize;
    const minY = halfCropSize;
    const maxY = displayedImageHeight - halfCropSize;

    // Ensure boundaries are valid (max should be >= min)
    const validMinX = Math.min(minX, maxX);
    const validMaxX = Math.max(minX, maxX);
    const validMinY = Math.min(minY, maxY);
    const validMaxY = Math.max(minY, maxY);

    // Clamp current crop position to stay within boundaries
    const clampedX = Math.max(validMinX, Math.min(validMaxX, crop.x));
    const clampedY = Math.max(validMinY, Math.min(validMaxY, crop.y));

    setCrop({ x: clampedX, y: clampedY });
  }, [sizeRatio, containerSize, mediaSize, effectiveCropSize]);

  const createImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  };

  const handleSubmit = useCallback(async () => {
    if (!imageSource || !croppedAreaPixels) return;

    if (isNewUpload) {
      // New upload: upload full image with crop metadata
      const fullImage = await createImage(imageSource);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');

      canvas.width = fullImage.naturalWidth;
      canvas.height = fullImage.naturalHeight;
      ctx.drawImage(fullImage, 0, 0);

      const fullImageBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b as Blob), 'image/png', 0.95);
      });

      const file = new File([fullImageBlob], 'avatar.png', {
        type: 'image/png',
      });

      changeAvatar({
        image: file,
        x: croppedAreaPixels.x,
        y: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
        zoom: 1,
      });
    } else {
      // Update existing avatar: only update metadata
      updateAvatarMetadata({
        x: croppedAreaPixels.x,
        y: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
        zoom: 1,
        type: 'avatar',
      });
    }

    onClose();
  }, [changeAvatar, updateAvatarMetadata, croppedAreaPixels, imageSource, onClose, isNewUpload]);

  const isPending = isUploadingAvatar || isUpdatingAvatar;

  return (
    <>
      <DialogTitle className="mb-3">
        {isNewUpload ? 'Adjust and upload' : 'Edit avatar'}
      </DialogTitle>
      {imageSource && (
        <div
          className="relative w-full h-80 rounded-md overflow-hidden bg-muted"
          ref={cropContainerRef}
          style={{ padding: 0, margin: 0, overflow: 'hidden' }}
        >
          <Cropper
            image={imageSource}
            crop={crop}
            zoom={1}
            aspect={1}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onMediaLoaded={handleMediaLoaded}
            restrictPosition={true}
            zoomWithScroll={false}
            objectFit="contain"
            cropSize={effectiveCropSize ?? undefined}
            style={{
              cropAreaStyle: {
                border: '3px solid white',
                borderRadius: '0px',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              },
            }}
          />
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => {
              const steps = [0.35, 0.5, 0.65, 0.8, 1.0];
              const currentIndex = steps.findIndex((step) => sizeRatio <= step);
              const prevIndex = Math.max(0, currentIndex - 1);
              setSizeRatio(steps[prevIndex]);
            }}
            disabled={sizeRatio <= 0.35}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <div className="relative flex-1 z-0">
            <Slider
              value={[sizeRatio]}
              onValueChange={(values) => setSizeRatio(values[0])}
              min={0.35}
              max={1}
              step={0.01}
              className="w-full"
            />
            <div className="absolute top-1/2 left-0 right-0 flex justify-between pointer-events-none -translate-y-1/2 z-10">
              {([0.35, 0.5, 0.65, 0.8, 1.0] as const).map((dotValue, index, arr) => {
                const currentIndex = arr.reduce((acc, v, i) => (sizeRatio >= v ? i : acc), 0);
                const isActive = index <= currentIndex;
                const isCurrentPosition = Math.abs(sizeRatio - dotValue) < 0.02;
                return (
                  <div
                    key={index}
                    role="button"
                    aria-label={`Set size to ${Math.round(dotValue * 100)}%`}
                    aria-hidden={isCurrentPosition}
                    tabIndex={isCurrentPosition ? -1 : 0}
                    onClick={() => {
                      if (!isCurrentPosition) {
                        setSizeRatio(dotValue);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!isCurrentPosition && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setSizeRatio(dotValue);
                      }
                    }}
                    className={`w-3 h-3 rounded-full border border-border ring-ring/50 hover:ring-4 focus-visible:ring-4 transition-[color,box-shadow] ${
                      isCurrentPosition
                        ? 'pointer-events-none'
                        : 'pointer-events-auto cursor-pointer'
                    } ${index !== 0 && index !== arr.length - 1 ? '-translate-x-1/2' : ''} ${
                      isCurrentPosition ? 'opacity-0' : isActive ? 'bg-primary' : 'bg-white'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => {
              const steps = [0.35, 0.5, 0.65, 0.8, 1.0];
              const currentIndex = steps.findIndex((step) => sizeRatio < step);
              const nextIndex =
                currentIndex === -1
                  ? steps.length - 1
                  : Math.min(steps.length - 1, currentIndex + 1);
              setSizeRatio(steps[nextIndex]);
            }}
            disabled={sizeRatio >= 1}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setSizeRatio(0.7)}
            title="Reset to default size"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DialogFooter className="flex !justify-end mt-4">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        )}
        {!isNewUpload && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={!imageSource || !croppedAreaPixels || isPending}>
          {isNewUpload ? 'Upload' : 'Save Changes'}
        </Button>
      </DialogFooter>
    </>
  );
}
