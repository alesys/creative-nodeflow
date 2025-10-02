# File Management System for Creative NodeFlow

## Overview

The Creative NodeFlow application now includes a comprehensive file management system that allows users to upload reference materials (images, documents, text files) and use them as context for AI-powered prompt generation. The system features AI-powered file analysis, seamless storage management, and integration with OpenAI's Vision API.

## Features

### 🗂️ File Upload and Storage
- **Drag & Drop Interface**: Intuitive file upload with visual feedback
- **Multiple File Types**: Support for images (JPG, PNG, GIF, WebP), PDFs, text files, and documents
- **Size Limits**: 50MB in development, 100MB in production
- **Environment-Agnostic Storage**: Seamless transition from local development to production

### 🤖 AI-Powered File Analysis
- **Image Analysis**: OpenAI Vision API analyzes images for visual style, elements, and creative direction
- **Text Processing**: Automatic summarization of long documents with key point extraction
- **PDF Support**: Basic text extraction and processing
- **Context Generation**: Creates contextual prompts from file content for AI interactions

### 💾 Smart Storage Architecture
- **Development**: IndexedDB for local browser storage
- **Production**: S3 + Supabase integration via API endpoints
- **Automatic Environment Detection**: No code changes needed when deploying
- **File Validation**: Comprehensive type and size checking

### 🎯 Prompt Integration
- **Context Injection**: Selected files automatically enhance prompts with relevant context
- **Visual Reference**: Images provide style and compositional guidance
- **Content Synthesis**: Text documents supply background information and requirements
- **File Indicators**: Visual markers show which nodes have attached file contexts

## Architecture

### Core Components

#### 1. FileStorageService.js (Main Abstraction Layer)
```javascript
// Environment-agnostic API
await fileStorageService.storeFile(file, fileId);
await fileStorageService.getFile(fileId);
await fileStorageService.listFiles();
await fileStorageService.deleteFile(fileId);
```

**Key Features:**
- Automatic environment detection (development vs production)
- Unified API regardless of storage backend
- Comprehensive error handling and fallbacks

#### 2. LocalDevAdapter.js (Development Storage)
```javascript
// IndexedDB-based local storage
- File storage with object URLs
- Context metadata management  
- Browser-based file validation
- No server dependencies
```

**Benefits:**
- Zero server setup required
- Instant file processing
- Full offline capability
- Perfect for development and testing

#### 3. ProductionAdapter.js (Production Storage)
```javascript
// S3 + Supabase integration
- API endpoint-based file upload
- Scalable cloud storage
- Metadata persistence
- Authentication support
```

**Benefits:**
- Enterprise-grade scaling
- Multi-user support
- Persistent storage across sessions
- Performance optimization

#### 4. FileProcessingService.js (AI Analysis)
```javascript
// Multi-format file analysis
- OpenAI Vision for images
- Text summarization for documents
- PDF text extraction
- Context prompt generation
```

**Capabilities:**
- Image style analysis and creative direction suggestions
- Document summarization with key points
- Automatic context prompt creation
- Fallback processing for unsupported formats

#### 5. FilePanel Component (User Interface)
```jsx
// React component for file management
- Drag & drop file upload
- File search and filtering
- Context preview and editing
- Integration with prompt nodes
```

**Features:**
- Responsive design with collapsible panel
- Real-time upload progress
- File type icons and previews
- Context quality indicators

### Storage Schema

#### IndexedDB Structure (Development)
```javascript
// Database: CreativeNodeFlowDB
stores: {
  files: {
    id: "file_timestamp_random",
    name: "document.pdf", 
    type: "application/pdf",
    size: 1024576,
    blob: Blob,
    uploadDate: "2024-01-15T10:30:00Z"
  },
  fileContexts: {
    fileId: "file_123",
    type: "pdf",
    category: "document", 
    content: { summary, keyPoints, sections },
    searchableContent: "...",
    contextPrompt: "...",
    processingMethod: "ai_summarization"
  },
  projectSettings: {
    key: "value"
  }
}
```

#### Production API Endpoints
```javascript
POST /api/files/upload     // File upload to S3
GET  /api/files/:id        // File retrieval 
GET  /api/files           // List user files
DELETE /api/files/:id     // File deletion
POST /api/contexts        // Store file context
GET  /api/contexts/:fileId // Get file context
```

## Usage Guide

### Basic File Upload
1. **Open File Panel**: Click the folder icon (📁) in the top-right corner
2. **Upload Files**: 
   - Drag files into the drop zone, or
   - Click "Add Files" and select from file browser
3. **AI Processing**: Files are automatically analyzed if OpenAI API is configured
4. **Context Generation**: AI extracts relevant context for prompt enhancement

### Using Files in Prompts
1. **Select Files**: Check files you want to use as context
2. **Send to Prompt**: Click "Send to Prompt" button  
3. **Choose Target Node**: Select prompt nodes to receive context
4. **Enhanced Generation**: Context is automatically included in AI requests

### File Types and Processing

