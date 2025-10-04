/**
 * Image Panel Node Component
 * A node that allows users to upload or paste images to pass as context
 */

import React, { useState, useCallback, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { ImagePanelNodeData } from '../types/nodes';
import logger from '../utils/logger';

interface ImagePanelNodeProps {
  data: ImagePanelNodeData;
  id: string;
  isConnectable: boolean;
  selected?: boolean;
}

const ImagePanelNode: React.FC<ImagePanelNodeProps> = ({ data, id, isConnectable, selected }) => {
  const [imageUrl, setImageUrl] = useState<string | undefined>(data.imageUrl);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      logger.warn('Only image files are allowed');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImageUrl(url);

      // Output the image data
      if (data.onOutput) {
        data.onOutput({
          nodeId: id,
          content: url,
          type: 'image'
        });
      }
    };
    reader.readAsDataURL(file);
  }, [data, id]);

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

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle click to upload
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle paste event (will be handled at parent level)
  // This component will expose a method to receive pasted images

  return (
    <div
      style={{
        background: 'var(--node-body-background)',
        border: selected
          ? '2px solid var(--color-accent-primary)'
          : '1px solid var(--node-border-color)',
        borderRadius: '8px',
        width: '280px',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'var(--node-header-background)',
          padding: '12px',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
          borderBottom: '1px solid var(--node-border-color)',
          fontWeight: 600,
          fontSize: '14px',
          color: 'var(--color-text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>🖼️</span>
        <span>Image Panel</span>
      </div>

      {/* Image Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          cursor: 'pointer',
          background: isDragging ? 'var(--color-accent-primary-alpha)' : 'transparent',
          border: isDragging ? '2px dashed var(--color-accent-primary)' : 'none',
          borderRadius: '4px',
          margin: '8px',
          minHeight: '150px',
          transition: 'all 0.2s ease'
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Uploaded preview"
            style={{
              maxWidth: '100%',
              maxHeight: '200px',
              objectFit: 'contain',
              borderRadius: '4px'
            }}
          />
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

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={isConnectable}
        style={{
          background: 'var(--color-accent-primary)',
          width: '12px',
          height: '12px',
          border: '2px solid var(--node-body-background)',
        }}
      />
    </div>
  );
};

export default ImagePanelNode;
