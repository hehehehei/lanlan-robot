import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToolsStore } from '../../state/toolsStore';

export const TextModal = () => {
  const { t } = useTranslation();
  const isOpen = useToolsStore((s) => s.isTextModalOpen);
  const value = useToolsStore((s) => s.textDraft.value);
  const update = useToolsStore((s) => s.updateTextValue);
  const confirm = useToolsStore((s) => s.confirmText);
  const cancel = useToolsStore((s) => s.cancelText);

  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = confirm();
    if (!result.ok) {
      setError(result.error ?? t('toolbar.textError'));
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={t('toolbar.textDialogLabel')} style={styles.backdrop}>
      <form onSubmit={onSubmit} style={styles.modal}>
        <label htmlFor="text-input" style={styles.label}>{t('toolbar.textPrompt')}</label>
        <input
          id="text-input"
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => update(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'text-error' : undefined}
          style={styles.input}
        />
        {error && (
          <div id="text-error" style={styles.error} role="alert">
            {error}
          </div>
        )}
        <div style={styles.actions}>
          <button type="submit">{t('toolbar.confirm')}</button>
          <button type="button" onClick={cancel}>{t('toolbar.cancel')}</button>
        </div>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
  },
  modal: {
    background: '#111827',
    padding: 16,
    borderRadius: 8,
    border: '1px solid #333',
    minWidth: 280,
  },
  label: {
    display: 'block',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #333',
    marginBottom: 8,
    background: '#1f2937',
    color: '#fff',
  },
  error: {
    color: '#fca5a5',
    marginBottom: 8,
  },
  actions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
};
