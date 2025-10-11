# Node Connector Visual Reference

**Quick reference for multi-connector layout design**

---

## Connector Type System

### Visual Indicators

| Type | Color | Icon | CSS Class | Position |
|------|-------|------|-----------|----------|
| **Text** | `#3B82F6` (Blue) | 📝 | `.connector-text` | Any |
| **Image** | `#A855F7` (Purple) | 🖼️ | `.connector-image` | Any |
| **Video** | `#EF4444` (Red) | 🎬 | `.connector-video` | Any |
| **Any** | `#6B7280` (Gray) | ⚡ | `.connector-any` | Any |

---

## Node Examples with Multi-Connectors

### Example 1: Enhanced Creative Director (AgentPromptNode)

```
┌─────────────────────────────────────────────────┐
│  👨‍🎨 Creative Director                            │
├─────────────────────────────────────────────────┤
│  ⚡ Status: Context received                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  ◉ Text in       ┌────────────────┐   Text out ◉│
│                  │  [Prompt Text]  │             │
│  ◉ Image ref     │                 │             │
│                  │  Previous:      │             │
│  ◉ Any context   │  "Create..."    │             │
│                  └────────────────┘             │
│  💡 Ctrl+Enter to execute                        │
│  📋 Input Context (3 messages)                   │
│  🎛️  Model: GPT-4                                │
└─────────────────────────────────────────────────┘

INPUTS:
  • Text in: Previous prompt/response
  • Image ref: Visual reference for style/content
  • Any context: File attachments, additional data

OUTPUTS:
  • Text out: Generated creative direction
```

### Example 2: Enhanced Art Director (ImagePromptNode)

```
┌─────────────────────────────────────────────────┐
│  🎨 Art Director                                 │
├─────────────────────────────────────────────────┤
│  ⚡ Status: Ready to generate                    │
├─────────────────────────────────────────────────┤
│                                                  │
│  ◉ Text prompt   ┌────────────────┐  Image out ◉│
│                  │ "A futuristic  │             │
│  ◉ Image ref     │  cityscape..." │             │
│                  │                 │             │
│  ◉ Any           │ [Reference img] │             │
│                  └────────────────┘             │
│  💡 Ctrl+Enter to generate image                 │
│  🎛️  Aspect: 16:9 | Style: Photorealistic       │
└─────────────────────────────────────────────────┘

INPUTS:
  • Text prompt: Image description/direction
  • Image ref: Style reference or img-to-img base
  • Any: Additional context/constraints

OUTPUTS:
  • Image out: Generated image (Gemini/DALL-E)
```

### Example 3: Enhanced Motion Director (VideoPromptNode)

```
┌─────────────────────────────────────────────────┐
│  🎬 Motion Director                              │
├─────────────────────────────────────────────────┤
│  ⚡ Status: Generating video... 45%              │
├─────────────────────────────────────────────────┤
│                                                  │
│  ◉ Text prompt   ┌────────────────┐  Video out ◉│
│                  │ "Camera pans   │             │
│  ◉ Image start   │  across..."    │   Text desc◉│
│                  │                 │             │
│  ◉ Any           │ [First frame]  │             │
│                  └────────────────┘             │
│  ⏳ Estimated: 2m 15s remaining                  │
│  🎛️  Duration: 8s | Aspect: 16:9                │
└─────────────────────────────────────────────────┘

INPUTS:
  • Text prompt: Motion description/camera direction
  • Image start: First frame or reference
  • Any: Additional parameters

OUTPUTS:
  • Video out: Generated video (VEO-3)
  • Text desc: Auto-generated description
```

### Example 4: Enhanced Output Node

```
┌─────────────────────────────────────────────────┐
│  📺 Output                                       │
├─────────────────────────────────────────────────┤
│  ⚡ Content: Image | Page 2/5                    │
├─────────────────────────────────────────────────┤
│                                                  │
│  ◉ Text in       ┌────────────────┐    Text ◉   │
│                  │                 │             │
│  ◉ Image in      │  [Display Area] │   Image ◉   │
│                  │                 │             │
│  ◉ Video in      │  [Current page  │   Video ◉   │
│                  │   content]      │             │
│  ◉ Any           └────────────────┘             │
│  📄 Navigate: ← Prev | Next →                    │
│  📋 Copy to clipboard | 🔍 View fullscreen       │
└─────────────────────────────────────────────────┘

INPUTS:
  • Text in: Text content to display
  • Image in: Images to display
  • Video in: Videos to display  
  • Any: Mixed content

OUTPUTS:
  • Text: Current page text (for chaining)
  • Image: Current page image (for chaining)
  • Video: Current page video (for chaining)

Note: Accepts content on any connector, displays
appropriately, outputs current page for downstream nodes
```

### Example 5: Starting Prompt (No Inputs)

```
┌─────────────────────────────────────────────────┐
│  ✨ Starting Prompt                              │
├─────────────────────────────────────────────────┤
│  ⚡ Status: Entry point (no input required)      │
├─────────────────────────────────────────────────┤
│                                                  │
│  [No inputs]     ┌────────────────┐   Text out ◉│
│                  │ "Create a..."  │             │
│                  │                 │             │
│                  └────────────────┘             │
│  💡 Ctrl+Enter to execute                        │
│  📎 2 files attached                             │
└─────────────────────────────────────────────────┘

INPUTS:
  • None (entry point)

OUTPUTS:
  • Text out: Generated response with context
```

### Example 6: Image Panel (No Inputs)

