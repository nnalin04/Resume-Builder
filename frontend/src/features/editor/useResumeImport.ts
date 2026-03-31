import type { ChangeEvent, RefObject } from 'react';
import { api } from '../../api/client';
import type { useResumeState } from '../../hooks/useResumeState';
import {
  flattenSkills,
  mapCertifications,
  mapEducation,
  mapExperiences,
  mapProjects,
} from '../../utils/sectionMappers';

type ResumeState = ReturnType<typeof useResumeState>;

interface UseResumeImportParams {
  user: unknown;
  resume: ResumeState;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  setBackendResumeId: (id: number | null) => void;
  setIsUploading: (value: boolean) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export function useResumeImport({
  user,
  resume,
  addToast,
  setBackendResumeId,
  setIsUploading,
  fileInputRef,
}: UseResumeImportParams) {
  const handlePdfUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      addToast('Sign in to import your PDF resume.', 'info');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const uploadRes = await api.uploadResume(file);
      setBackendResumeId(uploadRes.resume_id);

      const parseRes = await api.parseResume(uploadRes.resume_id);
      const sections = parseRes.sections;
      if (!sections) return;

      const contact = sections.contact ?? sections.personal;
      if (contact) {
        resume.updatePersonalInfo('name', contact.name || '');
        resume.updatePersonalInfo('email', contact.email || '');
        resume.updatePersonalInfo('phone', contact.phone || '');
        resume.updatePersonalInfo('location', contact.location || '');
        resume.updatePersonalInfo('linkedin', contact.linkedin || '');
        resume.updatePersonalInfo('github', contact.github || '');
      }

      if (sections.summary) resume.updateSummary(sections.summary);
      if (sections.skills) resume.updateSkills(flattenSkills(sections.skills));

      if (Array.isArray(sections.experience) && sections.experience.length > 0) {
        resume.replaceExperiences(mapExperiences(sections.experience));
      }

      if (Array.isArray(sections.education) && sections.education.length > 0) {
        resume.replaceEducation(mapEducation(sections.education));
      }

      if (Array.isArray(sections.projects) && sections.projects.length > 0) {
        resume.replaceProjects(mapProjects(sections.projects));
      }

      if (Array.isArray(sections.certifications) && sections.certifications.length > 0) {
        resume.replaceCertifications(mapCertifications(sections.certifications));
      }

      if (Array.isArray(sections.customSections) && sections.customSections.length > 0) {
        resume.replaceCustomSections(
          sections.customSections.map((customSection: any) => ({
            id: crypto.randomUUID(),
            heading: customSection.heading || 'Other',
            items: (customSection.items || []).map((item: any) => ({
              id: crypto.randomUUID(),
              title: item.title || '',
              subtitle: item.subtitle,
              date: item.date,
              description: item.description,
            })),
          })),
        );
      }

      addToast('Resume imported successfully!', 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return { handlePdfUpload };
}
