# Motion Director: Context Input Connector

## Overview

The **Motion Director** (Video generation node) has a **"Context"** input connector at the top of the node that accepts **TEXT** type connections. This connector can receive contextual information from various upstream nodes to inform and enhance video generation.

## Connector Configuration

```typescript
{
  id: 'input-text',
  type: 'text',        // ← Accepts TEXT type connections
  label: 'Context',
  position: 'top'
}
```

## What Content Can Connect?

The Context connector accepts **text-type outputs** from these nodes:

### ✅ Compatible Nodes (Output Type: TEXT)

1. **Creative Director (AgentPromptNode)**
   - Output: Text responses from OpenAI
   - Use case: Provide creative direction, story context, or detailed descriptions
   - Example: "Create a video of a serene landscape with gentle camera movements"

2. **Starting Prompt (StartingPromptNode)** *(Hidden)*
   - Output: Text responses from OpenAI with Brand Voice
   - Use case: Initial creative brief or concept

3. **Output Node**
   - Output: Any content type (text/image/video) that's been received
   - Use case: Chain multiple generations or reuse previous outputs
   - Note: Only the text content is used by Motion Director's context connector

### ❌ Incompatible Direct Connections

These nodes output different types and **cannot connect directly** to the Context input:

1. **Art Director (ImagePromptNode)**
   - Output type: IMAGE
   - Cannot connect to Context (text) input
   - **Solution**: Connect to the **Image input** (bottom connector) instead

2. **Image Panel (ImagePanelNode)**
   - Output type: IMAGE
   - Cannot connect to Context (text) input
   - **Solution**: Connect to the **Image input** (bottom connector) instead

3. **Motion Director (VideoPromptNode)**
   - Output type: VIDEO
   - Cannot connect to Context (text) input
   - Would need an intermediary text node

## Motion Director's Full Input Configuration

Motion Director has **TWO input connectors**:

```
┌─────────────────────┐
│  Motion Director    │
├─────────────────────┤
│  ⚫ Context (top)    │ ← TEXT type (creative direction, descriptions)
│                     │
│  [Your Prompt]      │
│                     │
│  ⚫ Image (bottom)   │ ← IMAGE type (visual to animate)
└─────────────────────┘
```

### Context Input (Top - TEXT)
- **Purpose**: Provide textual context, descriptions, narrative, or creative direction
- **Accepts**: Text outputs from Creative Director, Starting Prompt, Output nodes
- **Processing**: Text is merged into the video prompt to guide generation
- **Example flow**: 
  ```
  Creative Director → Motion Director (Context)
  "A dramatic sunset scene with warm colors and smooth transitions"
  ```

### Image Input (Bottom - IMAGE)
- **Purpose**: Provide the visual reference/starting image to animate
- **Accepts**: Image outputs from Art Director, Image Panel
- **Processing**: Most recent image is used as the primary image for animation
- **Example flow**:
  ```
  Art Director → Motion Director (Image)
  [Generated landscape image]
  ```

## How Context Content is Processed

When text context is received through the Context connector, the VeoVideoService:

1. **Extracts all text content** from context messages:
   ```typescript
   for (const msg of context.messages) {
     if (typeof msg.content === 'string') {
       if (msg.role !== 'system') {
         contextTexts.push(msg.content);
       }
     } else if (Array.isArray(msg.content)) {
       for (const part of msg.content) {
         if (part.type === 'text') {
           contextTexts.push(part.text);
         }
       }
     }
   }
   ```

2. **Merges context with your prompt**:
   ```typescript
   fullPrompt = `Context: ${contextText}\n\nVideo prompt: ${prompt}`;
   ```

3. **Sends enhanced prompt to VEO-3**:
   - The combined prompt provides richer context for better video generation
   - Your prompt acts as the specific instruction
   - Context provides supporting information and creative direction

## Example Workflows

### Workflow 1: Creative Direction Flow
```
Creative Director (text) → Motion Director
    ↓                           ↑
"Create a peaceful"        "morning sunrise"
"natural scene"            (your prompt)

Result: Video combines creative direction with specific prompt
```

