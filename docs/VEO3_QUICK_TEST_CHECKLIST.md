# VEO-3 Quick Test Checklist

## 🚀 Quick Start Testing (5 minutes)

### ✅ Basic Functionality Test
- [ ] Add Motion Director node to canvas
- [ ] Enter prompt: "A peaceful forest scene with morning light"
- [ ] Verify aspect ratio selector shows only **16:9** and **9:16** (NO 1:1)
- [ ] Press Ctrl+Enter
- [ ] Check console for debug messages
- [ ] Verify video generation completes without errors

**Expected Console Output:**
```
[DEBUG] Starting VEO-3 video generation with prompt: ...
[DEBUG] Aspect ratio: 16:9
[DEBUG] Video generation request: {model: 'veo-3.0-fast-generate-001', hasImage: false}
```

---

## 🔍 Critical Issues to Check

### Issue #1: Aspect Ratio Validation ⚠️
**Problem:** Using 1:1 aspect ratio causes 400 error

**Check:**
- [ ] Aspect ratio dropdown has ONLY 2 options:
  - 9:16 (Portrait)
  - 16:9 (Landscape)
- [ ] NO "1:1 (Square)" option visible

**If 1:1 is present:** File is not updated correctly!

---

### Issue #2: Motion Director Connection Error ⚠️
**Problem:** Errors occur when connecting Image Panel to Motion Director

**Test:**
- [ ] Add Image Panel node
- [ ] Add Motion Director node
- [ ] Connect Image Panel → Motion Director
- [ ] Upload PNG image to Image Panel
- [ ] In Motion Director, enter: "Bring this image to life with gentle motion"
- [ ] Press Ctrl+Enter

**Expected Console:**
```
[DEBUG] Adding image context to video generation
[DEBUG] Image parsed: {mimeType: 'image/png', base64Length: XXXXXX}
[DEBUG] Video generation request: {model: 'veo-3.0-fast-generate-001', hasImage: true}
```

**Expected Result:** ✅ Video generates successfully

---

## ⚡ 3-Step Smoke Test

### Test 1: Standalone Mode (No connections)
```
1. Motion Director node
2. Prompt: "Ocean waves at sunset"
3. Ctrl+Enter
✅ Should complete in 30-90 seconds
```

### Test 2: Portrait Mode
```
1. Motion Director node
2. Set aspect ratio: 9:16 (Portrait)
3. Prompt: "Vertical waterfall flowing down"
4. Ctrl+Enter
✅ Should complete without aspect ratio errors
```

### Test 3: Image-to-Video
```
1. Image Panel → Motion Director
2. Upload landscape image
3. Motion Director prompt: "Add camera motion"
4. Ctrl+Enter
✅ Should include image in request (check console)
```

---

## 🐛 Error Scenarios to Verify

### Error Handling Checklist
- [ ] **No API Key:** Clear error message shown
- [ ] **Invalid API Key:** Permission denied error with helpful hint
- [ ] **Empty Prompt:** Validation prevents submission
- [ ] **Network Error:** Graceful failure, no crash
- [ ] **Timeout:** Shows timeout message after 10 minutes

---

## 📊 Console Debug Verification

**Open browser console (F12) and check for:**

### ✅ Good Signs
```
[DEBUG] VEO-3 client initialized successfully
[DEBUG] Starting VEO-3 video generation...
[DEBUG] VEO-3 operation started, operation ID: ...
[DEBUG] Video generated successfully
[DEBUG] Blob URL created successfully
```

### ❌ Bad Signs (Should NOT appear)
```
[ERROR] `aspectRatio` does not support `1:1` as a valid value  ← CRITICAL BUG
[ERROR] Bad Request (400)  ← Check aspect ratio
[ERROR] undefined is not an object  ← Code error
```

---

## 🎯 Priority Test Matrix

| Priority | Test Scenario | Time | Status |
|----------|--------------|------|--------|
| **P0** | Aspect ratio has NO 1:1 option | 10s | [ ] |
| **P0** | Standalone video generation works | 2m | [ ] |
| **P0** | No errors with Image Panel connection | 2m | [ ] |
| **P1** | 16:9 aspect ratio works | 2m | [ ] |
| **P1** | 9:16 aspect ratio works | 2m | [ ] |
| **P1** | Image-to-video includes image | 2m | [ ] |
| **P2** | Error messages are helpful | 1m | [ ] |
| **P2** | Context from previous nodes works | 2m | [ ] |

**Total Time:** ~15 minutes for all priority tests

---

## 🔧 Quick Fixes

### If aspect ratio 1:1 is still visible:
```bash
# Check the file
cat src/components/VideoPromptNode.tsx | grep -A5 "Aspect Ratio"

# Should see only 2 options: 9:16 and 16:9
# If 1:1 is present, the file wasn't updated correctly
```

### If getting 400 errors:
1. Check console for exact error message
2. Look for "aspectRatio" in error
3. Verify dropdown selection
4. Check network tab for API request payload

### If image not included:
1. Console should show: "Adding image context to video generation"
2. Console should show: "Image parsed: {mimeType: ..., base64Length: ...}"
3. If missing, check connection between nodes
4. Verify image uploaded successfully to Image Panel

---

## 📝 One-Line Status Check

**Run in browser console:**
```javascript
// Check if VeoVideoService is configured
console.log('VEO-3 Configured:', window.localStorage.getItem('REACT_APP_GOOGLE_API_KEY') ? 'YES' : 'NO');
```

---

## ✅ Test Sign-Off

**Before marking as complete, verify:**
- [ ] No 1:1 aspect ratio in dropdown
- [ ] Standalone generation works
- [ ] Image Panel connection works
- [ ] Both aspect ratios (16:9, 9:16) work
- [ ] Error messages are helpful
- [ ] No console errors during normal operation
- [ ] Video download creates blob URLs
- [ ] Context from connected nodes is included

**Tester:** _______________
**Date:** _______________
**Build:** _______________
**Result:** PASS / FAIL

---

## 🚨 Known Issues & Workarounds

### Issue: "Video generated but download failed"
**Workaround:** This is expected with CORS restrictions. Video URI is still logged.

### Issue: Long generation times (>2 minutes)
**Workaround:** This is normal. VEO-3 can take up to 90 seconds. Wait for completion.

### Issue: Rate limit errors
**Workaround:** Wait 60 seconds between requests. Max 10 requests per minute.

---

## 📞 Emergency Debug Commands

**Check API configuration:**
```javascript
console.log('API Key exists:', !!process.env.REACT_APP_GOOGLE_API_KEY);
```

**Check service status:**
```javascript
import VeoVideoService from './services/VeoVideoService';
console.log('VEO-3 configured:', VeoVideoService.isConfigured());
```

**Monitor all VEO-3 debug logs:**
```javascript
// In browser console, filter by "VEO"
```

---

## 🎓 Quick Reference: Expected Behavior

| Scenario | Expected Result | Time |
|----------|----------------|------|
| Standalone generation | Success, video created | 30-90s |
| With text context | Context in prompt, success | 30-90s |
| With image context | Image included, success | 30-90s |
| 16:9 aspect ratio | Success | 30-90s |
| 9:16 aspect ratio | Success | 30-90s |
| Empty prompt | Validation error, no API call | Instant |
| No API key | Configuration error | Instant |
| Invalid API key | Permission error | 1-2s |

---

**Last Updated:** 2025-10-08
**Version:** 1.0
**Status:** VEO-3 Fast Implementation
