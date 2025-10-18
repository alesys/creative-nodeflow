// Output Node - Displays results from prompt nodes
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useReactFlow } from '@xyflow/react';
import OutputIcon from '@mui/icons-material/Output';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
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
  // Removed unused imageError, maximized
  const [textEditMode, setTextEditMode] = useState(false);
  const { setNodes } = useReactFlow();
  // Removed unused imageRef
  const initializedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        return (
          <div style={{ width: '100%' }}>
            <img
              src={content}
              alt="Generated content"
              className="output-image clickable"
              onClick={() => setLightboxOpen(true)}
              style={{ cursor: 'pointer', width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        );
      case 'video':
        return (
          <div style={{ width: '100%', marginTop: '8px' }}>
            <video
              src={content}
              controls
              preload="metadata"
              style={{ width: '100%', height: 'auto', borderRadius: '4px', backgroundColor: '#000', display: 'block' }}
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
          </div>
        );
      case 'text':
      default:
        return (
          <div 
            className="text-content" 
            onClick={() => setTextEditMode(true)}
            style={{ cursor: textEditMode ? 'text' : 'pointer', height: textEditMode ? '100%' : 'auto', display: 'flex', flexDirection: 'column' }}
          >
            {textEditMode ? (
              <textarea
                ref={textareaRef}
                className="nodrag"
                value={content}
                readOnly
                style={{ width: '100%', flex: 1, minHeight: '200px', padding: '8px', fontFamily: 'inherit', fontSize: 'inherit', border: '1px solid var(--node-border-color)', borderRadius: '4px', backgroundColor: 'var(--node-bg-color)', color: 'var(--color-text-primary)', resize: 'vertical' }}
                onBlur={() => setTextEditMode(false)}
                autoFocus
              />
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            )}
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

  // Build status message with pagination and timestamp
  const getStatusMessage = () => {
    const typeLabel = getContentTypeLabel();
    const baseMessage = content ? 'Content received' : 'Waiting for input...';
    const parts = [`${typeLabel}: ${baseMessage}`];
    
    if (pages.length > 1) {
      parts.push(`• Page ${currentPageIndex + 1}/${pages.length}`);
    }
    
    if (lastUpdated) {
      parts.push(`• ${lastUpdated.toLocaleTimeString()}`);
    }
    
    return parts.join(' ');
  };

  // Configure node using BaseNode architecture
  const nodeConfig: NodeConfig = {
    header: {
      title: 'Output',
      variant: 'output',
      icon: <OutputIcon sx={{ fontSize: '18px' }} />,
      actions: (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {content && (
            <button
              className="nodrag output-copy-btn"
              title="Copy to clipboard"
              style={{
                background: 'var(--node-border-color)',
                color: 'var(--color-text-primary)',
                border: 'none',
                borderRadius: '4px',
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center'
              }}
              onClick={handleCopyToClipboard}
            >
              <ContentCopyIcon sx={{ fontSize: '14px' }} />
            </button>
          )}
          <button
            className="nodrag output-maximize-btn"
            title={lightboxOpen ? 'Restore' : 'Maximize'}
            style={{
              background: lightboxOpen ? 'var(--color-accent-primary)' : 'var(--node-border-color)',
              color: 'var(--color-text-primary)',
              border: 'none',
              borderRadius: '4px',
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={() => setLightboxOpen((prev) => !prev)}
          >
            {lightboxOpen ? '🗗' : '🗖'}
          </button>
        </div>
      )
    },
    statusBar: {
      show: true,
      status: content ? 'success' : 'idle',
      message: getStatusMessage()
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
        {/* Pagination Controls - only show when there are multiple pages */}
        {pages.length > 1 && (
          <div className="parameter-control" style={{ 
            borderBottom: 'none', 
            display: 'flex', 
            flexDirection: 'row',
            justifyContent: 'center', 
            alignItems: 'center',
            padding: '4px 8px',
            gap: '8px',
            minHeight: 'auto',
            height: 'auto',
            width: 'fit-content',
            margin: '0 auto',
            flex: 'none'
          }}>
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
              title="Previous page"
            >
              ←
            </button>
            <span className="helper-text" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
              {currentPageIndex + 1} / {pages.length}
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
              title="Next page"
            >
              →
            </button>
          </div>
        )}

        {/* Node Body */}
        <div className="node-body output-node-body">
          {/* Content Display Area */}
          <div style={{ marginTop: 'var(--spacing-sm)' }} className="output-content-selectable nodrag">
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
      {lightboxOpen && ReactDOM.createPortal(
        <div
          className="lightbox-overlay"
          style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="lightbox-close"
            style={{ position: 'absolute', top: 24, right: 32, fontSize: '2em', background: 'none', color: '#fff', border: 'none', cursor: 'pointer', zIndex: 10, textShadow: '0 0 8px #000' }}
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
          >
            ✕
          </button>
          <div className="lightbox-content" style={{ maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', background: '#222', borderRadius: '8px', padding: '24px', boxShadow: '0 0 32px #0008', position: 'relative', margin: '48px auto 0 auto' }} onClick={(e) => e.stopPropagation()}>
            {contentType === 'text' ? (
              <div
                style={{
                  width: '60vw',
                  minWidth: '600px',
                  height: '70vh',
                  minHeight: '200px',
                  padding: '24px',
                  fontFamily: 'inherit',
                  fontSize: '1.15em',
                  border: '1px solid var(--node-border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--node-bg-color, #222)',
                  color: 'var(--color-text-primary, #eee)',
                  boxShadow: '0 0 16px #0004',
                  margin: '0 auto',
                  display: 'block',
                  overflowY: 'auto',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  MozUserSelect: 'text',
                  msUserSelect: 'text',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  cursor: 'text'
                }}
                tabIndex={0}
              >
                {content}
              </div>
            ) : (
              <>
                {contentType === 'image' && (
                  <img
                    src={content}
                    alt="Generated content - Full size"
                    className="lightbox-image"
                    style={{ maxWidth: '80vw', maxHeight: '80vh', display: 'block', margin: '0 auto', borderRadius: '8px' }}
                  />
                )}
                {contentType === 'video' && (
                  <video
                    src={content}
                    controls
                    autoPlay
                    style={{ maxWidth: '80vw', maxHeight: '80vh', display: 'block', margin: '0 auto', borderRadius: '8px', background: '#000' }}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default OutputNode;
