// Local development storage adapter
import { indexedDB as indexedDBManager, FileData } from '../database/indexedDB';
import { FileValidator } from '../utils/fileValidation';
import logger from '../../utils/logger';

export interface UploadOptions {
  metadata?: Record<string, any>;
}

export interface FileInfo {
  fileId: string;
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  category: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  category: string;
  uploadedAt: string;
  metadata: Record<string, any>;
}

export interface StorageInfo {
  totalFiles: number;
  totalSize: number;
  usedQuota: number;
  availableQuota: number;
  environment: string;
}

export class LocalDevAdapter {
  private environment: string;

  constructor() {
    this.environment = 'development';
  }

  /**
   * Upload file to local IndexedDB storage
   */
  async uploadFile(file: File, options: UploadOptions = {}): Promise<FileInfo> {
    try {
      // Validate file
      const validation = FileValidator.validate(file, this.environment as 'development' | 'production');
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
      const fileData: FileData = {
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
        id: fileId, // Alias for compatibility with components
        url: localUrl,
        name: file.name,
        type: file.type,
        size: file.size,
        category: validation.fileType
      };

    } catch (error) {
      logger.error('[LocalDevAdapter] Upload failed:', error);
      throw new Error(`Upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get file from local storage
   */
  async getFile(fileId: string): Promise<FileMetadata> {
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
      throw new Error(`Failed to get file: ${(error as Error).message}`);
    }
  }

  /**
   * Get raw file data (for processing)
   */
  async getFileData(fileId: string): Promise<File> {
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
      throw new Error(`Failed to get file data: ${(error as Error).message}`);
    }
  }

  /**
   * List all files
   */
  async listFiles(): Promise<FileMetadata[]> {
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
      throw new Error(`Failed to list files: ${(error as Error).message}`);
    }
  }

  /**
   * Delete file from local storage
   */
  async deleteFile(fileId: string): Promise<boolean> {
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
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  /**
   * Save processed file context
   */
  async saveFileContext(fileId: string, context: any): Promise<any> {
    try {
      const contextData = await indexedDBManager.saveFileContext(fileId, context);
      return contextData;

    } catch (error) {
      logger.error('[LocalDevAdapter] Save context failed:', error);
      throw new Error(`Failed to save context: ${(error as Error).message}`);
    }
  }

  /**
   * Get processed file context
   */
  async getFileContext(fileId: string): Promise<any | null> {
    try {
      const context = await indexedDBManager.getFileContext(fileId);
      return context || null;

    } catch (error) {
      logger.error('[LocalDevAdapter] Get context failed:', error);
      throw new Error(`Failed to get context: ${(error as Error).message}`);
    }
  }

  /**
   * List all file contexts
   */
  async listContexts(): Promise<any[]> {
    try {
      const contexts = await indexedDBManager.getAllFileContexts();
      return contexts || [];

    } catch (error) {
      logger.error('[LocalDevAdapter] List contexts failed:', error);
      throw new Error(`Failed to list contexts: ${(error as Error).message}`);
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageInfo(): Promise<StorageInfo> {
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
  async clearAllData(): Promise<boolean> {
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
      throw new Error(`Failed to clear data: ${(error as Error).message}`);
    }
  }

  /**
   * Check if adapter is ready
   */
  async isReady(): Promise<boolean> {
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
