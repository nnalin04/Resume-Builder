import { useState } from 'react';
import { api } from '../../api/client';
import type { useResumeState } from '../../hooks/useResumeState';

type ResumeState = ReturnType<typeof useResumeState>;

interface UseRewriteAssistantParams {
  jobDescription: string;
  resume: ResumeState;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useRewriteAssistant({
  jobDescription,
  resume,
  addToast,
}: UseRewriteAssistantParams) {
  const [isRewritingSummary, setIsRewritingSummary] = useState(false);
  const [rewritingExperienceId, setRewritingExperienceId] = useState<string | null>(null);

  const handleRewriteSummary = async () => {
    setIsRewritingSummary(true);
    try {
      const instruction = jobDescription
        ? `Rewrite to be more impactful and tailored to this job: ${jobDescription.slice(0, 300)}`
        : 'Rewrite to be more professional and impactful. 2-3 sentences.';
      const res = await api.rewriteText(resume.resumeData.summary, instruction);
      if (res.result && res.result !== resume.resumeData.summary) {
        resume.updateSummary(res.result);
        addToast('Summary rewritten!', 'success');
      }
    } catch {
      addToast('Failed to rewrite summary.', 'error');
    } finally {
      setIsRewritingSummary(false);
    }
  };

  const handleRewriteExperience = async (id: string, text: string) => {
    setRewritingExperienceId(id);
    try {
      const experience = resume.resumeData.experiences.find(item => item.id === id);
      const instruction = jobDescription
        ? `Improve these resume bullets for this job: ${jobDescription.slice(0, 300)}. Return improved bullets, one per line.`
        : 'Improve these resume bullets to be more action-oriented and quantified. Return improved bullets, one per line.';
      const context = experience ? `Role: ${experience.position} at ${experience.company}` : '';
      const res = await api.rewriteText(text, instruction, context);
      if (res.result) {
        resume.updateExperience(id, 'description', res.result);
        addToast('Bullets improved!', 'success');
      }
    } catch {
      addToast('Failed to rewrite experience.', 'error');
    } finally {
      setRewritingExperienceId(null);
    }
  };

  return {
    isRewritingSummary,
    rewritingExperienceId,
    handleRewriteSummary,
    handleRewriteExperience,
  };
}
