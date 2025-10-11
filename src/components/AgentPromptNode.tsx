// Agent Prompt Node - Continuation prompt with context input
import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import OpenAIService from '../services/OpenAIService';
import { usePromptNode } from '../hooks/useNodeEditor';
import { BaseNode } from './base';
import logger from '../utils/logger';
import type { AgentPromptNodeData } from '../types/nodes';
import type { NodeConfig } from '../types/nodeConfig';

interface AgentPromptNodeProps {
  data: AgentPromptNodeData;
  id: string;
  isConnectable: boolean;
}

const AgentPromptNode: React.FC<AgentPromptNodeProps> = ({ data, id, isConnectable }) => {
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

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    logger.debug('[AgentPromptNode] handleKeyDown called');
    logger.debug('[AgentPromptNode] hasReceivedInput:', hasReceivedInput);
    logger.debug('[AgentPromptNode] inputContext:', inputContext);
    await baseHandleKeyDown(e, OpenAIService);
  }, [baseHandleKeyDown, hasReceivedInput, inputContext]);

  const getConnectionStatus = () => {
    if (!hasReceivedInput) {
      return {
        text: 'Waiting for input context',
        status: 'idle' as const
      };
    }
    return {
      text: 'Context received',
      status: 'success' as const
    };
  };

  const connectionStatus = getConnectionStatus();

  // Configure node using BaseNode architecture
  const nodeConfig: NodeConfig = {
    header: {
      title: 'Creative Director',
      variant: 'positive',
      icon: '🎨'
    },
    statusBar: {
      show: true,
      status: isProcessing ? 'processing' : connectionStatus.status,
      message: isProcessing ? 'Processing with context...' : connectionStatus.text,
      showProgress: isProcessing
    },
    connectors: {
      inputs: [
        {
          id: 'input-text',
          type: 'text',
          label: 'Input',
          position: 'middle'
        }
      ],
      outputs: [
        {
          id: 'output-text',
          type: 'text',
          label: 'Output',
          position: 'middle'
        }
      ]
    },
    resizable: true,
    error: error
  };

  return (
    <BaseNode id={id} isConnectable={isConnectable} config={nodeConfig}>
      {/* File Context Indicator */}
      {data.fileContexts && data.fileContexts.length > 0 && (
        <div className="file-context-indicator">
          <span className="context-icon">📎</span>
          <span className="context-text">
            {data.fileContexts.length} file{data.fileContexts.length > 1 ? 's' : ''} attached
          </span>
        </div>
      )}
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
              minHeight: 'var(--textarea-min-height)'
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
        <details className="details-section">
          <summary className="helper-text summary-clickable">
            {hasReceivedInput ? (
              `Input Context (${inputContext?.messages?.length || 0} messages)`
            ) : (
              'Input Context (waiting for connection)'
            )}
          </summary>
          <div style={{ marginTop: 'var(--spacing-xs)' }}>
            {hasReceivedInput && inputContext?.messages ? (
              inputContext.messages.slice(-2).map((msg, idx) => {
                // Handle multimodal content
                if (Array.isArray(msg.content)) {
                  return (
                    <div key={idx} className="helper-text helper-text-small" style={{ marginBottom: 'var(--spacing-xs)' }}>
                      <strong>{msg.role}:</strong>
                      {msg.content.map((part, partIdx) => {
                        if (part.type === 'text') {
                          return (
                            <span key={partIdx}>
                              {' '}{part.text.substring(0, 80)}
                              {part.text.length > 80 && '...'}
                            </span>
                          );
                        } else if (part.type === 'image') {
                          return <span key={partIdx}> [Image]</span>;
                        }
                        return null;
                      })}
                    </div>
                  );
                } else {
                  // Handle simple text content
                  return (
                    <div key={idx} className="helper-text helper-text-small" style={{ marginBottom: 'var(--spacing-xs)' }}>
                      <strong>{msg.role}:</strong> {msg.content.substring(0, 80)}
                      {msg.content.length > 80 && '...'}
                    </div>
                  );
                }
              })
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
                Processing with context...
              </span>
            </div>
          )}

          {error && !isProcessing && (
            <div className="parameter-control" style={{ borderBottom: 'none', margin: 0 }}>
              <span className="control-label" style={{ color: 'var(--color-accent-error)' }}>
                {error}
              </span>
            </div>
          )}
        </div>
    </BaseNode>
  );
};

export default AgentPromptNode;
