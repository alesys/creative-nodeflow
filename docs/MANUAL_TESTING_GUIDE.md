# Manual Testing Guide - Connection Validation

## Quick Test Checklist ✅

### Prerequisites
- [x] Dev server running at http://localhost:3000
- [x] Zero compilation errors
- [x] Browser open to application

---

## Test Suite 1: Valid Connections (Should Succeed ✅)

### Test 1.1: Text Chain
**Steps:**
1. Add "Starting Prompt" node
2. Add "Agent Prompt" node
3. Connect Starting Prompt (text output) → Agent Prompt (text input)

**Expected:** ✅ Connection created successfully, no alert

### Test 1.2: Image Chain
**Steps:**
1. Add "Image Prompt" node
2. Add "Image Panel" node
3. Connect Image Prompt (image output) → Image Panel (image input)

**Expected:** ✅ Connection created successfully, no alert

### Test 1.3: Video to Universal
**Steps:**
1. Add "Video Prompt" node
2. Add "Output" node
3. Connect Video Prompt (video output) → Output (any input)

**Expected:** ✅ Connection created successfully, no alert

### Test 1.4: Multi-Input (Text to Video)
**Steps:**
1. Add "Starting Prompt" node
2. Add "Video Prompt" node
3. Connect Starting Prompt (text output) → Video Prompt (top input - any type)

**Expected:** ✅ Connection created successfully, no alert

### Test 1.5: Multi-Input (Image to Video)
**Steps:**
1. Add "Image Prompt" node
2. Add "Video Prompt" node
3. Connect Image Prompt (image output) → Video Prompt (bottom input - any type)

**Expected:** ✅ Connection created successfully, no alert

### Test 1.6: Universal Receiver
**Steps:**
1. Add any node type (Starting Prompt, Image Prompt, Video Prompt)
2. Add "Output" node
3. Connect any node → Output (any input)

**Expected:** ✅ Connection created successfully for all types, no alert

---

## Test Suite 2: Invalid Connections (Should Fail ❌)

### Test 2.1: Text to Image (Invalid)
**Steps:**
1. Add "Starting Prompt" node
2. Add "Image Panel" node
3. Attempt to connect Starting Prompt (text) → Image Panel (image input)

**Expected:** 
- ❌ Connection NOT created
- ⚠️ Alert shown: "Cannot connect text output to image input. Types must be compatible."

### Test 2.2: Text to Video (Invalid)
**Steps:**
1. Add "Agent Prompt" node
2. Add "Video Prompt" node
3. Attempt to connect Agent Prompt (text) → Video Prompt (video output handle)

**Expected:**
- ❌ Connection NOT created
- ⚠️ Alert shown: "Cannot connect text output to video input. Types must be compatible."

### Test 2.3: Image to Text (Invalid)
**Steps:**
1. Add "Image Prompt" node
2. Add "Agent Prompt" node
3. Attempt to connect Image Prompt (image) → Agent Prompt (text input)

**Expected:**
- ❌ Connection NOT created
- ⚠️ Alert shown: "Cannot connect image output to text input. Types must be compatible."

### Test 2.4: Image to Video (Invalid)
**Steps:**
1. Add "Image Panel" node
2. Add "Video Prompt" node
3. Attempt to connect Image Panel (image) → Video Prompt (video output handle)

**Expected:**
- ❌ Connection NOT created
- ⚠️ Alert shown: "Cannot connect image output to video input. Types must be compatible."

### Test 2.5: Video to Text (Invalid)
**Steps:**
1. Add "Video Prompt" node
2. Add "Agent Prompt" node
3. Attempt to connect Video Prompt (video) → Agent Prompt (text input)

**Expected:**
- ❌ Connection NOT created
- ⚠️ Alert shown: "Cannot connect video output to text input. Types must be compatible."

### Test 2.6: Video to Image (Invalid)
**Steps:**
1. Add "Video Prompt" node
2. Add "Image Panel" node
3. Attempt to connect Video Prompt (video) → Image Panel (image input)

**Expected:**
- ❌ Connection NOT created
- ⚠️ Alert shown: "Cannot connect video output to image input. Types must be compatible."

---

## Test Suite 3: Edge Cases

### Test 3.1: Self-Connection (Should Fail)
**Steps:**
1. Add "Agent Prompt" node
2. Attempt to connect node's output to its own input

**Expected:** ❌ ReactFlow prevents self-connections (built-in behavior)

### Test 3.2: Multiple Connections to Same Input
**Steps:**
1. Add two "Starting Prompt" nodes
2. Add one "Agent Prompt" node
3. Connect StartingPrompt1 → AgentPrompt
4. Attempt to connect StartingPrompt2 → AgentPrompt (same input)

**Expected:** 
- First connection: ✅ Success
- Second connection: Behavior depends on ReactFlow settings (may replace or multi-connect)

### Test 3.3: Connector Color Verification
**Steps:**
1. Add all node types
2. Visually inspect connector colors

