// Local development storage adapter
import { indexedDB as indexedDBManager } from '../database/indexedDB.js';
import { FileValidator } from '../utils/fileValidation.js';
import logger from '../../utils/logger';

export class LocalDevAdapter {
  constructor() {
    this.environment = 'development';
  }

  /**
   * Upload file to local IndexedDB storage
   */
  async uploadFile(file, options = {}) {
    try {
      // Validate file
      const validation = FileValidator.validate(file, this.environment);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate unique file ID
      const fileId = FileValidator.generateFileId();
      
      // Convert file to array buffer for storage
      const arrayBuffer = await file.arrayBuffer();
      
      // Create local URL for preview
      const localUrl = URL.createObjectURL(file);
      
      // Prepare file data for storage
      const fileData = {
        id: fileId,
        name: FileValidator.sanitizeFileName(file.name),
        originalName: file.name,
        type: file.type || FileValidator.getMimeType(file.name),
        size: file.size,
        data: arrayBuffer,
        url: localUrl,
        category: validation.fileType,
        extension: validation.extension,
        uploadedAt: new Date().toISOString(),
        lastModified: new Date(file.lastModified).toISOString(),
        environment: this.environment,
        metadata: {
          ...options.metadata,
          originalFileLastModified: file.lastModified
        }
      };

      // Store in IndexedDB
      await indexedDBManager.addFile(fileData);

      return {
        fileId,
        url: localUrl,
        name: file.name,
        type: file.type,
        size: file.size,
        category: validation.fileType
      };

    } catch (error) {
      logger.error('[LocalDevAdapter] Upload failed:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Get file from local storage
   */
  async getFile(fileId) {
    try {
      const fileData = await indexedDBManager.getFile(fileId);
      
      if (!fileData) {
        throw new Error(`File not found: ${fileId}`);
      }

      return {
        id: fileData.id,
        name: fileData.originalName || fileData.name,
        type: fileData.type,
        size: fileData.size,
        url: fileData.url,
        category: fileData.category,
        uploadedAt: fileData.uploadedAt,
        metadata: fileData.metadata || {}
      };

    } catch (error) {
      logger.error('[LocalDevAdapter] Get file failed:', error);
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }

  /**
   * Get raw file data (for processing)
   */
  async getFileData(fileId) {
    try {
      const fileData = await indexedDBManager.getFile(fileId);
      
      if (!fileData) {
        throw new Error(`File not found: ${fileId}`);
      }

      // Convert ArrayBuffer back to File object
      const file = new File(
        [fileData.data], 
        fileData.originalName || fileData.name, 
        { type: fileData.type }
      );

      return file;

    } catch (error) {
      logger.error('[LocalDevAdapter] Get file data failed:', error);
      throw new Error(`Failed to get file data: ${error.message}`);
    }
  }

  /**
   * List all files
   */
  async listFiles() {
    try {
      const files = await indexedDBManager.getAllFiles();
      
      return files.map(file => ({
        id: file.id,
        name: file.originalName || file.name,
        type: file.type,
        size: file.size,
        url: file.url,
        category: file.category,
        uploadedAt: file.uploadedAt,
        metadata: file.metadata || {}
      }));

    } catch (error) {
      logger.error('[LocalDevAdapter] List files failed:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Delete file from local storage
   */
  async deleteFile(fileId) {
    try {
      const fileData = await indexedDBManager.getFile(fileId);
      
      if (fileData) {
        // Revoke object URL to free memory
        if (fileData.url && fileData.url.startsWith('blob:')) {
          URL.revokeObjectURL(fileData.url);
        }
      }

      // Delete from IndexedDB
      await indexedDBManager.deleteFile(fileId);
      
      return true;

    } catch (error) {
      logger.error('[LocalDevAdapter] Delete failed:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Save processed file context
   */
  async saveFileContext(fileId, context) {
    try {
      const contextData = await indexedDBManager.saveFileContext(fileId, context);
      return contextData;

    } catch (error) {
      logger.error('[LocalDevAdapter] Save context failed:', error);
      throw new Error(`Failed to save context: ${error.message}`);
    }
  }

  /**
   * Get processed file context
   */
  async getFileContext(fileId) {
    try {
      const context = await indexedDBManager.getFileContext(fileId);
      return context || null;

    } catch (error) {
      logger.error('[LocalDevAdapter] Get context failed:', error);
      throw new Error(`Failed to get context: ${error.message}`);
    }
  }

  /**
   * List all file contexts
   */
  async listContexts() {
    try {
      const contexts = await indexedDBManager.getAllFileContexts();
      return contexts || [];

    } catch (error) {
      logger.error('[LocalDevAdapter] List contexts failed:', error);
      throw new Error(`Failed to list contexts: ${error.message}`);
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageInfo() {
    try {
      const usage = await indexedDBManager.getStorageUsage();
      const files = await this.listFiles();
      
      return {
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        usedQuota: usage.usage || 0,
        availableQuota: usage.quota || 0,
        environment: this.environment
      };

    } catch (error) {
      logger.error('[LocalDevAdapter] Storage info failed:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        usedQuota: 0,
        availableQuota: 0,
        environment: this.environment
      };
    }
  }

  /**
   * Clear all local storage data
   */
  async clearAllData() {
    try {
      // Get all files to revoke their URLs
      const files = await indexedDBManager.getAllFiles();
      
      // Revoke all object URLs
      files.forEach(file => {
        if (file.url && file.url.startsWith('blob:')) {
          URL.revokeObjectURL(file.url);
        }
      });

      // Clear IndexedDB
      await indexedDBManager.clearAllData();
      
      return true;

    } catch (error) {
      logger.error('[LocalDevAdapter] Clear data failed:', error);
      throw new Error(`Failed to clear data: ${error.message}`);
    }
  }

  /**
   * Check if adapter is ready
   */
  async isReady() {
    try {
      await indexedDBManager.ensureConnection();
      return true;
    } catch (error) {
      logger.error('[LocalDevAdapter] Readiness check failed:', error);
      return false;
    }
  }
}

export default LocalDevAdapter;