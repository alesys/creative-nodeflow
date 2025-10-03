// Alert Provider - manages alert state for the app
import React, { useState, useEffect } from 'react';
import Alert, { alertService } from './Alert';

const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const unsubscribe = alertService.subscribe((alertData) => {
      setAlert(alertData);
    });

    return unsubscribe;
  }, []);

  const handleClose = () => {
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
