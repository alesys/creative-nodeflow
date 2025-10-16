// File Panel Component - provides file upload, management, and AI processing interface
import React, { useState, useEffect, useRef, useCallback } from 'react';
import FolderIcon from '@mui/icons-material/Folder';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import EditIcon from '@mui/icons-material/Edit';
import LabelIcon from '@mui/icons-material/Label';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fileStorageService } from '../services/FileStorageService';
import { fileProcessingService } from '../services/FileProcessingService';
import openAIService from '../services/OpenAIService';
import { alertService } from './Alert';
import logger from '../utils/logger';
import inputSanitizer from '../utils/inputSanitizer';
import './FilePanel.css';

// Type definitions
interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  /** Local object URL or data URL used for immediate optimistic preview before a persistent URL is available */
  previewUrl?: string;
  /** Indicates this record was optimistically added and awaiting final persisted metadata */
  _temp?: boolean;
  category?: string;
  uploadedAt?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

interface FileContext {
  fileId: string;
  type: string;
  category: string;
  content: {
    name?: string;
    type?: string;
    size?: number;
    keyPoints?: string[];
    [key: string]: any;
  };
  summary: string;
  searchableContent: string;
  contextPrompt: string;
  processingMethod: string;
  error?: string;
}

interface UploadProgress {
  file: string;
  progress: number;
  stage: 'uploading' | 'processing' | 'complete';
}

interface FilePanelProps {
  onFileContext?: (contexts: FileContext[]) => void;
  isVisible?: boolean;
  position?: 'left' | 'right';
}

type FilterType = 'all' | 'image' | 'text' | 'document';
type TabType = 'files' | 'brand';

