# Creative NodeFlow - Implementation Plan for Code Review Fixes

**Plan Created:** 2025-09-30
**Based on:** CODE_REVIEW.md
**Estimated Total Effort:** 2-3 weeks (80-120 hours)
**Priority:** Production Readiness + Code Quality

---

## Table of Contents

1. [Overview](#1-overview)
2. [Phase 1: Critical Fixes](#2-phase-1-critical-fixes-week-1)
3. [Phase 2: Code Quality Improvements](#3-phase-2-code-quality-improvements-week-2)
4. [Phase 3: Polish & Optimization](#4-phase-3-polish--optimization-week-3)
5. [Task Breakdown](#5-detailed-task-breakdown)
6. [Testing Strategy](#6-testing-strategy)
7. [Deployment Checklist](#7-deployment-checklist)
8. [Risk Management](#8-risk-management)

---

## 1. Overview

### 1.1 Goals

**Primary Objectives:**
- ✅ Achieve production-ready security posture
- ✅ Eliminate memory leaks and performance issues
- ✅ Reduce code duplication and improve maintainability
- ✅ Increase test coverage to 80%+
- ✅ Document all public APIs

**Success Criteria:**
- All critical issues resolved
- No security vulnerabilities
- Test coverage > 80%
- Clean code quality metrics
- Production deployment successful

### 1.2 Timeline

```
Week 1: Critical Fixes (Production Blockers)
├── Backend Proxy Setup
├── Memory Leak Fixes
└── Security Hardening

Week 2: Code Quality Improvements
├── Refactor Node Components
├── State Management Fixes
└── Testing Infrastructure

Week 3: Polish & Optimization
├── Performance Optimization
├── Documentation
└── Final Testing & Deployment
```

### 1.3 Resource Requirements

- **Developer Time:** 80-120 hours over 3 weeks
- **Infrastructure:** Backend server/service for API proxy
- **Tools:**
  - Testing: Jest, React Testing Library
  - Code Quality: ESLint, Prettier
  - Backend: Express.js or similar
  - Deployment: Hosting platform (Vercel, Netlify, etc.)

---

## 2. Phase 1: Critical Fixes (Week 1)

**Goal:** Make the application production-ready from a security and stability perspective.
**Duration:** 5 days (40 hours)
**Priority:** 🔴 CRITICAL

### 2.1 Task 1.1: Backend API Proxy Setup

**Issue:** API keys currently exposed in browser
**Risk:** High - Keys can be stolen and abused
**Effort:** 16 hours
**Priority:** P0 - Production Blocker

#### Subtasks:

**1.1.1 Create Backend Server** (4 hours)
- [ ] Initialize Express.js server project
- [ ] Set up project structure
- [ ] Configure environment variables (server-side)
- [ ] Add CORS configuration
- [ ] Set up error handling middleware

**File Structure:**
```
creative-nodeflow-backend/
├── server.js
├── routes/
│   ├── openai.js
│   └── google.js
├── middleware/
│   ├── auth.js
│   └── errorHandler.js
├── .env
└── package.json
```

**Code Example:**
```javascript
// server.js
const express = require('express');
const cors = require('cors');
const openaiRoutes = require('./routes/openai');
const googleRoutes = require('./routes/google');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.use('/api/openai', openaiRoutes);
app.use('/api/google', googleRoutes);

app.listen(process.env.PORT || 3002, () => {
  console.log('Backend server running');
});
```

**1.1.2 Implement OpenAI Proxy Endpoint** (4 hours)
- [ ] Create `/api/openai/chat` endpoint
- [ ] Add request validation
- [ ] Implement rate limiting
- [ ] Add request/response logging
- [ ] Handle errors appropriately

**Code Example:**
```javascript
// routes/openai.js
const express = require('express');
const OpenAI = require('openai');
const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'gpt-4o-mini', max_tokens = 2000, temperature = 0.7 } = req.body;

    // Validate request
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens,
      temperature
    });

    res.json(response);
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**1.1.3 Implement Google AI Proxy Endpoint** (4 hours)
- [ ] Create `/api/google/generate-image` endpoint
- [ ] Create `/api/google/generate-text` endpoint
- [ ] Add request validation
- [ ] Implement rate limiting
- [ ] Handle errors appropriately

**Code Example:**
```javascript
// routes/google.js
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

router.post('/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });
    const result = await model.generateContent([prompt]);
    const response = await result.response;

    res.json(response);
  } catch (error) {
    console.error('Google AI API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-text', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    res.json({ text: response.text() });
  } catch (error) {
    console.error('Google AI API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**1.1.4 Update Frontend Services** (4 hours)
- [ ] Update `OpenAIService.js` to call backend
- [ ] Update `GoogleAIService.js` to call backend
- [ ] Remove `dangerouslyAllowBrowser` flag
- [ ] Update error handling
- [ ] Add request timeout handling

**Code Example:**
```javascript
// services/OpenAIService.js (Updated)
class OpenAIService {
  constructor() {
    this.backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3002';
    this.initialized = true;
  }

  async generateResponse(prompt, systemPrompt = null, context = null) {
    const messages = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    if (context && context.messages) {
      messages.push(...context.messages.slice(-20)); // Context windowing
    }

    messages.push({ role: 'user', content: prompt });

    try {
      const response = await fetch(`${this.backendUrl}/api/openai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate response');
      }

      const data = await response.json();
      const responseContent = data.choices[0].message.content;

      return {
        content: responseContent,
        context: {
          messages: [
            ...messages,
            { role: 'assistant', content: responseContent }
          ]
        }
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  isConfigured() {
    return this.initialized;
  }
}

export default new OpenAIService();
```

**Deliverables:**
- ✅ Backend server running on port 3002
- ✅ OpenAI and Google AI endpoints functional
- ✅ Frontend services updated
- ✅ API keys no longer in browser
- ✅ Rate limiting configured

---

### 2.2 Task 1.2: Fix Memory Leaks

**Issue:** Context messages accumulate without bounds
**Risk:** Medium - Performance degradation over time
**Effort:** 2 hours
**Priority:** P0 - Critical

#### Subtasks:

**1.2.1 Add Constants for Limits** (30 minutes)
- [ ] Create `src/constants/app.js`
- [ ] Define configuration constants
- [ ] Export for use across application

**Code Example:**
```javascript
// constants/app.js
export const LIMITS = {
  MAX_CONTEXT_MESSAGES: 20,  // ~10 turns of conversation
  MAX_IMAGE_SIZE_MB: 5,
  PREVIEW_TEXT_LENGTH: 80,
  PREVIEW_TEXT_LENGTH_LONG: 100,
};

export const TIMING = {
  HANDLER_REGISTRATION_DELAY: 100,
  FOCUS_DELAY: 0,
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
};

export const MODELS = {
  OPENAI: 'gpt-4o-mini',
  GOOGLE_IMAGE: 'gemini-2.5-flash-image-preview',
  GOOGLE_TEXT: 'gemini-2.5-flash',
};

export const API_ERRORS = {
  OPENAI_NOT_CONFIGURED: 'OpenAI service not available. Please check configuration.',
  GOOGLE_NOT_CONFIGURED: 'Google AI service not available. Please check configuration.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
};
```

**1.2.2 Implement Context Windowing in Services** (1 hour)
- [ ] Update `OpenAIService.js` (already done in 1.1.4)
- [ ] Update `GoogleAIService.js` with windowing
- [ ] Add tests for windowing logic

**Code Example:**
```javascript
// services/GoogleAIService.js (Updated section)
import { LIMITS } from '../constants/app';

async generateImage(prompt, context = null) {
  // ... existing code ...

  let fullPrompt = prompt;

  // Add context if provided (with windowing)
  if (context && context.messages) {
    const recentMessages = context.messages.slice(-LIMITS.MAX_CONTEXT_MESSAGES);
    const contextText = recentMessages
      .filter(msg => msg.role === 'assistant')
      .map(msg => msg.content)
      .join('\n');

    if (contextText) {
      fullPrompt = `Context: ${contextText}\n\nImage prompt: ${prompt}`;
    }
  }

  // ... rest of implementation ...

  return {
    content: imageData,
    type: 'image',
    context: {
      messages: [
        ...(context?.messages || []).slice(-LIMITS.MAX_CONTEXT_MESSAGES),
        { role: 'user', content: `Image generation request: ${prompt}` },
        { role: 'assistant', content: `Generated image based on: ${prompt}`, imageData }
      ]
    }
  };
}
```

**1.2.3 Add Context Size Monitoring** (30 minutes)
- [ ] Add warning when context approaching limit
- [ ] Log context size in development
- [ ] Display context message count in UI

**Code Example:**
```javascript
// components/AgentPromptNode.js (Add to context display)
{inputContext && (
  <details className="details-section" style={{ marginTop: 'var(--spacing-sm)' }}>
    <summary className="helper-text summary-clickable">
      Input Context ({inputContext.messages?.length || 0} messages)
      {inputContext.messages?.length > LIMITS.MAX_CONTEXT_MESSAGES * 0.8 && (
        <span style={{ color: 'var(--color-accent-warning)', marginLeft: '8px' }}>
          ⚠️ Context getting large
        </span>
      )}
    </summary>
    {/* ... rest of context display ... */}
  </details>
)}
```

**Deliverables:**
- ✅ Constants file created
- ✅ Context windowing implemented
- ✅ Tests added for windowing
- ✅ UI shows context size warnings

---

### 2.3 Task 1.3: State Management Fixes

**Issue:** Map stored in useState instead of useRef
**Risk:** Low - Potential bugs and React warnings
**Effort:** 1 hour
**Priority:** P1 - High

#### Subtasks:

**1.3.1 Convert Map to Ref** (30 minutes)
- [ ] Update `CreativeNodeFlow.js`
- [ ] Change `useState(new Map())` to `useRef(new Map())`
- [ ] Update all references to use `.current`
- [ ] Test node connections work correctly

**Code Example:**
```javascript
// CreativeNodeFlow.js
// Before:
const [nodeInputHandlers] = useState(new Map());

// After:
const nodeInputHandlers = useRef(new Map());

// Update all usages:
// Before: nodeInputHandlers.set(nodeId, handler)
// After: nodeInputHandlers.current.set(nodeId, handler)

// Before: nodeInputHandlers.get(nodeId)
// After: nodeInputHandlers.current.get(nodeId)

// Before: nodeInputHandlers.clear()
// After: nodeInputHandlers.current.clear()
```

**1.3.2 Fix Dependency Arrays** (30 minutes)
- [ ] Review all `useCallback` and `useMemo` dependencies
- [ ] Destructure `data` props where needed
- [ ] Remove unnecessary dependencies
- [ ] Add ESLint rule for exhaustive-deps

**Code Example:**
```javascript
// Before:
const handleKeyDown = useCallback(async (e) => {
  // ... uses data.onOutput
}, [prompt, systemPrompt, id, data]); // data changes every render!

// After:
const { onOutput } = data;
const handleKeyDown = useCallback(async (e) => {
  // ... uses onOutput
}, [prompt, systemPrompt, id, onOutput]); // Only onOutput
```

**Deliverables:**
- ✅ Map converted to Ref
- ✅ All references updated
- ✅ Dependency arrays optimized
- ✅ ESLint rules configured

---

### 2.4 Task 1.4: Security Hardening

**Effort:** 4 hours
**Priority:** P0 - Critical

#### Subtasks:

**1.4.1 Add Rate Limiting** (2 hours)
- [ ] Implement backend rate limiting
- [ ] Add client-side request throttling
- [ ] Display rate limit feedback to users
- [ ] Handle rate limit errors gracefully

**Code Example:**
```javascript
// Backend middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = apiLimiter;

// Apply to routes:
// app.use('/api/', apiLimiter);
```

**1.4.2 Add Input Validation** (1 hour)
- [ ] Validate prompt lengths
- [ ] Sanitize inputs (though APIs do this)
- [ ] Add max request size limits
- [ ] Validate message structure

**Code Example:**
```javascript
// Backend validation
const validateChatRequest = (req, res, next) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages must be an array' });
  }

  if (messages.length > 50) {
    return res.status(400).json({ error: 'Too many messages' });
  }

  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return res.status(400).json({ error: 'Invalid message format' });
    }
    if (msg.content.length > 10000) {
      return res.status(400).json({ error: 'Message too long' });
    }
  }

  next();
};
```

**1.4.3 Add Environment Validation** (1 hour)
- [ ] Validate backend environment variables on startup
- [ ] Add health check endpoint
- [ ] Implement graceful shutdown
- [ ] Add startup logging

**Code Example:**
```javascript
// Backend server.js
function validateEnvironment() {
  const required = ['OPENAI_API_KEY', 'GOOGLE_API_KEY', 'FRONTEND_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    process.exit(1);
  }

  console.log('✅ Environment validated');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

validateEnvironment();
```

**Deliverables:**
- ✅ Rate limiting active
- ✅ Input validation implemented
- ✅ Environment validation on startup
- ✅ Health check endpoint available

---

## 3. Phase 2: Code Quality Improvements (Week 2)

**Goal:** Reduce technical debt and improve maintainability
**Duration:** 5 days (40 hours)
**Priority:** 🟡 HIGH

### 3.1 Task 2.1: Extract Custom Hooks

**Issue:** Code duplication across node components
**Risk:** Low - Maintenance burden
**Effort:** 8 hours
**Priority:** P1 - High

#### Subtasks:

**2.1.1 Create useNodeEditor Hook** (2 hours)
- [ ] Create `src/hooks/useNodeEditor.js`
- [ ] Extract editing state logic
- [ ] Extract textarea management
- [ ] Add JSDoc documentation

**Code Example:**
```javascript
// hooks/useNodeEditor.js
import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for managing node editor state
 * @param {string} initialPrompt - Initial prompt value
 * @returns {Object} Editor state and handlers
 */
export const useNodeEditor = (initialPrompt = '') => {
  const [isEditing, setIsEditing] = useState(true);
  const [prompt, setPrompt] = useState(initialPrompt);
  const textareaRef = useRef(null);

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  return {
    isEditing,
    setIsEditing,
    prompt,
    setPrompt,
    textareaRef,
    handleEditClick,
    handleBlur
  };
};
```

**2.1.2 Create useNodeProcessing Hook** (2 hours)
- [ ] Create `src/hooks/useNodeProcessing.js`
- [ ] Extract processing state
- [ ] Extract error handling
- [ ] Add JSDoc documentation

**Code Example:**
```javascript
// hooks/useNodeProcessing.js
import { useState, useCallback } from 'react';

/**
 * Custom hook for managing node processing state
 * @returns {Object} Processing state and handlers
 */
export const useNodeProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleProcess = useCallback(async (processFn) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await processFn();
      return result;
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isProcessing,
    error,
    handleProcess,
    clearError,
    setError
  };
};
```

**2.1.3 Create useNodeContext Hook** (2 hours)
- [ ] Create `src/hooks/useNodeContext.js`
- [ ] Extract context management
- [ ] Add context size tracking
- [ ] Add JSDoc documentation

**Code Example:**
```javascript
// hooks/useNodeContext.js
import { useState, useEffect, useCallback } from 'react';
import { LIMITS } from '../constants/app';

/**
 * Custom hook for managing node context and input handling
 * @param {Function} onReceiveInput - Callback to register input handler
 * @returns {Object} Context state and handlers
 */
export const useNodeContext = (onReceiveInput) => {
  const [inputContext, setInputContext] = useState(null);
  const [hasReceivedInput, setHasReceivedInput] = useState(false);

  useEffect(() => {
    if (onReceiveInput) {
      onReceiveInput((inputData) => {
        setInputContext(inputData.context);
        setHasReceivedInput(true);
      });
    }
  }, [onReceiveInput]);

  const getContextSize = useCallback(() => {
    return inputContext?.messages?.length || 0;
  }, [inputContext]);

  const isContextLarge = useCallback(() => {
    return getContextSize() > LIMITS.MAX_CONTEXT_MESSAGES * 0.8;
  }, [getContextSize]);

  return {
    inputContext,
    hasReceivedInput,
    setInputContext,
    getContextSize,
    isContextLarge
  };
};
```

**2.1.4 Refactor Node Components** (2 hours)
- [ ] Update `StartingPromptNode.js`
- [ ] Update `AgentPromptNode.js`
- [ ] Update `ImagePromptNode.js`
- [ ] Test all node functionality

**Code Example:**
```javascript
// components/StartingPromptNode.js (Refactored)
import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Handle, Position } from '@xyflow/react';
import OpenAIService from '../services/OpenAIService';
import { useNodeEditor } from '../hooks/useNodeEditor';
import { useNodeProcessing } from '../hooks/useNodeProcessing';

const StartingPromptNode = ({ data, id }) => {
  const { isEditing, setIsEditing, prompt, setPrompt, textareaRef, handleEditClick }
    = useNodeEditor(data.prompt);
  const { isProcessing, error, handleProcess } = useNodeProcessing();

  const systemPrompt = data.systemPrompt ||
    process.env.REACT_APP_DEFAULT_SYSTEM_PROMPT ||
    'You are a helpful AI assistant.';

  const { onOutput } = data;

  const handleKeyDown = useCallback(async (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(false);

      if (!prompt.trim()) {
        return;
      }

      await handleProcess(async () => {
        if (!OpenAIService.isConfigured()) {
          throw new Error('OpenAI service not available. Please check configuration.');
        }

        const response = await OpenAIService.generateResponse(prompt, systemPrompt);

        if (onOutput) {
          onOutput({
            nodeId: id,
            content: response.content,
            context: response.context,
            type: 'text'
          });
        }
      });
    }
  }, [prompt, systemPrompt, id, onOutput, setIsEditing, handleProcess]);

  return (
    <div className={`node-panel ${isProcessing ? 'processing' : ''} ${error ? 'error' : ''}`}>
      <div className="node-header text-positive">
        Starting Prompt
      </div>

      <div className="node-body">
        {isEditing ? (
          <div>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseMove={(e) => e.stopPropagation()}
              className="nodrag textarea-control positive"
              placeholder="Enter your prompt here... Press Ctrl+Enter to execute"
            />
            <div className="helper-text helper-text-margined">
              Press Ctrl+Enter to execute • Click outside to preview
            </div>
          </div>
        ) : (
          <div
            onClick={handleEditClick}
            className="textarea-control positive"
            style={{ cursor: 'pointer', minHeight: 'var(--textarea-min-height)' }}
          >
            {prompt ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {prompt}
              </ReactMarkdown>
            ) : (
              <span className="helper-text helper-text-italic">
                Click to add prompt...
              </span>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="parameter-control" style={{ borderBottom: 'none', marginTop: 'var(--spacing-sm)' }}>
            <span className="control-label" style={{ color: 'var(--color-accent-primary)' }}>
              🔄 Processing with OpenAI...
            </span>
          </div>
        )}

        {error && (
          <div className="parameter-control" style={{ borderBottom: 'none', marginTop: 'var(--spacing-sm)' }}>
            <span className="control-label" style={{ color: 'var(--color-accent-error)' }}>
              ⚠️ {error}
            </span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="react-flow__handle"
      />
    </div>
  );
};

export default StartingPromptNode;
```

**Deliverables:**
- ✅ Three custom hooks created
- ✅ All node components refactored
- ✅ Code duplication reduced by ~40%
- ✅ JSDoc documentation added

---

### 3.2 Task 2.2: Add Comprehensive Testing

**Effort:** 12 hours
**Priority:** P1 - High

#### Subtasks:

**2.2.1 Set Up Testing Infrastructure** (2 hours)
- [ ] Configure Jest coverage
- [ ] Add testing utilities
- [ ] Set up test data factories
- [ ] Configure CI test running

**Code Example:**
```javascript
// package.json (Add scripts)
{
  "scripts": {
    "test": "react-scripts test",
    "test:coverage": "react-scripts test --coverage --watchAll=false",
    "test:ci": "CI=true npm run test:coverage"
  },
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.{js,jsx}",
      "!src/index.js",
      "!src/reportWebVitals.js",
      "!src/**/*.test.{js,jsx}"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

**2.2.2 Write Service Tests** (4 hours)
- [ ] Test `OpenAIService.js`
- [ ] Test `GoogleAIService.js`
- [ ] Mock API calls
- [ ] Test error handling
- [ ] Test context windowing

**Code Example:**
```javascript
// tests/services/OpenAIService.test.js
import OpenAIService from '../../services/OpenAIService';
import { LIMITS } from '../../constants/app';

// Mock fetch
global.fetch = jest.fn();

describe('OpenAIService', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('generateResponse', () => {
    it('should generate a response successfully', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Test response' } }]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await OpenAIService.generateResponse('Test prompt');

      expect(result.content).toBe('Test response');
      expect(result.context.messages).toBeDefined();
    });

    it('should limit context messages to MAX_CONTEXT_MESSAGES', async () => {
      const longContext = {
        messages: Array(50).fill().map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`
        }))
      };

      const mockResponse = {
        choices: [{ message: { content: 'Response' } }]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await OpenAIService.generateResponse(
        'Test',
        null,
        longContext
      );

      // Should include: system message (if any) + windowed context + user message + assistant response
      expect(result.context.messages.length).toBeLessThanOrEqual(
        LIMITS.MAX_CONTEXT_MESSAGES + 2
      );
    });

    it('should handle API errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'API Error' })
      });

      await expect(
        OpenAIService.generateResponse('Test')
      ).rejects.toThrow('API Error');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        OpenAIService.generateResponse('Test')
      ).rejects.toThrow();
    });
  });

  describe('isConfigured', () => {
    it('should return true when initialized', () => {
      expect(OpenAIService.isConfigured()).toBe(true);
    });
  });
});
```

**2.2.3 Write Hook Tests** (3 hours)
- [ ] Test `useNodeEditor`
- [ ] Test `useNodeProcessing`
- [ ] Test `useNodeContext`
- [ ] Use React Testing Library hooks utilities

**Code Example:**
```javascript
// tests/hooks/useNodeEditor.test.js
import { renderHook, act } from '@testing-library/react';
import { useNodeEditor } from '../../hooks/useNodeEditor';

