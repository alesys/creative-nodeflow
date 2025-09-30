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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

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
        <div className="helper-text waiting-content">
          Waiting for input...
        </div>
      );
    }

    switch (contentType) {
      case 'image':
        if (!content) {
          return (
            <div className="helper-text waiting-content">
              No image data received...
            </div>
          );
        }
        
        if (imageError) {
          return (
            <div className="image-error" style={{display: 'block'}}>
              ⚠️ Failed to load image
              <br/>
              <small>Data: {content ? content.substring(0, 50) + '...' : 'No data'}</small>
            </div>
          );
        }

        return (
          <div>
            <img 
              src={content}
              alt="Generated content"
              className="output-image clickable"
              onClick={() => setLightboxOpen(true)}
              onError={(e) => {
                console.error('Image load error:', e.target.src);
                setImageError(true);
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', content.substring(0, 50));
                setImageError(false);
              }}
              style={{ cursor: 'pointer' }}
            />
            {lightboxOpen && (
              <div 
                className="lightbox-overlay"
                onClick={() => setLightboxOpen(false)}
              >
                <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                  <img 
                    src={content} 
                    alt="Generated content - Full size" 
                    className="lightbox-image"
                  />
                  <button 
                    className="lightbox-close"
                    onClick={() => setLightboxOpen(false)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'text':
      default:
        return (
          <div className="text-content">
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
          <span className="helper-text helper-text-tiny">
            {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="output-content-container">
        {renderContent()}
      </div>

      {context && context.messages && (
        <details className="details-section-large">
          <summary className="helper-text summary-clickable">
            Context ({context.messages.length} messages)
          </summary>
          <div className="context-details">
            {context.messages.slice(-3).map((msg, idx) => (
              <div key={idx} className="output-item">
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