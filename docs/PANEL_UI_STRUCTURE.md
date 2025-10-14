# Panel UI Structure - Creative NodeFlow

## Overview

The application uses a **component-based architecture** with a **BaseNode** wrapper that provides consistent structure across all node types.

---

## UI Component Hierarchy

```
BaseNode (Wrapper)
├── NodeResizer (ReactFlow native)
├── NodeHeader
├── NodeStatusBar
├── NodeConnectors (Input/Output Handles)
└── NodeBody
    └── Children (Node-specific content)
```

---

## Art Director Panel (Image Generation)

### Full UI Structure

```tsx
<BaseNode>
  {/* 1. HEADER */}
  <NodeHeader 
    title="Art Director"
    icon="🖼️"
    variant="loader"
  />

  {/* 2. STATUS BAR */}
  <NodeStatusBar
    status={isProcessing ? 'processing' : 'success/idle'}
    message="Generating image with Nano Banana..." OR "Context received"
    showProgress={isProcessing}
  />

  {/* 3. CONNECTORS */}
  <NodeConnectors>
    {/* Input Handles */}
    <Handle id="input-text" type="text" position="top" />
    <Handle id="input-image" type="image" position="bottom" />
    
    {/* Output Handle */}
    <Handle id="output-image" type="image" position="middle" />
  </NodeConnectors>

  {/* 4. BODY CONTENT */}
  <NodeBody>
    {/* A. Prompt Textarea */}
    {isEditing ? (
      <textarea
        placeholder="Describe the image you want to generate..."
        onKeyDown={Ctrl+Enter to execute}
      />
    ) : (
      <div onClick={handleEditClick}>
        <ReactMarkdown>{prompt}</ReactMarkdown>
      </div>
    )}

    {/* B. Context Display (Collapsible) */}
    <details>
      <summary>Input Context (will influence generation)</summary>
      <div>
        {/* Shows last 2 messages from connected nodes */}
        <div>role: [text/image preview]</div>
        <div>role: [text/image preview]</div>
      </div>
    </details>

    {/* C. Aspect Ratio Selector */}
    <div className="parameter-control">
      <span>Aspect Ratio</span>
      <select value={aspectRatio}>
        <option value="9:16">9:16 (Portrait)</option>
        <option value="1:1">1:1 (Square)</option>
        <option value="4:5">4:5</option>
        <option value="16:9">16:9 (Landscape)</option>
        <option value="4:3">4:3</option>
        <option value="3:4">3:4</option>
        <option value="3:2">3:2</option>
        <option value="2:3">2:3</option>
        <option value="5:4">5:4</option>
      </select>
    </div>

    {/* D. Status Area */}
    <div className="status-area">
      {isProcessing && "Generating image with Nano Banana..."}
      {error && <ErrorMessage />}
    </div>
  </NodeBody>
</BaseNode>
```

---

## Motion Director Panel (Video Generation)

### Full UI Structure

```tsx
<BaseNode>
  {/* 1. HEADER */}
  <NodeHeader 
    title="Motion Director"
    icon="🎬"
    variant="loader"
  />

  {/* 2. STATUS BAR */}
  <NodeStatusBar
    status={isProcessing ? 'processing' : 'success/idle'}
    message="Generating video with VEO-3..." OR "Context received"
    showProgress={isProcessing}
  />

  {/* 3. CONNECTORS */}
  <NodeConnectors>
    {/* Input Handles */}
    <Handle id="input-text" type="text" label="Context" position="top" />
    <Handle id="input-image" type="image" label="Image" position="bottom" />
    
    {/* Output Handle */}
    <Handle id="output-video" type="video" label="Video" position="middle" />
  </NodeConnectors>

  {/* 4. BODY CONTENT */}
  <NodeBody>
    {/* A. Prompt Textarea */}
    {isEditing ? (
      <textarea
        placeholder="Describe the video you want to generate..."
        onKeyDown={Ctrl+Enter to execute}
      />
    ) : (
      <div onClick={handleEditClick}>
        <ReactMarkdown>{prompt}</ReactMarkdown>
      </div>
    )}

    {/* B. Context Display (Collapsible) */}
    <details>
      <summary>Input Context (will influence generation)</summary>
      <div>
        {/* Shows last 2 messages from connected nodes */}
        <div>role: [text/image preview]</div>
        <div>role: [text/image preview]</div>
      </div>
    </details>

    {/* C. Aspect Ratio Selector (LIMITED) */}
    <div className="parameter-control">
      <span>Aspect Ratio</span>
      <select value={aspectRatio}>
        <option value="9:16">9:16 (Portrait)</option>
        <option value="16:9">16:9 (Landscape)</option>
      </select>
    </div>

    {/* D. Status Area */}
    <div className="status-area">
      {isProcessing && "Generating video with VEO3..."}
      {error && <ErrorMessage />}
    </div>
  </NodeBody>
</BaseNode>
```

