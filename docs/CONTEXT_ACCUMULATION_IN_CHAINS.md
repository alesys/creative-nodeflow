# Context Accumulation Through Node Chains

## Question
In this chain:
```
Art Director A → Output → Art Director B → Output → Art Director C
```

Does **Art Director C** receive:
- Only Art Director B's output as context? OR
- **Both** Art Director A and Art Director B outputs as context?

## Answer: **BOTH** (Context Accumulates)

**Art Director C receives BOTH Art Director A and Art Director B outputs as accumulated context.**

## How Context Accumulation Works

The system uses a **context merging strategy** where contexts from multiple upstream nodes are accumulated and merged together.

### Key Code: `useNodeInput` Hook

Located in `src/hooks/useNodeEditor.ts` (lines 130-175):

```typescript
setInputContext(prevContext => {
  if (!inputData.context) {
    return prevContext;
  }

  if (!prevContext) {
    // No previous context, use new context
    return inputData.context;
  }

  // Merge messages from both contexts, preserve threadId
  const existingMessages = prevContext.messages || [];
  const newMessages = inputData.context.messages || [];

  logger.debug('[useNodeInput] Merging contexts - existing:', 
    existingMessages.length, 'new:', newMessages.length);

  return {
    messages: [...existingMessages, ...newMessages],  // ← ACCUMULATION HAPPENS HERE
    threadId: inputData.context.threadId || prevContext.threadId
  };
});
```

**Key Point**: When new context arrives, it **appends** new messages to existing messages instead of replacing them.

## Step-by-Step: Your Example Chain

Let's trace what happens in your example:

### Step 1: Art Director A Generates
```
Art Director A
├─ Prompt: "Create a sunset landscape"
├─ Generates: Image A
└─ Output Context:
    messages: [
      { role: 'user', content: 'Create a sunset landscape' },
      { role: 'assistant', content: [image A metadata] }
    ]
```

### Step 2: Output Node Receives & Forwards
```
Output (after A)
├─ Receives: Context with 2 messages from A
└─ Forwards: Same context (passes through)
    messages: [
      { role: 'user', content: 'Create a sunset landscape' },
      { role: 'assistant', content: [image A metadata] }
    ]
```

### Step 3: Art Director B Receives A's Context
```
Art Director B
├─ Receives INPUT: A's context (2 messages)
├─ Prompt: "Make it more dramatic"
├─ MERGES contexts:
│   Existing (from A): 2 messages
│   New (from B's generation): 2 messages
└─ Output Context:
    messages: [
      { role: 'user', content: 'Create a sunset landscape' },      ← From A
      { role: 'assistant', content: [image A metadata] },          ← From A
      { role: 'user', content: 'Make it more dramatic' },          ← From B
      { role: 'assistant', content: [image B metadata] }           ← From B
    ]
    Total: 4 messages
```

### Step 4: Output Node Forwards Accumulated Context
```
Output (after B)
├─ Receives: Context with 4 messages (A + B)
└─ Forwards: Same accumulated context
    messages: [all 4 messages from A + B]
```

### Step 5: Art Director C Receives ALL Context
```
Art Director C
├─ Receives INPUT: Accumulated context (4 messages from A + B)
├─ Prompt: "Add vibrant colors"
├─ MERGES contexts:
│   Existing (from A + B): 4 messages
│   New (from C's generation): 2 messages
└─ Final Context:
    messages: [
      { role: 'user', content: 'Create a sunset landscape' },      ← From A
      { role: 'assistant', content: [image A metadata] },          ← From A
      { role: 'user', content: 'Make it more dramatic' },          ← From B
      { role: 'assistant', content: [image B metadata] },          ← From B
      { role: 'user', content: 'Add vibrant colors' },             ← From C
      { role: 'assistant', content: [image C metadata] }           ← From C
    ]
    Total: 6 messages
```

## Context Flow Diagram

```
Art Director A              Art Director B              Art Director C
──────────────             ──────────────              ──────────────
Context: []                Context: [A]                Context: [A, B]
   ↓                          ↓                           ↓
Generates                  Generates                   Generates
   ↓                          ↓                           ↓
Output: [A]                Output: [A, B]              Output: [A, B, C]
   ↓                          ↓                           ↓
   └──→ Output ──→           └──→ Output ──→            Result
        (passes              (passes
         through)             through)
```

## Why This Design?

### Advantages of Accumulation:

1. **Conversation History**: Each node sees the full conversation/iteration history
2. **Iterative Refinement**: Nodes can reference previous steps in the chain
3. **Context Awareness**: Later nodes understand the evolution of the output
4. **Rich Generation**: AI models get more context for better results

### Example Use Case:
```
Art Director A: "Create a character"
    ↓
Output → Art Director B: "Add armor"
             ↓ (knows about character from A)
Output → Art Director C: "Make it fantasy style"
             ↓ (knows about character + armor from A & B)
Final Result: Fantasy character with armor
```

## What Gets Accumulated?

### ✅ Accumulated in Context:
- **User prompts** from each Art Director
- **Assistant responses** (image metadata, descriptions)
- **Image references** from each generation
- **Conversation flow** (the full chain)

