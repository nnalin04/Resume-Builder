import React from 'react';
import type { TemplateId } from '../../types/resumeTypes';

export const TEMPLATE_COLORS: Record<TemplateId, string> = {
  classic:      '#1a1a2e',
  modern:       '#0070f3',
  professional: '#6366f1',
  twocolumn:    '#059669',
  clean:        '#64748b',
  minimal:      '#9ca3af',
  executive:    '#1e2d4e',
  tech:         '#0d9488',
  finance:      '#1a2744',
  creative:     '#e05c5c',
};

export const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: 'classic',      label: 'Classic' },
  { id: 'modern',       label: 'Modern' },
  { id: 'professional', label: 'Professional' },
  { id: 'twocolumn',    label: 'Two Column' },
  { id: 'clean',        label: 'Clean' },
  { id: 'minimal',      label: 'Minimal' },
  { id: 'executive',    label: 'Executive' },
  { id: 'tech',         label: 'Tech' },
  { id: 'finance',      label: 'Finance' },
  { id: 'creative',     label: 'Creative' },
];

export function TemplateMiniPreview({ id, active }: { id: TemplateId; active: boolean }) {
  const c = TEMPLATE_COLORS[id];
  const b = (w: string | number, h = 2, color = '#e2e8f0') => (
    <div style={{ width: w, height: h, background: color, borderRadius: 1, flexShrink: 0 }} />
  );
  const col = {
    padding: '5px 5px 4px', display: 'flex', flexDirection: 'column' as const,
    gap: 2, height: '100%', boxSizing: 'border-box' as const,
  };

  let inner: React.ReactNode = null;

  if (id === 'classic') {
    inner = (
      <div style={col}>
        {b('68%', 3, '#1e1e1e')}
        {b('50%', 1.5, '#94a3b8')}
        <div style={{ height: 2 }} />
        <div style={{ borderBottom: '1px solid #333', paddingBottom: 1 }}>{b('36%', 2, '#3A6FA8')}</div>
        {b('90%')} {b('78%')} {b('64%')}
        <div style={{ height: 1 }} />
        <div style={{ borderBottom: '1px solid #333', paddingBottom: 1 }}>{b('36%', 2, '#3A6FA8')}</div>
        {b('85%')} {b('70%')}
      </div>
    );
  } else if (id === 'modern') {
    inner = (
      <div style={col}>
        {b('68%', 3, '#0f172a')}
        {b('50%', 1.5, '#94a3b8')}
        <div style={{ height: 2 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 2, height: 9, background: '#2563EB', borderRadius: 1, flexShrink: 0 }} />
          {b('28%', 1.5, '#1e293b')}
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>
        {b('90%')} {b('76%')} {b('62%')}
        <div style={{ height: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 2, height: 9, background: '#2563EB', borderRadius: 1, flexShrink: 0 }} />
          {b('28%', 1.5, '#1e293b')}
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>
        {b('85%')} {b('68%')}
      </div>
    );
  } else if (id === 'professional') {
    inner = (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ background: '#1e3a5f', padding: '5px 5px 4px', flexShrink: 0 }}>
          {b('70%', 2.5, 'rgba(255,255,255,0.9)')}
          <div style={{ height: 1.5 }} />
          {b('52%', 1.5, 'rgba(255,255,255,0.5)')}
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
          <div style={{ width: 14, background: '#eef1f6', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, padding: '3px 2px' }}>
            {b('90%', 1.5, '#6366f1')} {b('80%')} {b('85%')} {b('75%')} {b('80%')}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '3px 3px', boxSizing: 'border-box' }}>
            <div style={{ borderBottom: '1px solid #1e3a5f', paddingBottom: 1 }}>{b('48%', 1.5, '#1e3a5f')}</div>
            {b('90%')} {b('76%')} {b('62%')}
            <div style={{ height: 1 }} />
            <div style={{ borderBottom: '1px solid #1e3a5f', paddingBottom: 1 }}>{b('48%', 1.5, '#1e3a5f')}</div>
            {b('85%')} {b('68%')}
          </div>
        </div>
      </div>
    );
  } else if (id === 'twocolumn') {
    inner = (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '4px', gap: 3, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          {b('58%', 2.5, '#1a1a1a')}
          {b('76%', 1, '#bbb')}
        </div>
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {b('70%', 1.5, '#1565C0')} {b('90%')} {b('75%')} {b('80%')}
            <div style={{ height: 1 }} />
            {b('70%', 1.5, '#1565C0')} {b('85%')} {b('65%')}
          </div>
          <div style={{ width: 1, background: '#e2e8f0', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {b('70%', 1.5, '#1565C0')} {b('90%')} {b('72%')} {b('68%')}
            <div style={{ height: 1 }} />
            {b('70%', 1.5, '#1565C0')} {b('85%')} {b('60%')}
          </div>
        </div>
      </div>
    );
  } else if (id === 'clean') {
    inner = (
      <div style={col}>
        {b('68%', 3, '#0f0f0f')}
        {b('50%', 1.5, '#888')}
        <div style={{ height: 2 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {b('28%', 1.5, '#3A6FA8')}
          <div style={{ flex: 1, height: 1, background: '#d0d0d0' }} />
        </div>
        {b('90%')} {b('78%')} {b('65%')}
        <div style={{ height: 2 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {b('28%', 1.5, '#3A6FA8')}
          <div style={{ flex: 1, height: 1, background: '#d0d0d0' }} />
        </div>
        {b('85%')} {b('70%')}
      </div>
    );
  } else if (id === 'minimal') {
    inner = (
      <div style={col}>
        {b('72%', 3.5, '#111')}
        {b('54%', 1.5, '#9ca3af')}
        <div style={{ height: 4 }} />
        {b('26%', 1.5, '#9ca3af')}
        {b('90%')} {b('78%')} {b('65%')}
        <div style={{ height: 3 }} />
        {b('26%', 1.5, '#9ca3af')}
        {b('85%')} {b('70%')}
      </div>
    );
  } else if (id === 'executive') {
    inner = (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ background: '#1e2d4e', padding: '6px 5px 5px', flexShrink: 0 }}>
          {b('70%', 2.5, 'rgba(255,255,255,0.9)')}
          <div style={{ height: 1.5 }} />
          {b('52%', 1.5, 'rgba(255,255,255,0.5)')}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 5px 3px', boxSizing: 'border-box' }}>
          <div style={{ borderBottom: '1px solid #1e2d4e', paddingBottom: 1 }}>{b('44%', 1.5, '#1e2d4e')}</div>
          {b('90%')} {b('75%')} {b('62%')}
          <div style={{ height: 1 }} />
          <div style={{ borderBottom: '1px solid #1e2d4e', paddingBottom: 1 }}>{b('44%', 1.5, '#1e2d4e')}</div>
          {b('85%')} {b('68%')}
        </div>
      </div>
    );
  } else if (id === 'tech') {
    inner = (
      <div style={col}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {b(46, 3, '#0f172a')}
            {b(34, 1.5, '#94a3b8')}
          </div>
          <div style={{ width: 14, height: 6, background: '#f0fdfa', border: '1px solid #0d9488', borderRadius: 10, flexShrink: 0 }} />
        </div>
        <div style={{ height: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 2, height: 8, background: '#0d9488', borderRadius: 1, flexShrink: 0 }} />
          {b('26%', 1.5, '#1e293b')}
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>
        {b('90%')} {b('76%')} {b('60%')}
        <div style={{ height: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 2, height: 8, background: '#0d9488', borderRadius: 1, flexShrink: 0 }} />
          {b('26%', 1.5, '#1e293b')}
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>
        {b('85%')} {b('68%')}
      </div>
    );
  } else if (id === 'finance') {
    inner = (
      <div style={col}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {b('58%', 2.5, '#1a2744')}
          <div style={{ width: '100%', height: 1, background: '#1a2744' }} />
          {b('72%', 1.5, '#888')}
          <div style={{ width: '100%', height: 1, background: '#1a2744' }} />
        </div>
        <div style={{ height: 1 }} />
        <div style={{ borderBottom: '1px solid #1a2744', paddingBottom: 1 }}>{b('42%', 1.5, '#1a2744')}</div>
        {b('90%')} {b('78%')} {b('65%')}
        <div style={{ height: 2 }} />
        <div style={{ borderBottom: '1px solid #1a2744', paddingBottom: 1 }}>{b('42%', 1.5, '#1a2744')}</div>
        {b('85%')} {b('68%')}
      </div>
    );
  } else if (id === 'creative') {
    inner = (
      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{ width: 18, background: '#e05c5c', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 3px 4px', boxSizing: 'border-box' }}>
          {b('90%', 2.5, 'rgba(255,255,255,0.95)')}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.3)' }} />
          {b('85%', 1.5, 'rgba(255,255,255,0.65)')} {b('75%', 1.5, 'rgba(255,255,255,0.55)')} {b('80%', 1.5, 'rgba(255,255,255,0.55)')}
          <div style={{ height: 2 }} />
          {b('55%', 1, 'rgba(255,255,255,0.4)')}
          {b('70%', 1.5, 'rgba(255,255,255,0.55)')} {b('65%', 1.5, 'rgba(255,255,255,0.55)')} {b('72%', 1.5, 'rgba(255,255,255,0.55)')}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 4px 4px', boxSizing: 'border-box' }}>
          {b('55%', 1.5, '#e05c5c')} {b('90%')} {b('75%')} {b('65%')}
          <div style={{ height: 1 }} />
          {b('55%', 1.5, '#e05c5c')} {b('85%')} {b('68%')}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: 62, height: 88, background: '#fff', borderRadius: 5,
      overflow: 'hidden', border: `2px solid ${active ? c : '#e2e8f0'}`,
      transition: 'border-color 0.15s', boxSizing: 'border-box', flexShrink: 0,
    }}>
      {inner}
    </div>
  );
}
