import { Button } from '@repo/ui/components/button';
import Cropper from 'react-easy-crop';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CoverPlacholder from '@/assets/cover-placeholder.png';
import { useSelector } from '@/store';
import { useChangeCoverMutation, useUpdateCoverMetadataMutation } from '@/queries/profile';
import { PencilLine } from '@repo/ui/components/icons';

// Component to display cropped cover image using canvas

export default function CoverImage() {
  const user = useSelector((state) => state.user);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [mediaSize, setMediaSize] = useState<{
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
  } | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);
  const [isNewUpload, setIsNewUpload] = useState(false);

  const coverSrc = useMemo(() => {
    return croppedUrl ?? CoverPlacholder;
  }, [croppedUrl]);

  const onSelectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    setIsEditing(true);
    setIsNewUpload(true); // Mark as new upload
    setZoom(1);
    setMinZoom(1);
    setCrop({ x: 0, y: 0 });
  }, []);

  const onCropComplete = useCallback((_: any, areaPixels: any) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const el = cropContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });
    return () => ro.disconnect();
  }, [isEditing]);

  const handleMediaLoaded = useCallback(
    (mediaSize: { width: number; height: number; naturalWidth: number; naturalHeight: number }) => {
      setMediaSize(mediaSize);
    },
    [containerSize],
  );

  useEffect(() => {
    if (!isEditing || !containerSize || !mediaSize) return;
    const requiredZoom = Math.max(
      containerSize.width / mediaSize.naturalWidth,
      containerSize.height / mediaSize.naturalHeight,
    );
    const clampedMin = Math.max(1, requiredZoom);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMinZoom(clampedMin);
    setZoom(clampedMin);
  }, [containerSize, mediaSize, isEditing]);

  const handleOpenPicker = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  }, []);

  const { mutate: changeCover } = useChangeCoverMutation();
  const { mutate: updateCoverMetadata } = useUpdateCoverMetadataMutation();

  const createImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  };

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    fullImage?: HTMLImageElement,
  ): Promise<{
    croppedBlob: Blob;
    fullImage: HTMLImageElement;
    cropArea: { x: number; y: number; width: number; height: number };
  }> => {
    const image = fullImage || (await createImage(imageSrc));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );
    const croppedBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b as Blob), 'image/png', 0.95);
    });
    return {
      croppedBlob,
      fullImage: image,
      cropArea: pixelCrop,
    };
  };

  const handleCancel = useCallback(() => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setIsEditing(false);
    setSourceUrl(null);
    setCroppedAreaPixels(null);
    setIsNewUpload(false);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [sourceUrl]);

  const handleSubmit = useCallback(async () => {
    if (!sourceUrl || !croppedAreaPixels) return;

    if (isNewUpload) {
      // New upload: use changeCover with the full image
      const { croppedBlob, fullImage, cropArea } = await getCroppedImg(
        sourceUrl,
        croppedAreaPixels,
      );

      // Create a File from the full image instead of the cropped one
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');

      canvas.width = fullImage.naturalWidth;
      canvas.height = fullImage.naturalHeight;
      ctx.drawImage(fullImage, 0, 0);

      const fullImageBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b as Blob), 'image/png', 0.95);
      });

      const file = new File([fullImageBlob], 'cover.png', {
        type: 'image/png',
      });

      // Upload new image with crop metadata
      changeCover({
        image: file,
        x: cropArea.x,
        y: cropArea.y,
        width: cropArea.width,
        height: cropArea.height,
        zoom: zoom,
      });

      const url = URL.createObjectURL(croppedBlob);
      setCroppedUrl(url);
    } else {
      // Update existing cover: use updateCoverMetadata (no file upload)
      updateCoverMetadata({
        x: croppedAreaPixels.x,
        y: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
        zoom: zoom,
        type: 'cover',
      });
    }

    setIsEditing(false);
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [changeCover, updateCoverMetadata, croppedAreaPixels, sourceUrl, zoom, isNewUpload]);

  const handleReEdit = useCallback(() => {
    const displaySrc = (user?.cover_image?.url as string | null) ?? coverSrc;
    if (!displaySrc) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSourceUrl(displaySrc);
    setIsEditing(true);
    setIsNewUpload(false); // Mark as update, not new upload
    setZoom(1);
    setMinZoom(1);
    setCrop({ x: 0, y: 0 });
  }, [coverSrc, user?.cover_image]);

  return (
    <div className="relative w-full aspect-[16/2] @container min-h-28">
      <div className="group w-full h-full">
        <img
          src={user?.cover_image?.calculatedImage ?? coverSrc}
          alt="Cover"
          className="w-full min-h-28 aspect-[16/2] object-cover"
        />
        {!isEditing && Boolean(user?.cover_image?.calculatedImage) && (
          <button
            type="button"
            onClick={handleReEdit}
            className="absolute inset-0 z-10 hidden @md:flex items-center justify-center bg-black/40 text-white text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100"
          >
            <span className="flex justify-center items-center gap-2">
              <PencilLine className="w-4 h-4" /> Change cover image
            </span>
          </button>
        )}
      </div>
      {!isEditing ? (
        <Button
          variant="outline"
          className="absolute top-3 right-3 z-20 h-8 px-2 text-xs "
          onClick={handleOpenPicker}
          size="sm"
        >
          Add Cover Image
        </Button>
      ) : (
        <div className="absolute top-3 right-3 @md:top-5 @md:right-5 flex items-center gap-2 @md:gap-3 z-20 bg-background/70 backdrop-blur rounded-md px-2 py-1 @md:px-3 @md:py-2">
          <div className="flex items-center gap-1 @md:gap-2">
            <span className="text-[10px] @md:text-xs text-muted-foreground">Zoom</span>
            <input
              type="range"
              min={minZoom}
              max={Math.max(minZoom * 10, minZoom + 1)}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="hidden md:inline"
            />
          </div>
          <Button variant="outline" onClick={handleCancel} size="sm" className="h-8 px-2 text-xs">
            Cancel
          </Button>
          <Button onClick={handleSubmit} size="sm" className="h-8 px-2 text-xs">
            Submit
          </Button>
        </div>
      )}

      {isEditing && sourceUrl && (
        <div ref={cropContainerRef} className="absolute inset-0 w-full aspect-[16/2] min-h-28">
          <Cropper
            image={sourceUrl}
            crop={crop}
            zoom={zoom}
            minZoom={minZoom}
            maxZoom={Math.max(minZoom * 10, minZoom + 1)}
            aspect={16 / 2}
            cropSize={{
              width: containerSize?.width ?? 0,
              height: containerSize?.height ?? 0,
            }}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            onMediaLoaded={handleMediaLoaded}
            restrictPosition
            zoomWithScroll
            objectFit="cover"
          />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onSelectFile}
      />
    </div>
  );
}
