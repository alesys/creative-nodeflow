// File processing service - handles AI analysis of uploaded files
import OpenAIService from './OpenAIService';
import mammoth from 'mammoth';
import logger from '../utils/logger';

export interface ProcessingContent {
  description?: string;
  style?: string;
  elements?: string[];
  useCases?: string[];
  colors?: string[];
  mood?: string;
  composition?: string;
  fullText?: string;
  summary?: string;
  keyPoints?: string[];
  wordCount?: number;
  sections?: string[];
  name?: string;
  type?: string;
  size?: number;
  lastModified?: string;
  format?: string;
  errorMessage?: string;
  pageCount?: string;
  extractedText?: boolean;
}

export interface ProcessedContext {
  type: string;
  category: string;
  content: ProcessingContent;
  summary: string;
  searchableContent: string;
  contextPrompt: string;
  processingMethod: string;
  error?: string;
}

export interface TextSummary {
  summary: string;
  keyPoints: string[];
  sections: string[];
}

export interface ImageAnalysis {
  description: string;
  style: string;
  elements: string[];
  useCases: string[];
  colors?: string[];
  mood?: string;
  composition?: string;
}

export class FileProcessingService {
  private maxContextLength: number;

  constructor() {
    this.maxContextLength = 4000; // Characters for text summarization
  }

  /**
   * Extract context from any file type
   * @param {File} file - File object to process
   * @returns {Promise<Object>} Extracted context data
   */
  async extractContext(file: File): Promise<ProcessedContext> {
    logger.debug(`[FileProcessingService] Processing: ${file.name} (${file.type})`);

    try {
      const fileType = this.determineFileType(file);

      switch (fileType) {
        case 'image':
          return await this.processImage(file);

        case 'text':
          return await this.processTextFile(file);

        case 'pdf':
          return await this.processPDF(file);

        case 'document':
          return await this.processDocument(file);

        default:
          return await this.processGenericFile(file);
      }

    } catch (error) {
      logger.error('[FileProcessingService] Processing failed:', error);
      throw new Error(`Failed to process file: ${(error as Error).message}`);
    }
  }

  /**
   * Process image files using OpenAI Vision
   */
  async processImage(file: File): Promise<ProcessedContext> {
    try {
      const prompt = `Analyze this image for use as creative reference material. Provide:
1. A brief description of the content
2. Visual style characteristics (colors, composition, mood)
3. Key elements that could be referenced in prompts
4. Suggested use cases for creative projects

Format your response as structured data.`;

      const response = await OpenAIService.analyzeImage(file, prompt);

      // Parse the response to extract structured data
      const analysis = this.parseImageAnalysis(response);

      return {
        type: 'image',
        category: 'visual_reference',
        content: {
          description: analysis.description,
          style: analysis.style,
          elements: analysis.elements,
          useCases: analysis.useCases,
          colors: analysis.colors || [],
          mood: analysis.mood || '',
          composition: analysis.composition || ''
        },
        summary: analysis.description,
        searchableContent: `${analysis.description} ${analysis.elements.join(' ')} ${analysis.style}`,
        contextPrompt: `Reference image: ${analysis.description}. Style: ${analysis.style}. Key elements: ${analysis.elements.join(', ')}.`,
        processingMethod: 'openai_vision'
      };

    } catch (error) {
      logger.error('[FileProcessingService] Image processing failed:', error);

      // Fallback: basic image info
      return {
        type: 'image',
        category: 'visual_reference',
        content: {
          description: `Image file: ${file.name}`,
          style: 'Unknown style',
          elements: [],
          useCases: ['Visual reference']
        },
        summary: `Image file: ${file.name} (${this.formatFileSize(file.size)})`,
        searchableContent: file.name,
        contextPrompt: `Reference image: ${file.name}`,
        processingMethod: 'fallback',
        error: (error as Error).message
      };
    }
  }