#### Images (JPG, PNG, GIF, WebP, SVG)
- **Analysis**: Visual style, composition, color palette, mood
- **Context**: Creative direction and artistic inspiration
- **Use Case**: Visual reference for image generation and style guidance

#### Text Files (TXT, MD, CSV, JSON, XML)
- **Processing**: Direct content inclusion or AI summarization
- **Context**: Key information and requirements
- **Use Case**: Project briefs, requirements, and specifications

#### PDFs
- **Processing**: Text extraction and summarization
- **Context**: Document structure and key points  
- **Use Case**: Research papers, reports, and documentation

#### Documents (DOC, DOCX, RTF)
- **Processing**: Text extraction and AI analysis
- **Context**: Structured content with key themes
- **Use Case**: Project specifications and creative briefs

## Environment Setup

### Development Setup
```bash
# No additional setup required
# Files stored in browser's IndexedDB
npm start  # FilePanel works immediately
```

### Production Deployment
```javascript
// Set environment variables
REACT_APP_OPENAI_API_KEY=your_openai_key
REACT_APP_API_BASE_URL=https://your-api.com

// Backend API endpoints needed:
POST /api/files/upload
GET  /api/files/:id  
GET  /api/files
DELETE /api/files/:id
POST /api/contexts
GET  /api/contexts/:fileId
```

### OpenAI Configuration
```javascript
// Required for AI file processing
REACT_APP_OPENAI_API_KEY=sk-your-key-here

// Supported models:
- gpt-4o-mini (text + vision)
- gpt-4o (premium text + vision)
```

## API Reference

### FileStorageService Methods
```javascript
// Store a file with optional metadata
await fileStorageService.storeFile(file, fileId, metadata);

// Retrieve file blob and metadata  
const fileData = await fileStorageService.getFile(fileId);

// List all files with filtering
const files = await fileStorageService.listFiles(filter);

// Delete file and associated data
await fileStorageService.deleteFile(fileId);

// Store AI-generated context
await fileStorageService.storeContext(fileId, context);

// Get file's AI context
const context = await fileStorageService.getContext(fileId);
```

### FileProcessingService Methods
```javascript
// Extract context from any file type
const context = await fileProcessingService.extractContext(file);

// Process image with OpenAI Vision
const analysis = await fileProcessingService.processImage(file);

// Summarize text content
const summary = await fileProcessingService.processTextFile(file);
```

## Error Handling

### Common Scenarios
- **File Too Large**: Automatic size validation with user feedback
- **Unsupported Format**: Graceful fallback with basic metadata
- **AI Processing Failure**: Fallback to metadata-only context
- **Storage Errors**: Comprehensive error messages and retry options
- **Network Issues**: Offline capability in development mode

### Error Recovery
```javascript
// Automatic fallbacks at multiple levels:
1. AI processing failure → Basic file context
2. Storage failure → Local temporary storage  
3. Network issues → Cached content serving
4. API errors → Detailed user feedback
```

## Performance Optimization

### File Processing
- **Async Processing**: Non-blocking file upload and AI analysis
- **Progress Indicators**: Real-time feedback during operations
- **Batch Operations**: Efficient handling of multiple files
- **Memory Management**: Proper cleanup of file objects and URLs

### Storage Efficiency
- **Deduplication**: Prevent duplicate file storage
- **Compression**: Optimize file storage size
- **Lazy Loading**: Load file content only when needed
- **Cache Management**: Intelligent caching for frequently accessed files

## Security Considerations

### Development Mode
- Files stored locally in IndexedDB
- No network transmission of file content
- Browser-enforced security policies
- Automatic cleanup on browser data clear

### Production Mode  
- Server-side file validation
- Authentication and authorization
- Encrypted file transmission
- Access control and permissions
- Audit logging for file operations

## Future Enhancements

### Planned Features
- **Collaborative File Sharing**: Multi-user file libraries
- **Advanced AI Analysis**: Custom processing pipelines
- **File Version Control**: Track changes and revisions
- **Batch Processing**: AI analysis of file collections
- **Custom Context Templates**: User-defined context extraction
- **Integration APIs**: Connect with external file services

### Technical Roadmap
- **WebAssembly PDF Processing**: Client-side PDF text extraction
- **Image Preprocessing**: Automatic optimization and enhancement
- **Vector Database Integration**: Semantic file search capabilities
- **Real-time Collaboration**: Live file sharing and editing
- **Advanced Analytics**: File usage patterns and optimization

## Contributing

### Adding New File Types
1. Update `fileValidation.js` with new MIME types
2. Add processing logic in `FileProcessingService.js`
3. Create type-specific analysis methods
4. Add UI icons and indicators
5. Test with sample files

### Extending AI Analysis
1. Add new analysis methods to `FileProcessingService.js`
2. Update context schema in storage adapters
3. Enhance prompt integration logic
4. Test with various file types and content

### Storage Backend Integration
1. Implement new adapter following the interface pattern
2. Add environment detection logic
3. Update configuration documentation  
4. Test failover and error scenarios

---

This file management system provides a robust foundation for AI-enhanced creative workflows, with seamless development-to-production scaling and comprehensive file processing capabilities.