// Output Node - Displays results from prompt nodes
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react';

const OutputNode = ({ data, id }) => {
  const [content, setContent] = useState(data.content || '');
  const [context, setContext] = useState(data.context || null);
  const [contentType, setContentType] = useState(data.type || 'text');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { setNodes } = useReactFlow();
  const imageRef = useRef(null);

  // Listen for incoming data from connected nodes
  useEffect(() => {
    if (data.onReceiveInput) {
      data.onReceiveInput((inputData) => {
        console.log('[OutputNode] Received input:', inputData);
        console.log('[OutputNode] Context has', inputData.context?.messages?.length, 'messages');
        setContent(inputData.content);
        setContext(inputData.context);
        setContentType(inputData.type || 'text');
        setLastUpdated(new Date());

        // Update node data so connections can access it
        setNodes((nds) =>
          nds.map((node) =>
            node.id === id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    content: inputData.content,
                    context: inputData.context,
                    type: inputData.type
                  }
                }
              : node
          )
        );

        // Pass context through to output if there are connected nodes
        if (data.onOutput) {
          console.log('[OutputNode] Sending to connected nodes via onOutput');
          data.onOutput({
            nodeId: id,
            content: inputData.content,
            context: inputData.context,
            type: inputData.type
          });
        }
      });
    }
  }, [data, id, setNodes]);

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
              Failed to load image
              <br/>
              <small>Data: {content ? content.substring(0, 50) + '...' : 'No data'}</small>
            </div>
          );
        }

        return (
          <div>
            <img 
              ref={imageRef}
              src={content}
              alt="Generated content"
              className="output-image clickable"
              onClick={() => setLightboxOpen(true)}
              onError={(e) => {
                console.error('Image load error:', e.target.src);
                setImageError(true);
              }}
              onLoad={(e) => {
                console.log('Image loaded successfully:', content.substring(0, 50));
                setImageError(false);
                
                // Auto-resize node to accommodate image
                const img = e.target;
                if (img.naturalWidth && img.naturalHeight) {
                  const aspectRatio = img.naturalHeight / img.naturalWidth;
                  const maxWidth = 480; // Current node width
                  const imageHeight = Math.min(aspectRatio * maxWidth, 600); // Max height of 600px
                  const nodeHeight = imageHeight + 100; // Add padding for header and status
                  
                  setNodes((nodes) => 
                    nodes.map((node) => 
                      node.id === id 
                        ? { ...node, height: Math.max(nodeHeight, 320) } // Min height 320px
                        : node
                    )
                  );
                }
              }}
              style={{ cursor: 'pointer' }}
            />
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

  const getContentTypeLabel = () => {
    if (!content) return 'Waiting';
    return contentType === 'image' ? 'Image' : 'Text';
  };

  return (
    <>
      <div className={`node-panel ${content ? 'has-content' : 'empty'}`}>
        {/* ReactFlow Native Resize Control */}
        <NodeResizer 
          minWidth={480}
          minHeight={320}
        />
        
        {/* Node Header with Design System Gradient */}
        <div className="node-header output">
          Output
        </div>

        {/* Compact Status Bar */}
        <div className="output-status-bar">
          <div className="status-item">
            <span className="status-text">{getContentTypeLabel()}: {content ? 'Content received' : 'Waiting for input...'}</span>
          </div>
          {lastUpdated && (
            <div className="status-item">
              <span className="status-text">{lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Node Body */}
        <div className="node-body">
          {/* Content Display Area */}
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            {renderContent()}
          </div>

          {/* Context Display */}
          {context && context.messages && (
            <details className="details-section" style={{ marginTop: 'var(--spacing-sm)' }}>
              <summary className="helper-text summary-clickable">
                Context ({context.messages.length} messages)
              </summary>
              <div style={{ marginTop: 'var(--spacing-xs)' }}>
                {context.messages.slice(-3).map((msg, idx) => (
                  <div key={idx} className="helper-text helper-text-small" style={{ marginBottom: 'var(--spacing-xs)' }}>
                    <strong>{msg.role}:</strong> {msg.content.substring(0, 100)}
                    {msg.content.length > 100 && '...'}
                  </div>
                ))}
              </div>
            </details>
          )}

        </div>

        {/* ReactFlow Input Handle */}
        <Handle
          type="target"
          position={Position.Left}
          className="react-flow__handle"
        />
        
        {/* ReactFlow Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          className="react-flow__handle"
        />
      </div>
      
      {/* Render lightbox using portal to escape node positioning constraints */}
      {lightboxOpen && contentType === 'image' && ReactDOM.createPortal(
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
        </div>,
        document.body
      )}
    </>
  );
};

export default OutputNode;