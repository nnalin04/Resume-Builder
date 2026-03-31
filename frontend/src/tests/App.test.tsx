/**
 * Smoke tests for the auth context + auth utilities.
 * We avoid rendering the full App (which has BrowserRouter + lazy routes)
 * and instead test key building blocks in isolation.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── Auth context ────────────────────────────────────────────────────────────

import { AuthProvider, useAuth } from '../contexts/AuthContext';

function WhoAmI() {
  const { user } = useAuth();
  return <div>{user ? `Hello ${user.name}` : 'Not logged in'}</div>;
}

describe('AuthContext', () => {
  it('provides null user when not authenticated', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <WhoAmI />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText('Not logged in')).toBeInTheDocument();
  });
});

// ─── API client module smoke test ─────────────────────────────────────────────

import { api } from '../api/client';

describe('api/client', () => {
  it('exports auth methods on api.auth', () => {
    expect(typeof api.auth.login).toBe('function');
    expect(typeof api.auth.register).toBe('function');
    expect(typeof api.auth.me).toBe('function');
  });

  it('exports resume upload and list methods', () => {
    expect(typeof api.uploadResume).toBe('function');
    expect(typeof api.listResumes).toBe('function');
  });
});