  /**
   * Process text files directly
   */
  async processTextFile(file: File): Promise<ProcessedContext> {
    try {
      const text = await file.text();

      if (text.length <= this.maxContextLength) {
        // Short text - use directly
        return {
          type: 'text',
          category: 'document',
          content: {
            fullText: text,
            summary: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
            wordCount: text.split(/\s+/).length,
            keyPoints: this.extractKeyPoints(text)
          },
          summary: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          searchableContent: text,
          contextPrompt: `Document content: ${text}`,
          processingMethod: 'direct'
        };
      } else {
        // Long text - summarize with AI
        const summary = await this.summarizeText(text);

        return {
          type: 'text',
          category: 'document',
          content: {
            fullText: text,
            summary: summary.summary,
            keyPoints: summary.keyPoints,
            wordCount: text.split(/\s+/).length,
            sections: summary.sections || []
          },
          summary: summary.summary,
          searchableContent: `${summary.summary} ${summary.keyPoints.join(' ')}`,
          contextPrompt: `Document summary: ${summary.summary}. Key points: ${summary.keyPoints.join(', ')}.`,
          processingMethod: 'openai_summarization'
        };
      }

    } catch (error) {
      logger.error('[FileProcessingService] Text processing failed:', error);

      return {
        type: 'text',
        category: 'document',
        content: {
          summary: `Text file: ${file.name}`,
          wordCount: 0,
          keyPoints: []
        },
        summary: `Text file: ${file.name} (processing failed)`,
        searchableContent: file.name,
        contextPrompt: `Text file: ${file.name}`,
        processingMethod: 'fallback',
        error: (error as Error).message
      };
    }
  }

  /**
   * Process PDF files (basic text extraction)
   */
  async processPDF(file: File): Promise<ProcessedContext> {
    try {
      // For now, we'll use a simple approach
      // In production, you might want to use PDF.js or a backend service

      const text = await this.extractPDFText(file);

      if (text) {
        return await this.processExtractedText(text, 'pdf');
      } else {
        // Fallback: treat as binary file
        return {
          type: 'pdf',
          category: 'document',
          content: {
            summary: `PDF file: ${file.name}`,
            pageCount: 'Unknown',
            extractedText: false
          },
          summary: `PDF document: ${file.name} (${this.formatFileSize(file.size)})`,
          searchableContent: file.name,
          contextPrompt: `PDF document: ${file.name}`,
          processingMethod: 'metadata_only'
        };
      }

    } catch (error) {
      logger.error('[FileProcessingService] PDF processing failed:', error);

      return {
        type: 'pdf',
        category: 'document',
        content: {
          summary: `PDF file: ${file.name}`,
          extractedText: false
        },
        summary: `PDF file: ${file.name} (processing failed)`,
        searchableContent: file.name,
        contextPrompt: `PDF file: ${file.name}`,
        processingMethod: 'fallback',
        error: (error as Error).message
      };
    }
  }

  /**
   * Process other document types
   */
  async processDocument(file: File): Promise<ProcessedContext> {
    try {
      logger.debug('[FileProcessingService] Processing document:', file.name, file.type);

      // For Word documents (.docx), try to extract text
      if (file.name.toLowerCase().endsWith('.docx') || file.type.includes('wordprocessingml')) {
        try {
          logger.debug('[FileProcessingService] Detected DOCX file, attempting extraction...');
          // Read as ArrayBuffer for binary processing
          const arrayBuffer = await file.arrayBuffer();
          logger.debug('[FileProcessingService] ArrayBuffer size:', arrayBuffer.byteLength);

          const text = await this.extractDocxText(arrayBuffer);

          if (text && text.length > 0) {
            logger.debug('[FileProcessingService] Successfully extracted text from DOCX');
            logger.debug('[FileProcessingService] Text length:', text.length);
            logger.debug('[FileProcessingService] Text preview:', text.substring(0, 200));
            return await this.processExtractedText(text, 'docx');
          } else {
            logger.warn('[FileProcessingService] DOCX extraction returned empty or null');
          }
        } catch (docxError) {
          logger.error('[FileProcessingService] DOCX extraction failed:', docxError);
          logger.error('[FileProcessingService] Error stack:', (docxError as Error).stack);
        }
      }

      // Fallback: try to read as plain text (won't work for binary DOCX)
      logger.debug('[FileProcessingService] Falling back to plain text read...');
      const text = await file.text();
      if (text && text.trim().length > 0 && !text.includes('PK\x03\x04')) {
        // Check it's not binary data (DOCX starts with PK which is ZIP signature)
        logger.debug('[FileProcessingService] Extracted as plain text, length:', text.length);
        return await this.processExtractedText(text, file.type);
      }

      throw new Error('No text content extracted - document may be binary format');

    } catch (error) {
      logger.error('[FileProcessingService] Document processing failed:', error);

      return {
        type: 'document',
        category: 'document',
        content: {
          summary: `Document: ${file.name}`,
          format: file.type,
          errorMessage: `Unable to extract text: ${(error as Error).message}. Please save as .txt or paste the content manually.`
        },
        summary: `Document: ${file.name} (${this.formatFileSize(file.size)}) - Text extraction failed`,
        searchableContent: file.name,
        contextPrompt: `Document file "${file.name}" - Text extraction failed. Please paste the document content manually or save as .txt format for automatic extraction.`,
        processingMethod: 'fallback',
        error: (error as Error).message
      };
    }
  }

