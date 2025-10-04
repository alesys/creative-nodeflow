// Themed Alert Component - replaces JavaScript alerts
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import './Alert.css';

type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  message: string;
  type?: AlertType;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

const Alert: React.FC<AlertProps> = ({ message, type = 'info', onClose, autoClose = false, duration = 5000 }) => {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoClose, duration, onClose]);

  const getIcon = (): string => {
    switch (type) {
      case 'error':
        return '!';
      case 'warning':
        return '!';
      case 'success':
        return '✓';
      case 'info':
      default:
        return 'i';
    }
  };

  return ReactDOM.createPortal(
    <div className="alert-overlay" onClick={onClose}>
      <div className={`alert-dialog alert-${type}`} onClick={(e) => e.stopPropagation()}>
        <div className="alert-icon">{getIcon()}</div>
        <div className="alert-content">
          <p className="alert-message">{message}</p>
        </div>
        <button className="alert-close" onClick={onClose}>
          ×
        </button>
      </div>
    </div>,
    document.body
  );
};

interface AlertData {
  message: string;
  type: AlertType;
  autoClose: boolean;
}

type AlertListener = (alertData: AlertData) => void;

// Alert service for imperative usage
class AlertService {
  private listeners: AlertListener[] = [];

  show(message: string, type: AlertType = 'info', autoClose: boolean = true): void {
    this.listeners.forEach(listener => listener({ message, type, autoClose }));
  }

  info(message: string, autoClose: boolean = true): void {
    this.show(message, 'info', autoClose);
  }

  success(message: string, autoClose: boolean = true): void {
    this.show(message, 'success', autoClose);
  }

  warning(message: string, autoClose: boolean = true): void {
    this.show(message, 'warning', autoClose);
  }

  error(message: string, autoClose: boolean = false): void {
    this.show(message, 'error', autoClose);
  }

  subscribe(listener: AlertListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const alertService = new AlertService();
export default Alert;
