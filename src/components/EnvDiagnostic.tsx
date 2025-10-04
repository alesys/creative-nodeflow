// Environment diagnostic component for debugging API key detection
import React, { useEffect, useState } from 'react';
import OpenAIService from '../services/OpenAIService';
import GoogleAIService from '../services/GoogleAIService';

interface ServiceStatus {
  openai: boolean;
  google: boolean;
}

const EnvDiagnostic: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    openai: false,
    google: false
  });

  const openaiKey = process.env.REACT_APP_OPENAI_API_KEY;
  const googleKey = process.env.REACT_APP_GOOGLE_API_KEY;
  const systemPrompt = process.env.REACT_APP_DEFAULT_SYSTEM_PROMPT;

  useEffect(() => {
    // Check service initialization status
    setServiceStatus({
      openai: OpenAIService.isConfigured(),
      google: GoogleAIService.isConfigured()
    });

    // Log environment details to console for debugging
    console.log('=== ENVIRONMENT DIAGNOSTIC ===');
    console.log('OpenAI Key:', openaiKey ? `${openaiKey.substring(0, 7)}...` : 'NOT FOUND');
    console.log('Google Key:', googleKey ? `${googleKey.substring(0, 10)}...` : 'NOT FOUND');
    console.log('System Prompt:', systemPrompt || 'NOT FOUND');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('OpenAI Service Configured:', OpenAIService.isConfigured());
    console.log('Google Service Configured:', GoogleAIService.isConfigured());
    console.log('All REACT_APP vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));
    console.log('==============================');
  }, [openaiKey, googleKey, systemPrompt]);

  if (!isVisible) return null;

  const getStatusColor = (isWorking: boolean): string => isWorking ? '#10b981' : '#ef4444';
  const getStatusText = (isWorking: boolean): string => isWorking ? '✅ Working' : '❌ Not Working';

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      background: 'rgba(255, 255, 255, 0.95)',
      padding: '15px',
      border: '2px solid #374151',
      borderRadius: '8px',
      zIndex: 1000,
      fontSize: '12px',
      fontFamily: 'monospace',
      minWidth: '300px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, color: '#374151' }}>🔧 Environment Debug</h4>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            padding: '2px 6px',
            cursor: 'pointer'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>API Keys Status:</strong>
      </div>

      <div style={{ marginLeft: '10px', marginBottom: '5px' }}>
        <span style={{ color: getStatusColor(!!openaiKey) }}>
          OpenAI: {openaiKey ? `${openaiKey.substring(0, 7)}...` : 'NOT FOUND'}
        </span>
      </div>

      <div style={{ marginLeft: '10px', marginBottom: '5px' }}>
        <span style={{ color: getStatusColor(!!googleKey) }}>
          Google: {googleKey ? `${googleKey.substring(0, 10)}...` : 'NOT FOUND'}
        </span>
      </div>

      <div style={{ marginBottom: '8px', marginTop: '10px' }}>
        <strong>Service Initialization:</strong>
      </div>

      <div style={{ marginLeft: '10px', marginBottom: '5px' }}>
        <span style={{ color: getStatusColor(serviceStatus.openai) }}>
          OpenAI Service: {getStatusText(serviceStatus.openai)}
        </span>
      </div>

      <div style={{ marginLeft: '10px', marginBottom: '5px' }}>
        <span style={{ color: getStatusColor(serviceStatus.google) }}>
          Google Service: {getStatusText(serviceStatus.google)}
        </span>
      </div>

      <div style={{ marginTop: '10px', fontSize: '11px', color: '#6b7280' }}>
        <div><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</div>
        <div><strong>System Prompt:</strong> {systemPrompt ? 'SET' : 'NOT SET'}</div>
        {(!openaiKey || !googleKey) && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            color: '#dc2626'
          }}>
            ⚠️ Missing API keys! Make sure to restart the dev server after updating .env file.
          </div>
        )}
      </div>
    </div>
  );
};

export default EnvDiagnostic;
