// IndexedDB wrapper for local development storage
import logger from '../../utils/logger';

class IndexedDBManager {
  constructor() {
    this.dbName = 'CreativeNodeFlowDB';
    this.dbVersion = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      // Check if IndexedDB is available
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not supported in this browser'));
        return;
      }

      const request = window.indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        const error = event.target.error || new Error('Unknown IndexedDB error');
        logger.error('[IndexedDB] Open failed:', error);
        reject(new Error(`Failed to open IndexedDB: ${error.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

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

  async ensureConnection() {
    if (!this.db) {
      try {
        await this.init();
      } catch (error) {
        logger.error('[IndexedDB] Connection failed:', error);
        throw new Error(`Database connection failed: ${error.message}`);
      }
    }
    
    if (!this.db) {
      throw new Error('Database connection is null after initialization');
    }
    
    return this.db;
  }

  // File operations
  async addFile(fileData) {
    const db = await this.ensureConnection();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const request = store.add(fileData);

      request.onsuccess = () => resolve(fileData.id);
      request.onerror = () => reject(request.error);
    });
  }

  async getFile(fileId) {
    const db = await this.ensureConnection();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.get(fileId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFiles() {
    const db = await this.ensureConnection();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFile(fileId) {
    const db = await this.ensureConnection();
    return Promise.all([
      this.deleteFromStore('files', fileId),
      this.deleteFromStore('fileContexts', fileId)
    ]);
  }

  async deleteFromStore(storeName, key) {
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
  async saveFileContext(fileId, context) {
    const db = await this.ensureConnection();
    const contextData = {
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

  async getFileContext(fileId) {
    const db = await this.ensureConnection();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['fileContexts'], 'readonly');
      const store = transaction.objectStore('fileContexts');
      const request = store.get(fileId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllFileContexts() {
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
  async clearAllData() {
    const db = await this.ensureConnection();
    const storeNames = ['files', 'fileContexts', 'projectSettings'];
    
    return Promise.all(storeNames.map(storeName => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }));
  }

  async getStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return await navigator.storage.estimate();
    }
    return { usage: 0, quota: 0 };
  }
}

// Export singleton instance
export const indexedDB = new IndexedDBManager();
export default indexedDB;