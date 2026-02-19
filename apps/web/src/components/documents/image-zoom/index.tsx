/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  RotateCcwIcon,
  RotateCwIcon,
  ZoomInIcon,
  ZoomOutIcon,
  MinimizeIcon,
  XIcon,
} from '@repo/ui/components/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@repo/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/components/tooltip';
import { setShouldBlockNavigation, NAVIGATION_BLOCKED_EVENT } from '@repo/shared/navigation';
import { cn } from '@repo/ui/lib/utils';

interface ImageZoomProps {
  selector?: string;
}

interface ImageItem {
  src: string;
  alt: string;
  element: HTMLImageElement;
  index: number;
  hasDarkModeFilter: boolean;
}

interface TransformState {
  scale: number;
  rotate: number;
  x: number;
  y: number;
}

const INITIAL_TRANSFORM: TransformState = {
  scale: 1,
  rotate: 0,
  x: 0,
  y: 0,
};

const ZOOM_STEP = 0.5;
const MIN_SCALE = 0.5;
const MAX_SCALE = 5;

export function ImageZoom({ selector = '.editor-input' }: ImageZoomProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [transform, setTransform] = useState<TransformState>(INITIAL_TRANSFORM);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const transformRef = useRef<TransformState>(INITIAL_TRANSFORM);
  const pinchStartRef = useRef<{
    distance: number;
    scale: number;
    centerX: number;
    centerY: number;
    x: number;
    y: number;
  } | null>(null);

  // Sync ref with state for event handlers
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  // Scan for images
  useEffect(() => {
    const updateImages = () => {
      const container = document.querySelector(selector);
      if (!container) return;

      const imgElements = Array.from(container.querySelectorAll('img'));
      const items: ImageItem[] = imgElements.map((img, index) => {
        // Add click listener to existing images to open preview
        // We'll use a delegated listener on the container instead for better perf
        // But we need to map them to indices
        img.setAttribute('data-image-zoom-index', index.toString());
        img.style.cursor = 'zoom-in';
        return {
          src: img.src,
          alt: img.alt,
          element: img,
          index,
          hasDarkModeFilter:
            img.parentElement?.classList.contains('LexicalTheme__darkModeFilter') ?? false,
        };
      });
      setImages(items);
    };

    updateImages();

    const container = document.querySelector(selector);
    if (!container) return;

    // Observer for dynamic content
    const observer = new MutationObserver(() => {
      updateImages();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });

    // Delegated click listener
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        const indexStr = target.getAttribute('data-image-zoom-index');
        if (indexStr !== null) {
          e.preventDefault();
          const index = parseInt(indexStr, 10);
          setTransform(INITIAL_TRANSFORM);
          setCurrentIndex(index);
          setShouldBlockNavigation(true);
        }
      }
    };

    container.addEventListener('click', handleClick);

    return () => {
      observer.disconnect();
      container.removeEventListener('click', handleClick);
      // Cleanup styles
      const imgs = container.querySelectorAll('img');
      imgs.forEach((img) => {
        img.style.cursor = '';
        img.removeAttribute('data-image-zoom-index');
      });
    };
  }, [selector]);

  // Handle open/close side effects
  useEffect(() => {
    if (currentIndex !== null) {
      document.body.style.overflow = 'hidden';
      setShouldBlockNavigation(true);
    } else {
      document.body.style.overflow = '';
      setShouldBlockNavigation(false);
    }

    return () => {
      document.body.style.overflow = '';
      setShouldBlockNavigation(false);
    };
  }, [currentIndex]);

  const resetTransform = useCallback(() => {
    setTransform(INITIAL_TRANSFORM);
  }, []);

  const handleClose = useCallback(() => {
    resetTransform();
    setCurrentIndex(null);
  }, [resetTransform]);

  // Handle navigation blocking event from app
  useEffect(() => {
    const handleNavBlocked = () => {
      if (currentIndex !== null) {
        handleClose();
      }
    };
    window.addEventListener(NAVIGATION_BLOCKED_EVENT, handleNavBlocked);
    return () => {
      window.removeEventListener(NAVIGATION_BLOCKED_EVENT, handleNavBlocked);
    };
  }, [currentIndex]);

  const handleReset = useCallback(() => {
    resetTransform();
  }, [resetTransform]);

  const handleZoomIn = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(prev.scale + ZOOM_STEP, MAX_SCALE),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(prev.scale - ZOOM_STEP, MIN_SCALE),
    }));
  }, []);

  const handleRotateLeft = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      rotate: prev.rotate - 90,
    }));
  }, []);

  const handleRotateRight = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      rotate: prev.rotate + 90,
    }));
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev === null || prev <= 0) return prev;
      resetTransform();
      return prev - 1;
    });
  }, [resetTransform]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev === null || prev >= images.length - 1) return prev;
      resetTransform();
      return prev + 1;
    });
  }, [images.length, resetTransform]);

  // Keyboard navigation
  useEffect(() => {
    if (currentIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowLeft': {
          const img = imageRef.current;
          const container = containerRef.current;
          if (img && container) {
            const { left: imgLeft } = img.getBoundingClientRect();
            const { left: containerLeft } = container.getBoundingClientRect();
            if (imgLeft >= containerLeft - 1) handlePrev();
            else setTransform((prev) => ({ ...prev, x: prev.x + 40 }));
          }
          break;
        }
        case 'ArrowRight': {
          const img = imageRef.current;
          const container = containerRef.current;
          if (img && container) {
            const { right: imgRight } = img.getBoundingClientRect();
            const { right: containerRight } = container.getBoundingClientRect();
            if (imgRight <= containerRight + 1) handleNext();
            else setTransform((prev) => ({ ...prev, x: prev.x - 40 }));
          }
          break;
        }
        case 'ArrowUp':
          setTransform((prev) => ({ ...prev, y: prev.y + 40 }));
          break;
        case 'ArrowDown':
          setTransform((prev) => ({ ...prev, y: prev.y - 40 }));
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
        case '_':
          handleZoomOut();
          break;
        case '0':
          handleReset();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, handleClose, handleNext, handlePrev, handleZoomIn, handleZoomOut, handleReset]);

  // Mouse/Touch handlers for Pan & Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP) * 0.25;
    const container = containerRef.current;
    const image = imageRef.current;

    if (container && image) {
      const containerRect = container.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left - containerRect.width / 2;
      const mouseY = e.clientY - containerRect.top - containerRect.height / 2;

      setTransform((prev) => {
        const newScale = Math.min(Math.max(prev.scale + delta, MIN_SCALE), MAX_SCALE);

        // Calculate the point on the image (in image coordinates) that's under the mouse
        const imageX = (mouseX - prev.x) / prev.scale;
        const imageY = (mouseY - prev.y) / prev.scale;

        // Adjust position to keep the same image point under the mouse
        const newX = mouseX - imageX * newScale;
        const newY = mouseY - imageY * newScale;

        return {
          ...prev,
          scale: newScale,
          x: newX,
          y: newY,
        };
      });
    } else {
      // Fallback to simple zoom if refs aren't available
      setTransform((prev) => ({
        ...prev,
        scale: Math.min(Math.max(prev.scale + delta, MIN_SCALE), MAX_SCALE),
      }));
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only left click
    if (pinchStartRef.current) return; // Don't drag during pinch
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - transformRef.current.x,
      y: e.clientY - transformRef.current.y,
    };
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    e.preventDefault();

    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;

    setTransform((prev) => ({
      ...prev,
      x: newX,
      y: newY,
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    dragStartRef.current = null;
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Calculate distance between two touch points
  const getTouchDistance = (touch1: React.Touch | Touch, touch2: React.Touch | Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Get center point between two touches
  const getTouchCenter = (
    touch1: React.Touch | Touch,
    touch2: React.Touch | Touch,
  ): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  // Touch handlers for pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getTouchDistance(touch1, touch2);
      const center = getTouchCenter(touch1, touch2);
      const container = containerRef.current;

      if (container) {
        const rect = container.getBoundingClientRect();
        const centerX = center.x - rect.left - rect.width / 2;
        const centerY = center.y - rect.top - rect.height / 2;

        pinchStartRef.current = {
          distance,
          scale: transformRef.current.scale,
          centerX,
          centerY,
          x: transformRef.current.x,
          y: transformRef.current.y,
        };
      }
    } else if (e.touches.length === 1) {
      // Single touch - allow normal dragging
      pinchStartRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartRef.current) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = getTouchDistance(touch1, touch2);
      const center = getTouchCenter(touch1, touch2);
      const container = containerRef.current;
      const image = imageRef.current;

      if (container && image) {
        const containerRect = container.getBoundingClientRect();
        const currentCenterX = center.x - containerRect.left - containerRect.width / 2;
        const currentCenterY = center.y - containerRect.top - containerRect.height / 2;

        // Calculate scale change
        const scaleChange = distance / pinchStartRef.current.distance;
        const newScale = Math.min(
          Math.max(pinchStartRef.current.scale * scaleChange, MIN_SCALE),
          MAX_SCALE,
        );

        // Calculate position adjustment to keep pinch center fixed
        // The center point in image coordinates (before scale change)
        const imageCenterX =
          (currentCenterX - pinchStartRef.current.x) / pinchStartRef.current.scale;
        const imageCenterY =
          (currentCenterY - pinchStartRef.current.y) / pinchStartRef.current.scale;

        // New position to keep the same image point under the pinch center
        const newX = currentCenterX - imageCenterX * newScale;
        const newY = currentCenterY - imageCenterY * newScale;

        setTransform({
          ...transformRef.current,
          scale: newScale,
          x: newX,
          y: newY,
        });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchStartRef.current = null;
    }
  };

  if (currentIndex === null || !images[currentIndex]) return null;

  const currentImage = images[currentIndex];

  return createPortal(
    <TooltipProvider>
      <div
        className="absolute inset-0 h-screen z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
        style={{ top: window.scrollY + 'px' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
        onWheel={handleWheel}
      >
        {/* Header / Toolbar */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4">
          <div className="text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon-sm" onClick={handleReset}>
                  <MinimizeIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon-sm" onClick={handleRotateLeft}>
                  <RotateCcwIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rotate Left</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon-sm" onClick={handleRotateRight}>
                  <RotateCwIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rotate Right</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon-sm" onClick={handleZoomOut}>
                  <ZoomOutIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon-sm" onClick={handleZoomIn}>
                  <ZoomInIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 mx-2 bg-white/20" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={handleClose}
                  className="hover:bg-red-500/20 hover:text-red-400"
                >
                  <XIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Previous Button */}
        <Button
          variant="outline"
          size="icon-sm"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          disabled={currentIndex === 0}
        >
          <ArrowLeftIcon />
        </Button>

        {/* Next Button */}
        <Button
          variant="outline"
          size="icon-sm"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          disabled={currentIndex === images.length - 1}
        >
          <ArrowRightIcon />
        </Button>

        {/* Image Container */}
        <div
          ref={containerRef}
          className={cn(
            'relative w-full h-full overflow-hidden flex items-center justify-center cursor-move touch-none',
            {
              'items-start': currentImage.element.height > window.innerHeight * 0.9,
            },
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            ref={imageRef}
            src={currentImage.src}
            alt={currentImage.alt}
            className={cn(
              'max-w-[90vw] object-contain transition-[scale,rotate] duration-75 ease-linear',
              {
                'dark:invert-[.86] dark:hue-rotate-[180deg]': currentImage.hasDarkModeFilter,
                'w-full': currentImage.element.width > window.innerWidth * 0.9,
                'h-auto': currentImage.element.height > window.innerHeight * 0.9,
              },
            )}
            style={{
              translate: `${transform.x}px ${transform.y}px`,
              rotate: `${transform.rotate}deg`,
              scale: transform.scale,
            }}
            draggable={false}
          />
        </div>
      </div>
    </TooltipProvider>,
    document.body,
  );
}

export default ImageZoom;
