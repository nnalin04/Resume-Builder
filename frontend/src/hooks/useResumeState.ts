import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ResumeData, Experience, Project, Education } from '../types/resumeTypes';

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
};

export function useResumeState() {
  const [resumeData, setResumeData] = useState<ResumeData>(defaultData);

  const updatePersonalInfo = (field: keyof ResumeData['personalInfo'], value: string) => {
    setResumeData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value },
    }));
  };

  const updateSummary = (value: string) => setResumeData(prev => ({ ...prev, summary: value }));
  const updateSkills = (value: string) => setResumeData(prev => ({ ...prev, skills: value }));

  const addExperience = () => {
    const newExp: Experience = {
      id: uuidv4(), company: '', position: '', location: '',
      startDate: '', endDate: '', currentlyWorking: false, description: '',
    };
    setResumeData(prev => ({ ...prev, experiences: [...prev.experiences, newExp] }));
  };

  const updateExperience = (id: string, field: keyof Experience, value: string | boolean) => {
    setResumeData(prev => ({
      ...prev,
      experiences: prev.experiences.map(e => e.id === id ? { ...e, [field]: value } : e),
    }));
  };

  const removeExperience = (id: string) => {
    setResumeData(prev => ({ ...prev, experiences: prev.experiences.filter(e => e.id !== id) }));
  };

  const addProject = () => {
    const newProj: Project = { id: uuidv4(), name: '', description: '', link: '' };
    setResumeData(prev => ({ ...prev, projects: [...prev.projects, newProj] }));
  };

  const updateProject = (id: string, field: keyof Project, value: string) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, [field]: value } : p),
    }));
  };

  const removeProject = (id: string) => {
    setResumeData(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
  };

  const addEducation = () => {
    const newEdu: Education = { id: uuidv4(), institution: '', degree: '', field: '', year: '' };
    setResumeData(prev => ({ ...prev, education: [...prev.education, newEdu] }));
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.map(e => e.id === id ? { ...e, [field]: value } : e),
    }));
  };

  const removeEducation = (id: string) => {
    setResumeData(prev => ({ ...prev, education: prev.education.filter(e => e.id !== id) }));
  };

  return {
    resumeData,
    updatePersonalInfo,
    updateSummary,
    updateSkills,
    addExperience, updateExperience, removeExperience,
    addProject, updateProject, removeProject,
    addEducation, updateEducation, removeEducation,
  };
}
