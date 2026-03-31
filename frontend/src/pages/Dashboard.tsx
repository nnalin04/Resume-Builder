import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useResumeState } from '../hooks/useResumeState';
import type { TemplateId } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import { resumeDataToSections } from '../utils/sectionMappers';
import OnboardingWizard from '../components/OnboardingWizard';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';
import { useAtsState } from '../features/ats/useAtsState';
import { useChatState } from '../features/chat/useChatState';
import DashboardTopBar from '../features/editor/DashboardTopBar';
import EditorHeader from '../features/editor/EditorHeader';
import EditorFormStack from '../features/editor/EditorFormStack';
import ToastStack from '../features/editor/ToastStack';
import { useBackendResumeId } from '../features/editor/useBackendResumeId';
import { useEditorLayout } from '../features/editor/useEditorLayout';
import { useLeavePrompt } from '../features/editor/useLeavePrompt';
import { useProfileSync } from '../features/editor/useProfileSync';
import { useResumeImport } from '../features/editor/useResumeImport';
import { useRewriteAssistant } from '../features/editor/useRewriteAssistant';
import { useExportState } from '../features/export/useExportState';
import MobilePreviewModal from '../features/preview/MobilePreviewModal';
import PreviewPanel from '../features/preview/PreviewPanel';
import TemplateStrip from '../features/preview/TemplateStrip';
import { getTemplateComponent } from '../features/preview/templateRegistry';
import { useVersionState } from '../features/versioning/useVersionState';
import { useToasts } from '../hooks/useToasts';

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const resume = useResumeState();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<TemplateId>('classic');
  const [fontSize, setFontSize] = useState<FontSize>('small');
  const {
    openSections,
    editorWidth,
    showMobilePreview,
    setShowMobilePreview,
    isMobile,
    toggleSection,
    handleDividerMouseDown,
  } = useEditorLayout();

  const [isUploading, setIsUploading] = useState(false);
  const { backendResumeId, setBackendResumeId } = useBackendResumeId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  const [previewPageCount, setPreviewPageCount] = useState(1);
  const [mobilePageCount, setMobilePageCount] = useState(1);

  // Toasts
  const { toasts, addToast, dismissToast } = useToasts();
  const { exporting, exportingDocx, exportError, handleExport, handleDocxExport } = useExportState({
    user,
    resumeData: resume.resumeData,
    recordDownload: api.recordDownload,
    refreshUser,
    clearDraft: resume.clearDraft,
    navigateToPricing: () => navigate('/pricing'),
    resumeDataToSections,
  });
  const {
    jobDescription,
    setJobDescription,
    atsScore,
    atsMatched,
    atsMissing,
    atsRequiredMissing,
    atsPreferredMissing,
    atsRequiredMatched,
    atsPreferredMatched,
    atsSeniority,
    atsExpYears,
    showMatchedKeywords,
    setShowMatchedKeywords,
    isScoring,
    isOptimizing,
    openJD,
    setOpenJD,
    handleScore,
    handleOptimize,
    appendMissingKeyword,
    resetAtsState,
  } = useAtsState({
    backendResumeId,
    template,
    resume,
    addToast,
  });
  const {
    chatOpen,
    setChatOpen,
    chatMessages,
    chatInput,
    setChatInput,
    isChatLoading,
    chatEndRef,
    handleChatSend,
  } = useChatState({
    backendResumeId,
    jobDescription,
    resumeData: {
      summary: resume.resumeData.summary,
      experiences: resume.resumeData.experiences,
    },
    addToast,
  });
  const {
    showVersionInput,
    setShowVersionInput,
    versionName,
    setVersionName,
    isSavingVersion,
    versions,
    showVersions,
    isLoadingVersions,
    handleSaveVersion,
    handleLoadVersions,
    handleRestoreVersion,
  } = useVersionState({
    backendResumeId,
    resume,
    addToast,
  });
  const { handlePdfUpload } = useResumeImport({
    user,
    resume,
    addToast,
    setBackendResumeId,
    setIsUploading,
    fileInputRef,
  });
  const {
    isRewritingSummary,
    rewritingExperienceId,
    handleRewriteSummary,
    handleRewriteExperience,
  } = useRewriteAssistant({
    jobDescription,
    resume,
    addToast,
  });

  useLeavePrompt(resume.isDirty);
  useProfileSync(user, resume);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const isSubscriber = user?.subscription_status === 'ACTIVE';
  const freeLeft = user ? Math.max(0, 3 - (user.free_downloads_used ?? 0)) : null;

  // Onboarding wizard
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('resume_onboarding_done'));

  const PreviewComponent = getTemplateComponent(template);

  return (
    <>
    <motion.div
      id="resume-editor-shell"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-screen bg-slate-100 font-sans"
    >

      {/* ─── Onboarding Wizard ────────────────────────────────────────────── */}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={(templateId, file, targetRole) => {
            setShowOnboarding(false);
            setTemplate(templateId);
            if (targetRole) setJobDescription(targetRole);
            if (file) {
              const dt = new DataTransfer();
              dt.items.add(file);
              const fakeEvent = { target: { files: dt.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
              handlePdfUpload(fakeEvent);
            }
          }}
        />
      )}

      <ToastStack toasts={toasts} dismissToast={dismissToast} />

      <DashboardTopBar
        isMobile={isMobile}
        fontSize={fontSize}
        setFontSize={setFontSize}
        user={user}
        isSubscriber={isSubscriber}
        freeLeft={freeLeft}
        exportingDocx={exportingDocx}
        handleDocxExport={handleDocxExport}
        exporting={exporting}
        handleExport={handleExport}
        navigateToProfile={() => navigate('/profile')}
      />

      {exportError && (
        <div className="bg-red-50 border-b border-red-200 text-red-600 px-6 py-3 text-sm font-medium flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
          {exportError}
        </div>
      )}

      {/* ─── Main panels ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: '1 1 0', overflow: 'hidden', flexDirection: 'row' }}>

        {/* ─── Editor Panel ─────────────────────────────────────────────── */}
        <div className="hide-on-print" style={{
          flexShrink: 0,
          width: isMobile ? '100%' : editorWidth,
          background: '#fff',
          borderRight: isMobile ? 'none' : '1px solid #e2e8f0',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
        }}>
            <EditorHeader
              fileInputRef={fileInputRef}
              handlePdfUpload={handlePdfUpload}
              isUploading={isUploading}
              handleOptimize={handleOptimize}
              isOptimizing={isOptimizing}
              backendResumeId={backendResumeId}
              showVersionInput={showVersionInput}
              setShowVersionInput={setShowVersionInput}
              versionName={versionName}
              setVersionName={setVersionName}
              isSavingVersion={isSavingVersion}
              handleSaveVersion={handleSaveVersion}
            />

            <EditorFormStack
              openSections={openSections}
              toggleSection={toggleSection}
              resume={resume}
              handleRewriteSummary={handleRewriteSummary}
              isRewritingSummary={isRewritingSummary}
              handleRewriteExperience={handleRewriteExperience}
              rewritingExperienceId={rewritingExperienceId}
              openJD={openJD}
              setOpenJD={setOpenJD}
              jobDescription={jobDescription}
              setJobDescription={setJobDescription}
              atsScore={atsScore}
              atsMatched={atsMatched}
              atsMissing={atsMissing}
              atsRequiredMissing={atsRequiredMissing}
              atsPreferredMissing={atsPreferredMissing}
              atsRequiredMatched={atsRequiredMatched}
              atsPreferredMatched={atsPreferredMatched}
              atsSeniority={atsSeniority}
              atsExpYears={atsExpYears}
              showMatchedKeywords={showMatchedKeywords}
              setShowMatchedKeywords={setShowMatchedKeywords}
              isScoring={isScoring}
              handleScore={handleScore}
              isOptimizing={isOptimizing}
              handleOptimize={handleOptimize}
              appendMissingKeyword={appendMissingKeyword}
              resetAtsState={resetAtsState}
              backendResumeId={backendResumeId}
              showVersions={showVersions}
              isLoadingVersions={isLoadingVersions}
              versions={versions}
              handleLoadVersions={handleLoadVersions}
              handleRestoreVersion={handleRestoreVersion}
              chatOpen={chatOpen}
              setChatOpen={setChatOpen}
              chatMessages={chatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              isChatLoading={isChatLoading}
              chatEndRef={chatEndRef}
              handleChatSend={handleChatSend}
              isMobile={isMobile}
              setShowMobilePreview={setShowMobilePreview}
            />
          </div>

        {/* ─── Resizable divider ────────────────────────────────────────── */}
        {!isMobile && (
          <div
            className="hide-on-print"
            onMouseDown={handleDividerMouseDown}
            style={{
              width: 5, flexShrink: 0, cursor: 'col-resize',
              background: '#e2e8f0', transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#6366f1'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#e2e8f0'; }}
          >
            <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
          </div>
        )}

        {/* ─── Desktop: Preview + Template Strip ──────────────────────── */}
        {!isMobile && (
          <>
            <PreviewPanel
              template={template}
              previewPageCount={previewPageCount}
              previewContentRef={previewContentRef}
              resumeData={resume.resumeData}
              fontSize={fontSize}
              previewComponent={PreviewComponent}
              setPreviewPageCount={setPreviewPageCount}
            />

            <TemplateStrip template={template} setTemplate={setTemplate} />
          </>
        )}

      </div>

      <MobilePreviewModal
        show={isMobile && showMobilePreview}
        setShow={setShowMobilePreview}
        template={template}
        setTemplate={setTemplate}
        resumeData={resume.resumeData}
        fontSize={fontSize}
        setFontSize={setFontSize}
        previewComponent={PreviewComponent}
        mobilePageCount={mobilePageCount}
        setMobilePageCount={setMobilePageCount}
        exporting={exporting}
        handleExport={handleExport}
      />
    </motion.div>
      {/* ─── Print-only area ─────────────────────────────────────────────── */}
      {/* 🔒 LOCKED — commit a4ad0d2 — DO NOT MODIFY THIS BLOCK               */}
      {/* Hidden in browser; @media print makes it the only visible element.   */}
      {/* Renders full template at 100% scale — no overflow:hidden clipping,   */}
      {/* no translateY, no transforms. Browser paginates naturally.           */}
      {/* See CLAUDE.md "LOCKED FEATURES" for full explanation.               */}
      <div id="resume-print-area" style={{ display: 'none' }}>
        <PreviewComponent data={resume.resumeData} fontSize={fontSize} />
      </div>
    </>
  );
}
