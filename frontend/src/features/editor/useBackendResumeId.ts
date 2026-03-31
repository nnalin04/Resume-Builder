import { useState } from 'react';

const STORAGE_KEY = 'resume_backend_id';

export function useBackendResumeId() {
  const [backendResumeId, setBackendResumeIdState] = useState<number | null>(() => {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? parseInt(value, 10) : null;
  });

  const setBackendResumeId = (id: number | null) => {
    setBackendResumeIdState(id);
    if (id !== null) localStorage.setItem(STORAGE_KEY, String(id));
    else localStorage.removeItem(STORAGE_KEY);
  };

  return { backendResumeId, setBackendResumeId };
}
