// Starting Prompt Node - Entry point for prompt chains
import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import OpenAIService from '../services/OpenAIService';
import { usePromptNode } from '../hooks/useNodeEditor';
import { BaseNode } from './base';
import type { StartingPromptNodeData } from '../types/nodes';
import type { NodeConfig } from '../types/nodeConfig';

interface StartingPromptNodeProps {
  data: StartingPromptNodeData;
  id: string;
  isConnectable: boolean;
}

const StartingPromptNode: React.FC<StartingPromptNodeProps> = ({ data, id, isConnectable }) => {
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

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    await baseHandleKeyDown(e, OpenAIService);
  }, [baseHandleKeyDown]);

  // Configure node using BaseNode architecture
  const nodeConfig: NodeConfig = {
    header: {
      title: 'Starting Prompt',
      variant: 'positive',
      icon: '▶️'
    },
    statusBar: {
      show: true,
      status: isProcessing ? 'processing' : error ? 'error' : 'idle',
      message: isProcessing 
        ? 'Processing with OpenAI...' 
        : error 
        ? error 
        : 'Entry point (no input required)',
      showProgress: isProcessing
    },
    connectors: {
      inputs: [],
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
    </BaseNode>
  );
};

export default StartingPromptNode;
