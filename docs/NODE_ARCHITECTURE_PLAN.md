# Node Architecture Analysis & Homogenization Plan

**Date:** October 11, 2025  
**Status:** Draft - For Review  
**Goal:** Create a unified, extensible node architecture supporting multi-connector systems and JSON-based templates

---

## 1. Current Node Structure Analysis

### 1.1 Existing Nodes

| Node Type | Input Connectors | Output Connectors | Primary Function |
|-----------|------------------|-------------------|------------------|
| **StartingPromptNode** | None | 1 (source/right) | Text prompt entry point |
| **AgentPromptNode** | 1 (target/left) | 1 (source/right) | Contextual text prompt |
| **ImagePromptNode** | 1 (target/left) | 1 (source/right) | Image generation (Gemini) |
| **VideoPromptNode** | 1 (target/left) | 1 (source/right) | Video generation (VEO-3) |
| **OutputNode** | 1 (target/left) | 1 (source/right) | Display text/image/video results |
| **ImagePanelNode** | None | 1 (source/right) | Image upload/paste input |

### 1.2 Current Structure Pattern (Verified)

All nodes currently follow this general structure:

```
<div className="node-panel">
  <NodeResizer /> 
  
  <!-- HEADER -->
  <div className="node-header [variant]">
    [Node Name]
  </div>
  
  <!-- STATUS BAR -->
  <div className="[node-type]-status-bar">
    <span className="status-text">[Status]</span>
    [Progress bar if processing]
  </div>
  
  <!-- FILE CONTEXT INDICATOR (optional) -->
  <div className="file-context-indicator">
    [Attached files count]
  </div>
  
  <!-- BODY -->
  <div className="node-body">
    <!-- Main Content Area -->
    [textarea | display content | image upload area]
    
    <!-- Helper Text -->
    <div className="helper-text">
      [Instructions]
    </div>
    
    <!-- Details/Context Section -->
    <details className="details-section">
      <summary>[Context info]</summary>
      [Collapsible context display]
    </details>
    
    <!-- Status/Control Area -->
    <div className="status-area">
      [Additional controls/settings]
    </div>
  </div>
  
  <!-- CONNECTORS (outside body) -->
  <Handle type="target" position={Position.Left} />   <!-- Input -->
  <Handle type="source" position={Position.Right} />  <!-- Output -->
</div>
```

### 1.3 Structural Inconsistencies Found

**Problems:**
1. **Status bars vary**: Different class names (`starting-status-bar`, `agent-status-bar`, `image-status-bar`, `video-status-bar`, `output-status-bar`)
2. **Header variants inconsistent**: Some use `text-positive`, others `model-loader`, `output`
3. **Body content organization**: Different nodes organize helper text, details, and controls differently
4. **Connector positioning**: Currently at bottom of JSX (outside body), not visually integrated
5. **No connector labeling**: Users can't see what type of data flows through connectors
6. **Single connector limitation**: Cannot accept multiple input types or produce multiple output types simultaneously

---

## 2. Proposed Unified Node Structure

### 2.1 New Canonical Structure