### Context Message Structure:
```typescript
{
  messages: [
    { role: 'user', content: 'prompt from A' },
    { role: 'assistant', content: [{ type: 'image', imageUrl: '...' }] },
    { role: 'user', content: 'prompt from B' },
    { role: 'assistant', content: [{ type: 'image', imageUrl: '...' }] },
    { role: 'user', content: 'prompt from C' },
    { role: 'assistant', content: [{ type: 'image', imageUrl: '...' }] }
  ],
  threadId: '...'
}
```

## Output Node's Role

The Output node acts as a **pass-through relay**:

```typescript
// From OutputNode.tsx (lines 95-102)
if (data.onOutput) {
  logger.debug('[OutputNode] Sending new page to connected nodes via onOutput');
  data.onOutput({
    nodeId: id,
    content: inputData.content,
    context: inputData.context,  // ← Passes context unchanged
    type: inputData.type
  });
}
```

**Key behaviors:**
- ✅ Receives context from upstream node
- ✅ Stores it internally (for pagination/display)
- ✅ Forwards it unchanged to downstream nodes
- ❌ Does NOT modify or filter the context

## Alternative Patterns

### Pattern 1: Linear Chain (Your Example)
```
A → Output → B → Output → C
Result: C receives [A, B] context ✓
```

### Pattern 2: Direct Connection
```
A → B → C
Result: C receives [A, B] context ✓
(Same result, Output nodes are optional relays)
```

### Pattern 3: Branching & Merging
```
A → B ──┐
        ├→ C
A → D ──┘
Result: C receives whichever branch connects last
(Context from one branch only, not both)
```

### Pattern 4: Multi-Input Merging
```
A ──┐
    ├→ C
B ──┘
Result: C merges contexts from BOTH A and B
Total messages: [A messages + B messages]
```

## Verification

### Check in Console Logs:
When Art Director C receives input, you'll see:
```
[useNodeInput] Received input: {...}
[useNodeInput] Context: {...}
[useNodeInput] Context messages: 4  ← (2 from A + 2 from B)
[useNodeInput] Merging contexts - existing: 0, new: 4
```

After C generates:
```
[useNodeInput] Merging contexts - existing: 4, new: 2
Result: 6 total messages (A + B + C)
```

### Inspect in Code:
Add logging in your Art Director C node:
```typescript
useEffect(() => {
  if (inputContext) {
    console.log('Art Director C context:', inputContext);
    console.log('Total messages:', inputContext.messages?.length);
    inputContext.messages?.forEach((msg, i) => {
      console.log(`Message ${i}:`, msg);
    });
  }
}, [inputContext]);
```

## Impact on Generation

### For Image Generation:
When Art Director C generates, it sends the full context to the AI service:
- **Prompt enhancement**: Your prompt + context history
- **Image awareness**: Knows about previous images (A's and B's)
- **Evolution tracking**: Understands the progression of refinements

### From `useNodeEditor.ts` (lines 260-310):
```typescript
// Gather fileContexts and connected node contexts
let allFileContexts = Array.isArray(data.fileContexts) ? [...data.fileContexts] : [];

// Try to gather image context from connected input nodes
if (inputNodes && Array.isArray(inputNodes)) {
  inputNodes.forEach((inputNode: any) => {
    // ImagePrompt: generated image
    if (inputNode.type === 'imagePrompt' && inputNode.data?.generatedImageUrl) {
      allFileContexts.push({
        fileId: inputNode.id,
        fileName: inputNode.data.prompt || 'Generated Image',
        content: { type: 'image', imageUrl: inputNode.data.generatedImageUrl },
        contextPrompt: inputNode.data.prompt
      });
    }
  });
}
```

## Best Practices

### 1. **Use Output Nodes for Branching**
```
A → Output ──┬→ B (one direction)
             └→ C (another direction)
```

### 2. **Monitor Context Growth**
Long chains can accumulate many messages:
```
A → B → C → D → E → F
(Could have 12+ messages)
```
Consider: Token limits, performance, relevance

### 3. **Reset Context When Needed**
Start fresh by disconnecting or using a new Starting Prompt

### 4. **Leverage Full Context**
Later nodes can reference earlier work:
```
C's prompt: "Combine the style from step A with the colors from step B"
```

## Technical Details

### Files:
- **Context Merging**: `src/hooks/useNodeEditor.ts` (lines 130-175)
- **Output Forwarding**: `src/components/OutputNode.tsx` (lines 95-102)
- **Context Processing**: All node components using `usePromptNode`

### Types:
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

## Summary

**In the chain `Art Director A → Output → Art Director B → Output → Art Director C`:**

✅ **Art Director C receives BOTH A and B outputs as accumulated context**
- Context messages: ~6 total (2 from A + 2 from B + 2 from C during generation)
- Full conversation history is preserved and accumulated
- Each node sees all previous interactions in the chain
- Output nodes pass context through unchanged

This enables **iterative refinement workflows** where each node builds upon the work of all previous nodes in the chain.
