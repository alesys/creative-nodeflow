// Output Node - Displays results from prompt nodes
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CustomNodeBase from './CustomNodeBase';

const OutputNode = ({ data, id }) => {
  const [content, setContent] = useState(data.content || '');
  const [context, setContext] = useState(data.context || null);
  const [contentType, setContentType] = useState(data.type || 'text');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Listen for incoming data from connected nodes
  useEffect(() => {
    if (data.onReceiveInput) {
      data.onReceiveInput((inputData) => {
        setContent(inputData.content);
        setContext(inputData.context);
        setContentType(inputData.type || 'text');
        setLastUpdated(new Date());
        
        // Pass context through to output if there are connected nodes
        if (data.onOutput) {
          data.onOutput({
            nodeId: id,
            content: inputData.content,
            context: inputData.context,
            type: inputData.type
          });
        }
      });
    }
  }, [data, id]);

  const renderContent = () => {
    if (!content) {
      return (
        <div className="helper-text" style={{ 
          fontStyle: 'italic', 
          textAlign: 'left', 
          padding: '40px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80px',
          opacity: 0.7
        }}>
          Waiting for input...
        </div>
      );
    }

    switch (contentType) {
      case 'image':
        return (
          <div>
            <img 
              src={content}
              alt="Generated content"
              style={{ 
                maxWidth: '100%', 
                maxHeight: '300px',
                borderRadius: '4px',
                objectFit: 'contain'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div style={{ 
              display: 'none',
              color: '#ef4444',
              fontSize: '12px',
              marginTop: '8px'
            }}>
              ⚠️ Failed to load image
            </div>
          </div>
        );
      
      case 'text':
      default:
        return (
          <div style={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            lineHeight: '1.5'
          }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        );
    }
  };

  const getStatusIcon = () => {
    if (!content) return '⏳';
    return contentType === 'image' ? '🖼️' : '📝';
  };

  return (
    <CustomNodeBase 
      hasInput={true}
      hasOutput={true}
      nodeType="output"
      className={content ? 'has-content' : 'empty'}
    >
      <div className="node-header">
        <span>{getStatusIcon()} Output</span>
        {lastUpdated && (
          <span className="helper-text" style={{ fontSize: '10px', fontWeight: 'normal' }}>
            {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="output-content-container">
        {renderContent()}
      </div>

      {context && context.messages && (
        <details style={{ marginTop: '12px' }}>
          <summary className="helper-text" style={{ cursor: 'pointer' }}>
            Context ({context.messages.length} messages)
          </summary>
          <div className="context-details">
            {context.messages.slice(-3).map((msg, idx) => (
              <div key={idx} style={{ marginBottom: '4px' }}>
                <strong>{msg.role}:</strong> {msg.content.substring(0, 100)}
                {msg.content.length > 100 && '...'}
              </div>
            ))}
          </div>
        </details>
      )}
    </CustomNodeBase>
  );
};

export default OutputNode;