const FilePanel: React.FC<FilePanelProps> = ({ onFileContext, isVisible = true, position = 'right' }) => {
  // State management
  const [activeTab, setActiveTab] = useState<TabType>('files');
  const [brandInstructions, setBrandInstructions] = useState<string>('');
  const [isBrandEditMode, setIsBrandEditMode] = useState<boolean>(false);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [contexts, setContexts] = useState<FileContext[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState<string>('');
  const [editingTagsFileId, setEditingTagsFileId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState<string>('');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Load existing files on mount
  useEffect(() => {
    loadFiles();
    // Load brand instructions from localStorage
    const saved = localStorage.getItem('brandInstructions');
    if (saved) {
      setBrandInstructions(saved);
    }
  }, []);

  // Save brand instructions to localStorage
  useEffect(() => {
    if (brandInstructions) {
      localStorage.setItem('brandInstructions', brandInstructions);
    }
  }, [brandInstructions]);

  // Load files from storage
  const loadFiles = async (): Promise<void> => {
    try {
      // Initialize storage service first
      await fileStorageService.init();

      let storedFiles = await fileStorageService.listFiles();
      const storedContexts = await fileStorageService.listContexts();

      // For each image file, reconstruct a valid object URL from stored data
      storedFiles = await Promise.all(storedFiles.map(async (file) => {
        if (file.type && file.type.startsWith('image/')) {
          try {
            const fileData = await fileStorageService.getFileData(file.id);
            const objectUrl = URL.createObjectURL(fileData);
            return { ...file, url: objectUrl };
          } catch (e) {
            logger.warn('[FilePanel] Could not reconstruct image object URL for', file.name, e);
            return file;
          }
        }
        return file;
      }));

      setFiles(storedFiles);
      setContexts(storedContexts);
      setError(null);
    } catch (error) {
      logger.error('[FilePanel] Failed to load files:', error);
      setError('Failed to load files: ' + (error as Error).message);
    }
  };


  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      uploadFiles(selectedFiles);
    }
  }, []);

  // Handle drag and drop
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();

    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length > 0) {
      uploadFiles(droppedFiles);
    }

    dropZoneRef.current?.classList.remove('drag-over');
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    dropZoneRef.current?.classList.add('drag-over');
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    dropZoneRef.current?.classList.remove('drag-over');
  }, []);

  // Upload and process files
  const uploadFiles = async (fileList: File[]): Promise<void> => {
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
          alertService.error(fileTypeValidation.error || 'Invalid file type');
          continue;
        }

        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create a local object URL for immediate feedback if image (or potentially any file)
        let previewUrl: string | undefined;
        if (file.type.startsWith('image/')) {
          try {
            previewUrl = URL.createObjectURL(file);
          } catch (e) {
            logger.warn('[FilePanel] Failed to create object URL preview:', e);
          }
        }

        // Optimistically insert file into list so user sees it immediately
        const optimisticFile: StoredFile = {
          id: fileId,
            name: sanitizedFileName,
            type: file.type,
            size: file.size,
            previewUrl,
            _temp: true,
            uploadedAt: new Date().toISOString()
        };
        setFiles(prev => [optimisticFile, ...prev]);

        // Update progress
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { file: sanitizedFileName, progress: 0, stage: 'uploading' }
        }));

        // Store file with sanitized name (may take time)
        let storedFile: StoredFile | null = null;
        try {
          storedFile = await fileStorageService.uploadFile(file, { fileId, name: sanitizedFileName }) as StoredFile;
        } catch (uploadErr) {
          logger.error('[FilePanel] Upload failed for file', sanitizedFileName, uploadErr);
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: { ...prev[fileId], progress: 100, stage: 'complete' }
          }));
          // Mark optimistic file as failed (could add error state UI in future)
          continue; // Skip processing step
        }

        // Merge stored file data into optimistic entry
        if (storedFile) {
          setFiles(prev => prev.map(f => f.id === fileId ? {
            ...f,
            ...storedFile,
            // Preserve previewUrl if final url missing
            previewUrl: f.previewUrl || storedFile?.url,
            _temp: false
          } : f));
        }

        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { ...prev[fileId], progress: 50, stage: 'processing' }
        }));

        // Process with AI
        let context: FileContext | null = null;
        if (openAIService.isConfigured()) {
          try {
            context = await fileProcessingService.extractContext(file) as FileContext;

            // Store context
            if (context) {
              await fileStorageService.saveFileContext(storedFile.id, context);
            }
          } catch (processingError) {
            logger.warn('[FilePanel] AI processing failed, using fallback:', processingError);

            // Create basic context fallback
            context = {
              fileId: storedFile.id,
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
              error: (processingError as Error).message
            };

            await fileStorageService.saveFileContext(storedFile.id, context);
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

  // After all uploads, refresh to ensure we have any metadata/contexts not already merged
  await loadFiles();

    } catch (error) {
      logger.error('[FilePanel] Upload failed:', error);
      setError('Upload failed: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete file
  const handleDeleteFile = async (fileId: string): Promise<void> => {
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
      setError('Delete failed: ' + (error as Error).message);
    }
  };

  // Start renaming a file
  const handleStartRename = (fileId: string, currentName: string): void => {
    setRenamingFileId(fileId);
    setRenamingValue(currentName);
  };

  // Finish renaming a file
  const handleFinishRename = async (fileId: string): Promise<void> => {
    if (!renamingValue.trim()) {
      setRenamingFileId(null);
      return;
    }

    try {
      await fileStorageService.init();
      const file = files.find(f => f.id === fileId);
      if (file) {
        // Update file metadata with new name
        const updatedMetadata = {
          ...file.metadata,
          originalName: file.name,
          customName: renamingValue.trim()
        };
        // For now, we'll just update in memory
        // You may want to add a rename method to fileStorageService
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, name: renamingValue.trim(), metadata: updatedMetadata } : f
        ));
      }
      setRenamingFileId(null);
      setRenamingValue('');
    } catch (error) {
      logger.error('[FilePanel] Rename failed:', error);
      setError('Rename failed: ' + (error as Error).message);
    }
  };

  // Add tag to file
  const handleAddTag = async (fileId: string, tag: string): Promise<void> => {
    if (!tag.trim()) return;

    try {
      const file = files.find(f => f.id === fileId);
      if (file) {
        const existingTags = file.tags || [];
        if (existingTags.includes(tag.trim())) return; // Tag already exists
        
        const updatedTags = [...existingTags, tag.trim()];
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, tags: updatedTags } : f
        ));
        
        // Save to metadata
        await fileStorageService.init();
        // You may want to add an updateMetadata method to fileStorageService
      }
    } catch (error) {
      logger.error('[FilePanel] Add tag failed:', error);
    }
  };

  // Remove tag from file
  const handleRemoveTag = async (fileId: string, tag: string): Promise<void> => {
    try {
      const file = files.find(f => f.id === fileId);
      if (file && file.tags) {
        const updatedTags = file.tags.filter(t => t !== tag);
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, tags: updatedTags } : f
        ));
      }
    } catch (error) {
      logger.error('[FilePanel] Remove tag failed:', error);
    }
  };

  // Toggle file selection
  const handleFileToggle = (fileId: string): void => {
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
  const handleSendToPrompt = (): void => {
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
      file.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = filterType === 'all' ||
      (filterType === 'image' && file.type.startsWith('image/')) ||
      (filterType === 'text' && (file.type.startsWith('text/') || file.type === 'application/pdf')) ||
      (filterType === 'document' && (file.type.includes('document') || file.type.includes('pdf')));

    return matchesSearch && matchesType;
  });

  // Get context for a file
  const getFileContext = (fileId: string): FileContext | undefined => {
    return contexts.find(ctx => ctx.fileId === fileId);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file type label
  const getFileTypeLabel = (type: string): string => {
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
          <span>Resources & Brand</span>
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
          {isCollapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="file-panel-body">
          {/* Tabs */}
          <div className="file-panel-tabs">
            <button
              className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => setActiveTab('files')}
            >
              <FolderIcon fontSize="small" /> Files
            </button>
            <button
              className={`tab-btn ${activeTab === 'brand' ? 'active' : ''}`}
              onClick={() => setActiveTab('brand')}
            >
              <TrackChangesIcon fontSize="small" /> Brand Voice
            </button>
          </div>

          {activeTab === 'files' ? (
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
              onChange={(e) => setFilterType(e.target.value as FilterType)}
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

                const handleDragStart = (e: React.DragEvent) => {
                  const isImage = file.type.startsWith('image/');
                  const dragData = {
                    fileId: file.id,
                    fileName: file.name,
                    fileType: file.type,
                    isImage: isImage,
                    fileUrl: file.url || file.previewUrl,
                    previewUrl: file.previewUrl,
                    context: context ? {
                      summary: context.summary,
                      content: context.content,
                      type: context.type
                    } : null
                  };
                  e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                  e.dataTransfer.effectAllowed = 'copy';
                };

                return (
                  <div
                    key={file.id}
                    className={`file-item ${isSelected ? 'selected' : ''}`}
                    draggable="true"
                    onDragStart={handleDragStart}
                  >
                    <div className="file-item-header">
                      <div className="file-info">
                        <span className="file-icon" style={{ fontSize: '10px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
                          {getFileTypeLabel(file.type)}
                        </span>
                        <div className="file-details">
                          {renamingFileId === file.id ? (
                            <input
                              type="text"
                              className="file-rename-input"
                              value={renamingValue}
                              onChange={(e) => setRenamingValue(e.target.value)}
                              onBlur={() => handleFinishRename(file.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleFinishRename(file.id);
                                if (e.key === 'Escape') setRenamingFileId(null);
                                e.stopPropagation();
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          ) : (
                            <div 
                              className="file-name" 
                              title={file.name}
                              onDoubleClick={() => handleStartRename(file.id, file.name)}
                            >
                              {file.name}
                            </div>
                          )}
                          <div className="file-meta">
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                      </div>
                      <div className="file-actions">
                        <button
                          className="action-btn"
                          onClick={() => handleStartRename(file.id, file.name)}
                          title="Rename file"
                        >
                          <EditIcon fontSize="small" />
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => setEditingTagsFileId(editingTagsFileId === file.id ? null : file.id)}
                          title="Manage tags"
                        >
                          <LabelIcon fontSize="small" />
                        </button>
                        <button
                          className={`select-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleFileToggle(file.id)}
                          title={isSelected ? 'Deselect file' : 'Select file'}
                        >
                          {isSelected ? <CheckCircleIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteFile(file.id)}
                          title="Delete file"
                        >
                          <CloseIcon fontSize="small" />
                        </button>
                      </div>
                    </div>

                    {/* Tags section */}
                    {(file.tags && file.tags.length > 0) || editingTagsFileId === file.id ? (
                      <div className="file-tags">
                        {file.tags?.map((tag, idx) => (
                          <span key={idx} className="file-tag">
                            {tag}
                            <button
                              className="tag-remove"
                              onClick={() => handleRemoveTag(file.id, tag)}
                              title="Remove tag"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {editingTagsFileId === file.id && (
                          <input
                            type="text"
                            className="tag-input"
                            placeholder="Add tag..."
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && tagInput.trim()) {
                                handleAddTag(file.id, tagInput);
                                setTagInput('');
                                e.stopPropagation();
                              }
                              if (e.key === 'Escape') {
                                setEditingTagsFileId(null);
                                setTagInput('');
                              }
                            }}
                            onBlur={() => {
                              setEditingTagsFileId(null);
                              setTagInput('');
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        )}
                      </div>
                    ) : null}

                    {/* Image Thumbnail with fallback to previewUrl */}
                    {file.type.startsWith('image/') && (file.url || file.previewUrl) && (
                      <div className="file-thumbnail">
                        <img
                          src={file.url || file.previewUrl}
                          alt={file.name}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (file.previewUrl && target.src !== file.previewUrl) {
                              target.src = file.previewUrl; // fallback to local preview
                            } else {
                              // final fallback: remove image element (could show placeholder)
                              target.style.display = 'none';
                            }
                          }}
                        />
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
          ) : (
            /* Brand Voice Tab */
            <div className="brand-voice-container">
              <div className="brand-voice-header">
                <h3>Brand Voice & System Instructions</h3>
                <p className="brand-voice-description">
                  Define your brand's personality, tone, and default instructions that will be applied to all AI generations.
                </p>
              </div>
              
              {isBrandEditMode ? (
                <textarea
                  className="brand-voice-textarea"
                  value={brandInstructions}
                  onChange={(e) => setBrandInstructions(e.target.value)}
                  onBlur={() => setIsBrandEditMode(false)}
                  placeholder="Enter your brand voice guidelines, tone preferences, writing style, and any system-wide instructions you want the AI to follow...

Example:
- Brand: Professional yet approachable
- Tone: Conversational, helpful, and clear
- Style: Use active voice, short sentences
- Avoid: Jargon, overly formal language"
                  rows={15}
                  autoFocus
                />
              ) : (
                <div 
                  className="brand-voice-display"
                  onClick={() => setIsBrandEditMode(true)}
                >
                  {brandInstructions ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {brandInstructions}
                    </ReactMarkdown>
                  ) : (
                    <div className="brand-voice-placeholder">
                      Click to add your brand voice guidelines...
                    </div>
                  )}
                </div>
              )}
              
              <div className="brand-voice-footer">
                <span className="helper-text">
                  {brandInstructions.length} characters • Auto-saved
                  {!isBrandEditMode && <span> • Click to edit</span>}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilePanel;