```
<div className="node-panel" data-node-type="[type]">
  <NodeResizer /> 
  
  <!-- 1. HEADER -->
  <div className="node-header" data-variant="[variant]">
    <span className="node-icon">[Icon]</span>
    <span className="node-title">[Name]</span>
    <div className="node-header-actions">
      [Optional buttons]
    </div>
  </div>
  
  <!-- 2. STATUS BAR (unified) -->
  <div className="node-status-bar">
    <div className="status-primary">
      <span className="status-icon">[Icon]</span>
      <span className="status-text">[Status message]</span>
    </div>
    <div className="status-secondary">
      [Progress bar | Additional info | Actions]
    </div>
  </div>
  
  <!-- 3. CONNECTOR AREA (NEW!) -->
  <div className="node-connectors">
    <!-- Left: Inputs -->
    <div className="node-connectors-input">
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input-text"
        className="connector-text"
      />
      <span className="connector-label">Text</span>
      
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input-image"
        className="connector-image"
      />
      <span className="connector-label">Image</span>
      
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input-any"
        className="connector-any"
      />
      <span className="connector-label">Any</span>
    </div>
    
    <!-- Right: Outputs -->
    <div className="node-connectors-output">
      <Handle 
        type="source" 
        position={Position.Right} 
        id="output-text"
        className="connector-text"
      />
      <span className="connector-label">Text</span>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        id="output-image"
        className="connector-image"
      />
      <span className="connector-label">Image</span>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        id="output-video"
        className="connector-video"
      />
      <span className="connector-label">Video</span>
    </div>
  </div>
  
  <!-- 4. BODY -->
  <div className="node-body">
    <!-- Primary Content Area -->
    <div className="node-content-primary">
      [textarea | display | upload area | custom content]
    </div>
    
    <!-- Helper/Instructions -->
    <div className="node-helper">
      [Helper text, instructions, hints]
    </div>
    
    <!-- Expandable Details -->
    <details className="node-details">
      <summary className="node-details-summary">
        [Section title with count/status]
      </summary>
      <div className="node-details-content">
        [Context, history, metadata]
      </div>
    </details>
    
    <!-- Controls/Settings -->
    <div className="node-controls">
      [Dropdowns, sliders, toggles, buttons]
    </div>
  </div>
  
  <!-- 5. FOOTER (optional) -->
  <div className="node-footer">
    [Pagination, timestamps, actions]
  </div>
</div>
```

### 2.2 Connector System Design

#### 2.2.1 Connector Types

