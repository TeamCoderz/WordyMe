import { create } from 'zustand';

type PdfStoreType = {
  pdfFile: string | null;
  setPdfFile: (file: string | null) => void;
};

export const usePdfStore = create<PdfStoreType>((set) => ({
  pdfFile: null,
  setPdfFile: (file) => set({ pdfFile: file }),
}));
