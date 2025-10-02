// File processing service - handles AI analysis of uploaded files
import OpenAIService from './OpenAIService.js';

export class FileProcessingService {
  constructor() {
    this.maxContextLength = 4000; // Characters for text summarization
    this.maxImageSize = 20 * 1024 * 1024; // 20MB max for OpenAI Vision
  }

  /**
   * Extract context from any file type
   * @param {File} file - File object to process
   * @returns {Promise<Object>} Extracted context data
   */
  async extractContext(file) {
    console.log(`[FileProcessingService] Processing: ${file.name} (${file.type})`);
    
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
      console.error('[FileProcessingService] Processing failed:', error);
      throw new Error(`Failed to process file: ${error.message}`);
    }
  }

  /**
   * Process image files using OpenAI Vision
   */
  async processImage(file) {
    try {
      // Convert to base64 for OpenAI Vision API
      const base64 = await this.fileToBase64(file);
      
      const prompt = `Analyze this image for use as creative reference material. Provide:
1. A brief description of the content
2. Visual style characteristics (colors, composition, mood)
3. Key elements that could be referenced in prompts
4. Suggested use cases for creative projects

Format your response as structured data.`;

      const response = await OpenAIService.analyzeImage(base64, prompt);
      
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
      console.error('[FileProcessingService] Image processing failed:', error);
      
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
        error: error.message
      };
    }
  }

  /**
   * Process text files directly
   */
  async processTextFile(file) {
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
      console.error('[FileProcessingService] Text processing failed:', error);
      
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
        error: error.message
      };
    }
  }

  /**
   * Process PDF files (basic text extraction)
   */
  async processPDF(file) {
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
      console.error('[FileProcessingService] PDF processing failed:', error);
      
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
        error: error.message
      };
    }
  }

  /**
   * Process other document types
   */
  async processDocument(file) {
    try {
      // Attempt to read as text
      const text = await file.text();
      return await this.processExtractedText(text, file.type);

    } catch (error) {
      console.error('[FileProcessingService] Document processing failed:', error);
      
      return {
        type: 'document',
        category: 'document',
        content: {
          summary: `Document: ${file.name}`,
          format: file.type
        },
        summary: `Document: ${file.name} (${this.formatFileSize(file.size)})`,
        searchableContent: file.name,
        contextPrompt: `Document: ${file.name}`,
        processingMethod: 'fallback',
        error: error.message
      };
    }
  }

  /**
   * Process generic/unknown files
   */
  async processGenericFile(file) {
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
  determineFileType(file) {
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
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove data URL prefix and return just base64
        const result = reader.result.split(',')[1];
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Summarize long text using OpenAI
   */
  async summarizeText(text) {
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
      
      // Try to parse as JSON, fallback to structured text
      try {
        return JSON.parse(response);
      } catch {
        return this.parseTextSummary(response);
      }

    } catch (error) {
      console.error('AI summarization failed:', error);
      
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
  parseImageAnalysis(response) {
    try {
      // Try to extract structured data from AI response
      const lines = response.split('\n');
      let description = '';
      let style = '';
      const elements = [];
      const useCases = [];

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
  parseTextSummary(response) {
    // Ensure response is a string
    const responseText = typeof response === 'string' ? response : String(response || '');
    const lines = responseText.split('\n').filter(line => line.trim());
    let summary = '';
    const keyPoints = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !summary) {
        summary = trimmed;
      } else if (trimmed.match(/^\d+\.|^[-*•]/)) {
        keyPoints.push(trimmed.replace(/^\d+\.\s*|^[-*•]\s*/, ''));
      }
    }

    return {
      summary: summary || response.substring(0, 300),
      keyPoints: keyPoints.slice(0, 7),
      sections: []
    };
  }

  /**
   * Extract key points from text (fallback method)
   */
  extractKeyPoints(text) {
    // Simple extraction: look for sentences that might be important
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keyPoints = [];

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
  async processExtractedText(text, sourceType) {
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
  async extractPDFText(file) {
    // This is a placeholder - in production you'd use PDF.js or a backend service
    // For now, return null to trigger fallback processing
    console.log('[FileProcessingService] PDF text extraction not implemented - using fallback');
    return null;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
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