| Type | Color | Icon | Data Format | Example Use |
|------|-------|------|-------------|-------------|
| **text** | Blue (#3B82F6) | 📝 | String / Markdown | Prompts, responses |
| **image** | Purple (#A855F7) | 🖼️ | Base64 data URL | Generated/uploaded images |
| **video** | Red (#EF4444) | 🎬 | Blob URL / data URL | Generated videos |
| **any** | Gray (#6B7280) | ⚡ | Context object | Accepts any type |

#### 2.2.2 Connector Layout

**Visual Design:**
```
┌──────────────────────────────────────┐
│  Node Header                          │
├──────────────────────────────────────┤
│  Status Bar                           │
├──────────────────────────────────────┤
│  ┌────────────────────────────┐      │
│◉ │ Connectors Area            │    ◉ │  ← Connectors visible in body
│ Text                                Text│
│◉                                     ◉│
│ Image                             Image│
│◉                                     ◉│
│ Any                               Video│
│  └────────────────────────────┘      │
│  ┌────────────────────────────┐      │
│  │ Main Content                │      │
│  │ (textarea, display, etc)    │      │
│  └────────────────────────────┘      │
│  [Helper text]                        │
│  [Details] [Controls]                 │
└──────────────────────────────────────┘
```

#### 2.2.3 Connection Rules

**Validation:**
- Text → Text (always allowed)
- Image → Image (always allowed)
- Video → Video (always allowed)
- Any → [Text, Image, Video] (always allowed)
- [Text, Image, Video] → Any (always allowed)
- Cross-type connections: Configurable per node

**Data Flow:**
```typescript
interface ConnectorData {
  type: 'text' | 'image' | 'video';
  content: string;
  context?: ConversationContext;
  metadata?: {
    mimeType?: string;
    dimensions?: { width: number; height: number };
    duration?: number;
    [key: string]: any;
  };
}
```

---

## 3. Base Node Component Architecture

### 3.1 Component Hierarchy

```
BaseNode (wrapper/container)
  ├─ NodeHeader
  ├─ NodeStatusBar
  ├─ NodeConnectors
  │   ├─ ConnectorGroup (inputs)
  │   └─ ConnectorGroup (outputs)
  ├─ NodeBody
  │   ├─ NodeContent (customizable)
  │   ├─ NodeHelper
  │   ├─ NodeDetails
  │   └─ NodeControls
  └─ NodeFooter (optional)
```

### 3.2 BaseNode Props Interface

```typescript
interface BaseNodeProps {
  // Core ReactFlow props
  id: string;
  data: BaseNodeData;
  isConnectable: boolean;
  
  // Structure customization
  config: NodeConfig;
  
  // Content rendering
  children?: React.ReactNode;
  renderContent?: (data: BaseNodeData) => React.ReactNode;
  
  // Event handlers
  onProcess?: (data: BaseNodeData) => Promise<void>;
  onInputReceived?: (input: ConnectorData) => void;
  onOutputEmit?: (output: ConnectorData) => void;
}

interface NodeConfig {
  // Metadata
  type: string;
  title: string;
  icon: string;
  variant?: 'default' | 'positive' | 'loader' | 'output';
  
  // Connectors
  inputs: ConnectorConfig[];
  outputs: ConnectorConfig[];
  
  // Sections visibility
  showStatusBar?: boolean;
  showHelper?: boolean;
  showDetails?: boolean;
  showControls?: boolean;
  showFooter?: boolean;
  
  // Behavior
  resizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  
  // Custom CSS classes
  className?: string;
}

interface ConnectorConfig {
  id: string;
  type: 'text' | 'image' | 'video' | 'any';
  label: string;
  position: 'top' | 'bottom';  // Position within group
  required?: boolean;
  accepts?: string[];  // For validation
}
```

### 3.3 JSON Template Example

```json
{
  "type": "customPrompt",
  "title": "Custom Prompt Node",
  "icon": "✨",
  "variant": "positive",
  "inputs": [
    {
      "id": "input-text",
      "type": "text",
      "label": "Context",
      "position": "top",
      "required": false
    },
    {
      "id": "input-image",
      "type": "image",
      "label": "Reference",
      "position": "bottom",
      "required": false
    }
  ],
  "outputs": [
    {
      "id": "output-text",
      "type": "text",
      "label": "Result",
      "position": "top"
    }
  ],
  "sections": {
    "statusBar": true,
    "helper": true,
    "details": true,
    "controls": true,
    "footer": false
  },
  "resizable": true,
  "minWidth": 320,
  "minHeight": 320
}
```

### 3.4 Usage Example

```tsx
// Simple usage with config
<BaseNode
  id={id}
  data={data}
  isConnectable={isConnectable}
  config={nodeConfig}
  renderContent={(data) => (
    <textarea
      value={data.prompt}
      onChange={(e) => updatePrompt(e.target.value)}
    />
  )}
/>

// Advanced usage with custom children
<BaseNode
  id={id}
  data={data}
  isConnectable={isConnectable}
  config={nodeConfig}
>
  <NodeContent>
    <CustomEditor value={data.prompt} />
  </NodeContent>
  <NodeControls>
    <TemperatureSlider />
    <ModelSelector />
  </NodeControls>
</BaseNode>
```

---

## 4. Implementation Plan

### Phase 1: Foundation (Week 1)
**Goal:** Create base components without breaking existing nodes

**Tasks:**
1. ✅ Create `BaseNode.tsx` wrapper component
2. ✅ Create `NodeHeader.tsx` with unified styling
3. ✅ Create `NodeStatusBar.tsx` with standard structure
4. ✅ Create `NodeConnectors.tsx` with multi-connector support
5. ✅ Create `NodeBody.tsx` with section slots
6. ✅ Update CSS with new classes and connector styles
7. ✅ Create TypeScript interfaces and types
8. ✅ Write unit tests for base components

**Deliverables:**
- `src/components/base/BaseNode.tsx`
- `src/components/base/NodeHeader.tsx`
- `src/components/base/NodeStatusBar.tsx`
- `src/components/base/NodeConnectors.tsx`
- `src/components/base/NodeBody.tsx`
- `src/types/nodeConfig.ts`
- `src/styles/components/_base-node.css`
- Tests in `src/components/base/__tests__/`

### Phase 2: Migration Strategy (Week 2)
**Goal:** Migrate one node type at a time, validate, iterate

**Approach:**
1. Create config objects for each existing node type
2. Refactor nodes one-by-one to use `BaseNode`
3. Ensure backward compatibility with existing data
4. Update connection logic to handle multiple connectors
5. Test each migration thoroughly before moving to next node

**Migration Order:**
1. **StartingPromptNode** (simplest - no input)
2. **OutputNode** (display only - single input)
3. **ImagePanelNode** (upload only - no input)
4. **AgentPromptNode** (standard input/output)
5. **ImagePromptNode** (media generation)
6. **VideoPromptNode** (media generation)

**For each node:**
- Create JSON config
- Refactor component to use BaseNode
- Update tests
- Manual QA testing
- Deploy to dev/staging

### Phase 3: Multi-Connector Implementation (Week 3)
**Goal:** Enable multiple simultaneous connections

**Tasks:**
1. ✅ Update ReactFlow connection logic
2. ✅ Implement connector type validation
3. ✅ Update data flow handlers for multiple inputs/outputs
4. ✅ Add visual feedback for connector compatibility
5. ✅ Update existing nodes to leverage multiple connectors
6. ✅ Add connector labeling and tooltips
7. ✅ Update documentation

**Examples:**
- **ImagePromptNode**: Accept text (prompt) + image (reference) → Output image
- **VideoPromptNode**: Accept text (prompt) + image (first frame) → Output video
- **OutputNode**: Accept text/image/video on separate connectors → Display appropriately
- **AgentPromptNode**: Accept multiple text contexts → Merge and process

### Phase 4: JSON Template System (Week 4)
**Goal:** Enable dynamic node creation from JSON

**Tasks:**
1. ✅ Create JSON schema for node templates
2. ✅ Build template parser and validator
3. ✅ Create node factory function
4. ✅ Build template editor UI (optional)
5. ✅ Create template library/registry
6. ✅ Add import/export functionality
7. ✅ Documentation and examples

**Template Features:**
- Define structure via JSON
- Custom content rendering via plugins
- Validation rules
- Default values
- Versioning support

### Phase 5: Testing & Polish (Week 5)
**Goal:** Ensure stability and user experience

**Tasks:**
1. ✅ Comprehensive integration testing
2. ✅ Performance optimization
3. ✅ Accessibility audit (keyboard navigation, ARIA labels)
4. ✅ Visual polish (animations, hover states, feedback)
5. ✅ Documentation completion
6. ✅ Migration guide for custom nodes
7. ✅ Release notes

---

## 5. Backward Compatibility Strategy

### 5.1 Data Migration

**Existing node data:**
```typescript
// Old format
{
  id: "node-1",
  type: "agentPrompt",
  data: {
    prompt: "...",
    context: {...},
    onReceiveInput: fn,
    onOutput: fn
  }
}
```

**New format:**
```typescript
// New format
{
  id: "node-1",
  type: "agentPrompt",
  data: {
    prompt: "...",
    context: {...},
    // NEW: Multiple connector handlers
    inputs: {
      "input-text": { handler: fn, connected: true },
      "input-image": { handler: fn, connected: false }
    },
    outputs: {
      "output-text": { emit: fn, data: {...} }
    },
    // LEGACY: Keep for backward compatibility
    onReceiveInput: fn,  // Maps to inputs["input-text"].handler
    onOutput: fn         // Maps to outputs["output-text"].emit
  }
}
```

### 5.2 Migration Adapter

```typescript
function migrateNodeData(oldData: OldNodeData): NewNodeData {
  return {
    ...oldData,
    inputs: {
      "input-text": {
        handler: oldData.onReceiveInput || (() => {}),
        connected: false
      }
    },
    outputs: {
      "output-text": {
        emit: oldData.onOutput || (() => {}),
        data: null
      }
    }
  };
}
```

### 5.3 Gradual Rollout

1. **Phase A**: BaseNode available alongside old nodes
2. **Phase B**: Migrate nodes one-by-one, both versions work
3. **Phase C**: All nodes migrated, old components marked deprecated
4. **Phase D**: Remove deprecated components (after 2-3 release cycles)

---

## 6. Benefits of New Architecture

### 6.1 For Users
- ✅ **Clear visual feedback**: Labeled connectors show data types
- ✅ **Flexible workflows**: Multiple inputs/outputs enable complex pipelines
- ✅ **Consistent UX**: All nodes have same structure and behavior
- ✅ **Better discoverability**: Standard sections help users find features

### 6.2 For Developers
- ✅ **Rapid node creation**: JSON templates + BaseNode = new node in minutes
- ✅ **Maintainability**: Single source of truth for node structure
- ✅ **Extensibility**: Easy to add new connector types or sections
- ✅ **Type safety**: Strong TypeScript interfaces prevent errors
- ✅ **Testing**: Shared components = easier to test

### 6.3 For the Project
- ✅ **Scalability**: Add 10 new node types without architectural changes
- ✅ **Plugin system**: External developers can contribute nodes
- ✅ **Performance**: Optimized rendering with shared components
- ✅ **Documentation**: Self-documenting structure

---

## 7. Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Breaking changes** | High | Medium | Gradual migration, backward compat layer, version bumps |
| **Performance regression** | Medium | Low | Benchmark before/after, optimize BaseNode rendering |
| **User confusion** | Medium | Medium | Clear docs, migration guide, visual tutorials |
| **Data loss** | High | Low | Robust migration scripts, backup system, rollback plan |
| **Developer adoption** | Medium | Medium | Good docs, examples, templates, developer preview |
| **ReactFlow compatibility** | High | Low | Test with current ReactFlow version, monitor updates |

---

## 8. Success Metrics

**Quantitative:**
- ✅ 100% of existing nodes migrated
- ✅ <50ms average render time for BaseNode
- ✅ 5+ new node types created from JSON templates
- ✅ 0 data loss incidents during migration
- ✅ 90%+ test coverage for base components

**Qualitative:**
- ✅ Positive developer feedback on ease of creating new nodes
- ✅ Users successfully create custom nodes via JSON
- ✅ No increase in support tickets related to node behavior
- ✅ Code review approvals without major concerns

---

## 9. Next Steps

**Immediate (This Week):**
1. **Review this plan** with stakeholders
2. **Get approval** for architectural changes
3. **Set up feature branch** for development
4. **Create detailed task breakdown** for Phase 1

**Short Term (Next 2 Weeks):**
1. **Implement Phase 1**: Base components
2. **Migrate StartingPromptNode** as proof of concept
3. **Demo to team** for feedback
4. **Iterate on design** based on feedback

**Medium Term (Next Month):**
1. **Complete Phase 2**: All nodes migrated
2. **Implement Phase 3**: Multi-connector system
3. **Beta testing** with early adopters
4. **Prepare Phase 4**: JSON template system

---

## 10. Open Questions

1. **Connector positioning**: Should connectors be inside body or outside (current pattern)?
   - **Recommendation**: Inside body for better visual integration and labeling
   
2. **Connector limits**: Should we limit max connectors per node?
   - **Recommendation**: Start with max 5 per side, evaluate based on usage
   
3. **Type coercion**: Should we auto-convert between compatible types (e.g., image → text via description)?
   - **Recommendation**: No auto-conversion initially, explicit converter nodes instead
   
4. **Template validation**: Who can create/publish templates?
   - **Recommendation**: Admin-approved templates for production, anyone for personal use
   
5. **Performance**: How to optimize for 100+ nodes on canvas?
   - **Recommendation**: Virtualization, lazy rendering, memoization

---

## 11. References

- ReactFlow documentation: https://reactflow.dev/
- Current codebase: `src/components/*.tsx`
- Design system: `src/styles/components/_nodes.css`
- Hook architecture: `src/hooks/useNodeEditor.ts`

---

**Document Owner:** AI Assistant  
**Last Updated:** October 11, 2025  
**Version:** 1.0 (Draft)
