import { TOAST_COLORS } from '../../hooks/useToasts';
import type { Toast } from '../../hooks/useToasts';

interface ToastStackProps {
  toasts: Toast[];
  dismissToast: (id: number) => void;
}

export default function ToastStack({ toasts, dismissToast }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'flex-end',
      }}
    >
      {toasts.map((toast) => {
        const colors = TOAST_COLORS[toast.type];
        return (
          <div
            key={toast.id}
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.text,
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              maxWidth: 340,
              animation: 'fadeIn 0.15s ease',
            }}
          >
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: colors.text,
                fontSize: 16,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
