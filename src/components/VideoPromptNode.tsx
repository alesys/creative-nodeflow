// Motion Director Node - Video generation prompt node using VEO-3
import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useReactFlow } from '@xyflow/react';
import VideocamIcon from '@mui/icons-material/Videocam';
import SendIcon from '@mui/icons-material/Send';
import VeoVideoService from '../services/VeoVideoService';
import { MODELS } from '../constants/app';
import { usePromptNode } from '../hooks/useNodeEditor';
import { BaseNode } from './base';
import type { VideoPromptNodeData } from '../types/nodes';
import type { NodeConfig } from '../types/nodeConfig';

interface VideoPromptNodeProps {
  data: VideoPromptNodeData;
  id: string;
  isConnectable: boolean;
}

const VIDEO_MODELS = [
  { label: 'Veo 3.1 Fast (Preview)', value: MODELS.GOOGLE_VIDEO },
  { label: 'Veo 3.0 Fast', value: 'veo-3.0-fast-generate-001' }
];

const VideoPromptNode: React.FC<VideoPromptNodeProps> = ({ data, id, isConnectable }) => {
  const { setNodes } = useReactFlow();
  const [isDragOver, setIsDragOver] = React.useState(false);
  
  const {
    isEditing,
    setIsEditing,
    prompt,
    setPrompt,
    textareaRef,
    handleEditClick,
    isProcessing,
    error,
    inputContext,
    hasReceivedInput,
    handleProcess,
    setError
  } = usePromptNode(data.prompt || '', data, id);

  const [aspectRatio, setAspectRatio] = React.useState<string>(data.aspectRatio || '16:9');
  const [videoModel, setVideoModel] = React.useState<string>(
    typeof data.videoModel === 'string' && data.videoModel.length > 0
      ? data.videoModel
      : MODELS.GOOGLE_VIDEO
  );
  const [durationSeconds, setDurationSeconds] = React.useState<string>(
    typeof data.durationSeconds === 'string' && data.durationSeconds.length > 0
      ? data.durationSeconds
      : '8'
  );

  // Update node data when aspect ratio, model, or duration changes
  const handleAspectRatioChange = useCallback((newRatio: string) => {
    setAspectRatio(newRatio);
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                aspectRatio: newRatio
              }
            }
          : node
      )
    );
  }, [id, setNodes]);

  const handleDurationChange = useCallback((newDuration: string) => {
    setDurationSeconds(newDuration);
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                durationSeconds: newDuration
              }
            }
          : node
      )
    );
  }, [id, setNodes]);

  const handleModelChange = useCallback((newModel: string) => {
    setVideoModel(newModel);
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                videoModel: newModel
              }
            }
          : node
      )
    );
  }, [id, setNodes]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      if (dragData.fileId && dragData.context) {
        // Update node data with file context (without inserting text)
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === id) {
              const existingContexts = Array.isArray(node.data.fileContexts) ? node.data.fileContexts : [];
              const updatedFileContexts = [...existingContexts, {
                fileId: dragData.fileId,
                fileName: dragData.fileName,
                summary: dragData.context.summary,
                content: dragData.context.content
              }];
              return {
                ...node,
                data: {
                  ...node.data,
                  fileContexts: updatedFileContexts
                }
              };
            }
            return node;
          })
        );
      }
    } catch (err) {
      console.error('Failed to parse drop data:', err);
    }
  }, [id, setNodes]);

  // Input listener is now set up automatically by useNodeInput hook

  // Destructure onOutput from data to optimize dependency array
  const { onOutput } = data;

  // Custom video generation using VEO-3
  const generateVideo = useCallback(async () => {
    if (!VeoVideoService.isConfigured()) {
      throw new Error('Google API key not configured. Please check your .env file.');
    }

    const response = await VeoVideoService.generateVideo(
      prompt,
      inputContext,
      aspectRatio,
      videoModel,
      durationSeconds
    );

    // Emit the response through the output
    if (onOutput) {
      onOutput({
        nodeId: id,
        content: response.videoUrl || response.content, // Prioritize video URL for content
        context: response.context,
        type: 'video',
        videoUrl: response.videoUrl
      });
    }

    return response;
  }, [prompt, inputContext, aspectRatio, videoModel, durationSeconds, onOutput, id]);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();

      // Switch from editing to render mode
      setIsEditing(false);

      if (!prompt.trim()) {
        setError('Please enter video direction first');
        return;
      }

      // Use the optimized handleProcess from the hook
      await handleProcess(async () => {
        await generateVideo();
      });
    }
  }, [prompt, setIsEditing, setError, handleProcess, generateVideo]);

  const getConnectionStatus = () => {
    if (hasReceivedInput) {
      return {
        text: 'Context received',
        color: '#059669'
      };
    }
    return {
      text: 'No input (standalone mode)',
      color: '#6b7280'
    };
  };

  const connectionStatus = getConnectionStatus();

  // Configure node using BaseNode architecture
  const nodeConfig: NodeConfig = {
    header: {
      title: 'Motion Director',
      variant: 'loader',
      icon: <VideocamIcon sx={{ fontSize: '18px' }} />
    },
    statusBar: {
      show: true,
      status: isProcessing ? 'processing' : hasReceivedInput ? 'success' : 'idle',
      message: isProcessing 
        ? 'Generating video with VEO-3...' 
        : connectionStatus.text,
      showProgress: isProcessing
    },
    connectors: {
      inputs: [
        {
          id: 'input-text',
          type: 'text',
          label: 'Context',
          position: 'top'
        },
        {
          id: 'input-image',
          type: 'image',
          label: 'Image',
          position: 'bottom'
        }
      ],
      outputs: [
        {
          id: 'output-video',
          type: 'video',
          label: 'Video',
          position: 'middle'
        }
      ]
    },
    resizable: true,
    error: error
  };

  const handleSend = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter video direction first');
      return;
    }
    setIsEditing(false);
    await handleProcess(async () => {
      await generateVideo();
    });
  }, [prompt, setIsEditing, setError, handleProcess, generateVideo]);

  return (
    <BaseNode id={id} isConnectable={isConnectable} config={nodeConfig}>
        {/* Text Area Control */}
        {isEditing ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={isDragOver ? 'drop-zone-active' : ''}
            style={{ position: 'relative', display: 'flex', alignItems: 'flex-end' }}
          >
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseMove={(e) => e.stopPropagation()}
              className="nodrag textarea-control"
              placeholder="Describe the video you want to generate..."
              style={{ flex: 1, resize: 'none' }}
            />
            <button
              type="button"
              aria-label="Send"
              onClick={handleSend}
              className="send-button"
              disabled={isProcessing}
            >
              <SendIcon fontSize="medium" />
            </button>
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
                Click to add video direction...
              </span>
            )}
          </div>
        )}

        {/* Context Display - Always show to indicate connection status */}
        <details className="details-section">
          <summary className="helper-text summary-clickable">
            {hasReceivedInput ? (
              'Input Context (will influence generation)'
            ) : (
              'Input Context (waiting for connection)'
            )}
          </summary>
          <div>
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

        {/* Parameters Container */}
        <div className="parameters-container">
          {/* Model Selector */}
          <div className="parameter-control" style={{ borderBottom: 'none' }}>
            <span className="control-label">Video Model</span>
            <select
              value={videoModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="nodrag"
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--node-border-color)',
                background: 'var(--node-body-background)',
                color: 'var(--color-text-primary)',
                fontSize: '12px',
                cursor: 'pointer',
                marginRight: 8
              }}
            >
              {VIDEO_MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Duration Selector */}
          <div className="parameter-control" style={{ borderBottom: 'none' }}>
            <span className="control-label">Duration</span>
            <select
              value={durationSeconds}
              onChange={(e) => handleDurationChange(e.target.value)}
              className="nodrag"
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--node-border-color)',
                background: 'var(--node-body-background)',
                color: 'var(--color-text-primary)',
                fontSize: '12px',
                cursor: 'pointer',
                marginRight: 8
              }}
            >
              <option value="4">4 seconds</option>
              <option value="6">6 seconds</option>
              <option value="8">8 seconds</option>
            </select>
          </div>

          {/* Aspect Ratio Selector */}
          <div className="parameter-control" style={{ borderBottom: 'none' }}>
            <span className="control-label">Aspect Ratio</span>
            <select
              value={aspectRatio}
              onChange={(e) => handleAspectRatioChange(e.target.value)}
              className="nodrag"
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--node-border-color)',
                background: 'var(--node-body-background)',
                color: 'var(--color-text-primary)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value="9:16">9:16 (Portrait)</option>
              <option value="16:9">16:9 (Landscape)</option>
            </select>
          </div>
        </div>

        {/* Status Area */}
        <div className="status-area">
          {isProcessing && (
            <div className="parameter-control" style={{ borderBottom: 'none', margin: 0 }}>
              <span className="control-label" style={{ color: 'var(--color-accent-primary)' }}>
                Generating video with VEO3...
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

export default VideoPromptNode;
