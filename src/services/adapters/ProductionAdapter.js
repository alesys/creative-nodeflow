// Production storage adapter (S3 + Supabase)
import { FileValidator } from '../utils/fileValidation.js';

export class ProductionAdapter {
  constructor() {
    this.environment = 'production';
    this.apiBase = process.env.REACT_APP_API_BASE_URL || '/api';
  }

  /**
   * Get authentication token for API calls
   */
  getAuthToken() {
    // This will be implemented when you add authentication
    // For now, return null (unauthenticated development)
    return localStorage.getItem('auth_token') || null;
  }

  /**
   * Upload file to S3 via backend API
   */
  async uploadFile(file, options = {}) {
    try {
      // Validate file
      const validation = FileValidator.validate(file, this.environment);
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
      const response = await fetch(`${this.apiBase}/files/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': this.getAuthToken() ? `Bearer ${this.getAuthToken()}` : undefined
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      console.log(`[ProductionAdapter] File uploaded: ${file.name} (${FileValidator.formatFileSize(file.size)})`);

      return {
        fileId: result.fileId,
        url: result.url,
        name: file.name,
        type: file.type,
        size: file.size,
        category: validation.fileType
      };

    } catch (error) {
      console.error('[ProductionAdapter] Upload failed:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Get file metadata from API
   */
  async getFile(fileId) {
    try {
      const response = await fetch(`${this.apiBase}/files/${fileId}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthToken() ? `Bearer ${this.getAuthToken()}` : undefined,
          'Content-Type': 'application/json'
        }
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
      console.error('[ProductionAdapter] Get file failed:', error);
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }

  /**
   * Get raw file data for processing
   */
  async getFileData(fileId) {
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
      console.error('[ProductionAdapter] Get file data failed:', error);
      throw new Error(`Failed to get file data: ${error.message}`);
    }
  }

  /**
   * List all user files
   */
  async listFiles() {
    try {
      const response = await fetch(`${this.apiBase}/files`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthToken() ? `Bearer ${this.getAuthToken()}` : undefined,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.status}`);
      }

      const files = await response.json();
      return files;

    } catch (error) {
      console.error('[ProductionAdapter] List files failed:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Delete file from S3 and database
   */
  async deleteFile(fileId) {
    try {
      const response = await fetch(`${this.apiBase}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': this.getAuthToken() ? `Bearer ${this.getAuthToken()}` : undefined,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status}`);
      }

      console.log(`[ProductionAdapter] File deleted: ${fileId}`);
      return true;

    } catch (error) {
      console.error('[ProductionAdapter] Delete failed:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Save processed file context
   */
  async saveFileContext(fileId, context) {
    try {
      const response = await fetch(`${this.apiBase}/files/${fileId}/context`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthToken() ? `Bearer ${this.getAuthToken()}` : undefined,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(context)
      });

      if (!response.ok) {
        throw new Error(`Failed to save context: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[ProductionAdapter] Context saved for file: ${fileId}`);
      return result;

    } catch (error) {
      console.error('[ProductionAdapter] Save context failed:', error);
      throw new Error(`Failed to save context: ${error.message}`);
    }
  }

  /**
   * Get processed file context
   */
  async getFileContext(fileId) {
    try {
      const response = await fetch(`${this.apiBase}/files/${fileId}/context`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthToken() ? `Bearer ${this.getAuthToken()}` : undefined,
          'Content-Type': 'application/json'
        }
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
      console.error('[ProductionAdapter] Get context failed:', error);
      throw new Error(`Failed to get context: ${error.message}`);
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageInfo() {
    try {
      const response = await fetch(`${this.apiBase}/files/storage-info`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthToken() ? `Bearer ${this.getAuthToken()}` : undefined,
          'Content-Type': 'application/json'
        }
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
      console.error('[ProductionAdapter] Storage info failed:', error);
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
  async clearAllData(confirmationToken) {
    try {
      const response = await fetch(`${this.apiBase}/files/clear-all`, {
        method: 'DELETE',
        headers: {
          'Authorization': this.getAuthToken() ? `Bearer ${this.getAuthToken()}` : undefined,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmationToken })
      });

      if (!response.ok) {
        throw new Error(`Failed to clear data: ${response.status}`);
      }

      console.log('[ProductionAdapter] All data cleared');
      return true;

    } catch (error) {
      console.error('[ProductionAdapter] Clear data failed:', error);
      throw new Error(`Failed to clear data: ${error.message}`);
    }
  }

  /**
   * Check if adapter is ready and API is accessible
   */
  async isReady() {
    try {
      const response = await fetch(`${this.apiBase}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('[ProductionAdapter] Readiness check failed:', error);
      return false;
    }
  }

  /**
   * Get signed URL for direct file upload (optional optimization)
   */
  async getUploadUrl(fileName, fileType) {
    try {
      const response = await fetch(`${this.apiBase}/files/upload-url`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthToken() ? `Bearer ${this.getAuthToken()}` : undefined,
          'Content-Type': 'application/json'
        },
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
      console.error('[ProductionAdapter] Get upload URL failed:', error);
      throw new Error(`Failed to get upload URL: ${error.message}`);
    }
  }
}

export default ProductionAdapter;