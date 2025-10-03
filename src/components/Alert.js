// Themed Alert Component - replaces JavaScript alerts
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import './Alert.css';

const Alert = ({ message, type = 'info', onClose, autoClose = false, duration = 5000 }) => {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const getIcon = () => {
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

// Alert service for imperative usage
class AlertService {
  constructor() {
    this.listeners = [];
  }

  show(message, type = 'info', autoClose = true) {
    this.listeners.forEach(listener => listener({ message, type, autoClose }));
  }

  info(message, autoClose = true) {
    this.show(message, 'info', autoClose);
  }

  success(message, autoClose = true) {
    this.show(message, 'success', autoClose);
  }

  warning(message, autoClose = true) {
    this.show(message, 'warning', autoClose);
  }

  error(message, autoClose = false) {
    this.show(message, 'error', autoClose);
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const alertService = new AlertService();
export default Alert;
