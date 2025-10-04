// Main file storage service - environment-agnostic abstraction
import LocalDevAdapter from './adapters/LocalDevAdapter';
import ProductionAdapter from './adapters/ProductionAdapter';
import logger from '../utils/logger';

export interface UploadOptions {
  metadata?: Record<string, any>;
  [key: string]: any; // Allow additional properties for flexibility
}

export interface FileInfo {
  fileId: string;
  id: string; // Alias for compatibility with components
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
  category?: string;
  uploadedAt?: string;
  metadata?: Record<string, any>;
  context?: any;
  hasContext?: boolean;
}

export interface UploadResult {
  success: boolean;
  file?: FileInfo;
  error?: string;
  fileName?: string;
}

export interface EnvironmentInfo {
  environment: string;
  adapter: string;
  initialized: boolean;
}

export interface TestResults {
  canInitialize: boolean;
  canUpload: boolean;
  canRetrieve: boolean;
  canDelete: boolean;
  environment: string;
  error?: string;
}

export interface StorageInfo {
  totalFiles: number;
  totalSize: number;
  usedQuota: number;
  availableQuota: number;
  environment: string;
}

type StorageAdapter = LocalDevAdapter | ProductionAdapter;

export class FileStorageService {
  private adapter: StorageAdapter;
  private environment: string;
  private isInitialized: boolean;
  private initPromise: Promise<void> | null;

  constructor() {
    this.adapter = this.createAdapter();
    this.environment = process.env.NODE_ENV || 'development';
    this.isInitialized = false;
    this.initPromise = null; // Track initialization promise to avoid multiple inits
  }

  /**
   * Create appropriate storage adapter based on environment
   */
  createAdapter(): StorageAdapter {
    const env = process.env.NODE_ENV || 'development';
    const forceLocal = process.env.REACT_APP_FORCE_LOCAL_STORAGE === 'true';

    try {
      if (env === 'development' || forceLocal) {
        return new LocalDevAdapter();
      } else {
        return new ProductionAdapter();
      }
    } catch (error) {
      logger.error('[FileStorageService] Failed to create adapter:', error);
      throw new Error(`Failed to create storage adapter: ${(error as Error).message}`);
    }
  }

  /**
   * Initialize the storage service
   */
  async init(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.isInitialized) {
      return Promise.resolve();
    }

