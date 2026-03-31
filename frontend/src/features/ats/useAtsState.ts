import { useState } from 'react';

import { api } from '../../api/client';
import type { TemplateId } from '../../types/resumeTypes';
import { flattenSkills, mapEducation, mapExperiences, mapProjects } from '../../utils/sectionMappers';


type ToastType = 'error' | 'success' | 'info';

interface ResumeActions {
  resumeData: {
    skills: string;
  };
  updateSummary: (value: string) => void;
  updateSkills: (value: string) => void;
  replaceExperiences: (value: any[]) => void;
  replaceEducation: (value: any[]) => void;
  replaceProjects: (value: any[]) => void;
}

interface UseAtsStateArgs {
  backendResumeId: number | null;
  template: TemplateId;
  resume: ResumeActions;
  addToast: (message: string, type?: ToastType) => void;
}

export function useAtsState({ backendResumeId, template, resume, addToast }: UseAtsStateArgs) {
  const [jobDescription, setJobDescription] = useState('');
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsMatched, setAtsMatched] = useState<string[]>([]);
  const [atsMissing, setAtsMissing] = useState<string[]>([]);
  const [atsRequiredMissing, setAtsRequiredMissing] = useState<string[]>([]);
  const [atsPreferredMissing, setAtsPreferredMissing] = useState<string[]>([]);
  const [atsRequiredMatched, setAtsRequiredMatched] = useState<string[]>([]);
  const [atsPreferredMatched, setAtsPreferredMatched] = useState<string[]>([]);
  const [atsSeniority, setAtsSeniority] = useState('');
  const [atsExpYears, setAtsExpYears] = useState(0);
  const [showMatchedKeywords, setShowMatchedKeywords] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [openJD, setOpenJD] = useState(false);

  const handleScore = async () => {
    if (!jobDescription.trim()) {
      addToast('Paste a job description first.', 'info');
      return;
    }
    setIsScoring(true);
    try {
      const resumeId = backendResumeId ?? 0;
      const res = await api.getAtsScore(resumeId, jobDescription);
      setAtsScore(res.score);
      setAtsMatched(res.matched ?? res.keywords_found ?? []);
      setAtsMissing(res.missing ?? res.keywords_missing ?? []);
      setAtsRequiredMissing(res.required_missing ?? []);
      setAtsPreferredMissing(res.preferred_missing ?? []);
      setAtsRequiredMatched(res.required_matched ?? []);
      setAtsPreferredMatched(res.preferred_matched ?? []);
      setAtsSeniority(res.seniority ?? '');
      setAtsExpYears(res.experience_years ?? 0);
    } catch {
      addToast('Failed to get ATS score. Try importing your PDF first.', 'error');
    } finally {
      setIsScoring(false);
    }
  };

  const handleOptimize = async () => {
    if (!jobDescription.trim()) {
      addToast('Please enter a job description first.', 'info');
      return;
    }
    if (!backendResumeId) {
      addToast('Import a PDF first to use AI optimization.', 'info');
      return;
    }
    setIsOptimizing(true);
    try {
      const res = await api.generateResume(backendResumeId, jobDescription, template);
      const sections = res.sections;
      if (sections) {
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
      }
      if (res.ats_score != null) {
        setAtsScore(res.ats_score);
      }
      addToast('Resume optimized!', 'success');
    } catch {
      addToast('AI Optimization failed.', 'error');
    } finally {
      setIsOptimizing(false);
    }
  };

  const appendMissingKeyword = (keyword: string) => {
    const current = resume.resumeData.skills.trim();
    const skills = current ? `${current}, ${keyword}` : keyword;
    resume.updateSkills(skills);
    setAtsMissing((prev) => prev.filter((item) => item !== keyword));
  };

  const resetAtsState = () => {
    setAtsScore(null);
    setAtsMatched([]);
    setAtsMissing([]);
    setAtsRequiredMissing([]);
    setAtsPreferredMissing([]);
    setAtsRequiredMatched([]);
    setAtsPreferredMatched([]);
    setAtsSeniority('');
    setAtsExpYears(0);
  };

  return {
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
  };
}