### Workflow 2: Full Production Pipeline
```
Creative Director (text) ──────→ Motion Director ← Image Panel (image)
    ↓                                ↑                    ↓
"Cinematic, dramatic"         "Transform into"      [Landscape photo]
"slow motion effect"          "epic video"

Result: Text context + Image visual + Prompt = Rich video generation
```

### Workflow 3: Iterative Refinement
```
Creative Director → Creative Director → Motion Director
       ↓                   ↓                  ↑
   "Concept"          "Refined brief"    "Final direction"
```

### Workflow 4: Multi-Modal Context
```
Image Panel ──┐
              ├→ Creative Director → Motion Director
Text Input ───┘        ↓                  ↑
                  "Analyze image"    "Animate it"
                  "Suggest motion"
```

## What Content Types Can Be In Context?

The context messages can contain:

### ✅ Used by Motion Director:
1. **Plain text strings**: Direct text content
   ```javascript
   { role: 'user', content: 'Dramatic lighting and smooth camera movement' }
   ```

2. **Text parts in multimodal messages**: Extracted from content arrays
   ```javascript
   { 
     role: 'user', 
     content: [
       { type: 'text', text: 'Create cinematic atmosphere' },
       { type: 'image', imageUrl: '...' }  // ← Handled by Image connector
     ] 
   }
   ```

### ℹ️ Noted but Not Used by Context Connector:
- **Image parts**: These are processed separately from the **Image input connector**
- **System messages**: Filtered out (role !== 'system')

## Connection Validation

The system validates connections using type compatibility:

```typescript
// From nodeConfig.ts
export function areConnectorsCompatible(
  sourceType: ConnectorType,
  targetType: ConnectorType
): boolean {
  // 'any' can connect to anything
  if (sourceType === 'any' || targetType === 'any') {
    return true;
  }
  
  // Otherwise, types must match
  return sourceType === targetType;  // TEXT === TEXT ✓
}
```

### Valid Connections:
- ✅ TEXT output → TEXT input (Context)
- ✅ IMAGE output → IMAGE input
- ✅ ANY output → Any input

### Invalid Connections:
- ❌ IMAGE output → TEXT input (Context)
- ❌ VIDEO output → TEXT input (Context)
- ❌ TEXT output → IMAGE input

## Best Practices

### 1. Use Creative Director for Rich Context
```
Creative Director → Motion Director
"Style: Cinematic, dramatic lighting
Mood: Epic and awe-inspiring
Camera: Slow dolly-in movement
Colors: Warm sunset palette"
```

### 2. Combine Text Context + Image Input
```
Creative Director (Context) ──→ Motion Director ← Art Director (Image)
"Animate with smooth transitions"     ↑         [Generated scene]
```

### 3. Chain Creative Direction
```
Director 1 → Director 2 → Motion Director
"Concept"    "Details"    "Execute with context"
```

### 4. Standalone Mode
Motion Director works without context input:
- Just type your prompt directly
- No context required for basic video generation
- Context enhances but isn't mandatory

## Debug Tips

### Check What's Being Sent
Console logs show context processing:
```
Starting VEO-3 video generation with prompt: Context: [contextText]...
```

### Verify Connection Types
If connection fails:
1. Check connector colors/types
2. TEXT (green) can only connect to TEXT
3. IMAGE (orange) can only connect to IMAGE
4. Use Output node to bridge different types if needed

### Inspect Context Messages
```javascript
logger.debug('[VeoVideoService] Context has', context.messages.length, 'messages');
```

## Technical Reference

### Files:
- **Node Definition**: `src/components/VideoPromptNode.tsx` (lines 245-261)
- **Context Processing**: `src/services/VeoVideoService.ts` (lines 86-107)
- **Type System**: `src/types/nodeConfig.ts`

### Context Structure:
```typescript
interface ConversationContext {
  messages: ChatMessage[];
  threadId?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'text' | 'image';
    text?: string;
    imageUrl?: string;
  }>;
}
```

---

**Summary**: The Motion Director's **Context** connector accepts **TEXT** type outputs from nodes like Creative Director or Starting Prompt to provide creative direction and contextual information that enhances video generation. It processes text content to build a richer prompt for VEO-3, while images are handled separately through the dedicated Image input connector.
