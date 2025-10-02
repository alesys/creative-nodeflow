# Knowledge Base: ReactFlow Creative Prompt Tree

## 📋 Project Overview

This document captures the technical knowledge, insights, and lessons learned during the development of the ReactFlow Creative Prompt Tree application - a visual node-based interface for creating and managing AI prompts with context transmission, file management, and AI processing capabilities.

---

## 🏗️ Architecture & Technology Stack

### Core Technologies
- **ReactFlow**: `@xyflow/react v12.8.6` - Visual node graph library
- **React**: `v19.1.1` - UI framework with hooks architecture
- **CSS Variables**: Dynamic theming system with dark/light mode support
- **IndexedDB**: Browser-native storage for file management
- **OpenAI API**: GPT-5-nano for both text generation and vision processing
- **Google Generative AI**: Gemini integration for additional AI capabilities

### Project Structure
```
creative-nodeflow/
├── src/
│   ├── components/
│   │   ├── nodes/           # ReactFlow node components
│   │   └── panels/          # UI panels (File, Output, etc.)
│   ├── services/
│   │   ├── adapters/        # Storage adapters (development/production)
│   │   ├── database/        # IndexedDB wrapper
│   │   ├── ai/             # AI service integrations
│   │   └── validation/      # File validation utilities
│   ├── utils/              # Utility functions
│   └── styles/             # CSS and theming
```

---

## 🔧 Key Technical Learnings

### 1. ReactFlow Integration

#### Node Management System
- **Custom Node Types**: Implemented specialized nodes for different prompt types
- **Context Transmission**: Developed system for passing data between connected nodes
- **Dynamic Resizing**: Used `NodeResizer` components with proper event handling
- **Edge Management**: Custom edge selection and deletion with proper cleanup

```javascript
// Example: Context transmission between nodes
const handleConnect = useCallback((connection) => {
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);
  
  if (sourceNode?.data?.output && targetNode) {
    // Transmit context from source to target
    updateNodeData(targetNode.id, {
      context: sourceNode.data.output
    });
  }
}, [nodes, updateNodeData]);
```

#### Layout Management
- **Panel Sizing**: Default panel dimensions (320x240px) with responsive scaling
- **Z-Index Management**: Proper layering for new nodes and UI elements
- **Alignment During Processing**: Maintained visual consistency during async operations

### 2. File Storage Architecture

#### Environment-Agnostic Design
Created a flexible storage system that works across development and production environments:

```javascript
// FileStorageService.js - Main abstraction layer
class FileStorageService {
  constructor() {
    this.environment = this.detectEnvironment();
    this.adapter = this.initializeAdapter();
  }
  
  detectEnvironment() {
    return process.env.NODE_ENV === 'production' ? 'production' : 'development';
  }
}
```

#### Storage Adapters
- **LocalDevAdapter**: IndexedDB + local file URLs for development
- **ProductionAdapter**: S3/Supabase integration for production deployment
- **Validation System**: Comprehensive file type and size validation

### 3. IndexedDB Implementation

#### Database Schema
```javascript
// indexedDB.js - Storage structure
const DB_STRUCTURE = {
  files: {
    keyPath: 'id',
    indexes: ['category', 'uploadedAt', 'name']
  },
  contexts: {
    keyPath: 'fileId',
    indexes: ['createdAt', 'type']
  },
  settings: {
    keyPath: 'key'
  }
};
```

#### Critical Bug Fix: Naming Collision
**Problem**: Custom IndexedDB manager imported as `indexedDB` conflicted with browser's global API
```javascript
// ❌ Problematic import
import { indexedDB } from '../database/indexedDB.js';
// Caused: indexedDB.open is not a function

// ✅ Fixed import
import { indexedDB as indexedDBManager } from '../database/indexedDB.js';
```

**Lesson**: Always avoid naming conflicts with browser globals (indexedDB, localStorage, etc.)

### 4. AI Service Integration

#### OpenAI Vision API
- **Image Processing**: Automated analysis of uploaded images for context extraction
- **Context Storage**: Processed results saved to IndexedDB for reuse
- **Error Handling**: Robust fallback mechanisms for API failures

#### Context Management
```javascript
// Example: AI context processing
async saveFileContext(fileId, context) {
  const contextData = {
    fileId,
    content: context.analysis,
    keywords: context.keywords,
    type: context.type,
    createdAt: Date.now()
  };
  
  return await indexedDBManager.saveFileContext(fileId, contextData);
}
```

---

## 🐛 Debugging Techniques & Tools

### 1. Console Logging Strategy
Implemented comprehensive logging system for debugging complex initialization chains:

```javascript
// Strategic logging for debugging
console.log(`[FileStorageService] Environment: ${this.environment}`);
console.log(`[LocalDevAdapter] Initializing with IndexedDB`);
console.log(`[IndexedDB] Database opened successfully`);
```