    // Start initialization
    this.initPromise = this._performInit();
    return this.initPromise;
  }

  async _performInit(): Promise<void> {
    try {
      if (!this.adapter) {
        throw new Error('Adapter is null or undefined');
      }

      const isReady = await this.adapter.isReady();

      if (!isReady) {
        throw new Error(`Storage adapter not ready (${this.environment})`);
      }

      this.isInitialized = true;
      this.initPromise = null; // Clear promise after successful init

    } catch (error) {
      this.initPromise = null; // Clear promise on error to allow retry
      logger.error('[FileStorageService] Initialization failed:', error);
      throw new Error(`Failed to initialize storage: ${(error as Error).message}`);
    }
  }

  /**
   * Ensure service is initialized before operations
   */
  async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  // ===========================================
  // PUBLIC API - Same interface for all environments
  // ===========================================

  /**
   * Upload a file and return file info
   * @param {File} file - File object from input or drag-drop
   * @param {Object} options - Upload options and metadata
   * @returns {Promise<Object>} File info with id, url, etc.
   */
  async uploadFile(file: File, options: UploadOptions = {}): Promise<FileInfo> {
    await this.ensureInitialized();

    logger.debug(`[FileStorageService] Uploading file: ${file.name} (${file.size} bytes)`);
    return await this.adapter.uploadFile(file, options);
  }

  /**
   * Get file metadata by ID
   * @param {string} fileId - Unique file identifier
   * @returns {Promise<Object>} File metadata
   */
  async getFile(fileId: string): Promise<FileMetadata> {
    await this.ensureInitialized();
    return await this.adapter.getFile(fileId);
  }

  /**
   * Get raw file data for processing
   * @param {string} fileId - Unique file identifier
   * @returns {Promise<File>} File object for processing
   */
  async getFileData(fileId: string): Promise<File> {
    await this.ensureInitialized();
    return await this.adapter.getFileData(fileId);
  }

  /**
   * List all files for current user/session
   * @returns {Promise<Array>} Array of file metadata objects
   */
  async listFiles(): Promise<FileMetadata[]> {
    await this.ensureInitialized();
    return await this.adapter.listFiles();
  }

  /**
   * Delete a file by ID
   * @param {string} fileId - Unique file identifier
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(fileId: string): Promise<boolean> {
    await this.ensureInitialized();
    return await this.adapter.deleteFile(fileId);
  }

  /**
   * Save processed AI context for a file
   * @param {string} fileId - Unique file identifier
   * @param {Object} context - Processed context data
   * @returns {Promise<Object>} Saved context data
   */
  async saveFileContext(fileId: string, context: any): Promise<any> {
    await this.ensureInitialized();
    return await this.adapter.saveFileContext(fileId, context);
  }

  /**
   * Get processed context for a file
   * @param {string} fileId - Unique file identifier
   * @returns {Promise<Object|null>} Context data or null if not found
   */
  async getFileContext(fileId: string): Promise<any | null> {
    await this.ensureInitialized();
    return await this.adapter.getFileContext(fileId);
  }

  /**
   * List all processed contexts
   * @returns {Promise<Array>} Array of context objects
   */
  async listContexts(): Promise<any[]> {
    await this.ensureInitialized();
    return await this.adapter.listContexts();
  }

  /**
   * Get storage usage information
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageInfo(): Promise<StorageInfo> {
    await this.ensureInitialized();
    return await this.adapter.getStorageInfo();
  }

  /**
   * Clear all data (development only, requires confirmation in production)
   * @param {string} confirmationToken - Required for production
   * @returns {Promise<boolean>} Success status
   */
  async clearAllData(confirmationToken: string | null = null): Promise<boolean> {
    await this.ensureInitialized();

    if (this.environment === 'production' && !confirmationToken) {
      throw new Error('Confirmation token required for production data clearing');
    }

    return await this.adapter.clearAllData(confirmationToken);
  }

  // ===========================================
  // CONVENIENCE METHODS
  // ===========================================

  /**
   * Upload multiple files
   * @param {FileList|Array} files - Multiple files to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Array>} Array of upload results
   */
  async uploadMultipleFiles(files: FileList | File[], options: UploadOptions = {}): Promise<UploadResult[]> {
    const fileArray = Array.from(files);
    const results: UploadResult[] = [];

    for (const file of fileArray) {
      try {
        const result = await this.uploadFile(file, options);
        results.push({ success: true, file: result });
      } catch (error) {
        results.push({ success: false, error: (error as Error).message, fileName: file.name });
      }
    }

    return results;
  }

  /**
   * Get files by category
   * @param {string} category - File category (images, documents, text, code)
   * @returns {Promise<Array>} Filtered files
   */
  async getFilesByCategory(category: string): Promise<FileMetadata[]> {
    const allFiles = await this.listFiles();
    return allFiles.filter(file => file.category === category);
  }

  /**
   * Get file with context (if available)
   * @param {string} fileId - Unique file identifier
   * @returns {Promise<Object>} File with embedded context
   */
  async getFileWithContext(fileId: string): Promise<FileMetadata> {
    const file = await this.getFile(fileId);
    const context = await this.getFileContext(fileId);

    return {
      ...file,
      context,
      hasContext: !!context
    };
  }

  /**
   * Check if file exists
   * @param {string} fileId - Unique file identifier
   * @returns {Promise<boolean>} Existence status
   */
  async fileExists(fileId: string): Promise<boolean> {
    try {
      await this.getFile(fileId);
      return true;
    } catch (error) {
      return false;
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Get current environment info
   * @returns {Object} Environment information
   */
  getEnvironmentInfo(): EnvironmentInfo {
    return {
      environment: this.environment,
      adapter: this.adapter.constructor.name,
      initialized: this.isInitialized
    };
  }

  /**
   * Test storage functionality
   * @returns {Promise<Object>} Test results
   */
  async testStorage(): Promise<TestResults> {
    const testResults: TestResults = {
      canInitialize: false,
      canUpload: false,
      canRetrieve: false,
      canDelete: false,
      environment: this.environment
    };

    try {
      // Test initialization
      await this.ensureInitialized();
      testResults.canInitialize = true;

      // Create a test file
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

      // Test upload
      const uploadResult = await this.uploadFile(testFile);
      testResults.canUpload = true;

      // Test retrieval
      const retrievedFile = await this.getFile(uploadResult.fileId);
      testResults.canRetrieve = !!retrievedFile;

      // Test deletion
      await this.deleteFile(uploadResult.fileId);
      testResults.canDelete = true;

    } catch (error) {
      testResults.error = (error as Error).message;
    }

    return testResults;
  }
}

// Export singleton instance
export const fileStorageService = new FileStorageService();
export default fileStorageService;
