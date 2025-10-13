/**
 * Input Sanitization Utility
 * Provides comprehensive input validation and sanitization for user inputs
 */

import DOMPurify from 'dompurify';
import logger from './logger';

// Maximum lengths for various input types
export const MAX_LENGTHS = {
  PROMPT: 50000,
  SYSTEM_PROMPT: 10000,
  FILE_NAME: 255,
  FILE_CONTENT: 10 * 1024 * 1024, // 10MB
  CONTEXT: 100000,
} as const;

// Rate limiting configuration
export const RATE_LIMITS = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_FILE_UPLOADS_PER_MINUTE: 10,
} as const;

type LimitType = 'request' | 'file';
type InputType = 'text' | 'prompt' | 'systemPrompt' | 'fileName' | 'html' | 'context';

interface ValidationResult<T = string | SanitizedContext> {
  valid: boolean;
  errors: string[];
  sanitized: T | null;
}

interface FileValidationResult {
  valid: boolean;
  errors: string[];
}

interface FileTypeValidationResult {
  valid: boolean;
  error?: string;
}

interface RateLimitResult {
  allowed: boolean;
  error?: string;
}

interface ContextData {
  fileName?: string;
  content?: string;
  type?: string;
}

interface SanitizedContext {
  fileName?: string;
  content?: string;
  type?: string;
}

class InputSanitizer {
  private requestCounts: Map<string, number[]>;
  private fileUploadCounts: Map<string, number[]>;

  constructor() {
    this.requestCounts = new Map();
    this.fileUploadCounts = new Map();
  }

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  sanitizeHtml(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
      ALLOWED_ATTR: [],
    });
  }

  /**
   * Sanitize plain text input (removes HTML, scripts, etc.)
   */
  sanitizeText(input: string, maxLength: number = MAX_LENGTHS.PROMPT): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Remove any HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');

    // Remove null bytes and control characters (except newlines and tabs)
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Enforce max length
    if (sanitized.length > maxLength) {
      logger.warn(`Input truncated from ${sanitized.length} to ${maxLength} characters`);
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Validate and sanitize prompt input
   */
  sanitizePrompt(prompt: string): string {
    return this.sanitizeText(prompt, MAX_LENGTHS.PROMPT);
  }

  /**
   * Validate and sanitize system prompt
   */
  sanitizeSystemPrompt(systemPrompt: string): string {
    return this.sanitizeText(systemPrompt, MAX_LENGTHS.SYSTEM_PROMPT);
  }

  /**
   * Validate and sanitize file name
   */
  sanitizeFileName(fileName: string): string {
    if (typeof fileName !== 'string') {
      return '';
    }

    // Remove path traversal attempts
    let sanitized = fileName.replace(/\.\./g, '');

    // Remove null bytes and control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // Remove or replace unsafe characters
    sanitized = sanitized.replace(/[<>:"|?*]/g, '_');

    // Limit length
    if (sanitized.length > MAX_LENGTHS.FILE_NAME) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      const name = sanitized.substring(0, MAX_LENGTHS.FILE_NAME - ext.length);
      sanitized = name + ext;
    }

    return sanitized.trim();
  }

  /**
   * Validate file content
   */
  validateFileContent(content: string | Blob | File, _fileName?: string): FileValidationResult {
    const errors: string[] = [];

    if (!content) {
      errors.push('File content is empty');
      return { valid: false, errors };
    }

    if (typeof content === 'string') {
      if (content.length > MAX_LENGTHS.FILE_CONTENT) {
        errors.push(`File size exceeds maximum allowed size of ${MAX_LENGTHS.FILE_CONTENT / (1024 * 1024)}MB`);
      }
    } else if (typeof File !== 'undefined' && content instanceof File) {
      if (content.size > MAX_LENGTHS.FILE_CONTENT) {
        errors.push(`File size exceeds maximum allowed size of ${MAX_LENGTHS.FILE_CONTENT / (1024 * 1024)}MB`);
      }
    } else if (typeof Blob !== 'undefined' && content instanceof Blob) {
      if (content.size > MAX_LENGTHS.FILE_CONTENT) {
        errors.push(`File size exceeds maximum allowed size of ${MAX_LENGTHS.FILE_CONTENT / (1024 * 1024)}MB`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate file type against allowed extensions
   */
  validateFileType(
    fileName: string,
    allowedExtensions: string[] = [
      '.txt', '.md', '.json', '.js', '.jsx', '.ts', '.tsx', '.css', '.html',
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
      '.pdf', '.doc', '.docx'
    ]
  ): FileTypeValidationResult {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `File type ${ext} is not allowed. Allowed types: ${allowedExtensions.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Sanitize context data
   */
  sanitizeContext(context: ContextData | null | undefined): SanitizedContext | null {
    if (!context || typeof context !== 'object') {
      return null;
    }

    const sanitized: SanitizedContext = {};

    if (context.fileName) {
      sanitized.fileName = this.sanitizeFileName(context.fileName);
    }

    if (context.content) {
      sanitized.content = this.sanitizeText(context.content, MAX_LENGTHS.CONTEXT);
    }

    if (context.type) {
      sanitized.type = this.sanitizeText(context.type, 50);
    }

    return sanitized;
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(identifier: string, limitType: LimitType = 'request'): RateLimitResult {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = limitType === 'file'
      ? RATE_LIMITS.MAX_FILE_UPLOADS_PER_MINUTE
      : RATE_LIMITS.MAX_REQUESTS_PER_MINUTE;

    const counts = limitType === 'file' ? this.fileUploadCounts : this.requestCounts;

    if (!counts.has(identifier)) {
      counts.set(identifier, []);
    }

    const timestamps = counts.get(identifier)!;

    // Remove old timestamps outside the window
    const recentTimestamps = timestamps.filter(ts => now - ts < windowMs);

    if (recentTimestamps.length >= maxRequests) {
      logger.warn(`Rate limit exceeded for ${identifier} (${limitType})`);
      return {
        allowed: false,
        error: `Rate limit exceeded. Maximum ${maxRequests} ${limitType}s per minute.`,
      };
    }

    recentTimestamps.push(now);
    counts.set(identifier, recentTimestamps);

    return { allowed: true };
  }

  /**
   * Comprehensive input validation
   */
  validateInput(input: unknown, type: InputType = 'text'): ValidationResult {
    const errors: string[] = [];

    if (input === null || input === undefined) {
      errors.push('Input is required');
      return { valid: false, errors, sanitized: null };
    }

    let sanitized: string | SanitizedContext | null;

    switch (type) {
      case 'prompt':
        sanitized = this.sanitizePrompt(input as string);
        if (sanitized.length === 0 && (input as string).length > 0) {
          errors.push('Prompt contains only invalid characters');
        }
        break;

      case 'systemPrompt':
        sanitized = this.sanitizeSystemPrompt(input as string);
        break;

      case 'fileName':
        sanitized = this.sanitizeFileName(input as string);
        if (sanitized.length === 0 && (input as string).length > 0) {
          errors.push('File name contains only invalid characters');
        }
        break;

      case 'html':
        sanitized = this.sanitizeHtml(input as string);
        break;

      case 'context':
        sanitized = this.sanitizeContext(input as ContextData);
        break;

      default:
        sanitized = this.sanitizeText(input as string);
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized,
    };
  }
}

const inputSanitizer = new InputSanitizer();

export default inputSanitizer;
