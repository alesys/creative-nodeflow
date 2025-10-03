// File Panel Component - provides file upload, management, and AI processing interface
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fileStorageService } from '../services/FileStorageService.js';
import { fileProcessingService } from '../services/FileProcessingService.js';
import openAIService from '../services/OpenAIService.js';
import { alertService } from './Alert.js';
import logger from '../utils/logger';
import inputSanitizer from '../utils/inputSanitizer';
import './FilePanel.css';

const FilePanel = ({ onFileContext, isVisible = true, position = 'right' }) => {
  // State management
  const [files, setFiles] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [error, setError] = useState(null);

  // Refs
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Load existing files on mount
  useEffect(() => {
    loadFiles();
  }, []);

  // Load files from storage
  const loadFiles = async () => {
    try {
      // Initialize storage service first
      await fileStorageService.init();
      
      const storedFiles = await fileStorageService.listFiles();
      const storedContexts = await fileStorageService.listContexts();
      
      setFiles(storedFiles);
      setContexts(storedContexts);
      setError(null);
    } catch (error) {
      logger.error('[FilePanel] Failed to load files:', error);
      setError('Failed to load files: ' + error.message);
    }
  };

  // Handle file selection
  const handleFileSelect = useCallback((event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length > 0) {
      uploadFiles(selectedFiles);
    }
  }, []);

  // Handle drag and drop
  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length > 0) {
      uploadFiles(droppedFiles);
    }
    
    dropZoneRef.current?.classList.remove('drag-over');
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    dropZoneRef.current?.classList.add('drag-over');
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    dropZoneRef.current?.classList.remove('drag-over');
  }, []);

  // Upload and process files
  const uploadFiles = async (fileList) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Ensure storage is initialized
      await fileStorageService.init();

      for (const file of fileList) {
        // Validate and sanitize file
        const sanitizedFileName = inputSanitizer.sanitizeFileName(file.name);
        const fileValidation = inputSanitizer.validateFileContent(file, sanitizedFileName);

        if (!fileValidation.valid) {
          alertService.error(`Invalid file ${file.name}: ${fileValidation.errors.join(', ')}`);
          continue;
        }

        const fileTypeValidation = inputSanitizer.validateFileType(sanitizedFileName);
        if (!fileTypeValidation.valid) {
          alertService.error(fileTypeValidation.error);
          continue;
        }

        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Update progress
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { file: sanitizedFileName, progress: 0, stage: 'uploading' }
        }));

        // Store file with sanitized name
        const storedFile = await fileStorageService.uploadFile(file, { fileId, name: sanitizedFileName });
        
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { ...prev[fileId], progress: 50, stage: 'processing' }
        }));

        // Process with AI
        let context = null;
        if (openAIService.isConfigured()) {
          try {
            context = await fileProcessingService.extractContext(file);
            
            // Store context
            if (context) {
              await fileStorageService.saveFileContext(storedFile.fileId, context);
            }
          } catch (processingError) {
            logger.warn('[FilePanel] AI processing failed, using fallback:', processingError);
            
            // Create basic context fallback
            context = {
              type: file.type.split('/')[0] || 'file',
              category: 'unknown',
              content: {
                name: file.name,
                type: file.type,
                size: file.size
              },
              summary: `${file.name} (${formatFileSize(file.size)})`,
              searchableContent: file.name,
              contextPrompt: `File: ${file.name}`,
              processingMethod: 'fallback',
              error: processingError.message
            };
            
            await fileStorageService.saveFileContext(storedFile.fileId, context);
          }
        }

        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { ...prev[fileId], progress: 100, stage: 'complete' }
        }));

        // Remove progress after delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const updated = { ...prev };
            delete updated[fileId];
            return updated;
          });
        }, 2000);
      }

      // Reload files
      await loadFiles();

    } catch (error) {
      logger.error('[FilePanel] Upload failed:', error);
      setError('Upload failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete file
  const handleDeleteFile = async (fileId) => {
    try {
      await fileStorageService.init();
      await fileStorageService.deleteFile(fileId);
      await loadFiles();
      setSelectedFiles(prev => {
        const updated = new Set(prev);
        updated.delete(fileId);
        return updated;
      });
    } catch (error) {
      logger.error('[FilePanel] Delete failed:', error);
      setError('Delete failed: ' + error.message);
    }
  };

  // Toggle file selection
  const handleFileToggle = (fileId) => {
    setSelectedFiles(prev => {
      const updated = new Set(prev);
      if (updated.has(fileId)) {
        updated.delete(fileId);
      } else {
        updated.add(fileId);
      }
      return updated;
    });
  };

  // Send selected contexts to parent
  const handleSendToPrompt = () => {
    // Map selected file IDs to their contexts
    // Note: selectedFiles contains file.id values, but contexts use ctx.fileId
    const selectedFileIds = Array.from(selectedFiles);
    logger.debug('[FilePanel] Selected file IDs:', selectedFileIds);
    logger.debug('[FilePanel] Available contexts:', contexts.map(c => ({ fileId: c.fileId })));

    const selectedContexts = contexts.filter(ctx => selectedFileIds.includes(ctx.fileId));
    logger.debug('[FilePanel] Sending contexts to prompt:', {
      selectedFilesCount: selectedFiles.size,
      contextsCount: selectedContexts.length,
      selectedContexts
    });

    if (selectedContexts.length > 0 && onFileContext) {
      onFileContext(selectedContexts);
      logger.debug('[FilePanel] Contexts sent successfully');
    } else if (selectedFiles.size > 0 && selectedContexts.length === 0) {
      logger.warn('[FilePanel] Selected files have no processed contexts yet');
      alertService.warning('The selected files are still being processed or have no AI context. Please wait or try re-uploading.');
    } else {
      logger.warn('[FilePanel] No contexts to send or no handler:', {
        hasContexts: selectedContexts.length > 0,
        hasHandler: !!onFileContext,
        selectedFilesSize: selectedFiles.size
      });
    }
  };

  // Filter files based on search and type
  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchQuery || 
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || 
      (filterType === 'image' && file.type.startsWith('image/')) ||
      (filterType === 'text' && (file.type.startsWith('text/') || file.type === 'application/pdf')) ||
      (filterType === 'document' && (file.type.includes('document') || file.type.includes('pdf')));
    
    return matchesSearch && matchesType;
  });

  // Get context for a file
  const getFileContext = (fileId) => {
    return contexts.find(ctx => ctx.fileId === fileId);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type label
  const getFileTypeLabel = (type) => {
    if (type.startsWith('image/')) return 'IMG';
    if (type.startsWith('text/')) return 'TXT';
    if (type === 'application/pdf') return 'PDF';
    if (type.includes('document')) return 'DOC';
    return 'FILE';
  };

  if (!isVisible) return null;

  return (
    <div className={`file-panel ${position} ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Header */}
      <div className="file-panel-header">
        <div className="file-panel-title">
          <span>Reference Files</span>
          <div className="file-panel-stats">
            {files.length} file{files.length !== 1 ? 's' : ''}
            {selectedFiles.size > 0 && (
              <span className="selected-count"> • {selectedFiles.size} selected</span>
            )}
          </div>
        </div>
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {isCollapsed ? '◀' : '▶'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Controls */}
          <div className="file-panel-controls">
            <div className="upload-section">
              <button
                className="upload-btn primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : '+ Add Files'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                accept="image/*,.pdf,.txt,.md,.doc,.docx"
              />
            </div>

            {selectedFiles.size > 0 && (
              <button
                className="send-btn secondary"
                onClick={handleSendToPrompt}
                title="Send selected files as context to prompt"
              >
                Send to Prompt ({selectedFiles.size})
              </button>
            )}
          </div>

          {/* Search and Filter */}
          <div className="file-panel-search">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="text">Text</option>
              <option value="document">Documents</option>
            </select>
          </div>

          {/* Drop Zone */}
          <div
            ref={dropZoneRef}
            className="drop-zone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="drop-zone-content">
              <span>Drop files here or click "Add Files"</span>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <span className="error-icon">!</span>
              {error}
              <button onClick={() => setError(null)} className="error-close">×</button>
            </div>
          )}

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="upload-progress">
              {Object.entries(uploadProgress).map(([fileId, progress]) => (
                <div key={fileId} className="progress-item">
                  <div className="progress-info">
                    <span className="progress-filename">{progress.file}</span>
                    <span className="progress-stage">{progress.stage}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* File List */}
          <div className="file-list">
            {filteredFiles.length === 0 ? (
              <div className="empty-state">
                {files.length === 0 ? (
                  <div>
                    <p>No files uploaded yet</p>
                    <p className="empty-hint">Add reference materials to enhance your prompts</p>
                  </div>
                ) : (
                  <div>
                    <p>No files match your search</p>
                  </div>
                )}
              </div>
            ) : (
              filteredFiles.map(file => {
                const context = getFileContext(file.id);
                const isSelected = selectedFiles.has(file.id);
                
                return (
                  <div 
                    key={file.id} 
                    className={`file-item ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="file-item-header">
                      <div className="file-info">
                        <span className="file-icon" style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
                          {getFileTypeLabel(file.type)}
                        </span>
                        <div className="file-details">
                          <div className="file-name" title={file.name}>
                            {file.name}
                          </div>
                          <div className="file-meta">
                            {formatFileSize(file.size)} • {file.type}
                          </div>
                        </div>
                      </div>
                      <div className="file-actions">
                        <button
                          className={`select-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleFileToggle(file.id)}
                          title={isSelected ? 'Deselect file' : 'Select file'}
                        >
                          {isSelected ? '✓' : '○'}
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteFile(file.id)}
                          title="Delete file"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {context && (
                      <div className="file-context">
                        <div className="context-summary">
                          {context.summary}
                        </div>
                        {context.content?.keyPoints && context.content.keyPoints.length > 0 && (
                          <div className="context-points">
                            {context.content.keyPoints.slice(0, 2).map((point, i) => (
                              <div key={i} className="context-point">• {point}</div>
                            ))}
                          </div>
                        )}
                        <div className="context-meta">
                          {context.processingMethod} • {context.type}
                          {context.error && (
                            <span className="context-error" title={context.error}>Error</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Footer */}
          {files.length > 0 && (
            <div className="file-panel-footer">
              <div className="storage-info">
                Storage: {files.length} files
                {!openAIService.isConfigured() && (
                  <div className="ai-warning">
                    Configure OpenAI API for AI processing
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FilePanel;