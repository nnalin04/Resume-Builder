import { useEffect, useRef } from 'react';
import type { AuthUser } from '../../api/client';
import type { useResumeState } from '../../hooks/useResumeState';

type ResumeState = ReturnType<typeof useResumeState>;

export function useProfileSync(user: AuthUser | null, resume: ResumeState) {
  const lastSyncedProfileRef = useRef('');

  useEffect(() => {
    if (!user) return;

    const profileKey = [
      user.id,
      user.name,
      user.phone,
      user.location,
      user.linkedin,
      user.github,
    ].join('|');

    if (lastSyncedProfileRef.current === profileKey) return;
    lastSyncedProfileRef.current = profileKey;

    const personalInfo = resume.resumeData.personalInfo;
    if (user.name) resume.updatePersonalInfo('name', user.name);
    if (user.email && !personalInfo.email.includes('@example')) {
      resume.updatePersonalInfo('email', user.email);
    }
    if (user.phone) resume.updatePersonalInfo('phone', user.phone);
    if (user.location) resume.updatePersonalInfo('location', user.location);
    if (user.linkedin) resume.updatePersonalInfo('linkedin', user.linkedin);
    if (user.github) resume.updatePersonalInfo('github', user.github);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
}
