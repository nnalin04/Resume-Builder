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
}

export interface Project {
  id: string;
  name: string;
  description: string;
  link: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  year: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experiences: Experience[];
  projects: Project[];
  education: Education[];
  skills: string;
  certifications: Certification[];
}

export type TemplateId = 'classic' | 'modern' | 'professional' | 'twocolumn' | 'clean' | 'minimal' | 'executive' | 'tech' | 'finance' | 'creative';
