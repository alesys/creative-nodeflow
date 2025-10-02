// Agent Prompt Node - Continuation prompt with context input
import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import OpenAIService from '../services/OpenAIService';
import { usePromptNode } from '../hooks/useNodeEditor.js';

const AgentPromptNode = ({ data, id, isConnectable }) => {
  const {
    isEditing,
    prompt,
    setPrompt,
    textareaRef,
    handleEditClick,
    isProcessing,
    error,
    inputContext,
    hasReceivedInput,
    handleKeyDown: baseHandleKeyDown
  } = usePromptNode(data.prompt || '', data, id);

  // Input listener is now set up automatically by useNodeInput hook

  const handleKeyDown = useCallback(async (e) => {
    await baseHandleKeyDown(e, OpenAIService);
  }, [baseHandleKeyDown]);

  const getConnectionStatus = () => {
    if (!hasReceivedInput) {
      return {
        icon: '⚠️',
        text: 'Waiting for input context',
        color: '#d97706'
      };
    }
    return {
      icon: '✅',
      text: 'Context received',
      color: '#059669'
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className={`node-panel ${isProcessing ? 'processing' : ''} ${error ? 'error' : ''}`}>
      {/* ReactFlow Native Resize Control */}
      <NodeResizer 
        minWidth={320}
        minHeight={240}
      />
      
      {/* Node Header with Design System Gradient */}
      <div className="node-header text-positive">
        Agent Prompt
      </div>

      {/* Compact Status Bar */}
      <div className="agent-status-bar">
        <div className="status-item">
          <span className="status-icon" style={{ color: connectionStatus.color }}>{connectionStatus.icon}</span>
          <span className="status-text">{connectionStatus.text}</span>
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
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseMove={(e) => e.stopPropagation()}
              className="nodrag textarea-control"
              placeholder="Enter your follow-up prompt here... Press Ctrl+Enter to execute"
            />
            <div className="helper-text helper-text-margined">
              Press Ctrl+Enter to execute
            </div>
          </div>
        ) : (
          <div 
            onClick={handleEditClick}
            className="textarea-control"
            style={{ 
              cursor: 'pointer', 
              minHeight: 'var(--textarea-min-height)',
              marginTop: 'var(--spacing-sm)'
            }}
          >
            {prompt ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {prompt}
              </ReactMarkdown>
            ) : (
              <span className="helper-text helper-text-italic">
                Click to add follow-up prompt...
              </span>
            )}
          </div>
        )}

        {/* Context Display - Always show to indicate connection status */}
        <details className="details-section" style={{ marginTop: 'var(--spacing-sm)' }}>
          <summary className="helper-text summary-clickable">
            {hasReceivedInput ? (
              `Input Context (${inputContext?.messages?.length || 0} messages)`
            ) : (
              'Input Context (waiting for connection)'
            )}
          </summary>
          <div style={{ marginTop: 'var(--spacing-xs)' }}>
            {hasReceivedInput && inputContext?.messages ? (
              inputContext.messages.slice(-2).map((msg, idx) => (
                <div key={idx} className="helper-text helper-text-small" style={{ marginBottom: 'var(--spacing-xs)' }}>
                  <strong>{msg.role}:</strong> {msg.content.substring(0, 80)}
                  {msg.content.length > 80 && '...'}
                </div>
              ))
            ) : (
              <div className="helper-text helper-text-small">
                {hasReceivedInput ? 'No context messages available' : 'Connect an input node to see context here'}
              </div>
            )}
          </div>
        </details>

        {/* Status Area - Always present to prevent layout shifts */}
        <div className="status-area" style={{ marginTop: 'var(--spacing-sm)', minHeight: '24px' }}>
          {isProcessing && (
            <div className="parameter-control" style={{ borderBottom: 'none', margin: 0 }}>
              <span className="control-label" style={{ color: 'var(--color-accent-primary)' }}>
                🔄 Processing with context...
              </span>
            </div>
          )}

          {error && !isProcessing && (
            <div className="parameter-control" style={{ borderBottom: 'none', margin: 0 }}>
              <span className="control-label" style={{ color: 'var(--color-accent-error)' }}>
                ⚠️ {error}
              </span>
            </div>
          )}
        </div>

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
  );
};

export default AgentPromptNode;