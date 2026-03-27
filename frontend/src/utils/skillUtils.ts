import type { ResumeData, SkillCategory } from '../types/resumeTypes';

export interface SkillSection {
  label: string | null;
  items: string[];
}

/** Returns skill sections for template rendering.
 *  If skillCategories are set, returns labelled groups; otherwise returns a single flat group. */
export function getSkillSections(data: ResumeData): SkillSection[] {
  const cats = data.skillCategories?.filter(c => c.skills.trim());
  if (cats?.length) {
    return cats.map(c => ({
      label: c.label,
      items: c.skills.split(',').map(s => s.trim()).filter(Boolean),
    }));
  }
  return [{
    label: null,
    items: data.skills ? data.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
  }];
}

export const DEFAULT_SKILL_CATEGORIES: SkillCategory[] = [
  { id: 'languages',    label: 'Languages',    skills: '' },
  { id: 'frameworks',   label: 'Frameworks',   skills: '' },
  { id: 'databases',    label: 'Databases',    skills: '' },
  { id: 'devops',       label: 'DevOps',       skills: '' },
  { id: 'architecture', label: 'Architecture', skills: '' },
];
