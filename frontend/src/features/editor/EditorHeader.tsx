import type { ChangeEvent, RefObject } from 'react';

import SaveVersionControl from '../versioning/VersionPanel';


interface EditorHeaderProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  handlePdfUpload: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  isUploading: boolean;
  handleOptimize: () => Promise<void>;
  isOptimizing: boolean;
  backendResumeId: number | null;
  showVersionInput: boolean;
  setShowVersionInput: (value: boolean) => void;
  versionName: string;
  setVersionName: (value: string) => void;
  isSavingVersion: boolean;
  handleSaveVersion: () => Promise<void>;
}

export default function EditorHeader({
  fileInputRef,
  handlePdfUpload,
  isUploading,
  handleOptimize,
  isOptimizing,
  backendResumeId,
  showVersionInput,
  setShowVersionInput,
  versionName,
  setVersionName,
  isSavingVersion,
  handleSaveVersion,
}: EditorHeaderProps) {
  return (
    <div className="p-4 bg-surface-50 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
      <h2 className="font-outfit font-bold text-lg text-slate-800">Resume Details</h2>
      <div className="flex items-center gap-2">
        <input type="file" ref={fileInputRef} onChange={(e) => void handlePdfUpload(e)} accept=".pdf" className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-xs font-bold bg-white text-slate-600 border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Import PDF'}
        </button>
        <button
          onClick={() => void handleOptimize()}
          disabled={isOptimizing}
          className="text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-50"
        >
          {isOptimizing ? 'Optimizing...' : 'Optimize'}
        </button>

        <SaveVersionControl
          backendResumeId={backendResumeId}
          showVersionInput={showVersionInput}
          setShowVersionInput={setShowVersionInput}
          versionName={versionName}
          setVersionName={setVersionName}
          isSavingVersion={isSavingVersion}
          handleSaveVersion={handleSaveVersion}
        />
      </div>
    </div>
  );
}
