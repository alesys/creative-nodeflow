// File validation utilities
export const FileValidator = {
  // Supported file types
  SUPPORTED_TYPES: {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
    documents: ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf'],
    text: ['.txt', '.md', '.csv', '.json', '.xml', '.yaml', '.yml'],
    code: ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.css', '.html', '.php']
  },

  // Size limits (in bytes)
  SIZE_LIMITS: {
    development: 50 * 1024 * 1024, // 50MB in development
    production: 100 * 1024 * 1024   // 100MB in production
  },

  /**
   * Validate file type, size, and other constraints
   */
  validate(file, environment = 'development') {
    const errors = [];
    
    // Check file size
    const maxSize = this.SIZE_LIMITS[environment];
    if (file.size > maxSize) {
      errors.push(`File size (${this.formatFileSize(file.size)}) exceeds limit (${this.formatFileSize(maxSize)})`);
    }

    // Check file type
    const fileExtension = this.getFileExtension(file.name);
    if (!this.isSupportedType(fileExtension)) {
      errors.push(`File type "${fileExtension}" is not supported`);
    }

    // Check file name
    if (!this.isValidFileName(file.name)) {
      errors.push('File name contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      fileType: this.getFileCategory(fileExtension),
      extension: fileExtension
    };
  },

  /**
   * Get file extension (with dot)
   */
  getFileExtension(fileName) {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.substring(lastDot).toLowerCase();
  },

  /**
   * Check if file type is supported
   */
  isSupportedType(extension) {
    return Object.values(this.SUPPORTED_TYPES)
      .some(types => types.includes(extension));
  },

  /**
   * Get file category (images, documents, text, code)
   */
  getFileCategory(extension) {
    for (const [category, types] of Object.entries(this.SUPPORTED_TYPES)) {
      if (types.includes(extension)) {
        return category;
      }
    }
    return 'unknown';
  },

  /**
   * Check if file name is valid (no invalid characters)
   */
  isValidFileName(fileName) {
    // Disallow dangerous characters and reserved names
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    
    return !invalidChars.test(fileName) && 
           !reservedNames.test(fileName.split('.')[0]) &&
           fileName.length > 0 &&
           fileName.length <= 255;
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Generate safe file ID
   */
  generateFileId() {
    return `file_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  },

  /**
   * Sanitize file name for storage
   */
  sanitizeFileName(fileName) {
    // Replace invalid characters with underscores
    return fileName
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 200); // Limit length
  },

  /**
   * Check if file is an image
   */
  isImage(file) {
    return this.getFileCategory(this.getFileExtension(file.name)) === 'images';
  },

  /**
   * Check if file is a document
   */
  isDocument(file) {
    const category = this.getFileCategory(this.getFileExtension(file.name));
    return category === 'documents' || category === 'text';
  },

  /**
   * Get MIME type for file
   */
  getMimeType(fileName) {
    const extension = this.getFileExtension(fileName);
    const mimeTypes = {
      // Images
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      
      // Documents
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.rtf': 'application/rtf',
      
      // Text/Data
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.yaml': 'application/x-yaml',
      '.yml': 'application/x-yaml',
      
      // Code
      '.js': 'application/javascript',
      '.jsx': 'application/javascript',
      '.ts': 'application/typescript',
      '.tsx': 'application/typescript',
      '.py': 'text/x-python',
      '.css': 'text/css',
      '.html': 'text/html'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }
};

export default FileValidator;