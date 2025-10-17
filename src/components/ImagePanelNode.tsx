/**
 * Image Panel Node Component
 * A node that allows users to upload or paste images to pass as context
 */

import React, { useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useReactFlow } from '@xyflow/react';
import ImageIcon from '@mui/icons-material/Image';
import { BaseNode } from './base';
import type { ImagePanelNodeData } from '../types/nodes';
import type { NodeConfig } from '../types/nodeConfig';
import logger from '../utils/logger';

interface ImagePanelNodeProps {
  data: ImagePanelNodeData;
  id: string;
  isConnectable: boolean;
}

const ImagePanelNode: React.FC<ImagePanelNodeProps> = ({ data, id, isConnectable }) => {
  const [imageUrl, setImageUrl] = useState<string | undefined>(data.imageUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setNodes } = useReactFlow();

  // Update node size when image dimensions change
  const updateNodeSize = useCallback((width: number, height: number) => {
    const TARGET_WIDTH = 350; // Target node width in pixels (excluding padding)
    const PADDING = 32; // 16px padding on each side
    const aspectRatio = height / width;
    
    // Calculate scaled height to maintain aspect ratio
    const scaledHeight = TARGET_WIDTH * aspectRatio;
    
    // Update node dimensions
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              style: {
                ...node.style,
                width: `${TARGET_WIDTH + PADDING}px`,
                height: `${scaledHeight + PADDING + 100}px` // Add extra space for header, status bar, and padding
              }
            }
          : node
      )
    );
    
    logger.debug('[ImagePanelNode] Updated node size:', { 
      originalWidth: width, 
      originalHeight: height, 
      nodeWidth: TARGET_WIDTH + PADDING, 
      nodeHeight: scaledHeight + PADDING + 100 
    });
  }, [id, setNodes]);

  // Sync with external updates (e.g., from clipboard paste)
  React.useEffect(() => {
    if (data.imageUrl && data.imageUrl !== imageUrl) {
      setImageUrl(data.imageUrl);

      // Emit context to downstream nodes if onOutput exists
      if (data.onOutput) {
        const mimeType = typeof data.imageUrl === 'string' && data.imageUrl.startsWith('data:')
          ? data.imageUrl.split(';')[0].split(':')[1] || 'image/png'
          : 'image/png';
        const imageContext = {
          messages: [
            {
              role: 'user' as const,
              content: [
                { type: 'text' as const, text: 'Image loaded from resource file' },
                { type: 'image' as const, imageUrl: data.imageUrl, mimeType }
              ]
            }
          ]
        };
        data.onOutput({
          nodeId: id,
          content: data.imageUrl,
          type: 'image',
          context: imageContext
        });
      }
    }
  }, [data.imageUrl, imageUrl, data.onOutput, id]);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      logger.warn('Only image files are allowed');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const url = e.target?.result as string;
      setImageUrl(url);

      // Extract mime type from data URL
      const mimeType = url.split(';')[0].split(':')[1] || 'image/png';

      // Build context for the image
      const imageContext = {
        messages: [
          {
            role: 'user' as const,
            content: [
              {
                type: 'text' as const,
                text: 'User uploaded an image'
              },
              {
                type: 'image' as const,
                imageUrl: url,
                mimeType: mimeType
              }
            ]
          }
        ]
      };

      // Save image to FilePanel if not already there
            <img
              src={imageUrl}
              alt="Uploaded preview"
              style={{
                width: '100%',
                maxWidth: '400px',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '4px',
                display: 'block'
              }}
              onError={(e) => {
                // If the URL is a remote one and fails, we can't recover unless a preview was provided earlier
                // Replace image with placeholder icon
                const target = e.currentTarget;
                target.style.display = 'none';
              }}
            />
      // Update this node's data so it's available when connections are made
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  imageUrl: url,
                  content: url,
                  type: 'image',
                  context: imageContext
                }
              }
            : node
        )
      );

      // Output the image data with context (will trigger for existing connections)
      if (data.onOutput) {
        data.onOutput({
          nodeId: id,
          content: url,
          type: 'image',
          context: imageContext
        });
      }
    };
    reader.readAsDataURL(file);
  }, [data, id, setNodes]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Try to get JSON data first (from FilePanel)
    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const dragData = JSON.parse(jsonData);
        if (dragData.isImage && (dragData.fileUrl || dragData.previewUrl)) {
          const chosenUrl = dragData.fileUrl || dragData.previewUrl;
          setImageUrl(chosenUrl);

          // Update node data
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === id
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      imageUrl: chosenUrl,
                      fileName: dragData.fileName,
                      fileType: dragData.fileType
                    }
                  }
                : node
            )
          );

          // Immediately emit an image context downstream so connected nodes receive it
          if (data.onOutput) {
            const mimeType = typeof chosenUrl === 'string' && chosenUrl.startsWith('data:')
              ? chosenUrl.split(';')[0].split(':')[1] || 'image/png'
              : 'image/png';
            const imageContext = {
              messages: [
                {
                  role: 'user' as const,
                  content: [
                    { type: 'text' as const, text: 'Image dragged from File Panel' },
                    { type: 'image' as const, imageUrl: chosenUrl, mimeType }
                  ]
                }
              ]
            };
            data.onOutput({ nodeId: id, content: chosenUrl, type: 'image', context: imageContext });
          }

          return;
        }
      }
    } catch (err) {
      // Not JSON data, continue to check for files
    }

    // Handle file drops (from file system)
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect, id, setNodes]);

  // Handle click - open lightbox if image exists, otherwise upload
  const handleClick = useCallback(() => {
    if (imageUrl) {
      setLightboxOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  }, [imageUrl]);

  // Handle delete image
  const handleDeleteImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click (lightbox)

    setImageUrl(undefined);

    // Clear the node data and reset to default size
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                imageUrl: undefined,
                content: undefined,
                type: undefined,
                context: undefined
              },
              style: {
                ...node.style,
                width: undefined,
                height: undefined
              }
            }
          : node
      )
    );

    logger.debug('[ImagePanelNode] Image deleted and node size reset');
  }, [id, setNodes]);

  // Configure node using BaseNode architecture
  const nodeConfig: NodeConfig = {
    header: {
      title: 'Image Panel',
      variant: 'panel',
      icon: <ImageIcon sx={{ fontSize: '18px' }} />
    },
    statusBar: {
      show: true,
      status: imageUrl ? 'success' : 'idle',
      message: imageUrl ? 'Image loaded' : 'Drop or paste an image'
    },
    connectors: {
      inputs: [],
      outputs: [
        {
          id: 'output-image',
          type: 'image',
          label: 'Image',
          position: 'middle'
        }
      ]
    },
    resizable: true
  };

  return (
    <BaseNode id={id} isConnectable={isConnectable} config={nodeConfig}>
      {/* Image Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: imageUrl ? 'stretch' : 'center',
          justifyContent: imageUrl ? 'flex-start' : 'center',
          padding: '16px',
          cursor: imageUrl ? 'zoom-in' : 'pointer',
          background: isDragging ? 'var(--color-accent-primary-alpha)' : 'transparent',
          border: isDragging ? '2px dashed var(--color-accent-primary)' : 'none',
          borderRadius: '4px',
          margin: '8px',
          minHeight: imageUrl ? 'auto' : '150px',
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt="Uploaded preview"
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '4px',
                display: 'block'
              }}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  updateNodeSize(img.naturalWidth, img.naturalHeight);
                }
              }}
              onError={(e) => {
                // If the URL is a remote one and fails, we can't recover unless a preview was provided earlier
                // Replace image with placeholder icon
                const target = e.currentTarget;
                target.style.display = 'none';
              }}
            />
            {/* Delete/Trash Icon - appears when image exists */}
            <button
              onClick={handleDeleteImage}
              className="nodrag"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                width: '28px',
                height: '28px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Delete image"
            >
              🗑️
            </button>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--color-text-secondary)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '48px' }}>📷</div>
            <div style={{ fontSize: '13px' }}>
              Drop image here, click to upload,
              <br />
              or paste with Ctrl+V
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Lightbox Portal - Same as OutputNode */}
      {lightboxOpen && imageUrl && ReactDOM.createPortal(
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={imageUrl}
              alt="Full size preview"
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
    </BaseNode>
  );
};

export default ImagePanelNode;