  /**
   * Process generic/unknown files
   */
  async processGenericFile(file: File): Promise<ProcessedContext> {
    return {
      type: 'file',
      category: 'unknown',
      content: {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      },
      summary: `File: ${file.name} (${file.type || 'unknown type'})`,
      searchableContent: file.name,
      contextPrompt: `File reference: ${file.name}`,
      processingMethod: 'metadata_only'
    };
  }

  // ===========================================
  // HELPER METHODS
  // ===========================================

  /**
   * Determine file type for processing
   */
  determineFileType(file: File): string {
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();

    // Images
    if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName)) {
      return 'image';
    }

    // PDFs
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return 'pdf';
    }

    // Plain text
    if (mimeType.startsWith('text/') || /\.(txt|md|csv|json|xml|yaml|yml)$/i.test(fileName)) {
      return 'text';
    }

    // Documents
    if (/\.(doc|docx|rtf)$/i.test(fileName) || mimeType.includes('document')) {
      return 'document';
    }

    return 'unknown';
  }

  /**
   * Convert file to base64 for API calls
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove data URL prefix and return just base64
        const result = (reader.result as string).split(',')[1];
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Summarize long text using OpenAI
   */
  async summarizeText(text: string): Promise<TextSummary> {
    const prompt = `Summarize this document and extract key information:

Document:
${text.substring(0, 8000)} ${text.length > 8000 ? '...(truncated)' : ''}

Please provide:
1. A concise summary (2-3 sentences)
2. 5-7 key points or takeaways
3. Main topics/sections (if applicable)

Format as JSON with fields: summary, keyPoints, sections`;

    try {
      const response = await OpenAIService.generateResponse(prompt);
      const responseText = response.content;

      // Try to parse as JSON, fallback to structured text
      try {
        return JSON.parse(responseText);
      } catch {
        return this.parseTextSummary(responseText);
      }

    } catch (error) {
      logger.error('AI summarization failed:', error);

      // Fallback: simple text processing
      return {
        summary: text.substring(0, 300) + '...',
        keyPoints: this.extractKeyPoints(text),
        sections: []
      };
    }
  }

  /**
   * Parse image analysis response
   */
  parseImageAnalysis(response: string): ImageAnalysis {
    try {
      // Try to extract structured data from AI response
      const lines = response.split('\n');
      let description = '';
      let style = '';
      const elements: string[] = [];
      const useCases: string[] = [];

      for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.includes('description') || lower.includes('shows') || lower.includes('depicts')) {
          description = line.replace(/^\d+\.\s*/, '').replace(/^description:?\s*/i, '').trim();
        } else if (lower.includes('style') || lower.includes('visual')) {
          style = line.replace(/^\d+\.\s*/, '').replace(/^.*style:?\s*/i, '').trim();
        } else if (lower.includes('elements') || lower.includes('key')) {
          const elementText = line.replace(/^\d+\.\s*/, '').replace(/^.*elements:?\s*/i, '').trim();
          elements.push(...elementText.split(',').map(e => e.trim()));
        } else if (lower.includes('use case') || lower.includes('suggested')) {
          const useCaseText = line.replace(/^\d+\.\s*/, '').replace(/^.*cases?:?\s*/i, '').trim();
          useCases.push(...useCaseText.split(',').map(u => u.trim()));
        }
      }

      return {
        description: description || response.substring(0, 200),
        style: style || 'Visual style analysis needed',
        elements: elements.filter(e => e.length > 0).slice(0, 10),
        useCases: useCases.filter(u => u.length > 0).slice(0, 5)
      };

    } catch (error) {
      return {
        description: response.substring(0, 200),
        style: 'Style analysis needed',
        elements: [],
        useCases: ['Visual reference']
      };
    }
  }

  /**
   * Parse text summary response
   */
  parseTextSummary(response: string | any): TextSummary {
    // Ensure response is a string
    const responseText = typeof response === 'string' ? response : String(response || '');
    const lines = responseText.split('\n').filter(line => line.trim());
    let summary = '';
    const keyPoints: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !summary) {
        summary = trimmed;
      } else if (trimmed.match(/^\d+\.|^[-*•]/)) {
        keyPoints.push(trimmed.replace(/^\d+\.\s*|^[-*•]\s*/, ''));
      }
    }

    return {
      summary: summary || responseText.substring(0, 300),
      keyPoints: keyPoints.slice(0, 7),
      sections: []
    };
  }

  /**
   * Extract key points from text (fallback method)
   */
  extractKeyPoints(text: string): string[] {
    // Simple extraction: look for sentences that might be important
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keyPoints: string[] = [];

    for (const sentence of sentences.slice(0, 10)) {
      const trimmed = sentence.trim();
      if (trimmed.length > 30 && trimmed.length < 200) {
        keyPoints.push(trimmed);
      }
    }

    return keyPoints.slice(0, 5);
  }

  /**
   * Process extracted text (common logic for PDF/documents)
   */
  async processExtractedText(text: string, sourceType: string): Promise<ProcessedContext> {
    if (text.length <= this.maxContextLength) {
      return {
        type: sourceType,
        category: 'document',
        content: {
          fullText: text,
          summary: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
          keyPoints: this.extractKeyPoints(text),
          wordCount: text.split(/\s+/).length
        },
        summary: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        searchableContent: text,
        contextPrompt: `${sourceType.toUpperCase()} content: ${text.substring(0, 500)}`,
        processingMethod: 'text_extraction'
      };
    } else {
      const summary = await this.summarizeText(text);

      return {
        type: sourceType,
        category: 'document',
        content: {
          fullText: text,
          summary: summary.summary,
          keyPoints: summary.keyPoints,
          wordCount: text.split(/\s+/).length,
          sections: summary.sections || []
        },
        summary: summary.summary,
        searchableContent: `${summary.summary} ${summary.keyPoints.join(' ')}`,
        contextPrompt: `${sourceType.toUpperCase()} summary: ${summary.summary}. Key points: ${summary.keyPoints.join(', ')}.`,
        processingMethod: 'ai_summarization'
      };
    }
  }

  /**
   * Basic PDF text extraction (placeholder)
   */
  async extractPDFText(_file: File): Promise<string | null> {
    // This is a placeholder - in production you'd use PDF.js or a backend service
    // For now, return null to trigger fallback processing
    logger.debug('[FileProcessingService] PDF text extraction not implemented - using fallback');
    return null;
  }

  /**
   * Extract text from DOCX files using mammoth.js
   */
  async extractDocxText(arrayBuffer: ArrayBuffer): Promise<string | null> {
    try {
      logger.debug('[FileProcessingService] Extracting text from DOCX using mammoth.js');
      logger.debug('[FileProcessingService] Mammoth version:', mammoth);

      // Use mammoth.js to extract text from DOCX
      const result = await mammoth.extractRawText({ arrayBuffer });

      logger.debug('[FileProcessingService] Mammoth result:', result);

      if (result.value && result.value.length > 0) {
        logger.debug('[FileProcessingService] Successfully extracted text from DOCX');
        logger.debug('[FileProcessingService] Text length:', result.value.length);
        logger.debug('[FileProcessingService] First 100 chars:', result.value.substring(0, 100));

        // Log any messages/warnings from mammoth
        if (result.messages && result.messages.length > 0) {
          logger.debug('[FileProcessingService] Mammoth messages:', result.messages);
        }

        return result.value;
      }

      logger.warn('[FileProcessingService] Mammoth returned empty value');
      logger.warn('[FileProcessingService] Result object:', result);
      return null;

    } catch (error) {
      logger.error('[FileProcessingService] DOCX text extraction error:', error);
      logger.error('[FileProcessingService] Error type:', (error as Error).constructor.name);
      logger.error('[FileProcessingService] Error message:', (error as Error).message);
      logger.error('[FileProcessingService] Error stack:', (error as Error).stack);
      return null;
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const fileProcessingService = new FileProcessingService();
export default fileProcessingService;
