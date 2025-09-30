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
        <div className="helper-text waiting-content">
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
              className="output-image"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="image-error">
              ⚠️ Failed to load image
            </div>
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