### 2. Error Tracing Methods
- **Browser DevTools**: Used Network, Console, and Application tabs effectively
- **React DevTools**: Component state inspection and props tracking
- **Step-by-Step Debugging**: Isolated each component in the initialization chain

### 3. Common Issues & Solutions

#### File Storage Initialization Failures
- **Symptom**: "Storage adapter not ready (development)" error
- **Root Cause**: IndexedDB naming collision preventing proper initialization
- **Solution**: Rename imports to avoid browser API conflicts

#### Panel Layout Issues
- **Symptom**: Panels not maintaining proper dimensions during processing
- **Root Cause**: CSS transitions interfering with dynamic content updates
- **Solution**: Implement processing state management with proper CSS classes

#### Context Transmission Problems
- **Symptom**: Data not flowing between connected nodes
- **Root Cause**: Async operations completing after component unmount
- **Solution**: Proper cleanup in useEffect hooks and connection validation

#### OpenAI API Parameter Changes (GPT-5-nano)
- **Symptom 1**: `400 Unsupported parameter: 'max_tokens' is not supported with this model`
- **Symptom 2**: `400 Unsupported value: 'temperature' does not support 0.7 with this model. Only the default (1) value is supported`
- **Root Cause**: GPT-5-nano has very strict parameter limitations compared to other models
- **Solution**: Conditional parameter handling based on model type
  ```javascript
  // GPT-5-nano restrictions
  const apiParams = { model: MODELS.OPENAI, messages: messages };
  if (MODELS.OPENAI !== 'gpt-5-nano') {
    apiParams.max_completion_tokens = LIMITS.MAX_TOKENS;
    apiParams.temperature = 0.7;
  }
  ```
- **Lesson**: Research model-specific API restrictions proactively rather than fixing issues reactively

---

## 🎯 Best Practices Discovered

### 1. Component Architecture
- **Separation of Concerns**: Clear distinction between UI components and service layers
- **Hook Patterns**: Custom hooks for complex state management and side effects
- **Error Boundaries**: Implement React error boundaries for graceful failure handling

### 2. State Management
- **Local State First**: Use React state for UI-specific data
- **Service Layer**: Abstract complex operations into dedicated service classes
- **Async Handling**: Proper Promise chains with error handling at each level

### 3. File Handling
- **Validation First**: Always validate files before processing
- **Memory Management**: Proper cleanup of object URLs and file references
- **Progress Feedback**: User feedback for long-running operations

### 4. Development Workflow
- **Environment Detection**: Robust environment detection for different deployment scenarios
- **Debugging Infrastructure**: Built-in logging that can be toggled for production
- **Incremental Testing**: Test each component individually before integration

---

## 🔮 Future Considerations

### Performance Optimization
- **Lazy Loading**: Implement code splitting for large AI processing modules
- **Caching Strategy**: Cache processed AI contexts to reduce API calls
- **Virtual Scrolling**: For large numbers of files or nodes

### Scalability
- **Worker Threads**: Move heavy processing to web workers
- **Streaming**: Implement streaming for large file uploads
- **Progressive Enhancement**: Graceful degradation for older browsers

### Security
- **File Validation**: Server-side validation in production
- **API Key Management**: Secure storage of API credentials
- **Content Sanitization**: Proper sanitization of user-generated content

### User Experience
- **Offline Support**: Service worker for offline functionality
- **Keyboard Navigation**: Full keyboard accessibility
- **Mobile Responsiveness**: Touch-friendly interface for mobile devices

---

## 📚 Resources & References

### Documentation
- [ReactFlow Documentation](https://reactflow.dev/)
- [IndexedDB API Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [OpenAI API Documentation](https://platform.openai.com/docs)

### Key Code Patterns
- **Service Locator Pattern**: Used in FileStorageService for adapter management
- **Factory Pattern**: Adapter creation based on environment detection
- **Observer Pattern**: Node connection and data flow management

### Performance Monitoring
- **Browser DevTools**: Performance tab for identifying bottlenecks
- **React Profiler**: Component render optimization
- **Network Analysis**: API call optimization and error tracking

---

## 🎉 Project Milestones

### Phase 1: Core ReactFlow Implementation ✅
- Basic node creation and management
- Panel resizing and layout system
- Context transmission between nodes

### Phase 2: File Management System ✅
- IndexedDB integration
- File validation and storage
- Environment-agnostic architecture

### Phase 3: AI Integration ✅
- OpenAI Vision API integration
- Context processing and storage
- Error handling and fallback mechanisms

### Phase 4: Production Readiness 🚧
- Testing and validation (in progress)
- Performance optimization
- Deployment configuration

---

*This knowledge base is a living document that will be updated as the project evolves and new insights are discovered.*