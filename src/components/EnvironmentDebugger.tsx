import React from 'react';

const EnvironmentDebugger: React.FC = () => {
  const openAIKey = process.env.REACT_APP_OPENAI_API_KEY;
  const googleKey = process.env.REACT_APP_GOOGLE_API_KEY;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>Environment Debug</h4>
      <div>NODE_ENV: {process.env.NODE_ENV}</div>
      <div>OpenAI Key Present: {openAIKey ? 'YES' : 'NO'}</div>
      {openAIKey && <div>OpenAI Key Length: {openAIKey.length}</div>}
      {openAIKey && <div>OpenAI Key Prefix: {openAIKey.substring(0, 8)}...</div>}
      <div>Google Key Present: {googleKey ? 'YES' : 'NO'}</div>
      {googleKey && <div>Google Key Length: {googleKey.length}</div>}
      {googleKey && <div>Google Key Prefix: {googleKey.substring(0, 10)}...</div>}
    </div>
  );
};

export default EnvironmentDebugger;
