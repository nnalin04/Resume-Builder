import { useState } from 'react';

import { api } from '../../api/client';
import { flattenSkills, mapCertifications, mapEducation, mapExperiences, mapProjects } from '../../utils/sectionMappers';


type ToastType = 'error' | 'success' | 'info';

interface ResumeActions {
  updatePersonalInfo: (field: 'name' | 'email' | 'phone' | 'location' | 'linkedin' | 'github', value: string) => void;
  updateSummary: (value: string) => void;
  updateSkills: (value: string) => void;
  replaceExperiences: (value: any[]) => void;
  replaceEducation: (value: any[]) => void;
  replaceProjects: (value: any[]) => void;
  replaceCertifications: (value: any[]) => void;
}

interface UseVersionStateArgs {
  backendResumeId: number | null;
  resume: ResumeActions;
  addToast: (message: string, type?: ToastType) => void;
}

export function useVersionState({ backendResumeId, resume, addToast }: UseVersionStateArgs) {
  const [showVersionInput, setShowVersionInput] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [versions, setVersions] = useState<{ id: number; name: string; created_at: string }[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  const handleSaveVersion = async () => {
    if (!backendResumeId || !versionName.trim()) return;
    setIsSavingVersion(true);
    try {
      await api.saveVersion(backendResumeId, versionName.trim());
      setVersionName('');
      setShowVersionInput(false);
      setShowVersions(true);
      const res = await api.listVersions(backendResumeId);
      setVersions(res.versions);
      addToast('Version saved! See Version History below to restore it.', 'success');
    } catch {
      addToast('Failed to save version.', 'error');
    } finally {
      setIsSavingVersion(false);
    }
  };

  const handleLoadVersions = async () => {
    if (!backendResumeId) {
      addToast('Import a PDF first to use versions.', 'info');
      return;
    }
    setShowVersions((prev) => !prev);
    if (!showVersions) {
      setIsLoadingVersions(true);
      try {
        const res = await api.listVersions(backendResumeId);
        setVersions(res.versions);
      } catch {
        addToast('Failed to load versions.', 'error');
      } finally {
        setIsLoadingVersions(false);
      }
    }
  };

  const handleRestoreVersion = async (versionId: number) => {
    if (!backendResumeId) return;
    try {
      const res = await api.restoreVersion(backendResumeId, versionId);
      const sections = res.sections;
      if (sections) {
        if (sections.contact) {
          const contact = sections.contact;
          if (contact.name) resume.updatePersonalInfo('name', contact.name);
          if (contact.email) resume.updatePersonalInfo('email', contact.email);
          if (contact.phone) resume.updatePersonalInfo('phone', contact.phone);
          if (contact.location) resume.updatePersonalInfo('location', contact.location);
          if (contact.linkedin) resume.updatePersonalInfo('linkedin', contact.linkedin);
          if (contact.github) resume.updatePersonalInfo('github', contact.github);
        }
        if (sections.summary) resume.updateSummary(sections.summary);
        if (sections.skills) {
          resume.updateSkills(typeof sections.skills === 'string' ? sections.skills : flattenSkills(sections.skills));
        }
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
      }
      addToast('Version restored!', 'success');
      setShowVersions(false);
    } catch {
      addToast('Failed to restore version.', 'error');
    }
  };

  return {
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
  };
}
