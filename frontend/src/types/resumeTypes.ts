export interface PersonalInfo {
  name: string;
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  description: string;
  hidden?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  link: string;
  hidden?: boolean;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  year: string;
  start_year?: string;
  hidden?: boolean;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  hidden?: boolean;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  description?: string;
}

export interface CustomSection {
  id: string;
  heading: string;
  items: CustomSectionItem[];
}

export interface SkillCategory {
  id: string;
  label: string;
  skills: string; // comma-separated
}

export interface SkillTag {
  name: string;
  years?: number;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experiences: Experience[];
  projects: Project[];
  education: Education[];
  skills: string;
  skillCategories?: SkillCategory[]; // optional structured categories
  skillTags?: SkillTag[]; // optional pill-tag input
  certifications: Certification[];
  customSections?: CustomSection[];
}

export type TemplateId = 'classic' | 'modern' | 'professional' | 'twocolumn' | 'clean' | 'minimal' | 'executive' | 'tech' | 'finance' | 'creative';