---

## Visual Layout

```
┌─────────────────────────────────────────┐
│ 🖼️ Art Director              [Resize]  │  ← HEADER
├─────────────────────────────────────────┤
│ ● Generating image... [Progress Bar]   │  ← STATUS BAR
├─────────────────────────────────────────┤
│ ○ Text Input (top)                      │  ← CONNECTORS
│ ○ Image Input (bottom)                  │
│                            Output ○      │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Describe the image you want to      │ │  ← PROMPT TEXTAREA
│ │ generate...                         │ │
│ │ [Ctrl+Enter to execute]             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ▸ Input Context (waiting for conn...)  │  ← CONTEXT (collapsible)
│                                         │
│ Aspect Ratio: [1:1 ▼]                  │  ← ASPECT RATIO SELECTOR
│                                         │
│ [Status messages appear here]          │  ← STATUS AREA
│                                         │
└─────────────────────────────────────────┘
```

---

## Component Structure Details

### 1. BaseNode (Wrapper)
**Location:** `src/components/base/BaseNode.tsx`

**Purpose:** Unified wrapper providing:
- Consistent layout structure
- Resizable functionality
- State management (processing, error)
- Style consistency

**Props:**
```typescript
interface BaseNodeProps {
  id: string;
  isConnectable: boolean;
  config: NodeConfig;  // Configuration object
  children?: React.ReactNode;
}
```

### 2. NodeHeader
**Location:** `src/components/base/NodeHeader.tsx`

**Features:**
- Title with icon (🖼️/🎬)
- Variant styling ('loader')
- Drag handle

**Config:**
```typescript
header: {
  title: 'Art Director',
  variant: 'loader',
  icon: '🖼️'
}
```

### 3. NodeStatusBar
**Location:** `src/components/base/NodeStatusBar.tsx`

**Features:**
- Status indicator (processing/success/idle/error)
- Message display
- Progress bar (when processing)

**Config:**
```typescript
statusBar: {
  show: true,
  status: 'processing' | 'success' | 'idle' | 'error',
  message: 'Generating image...',
  showProgress: true
}
```

### 4. NodeConnectors
**Location:** `src/components/base/NodeConnectors.tsx`

**Features:**
- Input handles (top, bottom)
- Output handles (middle, right)
- Connection visualization

**Config:**
```typescript
connectors: {
  inputs: [
    { id: 'input-text', type: 'text', label: 'Text', position: 'top' },
    { id: 'input-image', type: 'image', label: 'Image', position: 'bottom' }
  ],
  outputs: [
    { id: 'output-image', type: 'image', label: 'Image', position: 'middle' }
  ]
}
```

### 5. NodeBody
**Location:** `src/components/base/NodeBody.tsx`

**Features:**
- Container for node-specific content
- Optional sections support
- Scroll handling

**Content:** Node-specific components (children)

---

## Node-Specific Content (Children)

Both Art Director and Motion Director panels contain:

### A. Prompt Textarea
- **Edit Mode:** Full textarea with Ctrl+Enter to execute
- **View Mode:** Rendered Markdown with click to edit
- **Placeholder:** Context-specific guidance

### B. Context Display (Collapsible `<details>`)
- **Header:** "Input Context (will influence generation)"
- **Content:** Last 2 messages from connected nodes
- **Format:** `role: [text preview or [Image]]`
- **Empty State:** "Connect an input node to see context here"

### C. Aspect Ratio Selector
- **Label:** "Aspect Ratio"
- **Type:** Dropdown `<select>`
- **Art Director Options:**
  - 9:16 (Portrait)
  - 1:1 (Square) - default
  - 4:5
  - 16:9 (Landscape)
  - 4:3, 3:4, 3:2, 2:3, 5:4
- **Motion Director Options:**
  - 9:16 (Portrait)
  - 16:9 (Landscape) - default

### D. Status Area
- **Processing:** "Generating image/video with Nano Banana/VEO3..."
- **Error:** Error message in red
- **Min Height:** 24px to prevent layout shifts

---

## State Management

