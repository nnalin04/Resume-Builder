import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

describe('App Routing', () => {
  it('renders Landing component for root path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/Intelligent Resume Builder/i)).toBeInTheDocument();
  });

  it('renders Login component for /login path', () => {
    // Basic test checking for login related text
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/Sign into your account/i)).toBeInTheDocument();
  });

  it('renders Dashboard component for /dashboard path', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/Resume Builder/i)).toBeInTheDocument();
  });
});