describe('useNodeEditor', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useNodeEditor());

    expect(result.current.isEditing).toBe(true);
    expect(result.current.prompt).toBe('');
    expect(result.current.textareaRef.current).toBeNull();
  });

  it('should initialize with provided prompt', () => {
    const { result } = renderHook(() => useNodeEditor('Initial prompt'));

    expect(result.current.prompt).toBe('Initial prompt');
  });

  it('should update prompt when setPrompt is called', () => {
    const { result } = renderHook(() => useNodeEditor());

    act(() => {
      result.current.setPrompt('New prompt');
    });

    expect(result.current.prompt).toBe('New prompt');
  });

  it('should toggle editing mode', () => {
    const { result } = renderHook(() => useNodeEditor());

    act(() => {
      result.current.setIsEditing(false);
    });

    expect(result.current.isEditing).toBe(false);

    act(() => {
      result.current.handleEditClick();
    });

    expect(result.current.isEditing).toBe(true);
  });
});
```

**2.2.4 Write Component Tests** (3 hours)
- [ ] Test node components
- [ ] Test interactions
- [ ] Test error states
- [ ] Test context flow

**Code Example:**
```javascript
// tests/components/StartingPromptNode.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StartingPromptNode from '../../components/StartingPromptNode';
import OpenAIService from '../../services/OpenAIService';

