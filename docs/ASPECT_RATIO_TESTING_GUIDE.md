# Aspect Ratio Testing Guide

## Pre-Testing Setup
- ✅ App is running at http://localhost:3000
- ✅ All changes committed (commit: e8dfc04)
- ✅ Google API key configured in `.env` file
- ✅ Billing enabled for Google AI Studio (required for image and video generation)

## Test Environment
- **Browser**: Open browser DevTools Console (F12) to view debug logs
- **Verification**: Look for logs showing aspect ratio being used in API calls

## Test Plan

### 🖼️ Art Director (Image Generation) Tests

#### Test 1: Default Aspect Ratio (1:1)
1. Add an Art Director node to the canvas
2. Verify the aspect ratio selector shows "1:1 (Square)" as default
3. Enter a prompt: "A beautiful sunset over mountains"
4. Press Ctrl+Enter to generate
5. **Expected Result**: 
   - Console shows: `Using normalized aspect ratio: 1:1`
   - Generated image is square (1024x1024)

#### Test 2: Landscape Format (16:9)
1. Select "16:9 (Landscape)" from the aspect ratio dropdown
2. Enter prompt: "Wide panoramic view of a beach at sunset"
3. Press Ctrl+Enter to generate
4. **Expected Result**:
   - Console shows: `Using normalized aspect ratio: 16:9`
   - Generated image is landscape (1344x768)

#### Test 3: Portrait Format (9:16)
1. Select "9:16 (Portrait)" from the aspect ratio dropdown
2. Enter prompt: "Tall building reaching into the sky"
3. Press Ctrl+Enter to generate
4. **Expected Result**:
   - Console shows: `Using normalized aspect ratio: 9:16`
   - Generated image is portrait (768x1344)

#### Test 4: Other Formats
Test each of these formats:
- **4:5**: Social media portrait (896x1152)
- **5:4**: Slightly wide (1152x896)
- **4:3**: Standard landscape (1184x864)
- **3:4**: Standard portrait (864x1184)
- **3:2**: Classic landscape (1248x832)
- **2:3**: Classic portrait (832x1248)

#### Test 5: Persistence After Edit
1. Select "16:9 (Landscape)"
2. Generate an image
3. Click the node to edit the prompt
4. Make a small change to the text
5. Check aspect ratio selector
6. **Expected Result**: Still shows "16:9 (Landscape)"

#### Test 6: Persistence After Page Reload
1. Select "9:16 (Portrait)" 
2. Refresh the browser page (F5)
3. Check the Art Director node's aspect ratio selector
4. **Expected Result**: Should still show "9:16 (Portrait)"

---

### 🎬 Motion Director (Video Generation) Tests

#### Test 1: Default Aspect Ratio (16:9)
1. Add a Motion Director node to the canvas
2. Verify the aspect ratio selector shows "16:9 (Landscape)" as default
3. Enter a prompt: "A drone shot flying over a city at sunset"
4. Press Ctrl+Enter to generate
5. **Expected Result**:
   - Console shows: `VEO-3 config: { aspectRatio: '16:9', ... }`
   - Generated video is 16:9 landscape format (1280x720 or 1920x1080)

#### Test 2: Portrait Format (9:16)
1. Select "9:16 (Portrait)" from the aspect ratio dropdown
2. Enter prompt: "A person walking down a street, shot from above"
3. Press Ctrl+Enter to generate
4. **Expected Result**:
   - Console shows: `VEO-3 config: { aspectRatio: '9:16', ... }`
   - Generated video is 9:16 portrait format (720x1280)

#### Test 3: Persistence After Edit
1. Select "9:16 (Portrait)"
2. Generate a video (wait for completion)
3. Click the node to edit the prompt
4. Make a small change to the text
5. Check aspect ratio selector
6. **Expected Result**: Still shows "9:16 (Portrait)"

#### Test 4: Persistence After Page Reload
1. Select "9:16 (Portrait)"
2. Refresh the browser page (F5)
3. Check the Motion Director node's aspect ratio selector
4. **Expected Result**: Should still show "9:16 (Portrait)"

---