### Local State (per node)
```typescript
const [aspectRatio, setAspectRatio] = useState('1:1' | '16:9');
const [prompt, setPrompt] = useState('');
const [isEditing, setIsEditing] = useState(false);
const [isProcessing, setIsProcessing] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### Shared State (via hooks)
```typescript
const { 
  inputContext,        // Context from connected nodes
  hasReceivedInput,    // Whether input is connected
  handleProcess,       // Process handler with error catching
  // ... other utilities
} = usePromptNode(initialPrompt, data, id);
```

---

## Styling Classes

### Node Classes
- `.node-panel` - Base node styling
- `.processing` - Applied when generating
- `.error` - Applied when error occurs

### Content Classes
- `.textarea-control` - Prompt input/display area
- `.helper-text` - Small gray helper text
- `.details-section` - Collapsible context section
- `.parameter-control` - Aspect ratio selector container
- `.control-label` - Label for controls
- `.status-area` - Bottom status messages

### Interactive Classes
- `.nodrag` - Prevents ReactFlow drag on interactive elements
- `.summary-clickable` - Clickable summary element

---

## Aspect Ratio Implementation

### Art Director (Image)
**Current State:** ✅ Fixed with new SDK migration
```typescript
// State persistence
const [aspectRatio, setAspectRatio] = useState(data.aspectRatio || '1:1');

// Change handler with node data update
const handleAspectRatioChange = useCallback((newRatio: string) => {
  setAspectRatio(newRatio);
  setNodes((nodes) =>
    nodes.map((node) =>
      node.id === id ? {
        ...node,
        data: { ...node.data, aspectRatio: newRatio }
      } : node
    )
  );
}, [id, setNodes]);

// API call (NEW SDK)
await GoogleAIService.generateImage(prompt, context, aspectRatio);
// → Uses config.imageConfig.aspectRatio parameter
```

### Motion Director (Video)
**Current State:** ✅ Working
```typescript
// Same state management pattern
const [aspectRatio, setAspectRatio] = useState(data.aspectRatio || '16:9');

// API call
await VeoVideoService.generateVideo(prompt, context, aspectRatio);
// → Uses config.aspectRatio parameter
```

---

## Key Features

### 1. **Unified Architecture**
- All nodes use BaseNode wrapper
- Consistent configuration pattern
- Reusable components

### 2. **Responsive Layout**
- Resizable nodes
- Min width/height constraints
- Prevents layout shifts during state changes

### 3. **Context Awareness**
- Shows connection status
- Displays input context
- Influences generation

### 4. **User Experience**
- Click to edit prompt
- Ctrl+Enter to execute
- Collapsible sections
- Status feedback
- Error handling

### 5. **Aspect Ratio Control**
- **Images:** 10 ratios (1:1 to 21:9)
- **Videos:** 2 ratios (9:16, 16:9)
- State persistence across edits
- Stored in node data

---

## File Structure

```
src/components/
├── base/
│   ├── BaseNode.tsx           # Main wrapper component
│   ├── NodeHeader.tsx         # Header with title/icon
│   ├── NodeStatusBar.tsx      # Status indicator
│   ├── NodeConnectors.tsx     # Input/output handles
│   ├── NodeBody.tsx           # Body container
│   └── index.ts               # Barrel export
├── ImagePromptNode.tsx        # Art Director implementation
├── VideoPromptNode.tsx        # Motion Director implementation
└── CustomNodeBase.tsx         # Legacy (not used)

src/types/
├── nodeConfig.ts              # NodeConfig type definitions
└── nodes.ts                   # Node data types

src/hooks/
└── useNodeEditor.ts           # usePromptNode hook
```

---

## Configuration Pattern

Nodes are configured via a `NodeConfig` object:

```typescript
const nodeConfig: NodeConfig = {
  header: { /* ... */ },
  statusBar: { /* ... */ },
  connectors: { /* ... */ },
  resizable: true,
  error: error
};

<BaseNode config={nodeConfig}>
  {/* Node-specific content */}
</BaseNode>
```

This provides:
- **Consistency:** All nodes follow same pattern
- **Flexibility:** Easy to customize per node type
- **Maintainability:** Changes in one place
- **Type Safety:** TypeScript enforced structure

---

## Recent Changes

### SDK Migration (Oct 12, 2025)
- ✅ Migrated from `@google/generative-ai` → `@google/genai`
- ✅ Added proper `imageConfig.aspectRatio` support
- ✅ Kept legacy backup (`GoogleAIService.legacy.ts`)
- ✅ Updated aspect ratio selector functionality
- ✅ All compilation errors resolved

### Aspect Ratio Features
- ✅ State persists across edits (stored in node data)
- ✅ Dropdown selector in both panels
- ✅ Art Director: 10 options
- ✅ Motion Director: 2 options (VEO-3 limitation)
- ✅ API properly receives aspect ratio parameter

---

## Testing Checklist

- [ ] Art Director: Select different aspect ratios
- [ ] Motion Director: Select different aspect ratios  
- [ ] Verify aspect ratio persists after editing prompt
- [ ] Check console logs show aspect ratio being used
- [ ] Confirm generated images/videos match selected ratio
- [ ] Test with/without input connections
- [ ] Verify error handling works
- [ ] Check resizing doesn't break layout
- [ ] Test Ctrl+Enter execution
- [ ] Verify context display updates correctly
