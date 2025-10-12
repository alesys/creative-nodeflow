// Output Node - Displays results from prompt nodes
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useReactFlow } from '@xyflow/react';
import { BaseNode } from './base';
import logger from '../utils/logger';
import type { OutputNodeData } from '../types/nodes';
import type { ConversationContext } from '../types/api';
import type { NodeConfig } from '../types/nodeConfig';

interface OutputNodeProps {
  data: OutputNodeData;
  id: string;
  isConnectable: boolean;
}

interface PageData {
  content: string;
  context: ConversationContext | null;
  type: 'text' | 'image' | 'video';
  timestamp: Date;
  videoUrl?: string;
}

const OutputNode: React.FC<OutputNodeProps> = ({ data, id, isConnectable }) => {
  // Pagination state - store multiple pages
  const [pages, setPages] = useState<PageData[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { setNodes } = useReactFlow();
  const imageRef = useRef<HTMLImageElement>(null);
  const initializedRef = useRef(false);

  // Get current page data
  const currentPage = pages[currentPageIndex] || null;
  const content = currentPage?.content || '';
  const context = currentPage?.context || null;
  const contentType = currentPage?.type || 'text';
  const lastUpdated = currentPage?.timestamp || null;

  // Listen for incoming data from connected nodes
  useEffect(() => {
    if (data.onReceiveInput) {
      data.onReceiveInput((inputData) => {
        logger.debug('[OutputNode] Received input:', inputData);
        logger.debug('[OutputNode] Context has', inputData.context?.messages?.length, 'messages');

        // Create new page with incoming data
        const newPage: PageData = {
          content: inputData.content,
          context: inputData.context || null,
          type: inputData.type || 'text',
          timestamp: new Date()
        };

        // Add new page and switch to it
        setPages(prevPages => {
          // If this is the first data and we have no pages yet, create the first page
          if (prevPages.length === 0 && !initializedRef.current) {
            initializedRef.current = true;
            setCurrentPageIndex(0);
            return [newPage];
          }

          // Otherwise, add as a new page
          const updatedPages = [...prevPages, newPage];
          setCurrentPageIndex(updatedPages.length - 1); // Index of new page
          return updatedPages;
        });

        // Update node data with current page info
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

        // Broadcast new page to connected nodes
        if (data.onOutput) {
          logger.debug('[OutputNode] Sending new page to connected nodes via onOutput');
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
                logger.error('Image load error:', (e.target as HTMLImageElement).src);
                setImageError(true);
              }}
              onLoad={(e) => {
                logger.debug('Image loaded successfully:', content.substring(0, 50));
                setImageError(false);

                // Auto-resize node to accommodate image
                const img = e.target as HTMLImageElement;
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

      case 'video':
        if (!content) {
          return (
            <div className="helper-text waiting-content">
              No video data received...
            </div>
          );
        }

        // Check if content is a data URL (video file) or just text
        const isVideoUrl = content.startsWith('data:video') || content.startsWith('blob:') || content.startsWith('http');

        logger.debug('Video content check:', {
          isVideoUrl,
          contentStart: content.substring(0, 50),
          contentLength: content.length
        });

        if (!isVideoUrl) {
          // If it's not a video URL, show as text (error message or status)
          logger.debug('Showing video content as text (not a URL)');
          return (
            <div className="text-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          );
        }

        logger.debug('Rendering video player with src:', content.substring(0, 60));
        return (
          <div style={{ width: '100%', marginTop: '8px' }}>
            <video
              src={content}
              controls
              preload="auto"
              style={{
                width: '100%',
                maxHeight: '400px',
                borderRadius: '4px',
                backgroundColor: '#000'
              }}
              onLoadedMetadata={(e) => {
                const video = e.target as HTMLVideoElement;
                logger.debug('Video metadata loaded:', {
                  duration: video.duration,
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight
                });
              }}
              onCanPlay={() => {
                logger.debug('Video can play now');
              }}
              onError={(e) => {
                const video = e.target as HTMLVideoElement;
                logger.error('Video error:', {
                  error: video.error,
                  errorCode: video.error?.code,
                  errorMessage: video.error?.message,
                  src: content.substring(0, 100)
                });
              }}
            >
              Your browser does not support the video tag.
            </video>
            <div className="helper-text" style={{ marginTop: '4px', fontSize: '10px', opacity: 0.7 }}>
              {content.substring(0, 80)}...
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

  const getContentTypeLabel = () => {
    if (!content) return 'Waiting';
    if (contentType === 'image') return 'Image';
    if (contentType === 'video') return 'Video';
    return 'Text';
  };

  // Copy to clipboard handler
  const handleCopyToClipboard = useCallback(async () => {
    if (!content) return;

    try {
      if (contentType === 'image') {
        // For images, convert data URL to blob and copy
        const response = await fetch(content);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        logger.debug('[OutputNode] Image copied to clipboard');
      } else {
        // For text, copy as plain text
        await navigator.clipboard.writeText(content);
        logger.debug('[OutputNode] Text copied to clipboard');
      }
    } catch (error) {
      logger.error('[OutputNode] Failed to copy to clipboard:', error);
    }
  }, [content, contentType]);

  // Page navigation handlers
  const handlePreviousPage = useCallback(() => {
    if (currentPageIndex > 0) {
      const newIndex = currentPageIndex - 1;
      setCurrentPageIndex(newIndex);

      // Update node data with selected page
      const selectedPage = pages[newIndex];
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  content: selectedPage.content,
                  context: selectedPage.context,
                  type: selectedPage.type
                }
              }
            : node
        )
      );

      // Broadcast selected page to connected nodes
      if (data.onOutput && selectedPage) {
        logger.debug('[OutputNode] Broadcasting page', newIndex + 1, 'to connected nodes');
        data.onOutput({
          nodeId: id,
          content: selectedPage.content,
          context: selectedPage.context || undefined,
          type: selectedPage.type
        });
      }
    }
  }, [currentPageIndex, pages, id, setNodes, data]);

  const handleNextPage = useCallback(() => {
    if (currentPageIndex < pages.length - 1) {
      const newIndex = currentPageIndex + 1;
      setCurrentPageIndex(newIndex);

      // Update node data with selected page
      const selectedPage = pages[newIndex];
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  content: selectedPage.content,
                  context: selectedPage.context,
                  type: selectedPage.type
                }
              }
            : node
        )
      );

      // Broadcast selected page to connected nodes
      if (data.onOutput && selectedPage) {
        logger.debug('[OutputNode] Broadcasting page', newIndex + 1, 'to connected nodes');
        data.onOutput({
          nodeId: id,
          content: selectedPage.content,
          context: selectedPage.context || undefined,
          type: selectedPage.type
        });
      }
    }
  }, [currentPageIndex, pages, id, setNodes, data]);

  // Configure node using BaseNode architecture
  const nodeConfig: NodeConfig = {
    header: {
      title: 'Output',
      variant: 'output',
      icon: '📤'
    },
    statusBar: {
      show: true,
      status: content ? 'success' : 'idle',
      message: `${getContentTypeLabel()}: ${content ? 'Content received' : 'Waiting for input...'}`
    },
    connectors: {
      inputs: [
        {
          id: 'input-any',
          type: 'any',
          label: 'Input',
          position: 'middle'
        }
      ],
      outputs: [
        {
          id: 'output-any',
          type: 'any',
          label: 'Output',
          position: 'middle'
        }
      ]
    },
    resizable: true,
    minWidth: 480,
    minHeight: 320,
    className: content ? 'has-content' : 'empty'
  };

  return (
    <>
      <BaseNode id={id} isConnectable={isConnectable} config={nodeConfig}>
        {/* Pagination Controls in Status Bar */}
        <div className="output-status-bar">
          <div className="status-item">
            <span className="status-text">{getContentTypeLabel()}: {content ? 'Content received' : 'Waiting for input...'}</span>
          </div>
          {content && (
            <div className="status-item">
              <button
                onClick={handleCopyToClipboard}
                className="nodrag"
                style={{
                  background: 'transparent',
                  color: 'var(--color-accent-primary)',
                  border: '1px solid var(--color-accent-primary)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-accent-primary)';
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--color-accent-primary)';
                }}
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
          )}
          {pages.length > 1 && (
            <div className="status-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handlePreviousPage}
                disabled={currentPageIndex === 0}
                className="nodrag"
                style={{
                  background: currentPageIndex === 0 ? 'var(--node-border-color)' : 'var(--color-accent-primary)',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: currentPageIndex === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: currentPageIndex === 0 ? 0.5 : 1
                }}
              >
                ←
              </button>
              <span className="status-text">
                Page {currentPageIndex + 1} / {pages.length}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPageIndex === pages.length - 1}
                className="nodrag"
                style={{
                  background: currentPageIndex === pages.length - 1 ? 'var(--node-border-color)' : 'var(--color-accent-primary)',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: currentPageIndex === pages.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: currentPageIndex === pages.length - 1 ? 0.5 : 1
                }}
              >
                →
              </button>
            </div>
          )}
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
                {context.messages.slice(-3).map((msg, idx) => {
                  // Handle multimodal content
                  if (Array.isArray(msg.content)) {
                    return (
                      <div key={idx} className="helper-text helper-text-small" style={{ marginBottom: 'var(--spacing-xs)' }}>
                        <strong>{msg.role}:</strong>
                        {msg.content.map((part, partIdx) => {
                          if (part.type === 'text') {
                            return (
                              <span key={partIdx}>
                                {' '}{part.text.substring(0, 100)}
                                {part.text.length > 100 && '...'}
                              </span>
                            );
                          } else if (part.type === 'image') {
                            return (
                              <span key={partIdx}>
                                {' '}[Image: {part.imageUrl.substring(0, 30)}...]
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                    );
                  } else {
                    // Handle simple text content
                    return (
                      <div key={idx} className="helper-text helper-text-small" style={{ marginBottom: 'var(--spacing-xs)' }}>
                        <strong>{msg.role}:</strong> {msg.content.substring(0, 100)}
                        {msg.content.length > 100 && '...'}
                      </div>
                    );
                  }
                })}
              </div>
            </details>
          )}

        </div>
      </BaseNode>

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
