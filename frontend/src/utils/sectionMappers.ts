import { v4 as uuidv4 } from 'uuid';
import type { Experience, Education, Project, Certification, ResumeData } from '../types/resumeTypes';

// ─── Raw backend shapes ────────────────────────────────────────────────────────

interface RawExp {
  company?: string;
  title?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  bullets?: string[];
}

interface RawEdu {
  institution?: string;
  degree?: string;
  field?: string;
  graduation_date?: string;
  start_year?: string;
}

interface RawProj {
  name?: string;
  description?: string | string[];
  link?: string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function mapExperiences(raw: RawExp[]): Experience[] {
  return raw.map(exp => ({
    id: uuidv4(),
    company: exp.company || '',
    position: exp.title || '',
    location: exp.location || '',
    startDate: exp.start_date || '',
    endDate: (!exp.end_date || exp.end_date.toLowerCase().includes('present')) ? '' : exp.end_date,
    currentlyWorking: !exp.end_date || exp.end_date.toLowerCase().includes('present'),
    description: Array.isArray(exp.bullets) ? exp.bullets.join('\n') : '',
  }));
}

export function mapEducation(raw: RawEdu[]): Education[] {
  return raw.map(edu => ({
    id: uuidv4(),
    institution: edu.institution || '',
    degree: edu.degree || '',
    field: edu.field || '',
    year: edu.graduation_date || '',
    ...(edu.start_year ? { start_year: edu.start_year } : {}),
  }));
}

export function mapProjects(raw: RawProj[]): Project[] {
  return raw.map(proj => ({
    id: uuidv4(),
    name: proj.name || '',
    description: typeof proj.description === 'string'
      ? proj.description
      : Array.isArray(proj.description)
      ? proj.description.join('\n')
      : '',
    link: proj.link || '',
  }));
}

interface RawCert {
  name?: string;
  issuer?: string;
  date?: string;
}

export function mapCertifications(raw: RawCert[]): Certification[] {
  return raw.map(c => ({
    id: uuidv4(),
    name: c.name || '',
    issuer: c.issuer || '',
    date: c.date || '',
  }));
}

export function flattenSkills(skills: Record<string, string[]> | string): string {
  if (typeof skills === 'string') return skills;
  const cats = ['languages', 'frameworks', 'tools', 'databases', 'other'] as const;
  return cats.flatMap(c => (Array.isArray(skills[c]) ? skills[c] : [])).join(', ');
}

// ─── Frontend ResumeData → backend sections format ────────────────────────────

export function resumeDataToSections(data: ResumeData): object {
  return {
    contact: {
      name: data.personalInfo.name,
      email: data.personalInfo.email,
      phone: data.personalInfo.phone,
      location: data.personalInfo.location,
      linkedin: data.personalInfo.linkedin,
      github: data.personalInfo.github,
    },
    summary: data.summary,
    experience: data.experiences.map(e => ({
      company: e.company,
      title: e.position,
      location: e.location,
      start_date: e.startDate,
      end_date: e.currentlyWorking ? 'Present' : e.endDate,
      bullets: e.description ? e.description.split('\n').filter((b: string) => b.trim()) : [],
    })),
    education: data.education.map(e => ({
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      graduation_date: e.year,
      ...(e.start_year ? { start_year: e.start_year } : {}),
    })),
    skills: {
      languages: [],
      frameworks: [],
      tools: [],
      databases: [],
      other: data.skills ? data.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    },
    projects: data.projects.map(p => ({
      name: p.name,
      description: p.description,
      link: p.link,
    })),
    certifications: (data.certifications ?? []).map(c => ({
      name: c.name,
      issuer: c.issuer,
      date: c.date,
    })),
  };
}