### 🔗 Multi-Node Workflow Tests

#### Test 5: Art Director with Context
1. Add a Starting Prompt node with text: "A futuristic city"
2. Add an Art Director node
3. Connect Starting Prompt → Art Director
4. In Art Director, select "21:9" (ultra-wide, if available in dropdown - otherwise use 16:9)
5. Enter prompt: "Render this as a wide cinematic shot"
6. Press Ctrl+Enter to generate
7. **Expected Result**: Image generated in selected aspect ratio, incorporating the context

#### Test 6: Motion Director with Image Input
1. Add an Art Director node and generate a 16:9 landscape image
2. Add a Motion Director node
3. Connect Art Director → Motion Director (image input)
4. In Motion Director, select "16:9"
5. Enter prompt: "Animate this scene with gentle camera movement"
6. Press Ctrl+Enter to generate
7. **Expected Result**: Video generated in 16:9 format, using the image as a starting frame

---

## Console Log Verification

### What to Look For

**For Art Director (Images):**
```
Using aspect ratio: 16:9
Using normalized aspect ratio: 16:9
Enhanced prompt with aspect ratio instruction: 16:9
Generated image with imageConfig: 16:9
```

**For Motion Director (Videos):**
```
Aspect ratio: 16:9
VEO-3 config: { aspectRatio: '16:9', negativePrompt: 'low quality, blurry, distorted' }
Starting VEO-3 video generation with prompt: ...
```

---

## Troubleshooting

### Image Always 1:1 Despite Selection
**Check:**
1. Console logs - Is aspect ratio being passed to API?
2. Browser console errors - Any TypeScript or React errors?
3. Node data - Use React DevTools to inspect node data and verify `aspectRatio` field is set

**Solution:**
- Clear browser cache and hard reload (Ctrl+Shift+R)
- Check that `handleAspectRatioChange` is being called in select onChange

### Video Aspect Ratio Not Applied
**Check:**
1. VEO-3 only supports 16:9 and 9:16
2. Console logs for config being passed
3. API response for any error messages

**Solution:**
- Verify Google API key has VEO-3 access
- Check billing is enabled
- Ensure prompt doesn't conflict with aspect ratio

### Aspect Ratio Not Persisting
**Check:**
1. ReactFlow node data using React DevTools
2. Console for any errors when calling `setNodes`

**Solution:**
- Verify `useReactFlow` hook is imported
- Check that `handleAspectRatioChange` calls `setNodes`

---

## Success Criteria

### ✅ All Tests Pass When:
1. **Art Director**:
   - Can select any of the 9 aspect ratios
   - Generated images match selected aspect ratio
   - Aspect ratio persists across edits and reloads
   - Console logs confirm aspect ratio in API calls

2. **Motion Director**:
   - Can select 16:9 or 9:16
   - Generated videos match selected aspect ratio
   - Aspect ratio persists across edits and reloads
   - Console logs confirm aspect ratio in API config

3. **Both Nodes**:
   - Aspect ratio selector updates the UI immediately
   - Node data includes `aspectRatio` field
   - No console errors or warnings
   - Works correctly in multi-node workflows

---

## API Limitations to Note

### Google Gemini (Image Generation)
- **Supported Aspect Ratios**: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
- **Image Size**: Varies by aspect ratio (see API docs)
- **Billing Required**: Yes, for image generation

### VEO-3 (Video Generation)
- **Supported Aspect Ratios**: 16:9, 9:16 only
- **Resolution**: 720p (both), 1080p (16:9 only)
- **Duration**: 8 seconds
- **Billing Required**: Yes, VEO-3 access needed

---

## Quick Test Scenario

**5-Minute Smoke Test:**
1. Open http://localhost:3000
2. Add Art Director node
3. Select "16:9 (Landscape)"
4. Enter prompt: "A landscape photo"
5. Generate → Verify 16:9 image
6. Add Motion Director node
7. Select "9:16 (Portrait)"
8. Enter prompt: "A person walking"
9. Generate → Verify 9:16 video
10. Refresh page → Verify both nodes retain aspect ratios

If all 10 steps work, the fix is successful! ✨
