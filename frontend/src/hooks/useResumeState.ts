import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ResumeData, Experience, Project, Education, Certification } from '../types/resumeTypes';

const STORAGE_KEY = 'resume_draft';

const defaultData: ResumeData = {
  personalInfo: {
    name: 'YOUR NAME',
    location: 'City, Country',
    phone: '+1-555-000-0000',
    email: 'your.email@example.com',
    linkedin: 'https://www.linkedin.com/in/your-profile/',
    github: 'https://github.com/yourusername',
  },
  summary:
    'Experienced software engineer with X+ years building scalable systems. Passionate about clean code, performance, and delivering business value.',
  experiences: [
    {
      id: uuidv4(),
      company: 'Acme Corp',
      position: 'Senior Software Engineer',
      location: 'Remote',
      startDate: 'Jan 2022',
      endDate: '',
      currentlyWorking: true,
      description:
        'Led design and delivery of a high-throughput data pipeline processing 1M+ events/day.\nReduced infrastructure costs by 30% through caching and query optimization.\nMentored 3 junior engineers and improved team onboarding process.',
    },
    {
      id: uuidv4(),
      company: 'Startup Inc',
      position: 'Software Engineer',
      location: 'New York, NY',
      startDate: 'Jun 2019',
      endDate: 'Dec 2021',
      currentlyWorking: false,
      description:
        'Built RESTful APIs serving 500K+ daily active users with 99.9% uptime.\nMigrated monolith to microservices, improving deployment frequency by 3x.\nImplemented automated test suite achieving 85% code coverage.',
    },
  ],
  projects: [
    {
      id: uuidv4(),
      name: 'Open Source CLI Tool',
      description:
        'Built a developer productivity CLI tool with 500+ GitHub stars.\nFeatures include project scaffolding, code generation, and CI/CD integration.',
      link: 'https://github.com/yourusername/project',
    },
  ],
  education: [
    {
      id: uuidv4(),
      institution: 'State University',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      year: '2019',
    },
  ],
  skills:
    'JavaScript, TypeScript, React, Node.js, Python, Docker, Kubernetes, PostgreSQL, Redis, AWS, Git, CI/CD, REST APIs, System Design',
  certifications: [],
};

function loadDraft(): ResumeData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ResumeData;
  } catch {
    // corrupted storage — fall through to default
  }
  return defaultData;
}

export function useResumeState() {
  const [resumeData, setResumeData] = useState<ResumeData>(loadDraft);
  const [isDirty, setIsDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save to localStorage with 500ms debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
      } catch {
        // storage quota exceeded — ignore
      }
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [resumeData]);

  const set = (updater: (prev: ResumeData) => ResumeData) => {
    setResumeData(updater);
    setIsDirty(true);
  };

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsDirty(false);
  };

  const updatePersonalInfo = (field: keyof ResumeData['personalInfo'], value: string) => {
    set(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }));
  };

  const updateSummary = (value: string) => set(prev => ({ ...prev, summary: value }));
  const updateSkills = (value: string) => set(prev => ({ ...prev, skills: value }));

  const addExperience = () => {
    const newExp: Experience = {
      id: uuidv4(), company: '', position: '', location: '',
      startDate: '', endDate: '', currentlyWorking: false, description: '',
    };
    set(prev => ({ ...prev, experiences: [...prev.experiences, newExp] }));
  };

  const updateExperience = (id: string, field: keyof Experience, value: string | boolean) => {
    set(prev => ({
      ...prev,
      experiences: prev.experiences.map(e => e.id === id ? { ...e, [field]: value } : e),
    }));
  };

  const removeExperience = (id: string) => {
    set(prev => ({ ...prev, experiences: prev.experiences.filter(e => e.id !== id) }));
  };

  const addProject = () => {
    const newProj: Project = { id: uuidv4(), name: '', description: '', link: '' };
    set(prev => ({ ...prev, projects: [...prev.projects, newProj] }));
  };

  const updateProject = (id: string, field: keyof Project, value: string) => {
    set(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, [field]: value } : p),
    }));
  };

  const removeProject = (id: string) => {
    set(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
  };

  const addEducation = () => {
    const newEdu: Education = { id: uuidv4(), institution: '', degree: '', field: '', year: '' };
    set(prev => ({ ...prev, education: [...prev.education, newEdu] }));
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    set(prev => ({
      ...prev,
      education: prev.education.map(e => e.id === id ? { ...e, [field]: value } : e),
    }));
  };

  const removeEducation = (id: string) => {
    set(prev => ({ ...prev, education: prev.education.filter(e => e.id !== id) }));
  };

  const replaceExperiences = (experiences: Experience[]) =>
    set(prev => ({ ...prev, experiences }));

  const replaceEducation = (education: Education[]) =>
    set(prev => ({ ...prev, education }));

  const replaceProjects = (projects: Project[]) =>
    set(prev => ({ ...prev, projects }));

  const addCertification = () => {
    const newCert: Certification = { id: uuidv4(), name: '', issuer: '', date: '' };
    set(prev => ({ ...prev, certifications: [...(prev.certifications ?? []), newCert] }));
  };

  const updateCertification = (id: string, field: keyof Certification, value: string) => {
    set(prev => ({
      ...prev,
      certifications: (prev.certifications ?? []).map(c => c.id === id ? { ...c, [field]: value } : c),
    }));
  };

  const removeCertification = (id: string) => {
    set(prev => ({ ...prev, certifications: (prev.certifications ?? []).filter(c => c.id !== id) }));
  };

  const replaceCertifications = (certifications: Certification[]) =>
    set(prev => ({ ...prev, certifications }));

  return {
    resumeData,
    isDirty,
    clearDraft,
    updatePersonalInfo,
    updateSummary,
    updateSkills,
    addExperience, updateExperience, removeExperience, replaceExperiences,
    addProject, updateProject, removeProject, replaceProjects,
    addEducation, updateEducation, removeEducation, replaceEducation,
    addCertification, updateCertification, removeCertification, replaceCertifications,
  };
}
