import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Icon, type IconName } from './Icon';

const ICONS: Record<'success' | 'error' | 'info', IconName> = {
  success: 'check',
  error: 'alert',
  info: 'info',
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}${toast.leaving ? ' leaving' : ''}`}>
          <span className="toast-icon">
            {/* play={1}: bifa se desenează / alerta „scutură din cap” la apariție */}
            <Icon name={ICONS[toast.type]} size={16} play={1} />
          </span>
          <span>{toast.message}</span>
          <span className="toast-bar" aria-hidden />
        </div>
      ))}
    </div>
  );
};
