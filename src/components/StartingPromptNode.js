// Starting Prompt Node - Entry point for prompt chains
import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import OpenAIService from '../services/OpenAIService';
import { usePromptNode } from '../hooks/useNodeEditor.js';

const StartingPromptNode = ({ data, id, isConnectable }) => {
  const {
    isEditing,
    prompt,
    setPrompt,
    textareaRef,
    handleEditClick,
    isProcessing,
    error,
    handleKeyDown: baseHandleKeyDown
  } = usePromptNode(data.prompt || '', data, id);

  const handleKeyDown = useCallback(async (e) => {
    await baseHandleKeyDown(e, OpenAIService);
  }, [baseHandleKeyDown]);

  return (
    <div className={`node-panel ${isProcessing ? 'processing' : ''} ${error ? 'error' : ''}`}>
      {/* ReactFlow Native Resize Control */}
      <NodeResizer 
        minWidth={320}
        minHeight={240}
      />
      
      {/* Node Header with Design System Gradient */}
      <div className="node-header text-positive">
        Starting Prompt
      </div>

      {/* Compact Status Bar */}
      <div className="starting-status-bar">
        <div className="status-item">
          {isProcessing ? (
            <>
              <span className="status-icon" style={{ color: 'var(--color-accent-primary)' }}>🔄</span>
              <span className="status-text">Processing with OpenAI...</span>
            </>
          ) : error ? (
            <>
              <span className="status-icon" style={{ color: 'var(--color-accent-error)' }}>⚠️</span>
              <span className="status-text">{error}</span>
            </>
          ) : (
            <>
              <span className="status-icon" style={{ color: '#059669' }}>🚀</span>
              <span className="status-text">Entry point (no input required)</span>
            </>
          )}
        </div>
      </div>

      {/* File Context Indicator */}
      {data.fileContexts && data.fileContexts.length > 0 && (
        <div className="file-context-indicator">
          <span className="context-icon">📎</span>
          <span className="context-text">
            {data.fileContexts.length} file{data.fileContexts.length > 1 ? 's' : ''} attached
          </span>
        </div>
      )}

      {/* Node Body */}
      <div className="node-body">
        
        {/* Text Area Control */}
        {isEditing ? (
          <div>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseMove={(e) => e.stopPropagation()}
              className="nodrag textarea-control positive"
              placeholder="Enter your prompt here... Press Ctrl+Enter to execute"
            />
            <div className="helper-text helper-text-margined">
              Press Ctrl+Enter to execute
            </div>
          </div>
        ) : (
          <div 
            onClick={handleEditClick}
            className="textarea-control positive"
            style={{ cursor: 'pointer', minHeight: 'var(--textarea-min-height)' }}
          >
            {prompt ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {prompt}
              </ReactMarkdown>
            ) : (
              <span className="helper-text helper-text-italic">
                Click to add prompt...
              </span>
            )}
          </div>
        )}



      </div>

      {/* ReactFlow Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="react-flow__handle"
      />
    </div>
  );
};

export default StartingPromptNode;