/**
 * Tests for frontend/src/utils/sectionMappers.ts
 * Covers: mapExperiences, mapEducation, mapProjects, mapCertifications,
 *         flattenSkills, resumeDataToSections
 */
import { describe, it, expect } from 'vitest';
import {
  mapExperiences,
  mapEducation,
  mapProjects,
  mapCertifications,
  flattenSkills,
  resumeDataToSections,
} from '../utils/sectionMappers';
import type { ResumeData } from '../types/resumeTypes';

// ─── mapExperiences ───────────────────────────────────────────────────────────

describe('mapExperiences', () => {
  it('maps basic fields', () => {
    const result = mapExperiences([
      {
        company: 'Acme Corp',
        title: 'Engineer',
        location: 'Mumbai',
        start_date: '2020-01',
        end_date: '2022-06',
        bullets: ['Built APIs', 'Led team'],
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].company).toBe('Acme Corp');
    expect(result[0].position).toBe('Engineer');
    expect(result[0].location).toBe('Mumbai');
    expect(result[0].startDate).toBe('2020-01');
    expect(result[0].endDate).toBe('2022-06');
    expect(result[0].currentlyWorking).toBe(false);
    expect(result[0].description).toBe('Built APIs\nLed team');
  });

  it('sets currentlyWorking=true when end_date is Present', () => {
    const result = mapExperiences([{ end_date: 'Present' }]);
    expect(result[0].currentlyWorking).toBe(true);
    expect(result[0].endDate).toBe('');
  });

  it('sets currentlyWorking=true when end_date is missing', () => {
    const result = mapExperiences([{}]);
    expect(result[0].currentlyWorking).toBe(true);
  });

  it('assigns unique ids', () => {
    const results = mapExperiences([{}, {}]);
    expect(results[0].id).not.toBe(results[1].id);
  });

  it('handles empty bullets array', () => {
    const result = mapExperiences([{ bullets: [] }]);
    expect(result[0].description).toBe('');
  });

  it('returns empty array for empty input', () => {
    expect(mapExperiences([])).toEqual([]);
  });
});

// ─── mapEducation ─────────────────────────────────────────────────────────────

describe('mapEducation', () => {
  it('maps all fields', () => {
    const result = mapEducation([
      {
        institution: 'IIT Bombay',
        degree: 'B.Tech',
        field: 'Computer Science',
        graduation_date: '2020',
        start_year: '2016',
      },
    ]);
    expect(result[0].institution).toBe('IIT Bombay');
    expect(result[0].degree).toBe('B.Tech');
    expect(result[0].field).toBe('Computer Science');
    expect(result[0].year).toBe('2020');
    expect(result[0].start_year).toBe('2016');
  });

  it('does not include start_year key when absent', () => {
    const result = mapEducation([{ institution: 'MIT' }]);
    expect(result[0]).not.toHaveProperty('start_year');
  });

  it('assigns unique ids', () => {
    const results = mapEducation([{}, {}]);
    expect(results[0].id).not.toBe(results[1].id);
  });
});

// ─── mapProjects ──────────────────────────────────────────────────────────────

describe('mapProjects', () => {
  it('maps basic fields', () => {
    const result = mapProjects([
      { name: 'My App', description: 'A cool app', link: 'https://github.com/me/app' },
    ]);
    expect(result[0].name).toBe('My App');
    expect(result[0].description).toBe('A cool app');
    expect(result[0].link).toBe('https://github.com/me/app');
  });

  it('joins description array into string', () => {
    const result = mapProjects([{ description: ['Line 1', 'Line 2'] }]);
    expect(result[0].description).toBe('Line 1\nLine 2');
  });

  it('handles missing description', () => {
    const result = mapProjects([{ name: 'Proj' }]);
    expect(result[0].description).toBe('');
  });
});

// ─── mapCertifications ────────────────────────────────────────────────────────

describe('mapCertifications', () => {
  it('maps all fields', () => {
    const result = mapCertifications([
      { name: 'AWS SAA', issuer: 'Amazon', date: '2023' },
    ]);
    expect(result[0].name).toBe('AWS SAA');
    expect(result[0].issuer).toBe('Amazon');
    expect(result[0].date).toBe('2023');
  });

  it('handles empty input', () => {
    expect(mapCertifications([])).toEqual([]);
  });
});

// ─── flattenSkills ────────────────────────────────────────────────────────────

describe('flattenSkills', () => {
  it('flattens categorized skills into comma-separated string', () => {
    const result = flattenSkills({
      languages: ['Python', 'TypeScript'],
      frameworks: ['FastAPI'],
      tools: ['Docker'],
      databases: ['PostgreSQL'],
      other: ['Linux'],
    });
    expect(result).toBe('Python, TypeScript, FastAPI, Docker, PostgreSQL, Linux');
  });

  it('passes through a string unchanged', () => {
    expect(flattenSkills('Python, TypeScript')).toBe('Python, TypeScript');
  });

  it('handles empty categories', () => {
    const result = flattenSkills({ languages: [], frameworks: [], tools: [], databases: [], other: [] });
    expect(result).toBe('');
  });
});

// ─── resumeDataToSections ─────────────────────────────────────────────────────

const minimalResumeData: ResumeData = {
  personalInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+91-9999999999',
    location: 'Mumbai',
    linkedin: 'https://linkedin.com/in/johndoe',
    github: 'https://github.com/johndoe',
  },
  summary: 'Experienced backend engineer.',
  experiences: [
    {
      id: 'e1',
      company: 'Acme',
      position: 'Engineer',
      location: 'Mumbai',
      startDate: '2020-01',
      endDate: '',
      currentlyWorking: true,
      description: 'Built APIs\nLed migration',
    },
  ],
  education: [
    {
      id: 'ed1',
      institution: 'IIT Bombay',
      degree: 'B.Tech',
      field: 'CS',
      year: '2020',
    },
  ],
  skills: 'Python, TypeScript, Docker',
  projects: [
    {
      id: 'p1',
      name: 'ResumeAI',
      description: 'AI resume tool',
      link: 'https://github.com/me/resumeai',
    },
  ],
  certifications: [
    { id: 'c1', name: 'AWS SAA', issuer: 'Amazon', date: '2023' },
  ],
};

