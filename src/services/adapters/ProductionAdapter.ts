// Production storage adapter (S3 + Supabase)
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
  downloadUrl?: string;
  category?: string;
  uploadedAt?: string;
  metadata?: Record<string, any>;
}

export interface StorageInfo {
  totalFiles: number;
  totalSize: number;
  usedQuota: number;
  availableQuota: number;
  environment: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  fileId: string;
}

export class ProductionAdapter {
  private environment: string;
  private apiBase: string;

  constructor() {
    this.environment = 'production';
    this.apiBase = process.env.REACT_APP_API_BASE_URL || '/api';
  }

  /**
   * Get authentication token for API calls
   */
  getAuthToken(): string | null {
    // This will be implemented when you add authentication
    // For now, return null (unauthenticated development)
    return localStorage.getItem('auth_token') || null;
  }

  /**
   * Upload file to S3 via backend API
   */
  async uploadFile(file: File, options: UploadOptions = {}): Promise<FileInfo> {
    try {
      // Validate file
      const validation = FileValidator.validate(file, this.environment as 'development' | 'production');
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', validation.fileType);

      if (options.metadata) {
        formData.append('metadata', JSON.stringify(options.metadata));
      }

      // Upload to backend
      const headers: HeadersInit = {};
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.apiBase}/files/upload`, {
        method: 'POST',
        body: formData,
        headers
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Upload failed: ${response.status}`);
      }

      const result = await response.json();

      logger.debug(`[ProductionAdapter] File uploaded: ${file.name} (${FileValidator.formatFileSize(file.size)})`);

      return {
        fileId: result.fileId,
        id: result.fileId, // Alias for compatibility with components
        url: result.url,
        name: file.name,
        type: file.type,
        size: file.size,
        category: validation.fileType
      };

    } catch (error) {
      logger.error('[ProductionAdapter] Upload failed:', error);
      throw new Error(`Upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get file metadata from API
   */
  async getFile(fileId: string): Promise<FileMetadata> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.apiBase}/files/${fileId}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`File not found: ${fileId}`);
        }
        throw new Error(`Failed to get file: ${response.status}`);
      }

      const fileData = await response.json();
      return fileData;

    } catch (error) {
      logger.error('[ProductionAdapter] Get file failed:', error);
      throw new Error(`Failed to get file: ${(error as Error).message}`);
    }
  }

  /**
   * Get raw file data for processing
   */
  async getFileData(fileId: string): Promise<File> {
    try {
      const fileInfo = await this.getFile(fileId);

      // Download file from signed URL
      const response = await fetch(fileInfo.downloadUrl || fileInfo.url);

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }

      const blob = await response.blob();

      // Convert to File object
      const file = new File([blob], fileInfo.name, { type: fileInfo.type });
      return file;

    } catch (error) {
      logger.error('[ProductionAdapter] Get file data failed:', error);
      throw new Error(`Failed to get file data: ${(error as Error).message}`);
    }
  }

  /**
   * List all user files
   */
  async listFiles(): Promise<FileMetadata[]> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.apiBase}/files`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.status}`);
      }

      const files = await response.json();
      return files;

    } catch (error) {
      logger.error('[ProductionAdapter] List files failed:', error);
      throw new Error(`Failed to list files: ${(error as Error).message}`);
    }
  }

  /**
   * Delete file from S3 and database
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.apiBase}/files/${fileId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status}`);
      }

      logger.debug(`[ProductionAdapter] File deleted: ${fileId}`);
      return true;

    } catch (error) {
      logger.error('[ProductionAdapter] Delete failed:', error);
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  /**
   * Save processed file context
   */
  async saveFileContext(fileId: string, context: any): Promise<any> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.apiBase}/files/${fileId}/context`, {
        method: 'POST',
        headers,
        body: JSON.stringify(context)
      });

      if (!response.ok) {
        throw new Error(`Failed to save context: ${response.status}`);
      }

      const result = await response.json();
      logger.debug(`[ProductionAdapter] Context saved for file: ${fileId}`);
      return result;

    } catch (error) {
      logger.error('[ProductionAdapter] Save context failed:', error);
      throw new Error(`Failed to save context: ${(error as Error).message}`);
    }
  }

  /**
   * Get processed file context
   */
  async getFileContext(fileId: string): Promise<any | null> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.apiBase}/files/${fileId}/context`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No context saved yet
        }
        throw new Error(`Failed to get context: ${response.status}`);
      }

      const context = await response.json();
      return context;

    } catch (error) {
      logger.error('[ProductionAdapter] Get context failed:', error);
      throw new Error(`Failed to get context: ${(error as Error).message}`);
    }
  }

  /**
   * List all file contexts
   */
  async listContexts(): Promise<any[]> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.apiBase}/files/contexts`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to list contexts: ${response.status}`);
      }

      const contexts = await response.json();
      return contexts || [];

    } catch (error) {
      logger.error('[ProductionAdapter] List contexts failed:', error);
      throw new Error(`Failed to list contexts: ${(error as Error).message}`);
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageInfo(): Promise<StorageInfo> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.apiBase}/files/storage-info`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to get storage info: ${response.status}`);
      }

      const info = await response.json();
      return {
        ...info,
        environment: this.environment
      };

    } catch (error) {
      logger.error('[ProductionAdapter] Storage info failed:', error);
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
   * Clear all user data (requires confirmation)
   */
  async clearAllData(confirmationToken: string | null): Promise<boolean> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.apiBase}/files/clear-all`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ confirmationToken })
      });

      if (!response.ok) {
        throw new Error(`Failed to clear data: ${response.status}`);
      }

      logger.debug('[ProductionAdapter] All data cleared');
      return true;

    } catch (error) {
      logger.error('[ProductionAdapter] Clear data failed:', error);
      throw new Error(`Failed to clear data: ${(error as Error).message}`);
    }
  }

  /**
   * Check if adapter is ready and API is accessible
   */
  async isReady(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBase}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      logger.error('[ProductionAdapter] Readiness check failed:', error);
      return false;
    }
  }

  /**
   * Get signed URL for direct file upload (optional optimization)
   */
  async getUploadUrl(fileName: string, fileType: string): Promise<UploadUrlResponse> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      const authToken = this.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.apiBase}/files/upload-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fileName: FileValidator.sanitizeFileName(fileName),
          fileType
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get upload URL: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      logger.error('[ProductionAdapter] Get upload URL failed:', error);
      throw new Error(`Failed to get upload URL: ${(error as Error).message}`);
    }
  }
}

export default ProductionAdapter;