jest.mock('../../services/OpenAIService');

describe('StartingPromptNode', () => {
  const mockData = {
    prompt: '',
    systemPrompt: 'Test system prompt',
    onOutput: jest.fn(),
    onReceiveInput: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    OpenAIService.isConfigured.mockReturnValue(true);
  });

  it('should render the node', () => {
    render(<StartingPromptNode data={mockData} id="test-1" />);

    expect(screen.getByText('Starting Prompt')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your prompt/)).toBeInTheDocument();
  });

  it('should update prompt on input', async () => {
    render(<StartingPromptNode data={mockData} id="test-1" />);

    const textarea = screen.getByPlaceholderText(/Enter your prompt/);
    await userEvent.type(textarea, 'Test prompt');

    expect(textarea.value).toBe('Test prompt');
  });

  it('should call OpenAI service on Ctrl+Enter', async () => {
    OpenAIService.generateResponse.mockResolvedValue({
      content: 'AI response',
      context: { messages: [] }
    });

    render(<StartingPromptNode data={mockData} id="test-1" />);

    const textarea = screen.getByPlaceholderText(/Enter your prompt/);
    await userEvent.type(textarea, 'Test prompt');

    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    await waitFor(() => {
      expect(OpenAIService.generateResponse).toHaveBeenCalledWith(
        'Test prompt',
        'Test system prompt'
      );
    });
  });

  it('should display error when service fails', async () => {
    OpenAIService.generateResponse.mockRejectedValue(
      new Error('API Error')
    );

    render(<StartingPromptNode data={mockData} id="test-1" />);

    const textarea = screen.getByPlaceholderText(/Enter your prompt/);
    await userEvent.type(textarea, 'Test prompt');

    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByText(/⚠️ API Error/)).toBeInTheDocument();
    });
  });

  it('should show processing state', async () => {
    OpenAIService.generateResponse.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<StartingPromptNode data={mockData} id="test-1" />);

    const textarea = screen.getByPlaceholderText(/Enter your prompt/);
    await userEvent.type(textarea, 'Test prompt');

    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(screen.getByText(/Processing with OpenAI/)).toBeInTheDocument();
  });
});
```

**Deliverables:**
- ✅ Test coverage > 80%
- ✅ All services tested
- ✅ All hooks tested
- ✅ Critical components tested
- ✅ CI pipeline configured

---

### 3.3 Task 2.3: Code Quality Tools

**Effort:** 4 hours
**Priority:** P2 - Medium

#### Subtasks:

**2.3.1 Set Up ESLint** (2 hours)
- [ ] Configure ESLint rules
- [ ] Add React-specific rules
- [ ] Configure Prettier integration
- [ ] Add pre-commit hooks

**Code Example:**
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'react-app',
    'react-app/jest',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

**2.3.2 Add Git Hooks** (1 hour)
- [ ] Install husky
- [ ] Add pre-commit hook for linting
- [ ] Add pre-push hook for tests
- [ ] Document in README

**Code Example:**
```json
// package.json
{
  "scripts": {
    "prepare": "husky install",
    "lint": "eslint src --ext .js,.jsx",
    "lint:fix": "eslint src --ext .js,.jsx --fix",
    "format": "prettier --write \"src/**/*.{js,jsx,json,css,md}\""
  },
  "devDependencies": {
    "husky": "^8.0.0",
    "lint-staged": "^13.0.0",
    "prettier": "^3.0.0"
  },
  "lint-staged": {
    "src/**/*.{js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "src/**/*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

```bash
# .husky/pre-push
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run test:ci
```

**2.3.3 Add Code Documentation** (1 hour)
- [ ] Add JSDoc to all public functions
- [ ] Generate API documentation
- [ ] Update README with code guidelines

**Code Example:**
```javascript
// Example JSDoc template
/**
 * Generates an AI response using OpenAI's GPT model
 *
 * @param {string} prompt - The user's prompt text
 * @param {string|null} [systemPrompt=null] - Optional system instructions
 * @param {Object|null} [context=null] - Previous conversation context
 * @param {Array<Object>} context.messages - Array of previous messages
 *
 * @returns {Promise<Object>} Response object
 * @returns {string} response.content - The generated content
 * @returns {Object} response.context - Updated context with new messages
 *
 * @throws {Error} If service is not configured or API request fails
 *
 * @example
 * const response = await OpenAIService.generateResponse(
 *   'Tell me a joke',
 *   'You are a comedian',
 *   { messages: [] }
 * );
 * console.log(response.content); // The joke
 */
```

**Deliverables:**
- ✅ ESLint configured and passing
- ✅ Prettier configured
- ✅ Git hooks active
- ✅ JSDoc on all public APIs

---

### 3.4 Task 2.4: Performance Optimization

**Effort:** 6 hours
**Priority:** P2 - Medium

#### Subtasks:

**2.4.1 Optimize DOM Queries** (2 hours)
- [ ] Replace `querySelectorAll` in useEffect
- [ ] Use ReactFlow's built-in handle styling
- [ ] Add refs for direct DOM access where needed

**Code Example:**
```javascript
// CreativeNodeFlow.js (Remove DOM queries)
// Before:
useEffect(() => {
  document.querySelectorAll('.react-flow__handle').forEach(handle => {
    handle.classList.remove('connected-input', 'connected-output');
  });
  // ...
}, [edges]);

// After: Use ReactFlow's connection status
// Or use CSS-only solution with adjacency selectors
// Or track connection state in node data
```

**2.4.2 Optimize Re-renders** (2 hours)
- [ ] Add React.memo to components
- [ ] Optimize callback dependencies
- [ ] Use useMemo for expensive calculations
- [ ] Profile with React DevTools

**Code Example:**
```javascript
// Optimize registerNodeHandlers
const registerNodeHandlers = useCallback((nodeId) => {
  return {
    onOutput: handleNodeOutput,
    onReceiveInput: (handler) => nodeInputHandlers.current.set(nodeId, handler)
  };
}, [handleNodeOutput]); // Removed nodeInputHandlers from deps

// Memoize node types
const nodeTypes = useMemo(() => ({
  startingPrompt: React.memo(StartingPromptNode),
  agentPrompt: React.memo(AgentPromptNode),
  imagePrompt: React.memo(ImagePromptNode),
  customOutput: React.memo(OutputNode),
}), []);
```

**2.4.3 Image Optimization** (2 hours)
- [ ] Implement image compression
- [ ] Convert base64 to object URLs
- [ ] Add cleanup for object URLs
- [ ] Add lazy loading for images

**Code Example:**
```javascript
// utils/imageUtils.js
export const base64ToObjectURL = (base64String) => {
  // Extract base64 data
  const parts = base64String.split(',');
  const contentType = parts[0].split(':')[1].split(';')[0];
  const base64Data = parts[1];

  // Convert to binary
  const binary = atob(base64Data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }

  // Create blob and object URL
  const blob = new Blob([array], { type: contentType });
  return URL.createObjectURL(blob);
};

// In component:
useEffect(() => {
  if (imageData && imageData.startsWith('data:')) {
    const objectUrl = base64ToObjectURL(imageData);
    setImageSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }
}, [imageData]);
```

**Deliverables:**
- ✅ DOM queries optimized
- ✅ Re-renders minimized
- ✅ Image handling optimized
- ✅ Performance profiling done

---

## 4. Phase 3: Polish & Optimization (Week 3)

**Goal:** Final polish, documentation, and deployment
**Duration:** 5 days (40 hours)
**Priority:** 🟢 MEDIUM

### 4.1 Task 3.1: Enhanced Error Handling

**Effort:** 4 hours
**Priority:** P2 - Medium

#### Subtasks:

**4.1.1 Implement Global Error Boundary** (2 hours)
- [ ] Create enhanced error boundary
- [ ] Add error reporting
- [ ] Add retry functionality
- [ ] Style error UI

**4.1.2 Add Toast Notifications** (2 hours)
- [ ] Install/create toast system
- [ ] Add success notifications
- [ ] Add error notifications
- [ ] Add info notifications

---

### 4.2 Task 3.2: User Experience Enhancements

**Effort:** 8 hours
**Priority:** P2 - Medium

#### Subtasks:

**4.2.1 Add Loading States** (2 hours)
- [ ] Add skeleton loaders
- [ ] Add progress indicators
- [ ] Add spinners for async operations

**4.2.2 Add Keyboard Shortcuts** (3 hours)
- [ ] Implement shortcut system
- [ ] Add node creation shortcuts
- [ ] Add canvas shortcuts
- [ ] Display shortcut help

**4.2.3 Add Save/Load Workflows** (3 hours)
- [ ] Implement local storage save
- [ ] Add export to JSON
- [ ] Add import from JSON
- [ ] Add auto-save

---

### 4.3 Task 3.3: Documentation

**Effort:** 8 hours
**Priority:** P1 - High

#### Subtasks:

**4.3.1 Update README** (2 hours)
- [ ] Update setup instructions for backend
- [ ] Add architecture diagram
- [ ] Update troubleshooting section
- [ ] Add deployment instructions

**4.3.2 Create API Documentation** (3 hours)
- [ ] Document backend API endpoints
- [ ] Add request/response examples
- [ ] Document error codes
- [ ] Add Postman collection

**4.3.3 Create Developer Guide** (3 hours)
- [ ] Write contributing guidelines
- [ ] Document code structure
- [ ] Add development workflow guide
- [ ] Document testing strategy

---

### 4.4 Task 3.4: Deployment Preparation

**Effort:** 12 hours
**Priority:** P0 - Critical

#### Subtasks:

**4.4.1 Backend Deployment** (4 hours)
- [ ] Set up hosting (Railway, Render, etc.)
- [ ] Configure environment variables
- [ ] Set up monitoring
- [ ] Configure logging

**4.4.2 Frontend Deployment** (4 hours)
- [ ] Set up hosting (Vercel, Netlify)
- [ ] Configure build settings
- [ ] Set environment variables
- [ ] Configure domain

**4.4.3 CI/CD Pipeline** (4 hours)
- [ ] Set up GitHub Actions
- [ ] Add automated tests
- [ ] Add automated deployment
- [ ] Add status badges

**Code Example:**
```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linter
      run: npm run lint

    - name: Run tests
      run: npm run test:ci

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/coverage-final.json

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
```

**Deliverables:**
- ✅ Backend deployed and accessible
- ✅ Frontend deployed and accessible
- ✅ CI/CD pipeline active
- ✅ Monitoring configured

---

## 5. Detailed Task Breakdown

### Task Priority Matrix

| Priority | Tasks | Total Hours |
|----------|-------|-------------|
| P0 (Critical) | Backend Proxy, Memory Leaks, Security, Deployment | 37 hours |
| P1 (High) | State Fixes, Custom Hooks, Testing, Documentation | 29 hours |
| P2 (Medium) | Code Quality, Performance, UX Enhancements | 34 hours |

### Weekly Schedule

**Week 1 (40 hours):**
- Monday: Backend Proxy Setup (8h)
- Tuesday: Backend Proxy Implementation (8h)
- Wednesday: Memory Leaks + State Fixes (8h)
- Thursday: Security Hardening (8h)
- Friday: Testing & Buffer (8h)

**Week 2 (40 hours):**
- Monday: Custom Hooks (8h)
- Tuesday: Refactor Components (8h)
- Wednesday: Write Tests (8h)
- Thursday: More Tests + Code Quality (8h)
- Friday: Performance Optimization (8h)

**Week 3 (40 hours):**
- Monday: Error Handling + UX (8h)
- Tuesday: More UX + Save/Load (8h)
- Wednesday: Documentation (8h)
- Thursday: Deployment Prep (8h)
- Friday: Deployment + Final Testing (8h)

---

## 6. Testing Strategy

### 6.1 Unit Tests
- All services (OpenAI, Google AI)
- All custom hooks
- Utility functions
- Constants and configuration

### 6.2 Integration Tests
- Node connections and data flow
- Context propagation
- Auto-output creation
- Error handling across components

### 6.3 E2E Tests (Optional - Phase 4)
- Complete workflow creation
- Multi-node chains
- Image generation flow
- Save/load functionality

### 6.4 Coverage Goals
- Overall: 80%+
- Services: 90%+
- Hooks: 85%+
- Components: 75%+

---

## 7. Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Security audit passed
- [ ] Performance benchmarks met

### Backend Deployment
- [ ] Server running and accessible
- [ ] Health check endpoint responding
- [ ] API endpoints functional
- [ ] Rate limiting active
- [ ] Logging configured
- [ ] Error tracking setup (Sentry, etc.)
- [ ] SSL certificate installed
- [ ] CORS configured correctly

### Frontend Deployment
- [ ] Build successful
- [ ] Environment variables set
- [ ] Backend URL configured
- [ ] Assets optimized
- [ ] Service worker configured (if PWA)
- [ ] Analytics setup (optional)
- [ ] Domain configured

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Monitoring active
- [ ] Backup strategy in place
- [ ] Rollback plan tested
- [ ] Documentation updated
- [ ] Team trained

---

## 8. Risk Management

### High-Risk Areas

**1. Backend Migration**
- **Risk:** Breaking changes in API structure
- **Mitigation:** Comprehensive testing, gradual rollout
- **Rollback:** Keep old services as fallback temporarily

**2. State Management Refactor**
- **Risk:** Broken node connections
- **Mitigation:** Extensive integration tests
- **Rollback:** Git revert available

**3. Deployment Issues**
- **Risk:** Service downtime
- **Mitigation:** Staged deployment, health checks
- **Rollback:** Quick rollback via hosting platform

### Mitigation Strategies

1. **Feature Flags**
   - Use flags for major changes
   - Enable for testing first
   - Gradual rollout to users

2. **Staging Environment**
   - Test all changes in staging
   - Mirror production setup
   - Run full test suite

3. **Monitoring & Alerts**
   - Set up error tracking
   - Monitor API usage
   - Alert on failures

4. **Backup & Recovery**
   - Daily backups
   - Test restore procedures
   - Document recovery steps

---

## 9. Success Metrics

### Technical Metrics
- ✅ Test coverage > 80%
- ✅ Zero critical security issues
- ✅ API response time < 2s (95th percentile)
- ✅ Zero memory leaks
- ✅ Build size < 1MB (gzipped)

### Quality Metrics
- ✅ ESLint score: 0 errors, < 10 warnings
- ✅ Lighthouse score > 90
- ✅ No console errors in production
- ✅ All documentation up to date

### Business Metrics
- ✅ 99% uptime
- ✅ Zero data loss incidents
- ✅ Successful production deployment
- ✅ Positive user feedback

---

## 10. Post-Implementation Review

### After Each Phase

**Review Checklist:**
- [ ] All tasks completed?
- [ ] Tests passing?
- [ ] Documentation updated?
- [ ] Code reviewed?
- [ ] Performance acceptable?
- [ ] Any blockers encountered?
- [ ] Lessons learned documented?

**Retrospective Questions:**
1. What went well?
2. What could be improved?
3. What surprised us?
4. What should we do differently?

---

## 11. Future Enhancements (Phase 4+)

After completing the core implementation plan:

### Short-term (Next Quarter)
- [ ] Undo/Redo functionality
- [ ] Node templates
- [ ] Workflow sharing
- [ ] Advanced error recovery
- [ ] Better mobile support

### Long-term (Future)
- [ ] Real-time collaboration
- [ ] Cloud workflow storage
- [ ] More AI providers
- [ ] Visual workflow debugger
- [ ] Workflow marketplace

---

## 12. Resources & References

### Documentation
- [React Best Practices](https://react.dev/)
- [ReactFlow Documentation](https://reactflow.dev/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Google Gemini API](https://ai.google.dev/docs)

### Tools
- [Jest Testing](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)

### Deployment
- [Vercel](https://vercel.com/)
- [Railway](https://railway.app/)
- [Render](https://render.com/)

---

## Appendix A: Quick Reference

### Command Cheatsheet

```bash
# Development
npm start              # Start dev server
npm run validate-env   # Validate environment
npm run dev:debug      # Start with validation

# Testing
npm test               # Run tests (watch mode)
npm run test:coverage  # Coverage report
npm run test:ci        # CI mode

# Code Quality
npm run lint           # Run linter
npm run lint:fix       # Fix lint issues
npm run format         # Format with Prettier

# Build
npm run build          # Production build
npm run eject          # Eject from CRA (careful!)

# Backend
cd backend
npm start              # Start backend server
npm run dev            # Start with nodemon
npm test               # Run backend tests
```

### Environment Variables Reference

**Frontend (.env):**
```bash
REACT_APP_BACKEND_URL=http://localhost:3002
REACT_APP_DEFAULT_SYSTEM_PROMPT=You are a helpful AI assistant.
```

**Backend (.env):**
```bash
PORT=3002
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
NODE_ENV=production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## Appendix B: Contact & Support

**Project Lead:** [Your Name]
**Repository:** [GitHub URL]
**Documentation:** [Docs URL]
**Support:** [Email/Slack/Discord]

---

**Document Version:** 1.0
**Last Updated:** 2025-09-30
**Next Review:** After Phase 1 completion