describe('resumeDataToSections', () => {
  it('produces correct contact block', () => {
    const sections = resumeDataToSections(minimalResumeData) as any;
    expect(sections.contact.name).toBe('John Doe');
    expect(sections.contact.email).toBe('john@example.com');
    expect(sections.contact.linkedin).toBe('https://linkedin.com/in/johndoe');
  });

  it('maps currentlyWorking=true to end_date=Present', () => {
    const sections = resumeDataToSections(minimalResumeData) as any;
    expect(sections.experience[0].end_date).toBe('Present');
  });

  it('splits description into bullets', () => {
    const sections = resumeDataToSections(minimalResumeData) as any;
    expect(sections.experience[0].bullets).toEqual(['Built APIs', 'Led migration']);
  });

  it('splits skills string into other array', () => {
    const sections = resumeDataToSections(minimalResumeData) as any;
    expect(sections.skills.other).toEqual(['Python', 'TypeScript', 'Docker']);
    expect(sections.skills.languages).toEqual([]);
  });

  it('maps certifications', () => {
    const sections = resumeDataToSections(minimalResumeData) as any;
    expect(sections.certifications[0].name).toBe('AWS SAA');
  });

  it('handles empty certifications (undefined)', () => {
    const data = { ...minimalResumeData, certifications: undefined as any };
    const sections = resumeDataToSections(data) as any;
    expect(sections.certifications).toEqual([]);
  });

  it('handles empty skills string', () => {
    const data = { ...minimalResumeData, skills: '' };
    const sections = resumeDataToSections(data) as any;
    expect(sections.skills.other).toEqual([]);
  });
});
