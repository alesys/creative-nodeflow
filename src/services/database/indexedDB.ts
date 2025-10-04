// IndexedDB wrapper for local development storage
import logger from '../../utils/logger';

export interface FileData {
  id: string;
  name: string;
  originalName?: string;
  type: string;
  size: number;
  data: ArrayBuffer;
  url: string;
  category: string;
  extension: string;
  uploadedAt: string;
  lastModified: string;
  environment: string;
  metadata?: Record<string, any>;
}

export interface FileContext {
  fileId: string;
  type?: string;
  category?: string;
  content?: any;
  summary?: string;
  searchableContent?: string;
  contextPrompt?: string;
  processingMethod?: string;
  processedAt?: string;
  error?: string;
}

export interface StorageEstimate {
  usage: number;
  quota: number;
}

class IndexedDBManager {
  private dbName: string;
  private dbVersion: number;
  private db: IDBDatabase | null;

  constructor() {
    this.dbName = 'CreativeNodeFlowDB';
    this.dbVersion = 1;
    this.db = null;
  }

  async init(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      // Check if IndexedDB is available
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not supported in this browser'));
        return;
      }

      const request = window.indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        const target = event.target as IDBOpenDBRequest;
        const error = target.error || new Error('Unknown IndexedDB error');
        logger.error('[IndexedDB] Open failed:', error);
        reject(new Error(`Failed to open IndexedDB: ${error.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const target = event.target as IDBOpenDBRequest;
        const db = target.result;

        // Files object store
        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: 'id' });
          filesStore.createIndex('name', 'name', { unique: false });
          filesStore.createIndex('type', 'type', { unique: false });
          filesStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
        }

        // File contexts object store (processed AI data)
        if (!db.objectStoreNames.contains('fileContexts')) {
          const contextsStore = db.createObjectStore('fileContexts', { keyPath: 'fileId' });
          contextsStore.createIndex('processedAt', 'processedAt', { unique: false });
        }

        // Project settings object store
        if (!db.objectStoreNames.contains('projectSettings')) {
          db.createObjectStore('projectSettings', { keyPath: 'key' });
        }
      };
    });
  }

  async ensureConnection(): Promise<IDBDatabase> {
    if (!this.db) {
      try {
        await this.init();
      } catch (error) {
        logger.error('[IndexedDB] Connection failed:', error);
        throw new Error(`Database connection failed: ${(error as Error).message}`);
      }
    }

    if (!this.db) {
      throw new Error('Database connection is null after initialization');
    }

    return this.db;
  }

  // File operations
  async addFile(fileData: FileData): Promise<string> {
    const db = await this.ensureConnection();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const request = store.add(fileData);

      request.onsuccess = () => resolve(fileData.id);
      request.onerror = () => reject(request.error);
    });
  }

  async getFile(fileId: string): Promise<FileData | undefined> {
    const db = await this.ensureConnection();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.get(fileId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFiles(): Promise<FileData[]> {
    const db = await this.ensureConnection();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFile(fileId: string): Promise<void[]> {
    await this.ensureConnection();
    return Promise.all([
      this.deleteFromStore('files', fileId),
      this.deleteFromStore('fileContexts', fileId)
    ]);
  }

  async deleteFromStore(storeName: string, key: string): Promise<void> {
    const db = await this.ensureConnection();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Context operations
  async saveFileContext(fileId: string, context: Partial<FileContext>): Promise<FileContext> {
    const db = await this.ensureConnection();
    const contextData: FileContext = {
      fileId,
      ...context,
      processedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['fileContexts'], 'readwrite');
      const store = transaction.objectStore('fileContexts');
      const request = store.put(contextData);

      request.onsuccess = () => resolve(contextData);
      request.onerror = () => reject(request.error);
    });
  }

  async getFileContext(fileId: string): Promise<FileContext | undefined> {
    const db = await this.ensureConnection();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['fileContexts'], 'readonly');
      const store = transaction.objectStore('fileContexts');
      const request = store.get(fileId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFileContexts(): Promise<FileContext[]> {
    const db = await this.ensureConnection();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['fileContexts'], 'readonly');
      const store = transaction.objectStore('fileContexts');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Utility methods
  async clearAllData(): Promise<void[]> {
    const db = await this.ensureConnection();
    const storeNames = ['files', 'fileContexts', 'projectSettings'];

    return Promise.all(storeNames.map(storeName => {
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }));
  }

  async getStorageUsage(): Promise<StorageEstimate> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { usage: 0, quota: 0 };
  }
}

// Export singleton instance
export const indexedDB = new IndexedDBManager();
export default indexedDB;
