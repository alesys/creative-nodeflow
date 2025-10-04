// Alert Provider - manages alert state for the app
import React, { useState, useEffect } from 'react';
import Alert, { alertService } from './Alert';

interface AlertData {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  autoClose: boolean;
}

interface AlertProviderProps {
  children: React.ReactNode;
}

const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alert, setAlert] = useState<AlertData | null>(null);

  useEffect(() => {
    const unsubscribe = alertService.subscribe((alertData: AlertData) => {
      setAlert(alertData);
    });

    return unsubscribe;
  }, []);

  const handleClose = (): void => {
    setAlert(null);
  };

  return (
    <>
      {children}
      {alert && (
        <Alert
          message={alert.message}
          type={alert.type}
          autoClose={alert.autoClose}
          onClose={handleClose}
        />
      )}
    </>
  );
};

export default AlertProvider;
