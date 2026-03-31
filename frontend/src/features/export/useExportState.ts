import { useRef, useState } from 'react';

import type { ResumeData } from '../../types/resumeTypes';
import { exportToDOCX } from '../../utils/pdfExport';


type ToastType = 'error' | 'success' | 'info';

interface UseExportStateArgs {
  user: { id: number } | null;
  resumeData: ResumeData;
  recordDownload: () => Promise<unknown>;
  refreshUser: () => Promise<void>;
  clearDraft: () => void;
  navigateToPricing: () => void;
  resumeDataToSections: (data: ResumeData) => object;
  addToast?: (message: string, type?: ToastType) => void;
}

export function useExportState({
  user,
  resumeData,
  recordDownload,
  refreshUser,
  clearDraft,
  navigateToPricing,
  resumeDataToSections,
}: UseExportStateArgs) {
  const [exporting, setExporting] = useState(false);
  const exportingRef = useRef(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportError, setExportError] = useState('');

  const handleExport = async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setExportError('');
    try {
      if (user) {
        await recordDownload();
        await refreshUser();
      }
      clearDraft();
      const candidateName = resumeData.personalInfo.name?.trim().replace(/\s+/g, '_') || 'Resume';
      const dateStr = new Date().toISOString().slice(0, 10);
      const prevTitle = document.title;
      document.title = `${candidateName}_Resume_${dateStr}`;
      const restoreTitle = () => {
        document.title = prevTitle;
        window.removeEventListener('afterprint', restoreTitle);
      };
      window.addEventListener('afterprint', restoreTitle);
      window.print();
    } catch (err: unknown) {
      const exportErr = err as { status?: number };
      if (exportErr?.status === 402) {
        navigateToPricing();
      } else {
        setExportError(err instanceof Error ? err.message : 'Export failed');
      }
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  };

  const handleDocxExport = async () => {
    setExportingDocx(true);
    setExportError('');
    try {
      const sections = resumeDataToSections(resumeData);
      const name = resumeData.personalInfo.name?.replace(/\s+/g, '_') || 'resume';
      await exportToDOCX(sections, name);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'DOCX export failed');
    } finally {
      setExportingDocx(false);
    }
  };

  return {
    exporting,
    exportingDocx,
    exportError,
    handleExport,
    handleDocxExport,
  };
}
