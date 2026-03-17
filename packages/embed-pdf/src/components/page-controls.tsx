/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { useViewportCapability } from '@embedpdf/plugin-viewport/react';
import { useScroll } from '@embedpdf/plugin-scroll/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

type PageControlsProps = {
  documentId: string;
};

export function PageControls({ documentId }: PageControlsProps) {
  const { provides: viewport } = useViewportCapability();
  const {
    provides: scroll,
    state: { currentPage, totalPages },
  } = useScroll(documentId);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [inputValue, setInputValue] = useState<string>(currentPage.toString());

  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  const startHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      if (!isHovering) {
        setIsVisible(false);
      }
    }, 4000);
  }, [isHovering]);

  useEffect(() => {
    if (!viewport) return;

    return viewport.onScrollActivity((activity) => {
      if (activity.documentId === documentId) {
        setIsVisible(true);
        startHideTimer();
      }
    });
  }, [viewport, startHideTimer]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    setIsHovering(true);
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    startHideTimer();
  };

  const handlePageChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const pageStr = formData.get('page') as string;
    const page = parseInt(pageStr);

    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      scroll?.scrollToPage?.({
        pageNumber: page,
      });
    }
  };

  const handlePreviousPage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.blur();
    if (currentPage > 1) {
      scroll?.scrollToPreviousPage();
    }
  };

  const handleNextPage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.blur();
    if (currentPage < totalPages) {
      scroll?.scrollToNextPage();
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2 transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-center gap-2 rounded-lg border bg-background p-1 shadow-lg">
        {/* Previous Button */}
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent/75 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        {/* Page Input */}
        <form onSubmit={handlePageChange} className="flex items-center gap-2">
          <input
            type="text"
            name="page"
            value={inputValue}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              setInputValue(value);
            }}
            className="h-7 w-10 bg-accent text-accent-foreground rounded border border-border px-1 text-center text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <span className="text-sm text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">{totalPages}</span>
        </form>

        {/* Next Button */}
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent/75 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"
          aria-label="Next page"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