```
┌─────────────────────────────────────────────────┐
│  🖼️  Image Panel                                 │
├─────────────────────────────────────────────────┤
│  ⚡ Status: Image loaded                         │
├─────────────────────────────────────────────────┤
│                                                  │
│  [No inputs]     ┌────────────────┐  Image out ◉│
│                  │                 │             │
│                  │  [Uploaded or  │             │
│                  │   pasted img]  │             │
│                  │                 │             │
│                  └────────────────┘             │
│  📷 Drop image here, click to upload,            │
│     or paste with Ctrl+V                         │
└─────────────────────────────────────────────────┘

INPUTS:
  • None (source node)

OUTPUTS:
  • Image out: Uploaded/pasted image with context
```

---

## Connection Validation Matrix

### Valid Connections

| From ↓ | To → | Text | Image | Video | Any |
|--------|------|------|-------|-------|-----|
| **Text** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Image** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Video** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Any** | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend:**
- ✅ Connection allowed
- ❌ Connection blocked (type mismatch)

**Special Cases:**
- Image → Video: Allowed (first frame extraction)
- Any → All: Always allowed (flexible routing)
- All → Any: Always allowed (type preservation)

---

## Connector Positioning

### Layout Rules

```
LEFT SIDE (Inputs):                RIGHT SIDE (Outputs):
┌─────┐                           ┌─────┐
│  ◉  │ Top input                 │  ◉  │ Top output
│     │                           │     │
│  ◉  │ Middle input              │  ◉  │ Middle output
│     │                           │     │
│  ◉  │ Bottom input              │  ◉  │ Bottom output
└─────┘                           └─────┘

Vertical spacing: 
- 32px between connectors
- 16px from first connector to body top
- Auto-adjust if more than 3 connectors
```

### Connector Size & Spacing

```css
.connector {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--node-body-background);
  position: absolute;
}

.connector-text { background: #3B82F6; }
.connector-image { background: #A855F7; }
.connector-video { background: #EF4444; }
.connector-any { background: #6B7280; }

.connector:hover {
  transform: scale(1.3);
  box-shadow: 0 0 8px currentColor;
}

.connector.compatible {
  /* When dragging compatible connection */
  animation: pulse 1s ease-in-out infinite;
}
```

### Label Positioning

```
For LEFT (input) connectors:
┌──────────────┐
│◉ Text        │  ← Label to the right
│              │
│◉ Image       │
└──────────────┘

For RIGHT (output) connectors:
┌──────────────┐
│       Text ◉ │  ← Label to the left
│              │
│      Image ◉ │
└──────────────┘
```

---

## Connector States

### Visual Feedback

```
STATE               VISUAL                  WHEN
─────────────────────────────────────────────────
Default             ◉ (solid color)         No connection
Hover               ◉ (glow + scale)        Mouse over
Connected           ◉ (pulsing)             Active connection
Connecting          ◉ (animated)            Dragging connection
Compatible          ◉ (green glow)          Valid target while dragging
Incompatible        ◉ (red X)               Invalid target while dragging
Processing          ◉ (spinner overlay)     Data flowing through
Error               ◉ (red flash)           Connection error
```

### CSS Animation Examples

```css
/* Connected state */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.connector.connected {
  animation: pulse 2s ease-in-out infinite;
}

/* Compatible target while dragging */
@keyframes glow {
  0%, 100% { box-shadow: 0 0 4px currentColor; }
  50% { box-shadow: 0 0 12px currentColor; }
}

.connector.compatible-target {
  animation: glow 1s ease-in-out infinite;
  border-color: #10b981;
}

/* Data flowing */
@keyframes flow {
  from { opacity: 0.3; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1.2); }
}

.connector.processing::after {
  content: '';
  animation: flow 0.6s ease-out;
}
```

---

## Future Enhancements

### Dynamic Connectors

Allow nodes to add/remove connectors dynamically:

```typescript
// Add connector at runtime
node.addInput({
  id: 'input-custom',
  type: 'text',
  label: 'Custom Input',
  position: 'bottom'
});

// Remove connector
node.removeInput('input-custom');
```

### Connector Badges

Show data type or status on connectors:

```
◉ Text [5 msgs]    ← Badge shows message count
◉ Image [2.4 MB]   ← Badge shows file size
◉ Any [JSON]       ← Badge shows data format
```

### Connector Tooltips

Hover to see connection details:

```
╔════════════════════════╗
║ Text Connector         ║
║────────────────────────║
║ Type: text/markdown    ║
║ Connected: Yes         ║
║ Source: Node "Prompt"  ║
║ Last data: 2 sec ago   ║
╚════════════════════════╝
```

---

## Implementation Checklist

### Phase 1: Basic Multi-Connector
- [ ] Create ConnectorConfig type
- [ ] Build Connector component
- [ ] Build ConnectorGroup component (left/right)
- [ ] Add connector type colors to CSS
- [ ] Implement connector labels
- [ ] Add to BaseNode

### Phase 2: Validation & Feedback
- [ ] Implement connection validation logic
- [ ] Add visual feedback for compatible/incompatible
- [ ] Add hover states
- [ ] Add connected state animation
- [ ] Add error states

### Phase 3: Data Flow
- [ ] Update connection handler for multi-connectors
- [ ] Implement type-specific data routing
- [ ] Add data transformation layer
- [ ] Update existing nodes to use multi-connectors

### Phase 4: Polish
- [ ] Add tooltips
- [ ] Add badges (optional)
- [ ] Performance optimization
- [ ] Accessibility (keyboard nav, ARIA)
- [ ] Documentation

---

**Reference:** See `NODE_ARCHITECTURE_PLAN.md` for complete details