**Expected:**
- Text connectors: Blue (#3B82F6)
- Image connectors: Purple (#A855F7)
- Video connectors: Red (#EF4444)
- Any connectors: Gray (#6B7280)

### Test 3.4: Multi-Connector Positioning
**Steps:**
1. Add "Video Prompt" node (has 2 inputs + 1 output)
2. Verify connector positions

**Expected:**
- Top input (text/any): Positioned at top-center
- Bottom input (image/any): Positioned at bottom-center
- Output (video): Positioned at middle-right
- No overlap between connectors

---

## Test Suite 4: User Experience

### Test 4.1: Alert Message Clarity
**Steps:**
1. Attempt any invalid connection (e.g., text → image)
2. Read alert message

**Expected:**
- ⚠️ Alert clearly states connector types involved
- Message format: "Cannot connect {sourceType} output to {targetType} input. Types must be compatible."
- User can understand why connection failed

### Test 4.2: Alert Dismissal
**Steps:**
1. Trigger alert with invalid connection
2. Click "OK" or close button

**Expected:**
- ✅ Alert dismisses cleanly
- No error in console
- Can attempt another connection

### Test 4.3: Multiple Failed Attempts
**Steps:**
1. Attempt invalid connection
2. Dismiss alert
3. Immediately attempt another invalid connection

**Expected:**
- Each attempt shows new alert
- No alert stacking issues
- No performance degradation

---

## Test Suite 5: Integration Tests

### Test 5.1: Complete Workflow
**Steps:**
1. Create: Starting Prompt → Agent Prompt → Image Prompt → Image Panel → Output
2. Verify all connections are valid (text → text → text → image → image → any)

**Expected:** ✅ All connections succeed, workflow functional

### Test 5.2: Mixed Valid/Invalid Workflow
**Steps:**
1. Create Starting Prompt → Agent Prompt (✅ valid)
2. Attempt Agent Prompt → Image Panel (❌ invalid)
3. Create Image Prompt → Image Panel (✅ valid)

**Expected:**
- Valid connections: ✅ Created
- Invalid connections: ❌ Blocked with alert
- Valid connections remain unaffected

### Test 5.3: Existing Edges Preserved
**Steps:**
1. Create any valid connection
2. Reload page or change something
3. Verify existing connection still works

**Expected:** ✅ Backwards compatibility - existing edges remain functional

---

## Console Error Check

### During All Tests:
**Steps:**
1. Open browser DevTools (F12)
2. Check Console tab during testing

**Expected:**
- ✅ Zero errors
- ✅ Zero warnings (except React DevTools, ResizeObserver)
- ✅ Clean console throughout

---

## Performance Check

### Test P.1: Connection Speed
**Steps:**
1. Create 10+ valid connections rapidly
2. Measure response time

**Expected:**
- ✅ Each connection validates in <2ms
- ✅ No lag or delay
- ✅ Smooth user experience

### Test P.2: Memory Usage
**Steps:**
1. Create 20+ nodes with connections
2. Monitor browser memory (Performance tab)

**Expected:**
- ✅ No memory leaks
- ✅ Memory usage stable
- ✅ No significant increase over time

---

## Regression Testing

### Test R.1: Node Features Still Work
**Steps:**
1. Test each node's core functionality:
   - Starting Prompt: Edit prompt, change API
   - Agent Prompt: Add context, chain prompts
   - Image Prompt: Generate image, change model
   - Video Prompt: Upload image, generate video
   - Output: Display results, view history
   - Image Panel: Gallery view, file management

**Expected:** ✅ All features work as before migration

### Test R.2: Node Resizing
**Steps:**
1. Add any node
2. Drag resize handles

**Expected:**
- ✅ Node resizes smoothly
- ✅ Min/max dimensions respected
- ✅ Content scales appropriately

### Test R.3: Node Deletion
**Steps:**
1. Add node
2. Click delete button (X)

**Expected:**
- ✅ Node deleted
- ✅ Connected edges removed
- ✅ No orphaned data

---

## Bug Tracking

### If Test Fails:
1. **Document:**
   - Test number
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors (if any)
   - Screenshots

2. **Check:**
   - Browser console for errors
   - Network tab for failed requests
   - React DevTools for state issues

3. **Report:**
   - File in issue tracker
   - Tag as "Phase 3" bug
   - Include reproduction steps

---

## Test Results Template

```
## Test Session: [Date/Time]

### Environment
- Browser: Chrome/Firefox/Edge [version]
- OS: Windows/Mac/Linux
- Dev Server: localhost:3000

### Test Results
- Suite 1 (Valid Connections): [X/6 passed]
- Suite 2 (Invalid Connections): [X/6 passed]
- Suite 3 (Edge Cases): [X/4 passed]
- Suite 4 (UX): [X/3 passed]
- Suite 5 (Integration): [X/3 passed]
- Console Errors: [X found]
- Performance: [Pass/Fail]
- Regression: [X/3 passed]

### Overall: [Pass/Fail]

### Issues Found:
1. [Issue description]
2. [Issue description]

### Notes:
[Additional observations]
```

---

## Quick Start Testing

**For rapid validation, run these 3 tests:**

1. **Valid Connection:** Starting Prompt → Agent Prompt → ✅
2. **Invalid Connection:** Starting Prompt → Image Panel → ❌ + Alert
3. **Console Check:** Zero errors → ✅

If all 3 pass: System is working correctly ✅

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Estimated Testing Time:** 20-30 minutes (full suite)  
**Quick Test Time:** 2-3 minutes
