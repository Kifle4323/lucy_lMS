import { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmModal } from './components/ConfirmModal';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [config, setConfig] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfig({
        ...options,
        onConfirm: () => {
          setConfig(null);
          resolve(true);
        },
        onCancel: () => {
          setConfig(null);
          resolve(false);
        },
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {config && (
        <ConfirmModal
          isOpen={true}
          title={config.title}
          message={config.message}
          confirmText={config.confirmText}
          cancelText={config.cancelText}
          type={config.type}
          onConfirm={config.onConfirm}
          onCancel={config.onCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}
