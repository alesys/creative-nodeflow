# VEO-3 Image-to-Video Bug Fix

## Issue Summary

**Date:** 2025-10-08
**Severity:** Critical
**Component:** Image-to-Video Generation
**Status:** ✅ FIXED

---

## Problem Description

When connecting an Image Panel node to the Motion Director (Video Prompt) node, the video generation would fail with a 400 Bad Request error:

```
Error: Input instance with `image` should contain both
`bytesBase64Encoded` and `mimeType` in underlying struct value.
```

### Error Details

**Console Output:**
```
[DEBUG] Adding image context to video generation
[DEBUG] Image parsed: {mimeType: 'image/png', base64Length: 818604}
[DEBUG] Video generation request: {model: 'veo-3.0-fast-generate-001', hasImage: true}

POST https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-fast-generate-001:predictLongRunning 400 (Bad Request)

[ERROR] VEO-3 Video Generation Error: {
  message: '{"error":{"code":400,"message":"Input instance with `image`
  should contain both `bytesBase64Encoded` and `mimeType` in underlying struct value.",
  "status":"INVALID_ARGUMENT"}}'
}
```

---

## Root Cause

The `@google/genai` SDK (version 1.22.0) uses different field names than the raw Vertex AI REST API.

### Incorrect Code (VeoVideoService.ts:111-114)
```typescript
videoRequest.image = {
  bytesBase64Encoded: matches[2],  // ❌ WRONG - REST API format
  mimeType: matches[1]
};
```

This format works for the **Vertex AI REST API**, but the `@google/genai` SDK expects:

### Correct Code
```typescript
videoRequest.image = {
  imageBytes: matches[2],  // ✅ CORRECT - SDK format
  mimeType: matches[1]
};
```

---

## The Fix

**File:** [src/services/VeoVideoService.ts](../src/services/VeoVideoService.ts)
**Line:** 111-114

### Change Made
```diff
videoRequest.image = {
-  bytesBase64Encoded: matches[2],
+  imageBytes: matches[2],
   mimeType: matches[1]
};
```

### Updated Unit Tests
**File:** [src/services/__tests__/VeoVideoService.test.ts](../src/services/__tests__/VeoVideoService.test.ts)

Updated test assertions:
```diff
- expect(callArgs.image.bytesBase64Encoded).toBe('...');
+ expect(callArgs.image.imageBytes).toBe('...');
```

---

## API Reference

### @google/genai SDK Image Interface

According to the TypeScript type definitions in `@google/genai` v1.22.0:

```typescript
interface Image {
  gcsUri?: string;      // Cloud Storage URI (alternative to imageBytes)
  imageBytes?: string;  // Base64 encoded image bytes (no data: prefix)
  mimeType?: string;    // MIME type: "image/png" or "image/jpeg"
}
```

### Key Differences

| Field | Vertex AI REST API | @google/genai SDK |
|-------|-------------------|-------------------|
| Image data | `bytesBase64Encoded` | `imageBytes` |
| MIME type | `mimeType` | `mimeType` |
| Format | Same | Same |

---

## Verification

### Before Fix
```
✅ Standalone video generation (no image) - WORKS
❌ Image-to-video generation - FAILS with 400 error
```

### After Fix
```
✅ Standalone video generation (no image) - WORKS
✅ Image-to-video generation - WORKS
```

---

## Testing

### Manual Test Case

**Steps:**
1. Add an Image Panel node
2. Add a Motion Director node
3. Connect Image Panel → Motion Director
4. Upload a PNG or JPEG image to Image Panel
5. In Motion Director, enter prompt: "Bring this image to life with gentle motion"
6. Set aspect ratio to 16:9
7. Press Ctrl+Enter

**Expected Result:**
- ✅ No 400 errors
- ✅ Console shows: "Adding image context to video generation"
- ✅ Console shows: "Image parsed: {mimeType: 'image/png', base64Length: XXXXX}"
- ✅ Video generation proceeds successfully

**Console Output (Success):**
```
[DEBUG] Adding image context to video generation
[DEBUG] Image parsed: {mimeType: 'image/png', base64Length: 818604}
[DEBUG] Video generation request: {model: 'veo-3.0-fast-generate-001', hasImage: true}
[DEBUG] VEO-3 operation started, operation ID: operations/...
[DEBUG] Polling VEO-3 operation... (1/60)
[DEBUG] Video generated successfully
```

### Unit Test Coverage

**Tests Updated:**
- `should extract and include image from context` (Line 368)
- `should only use first image when multiple images in context` (Line 405)

**All tests passing:** ✅

---

## Image Requirements

### Supported Formats
- ✅ PNG (`image/png`)
- ✅ JPEG (`image/jpeg`)

### Recommended Specifications
- **Resolution:** 720p (1280 x 720) or higher
- **Aspect Ratio:** 16:9 or 9:16 (matching video aspect ratio)
- **Max File Size:** 20MB
- **Base64 Encoding:** Without `data:` prefix in `imageBytes` field

### Data URL Parsing
The service correctly parses data URLs in this format:
```
data:image/png;base64,iVBORw0KGgoAAAANS...
     ↑          ↑       ↑
     |          |       └─ Base64 data → imageBytes
     |          └─────────── mimeType
     └────────────────────── Prefix (removed)
```

---

## Related Issues Fixed

### Issue #1: Aspect Ratio 1:1
- **Status:** ✅ Fixed in previous session
- **File:** VideoPromptNode.tsx
- **Change:** Removed unsupported 1:1 option

### Issue #2: Image-to-Video API Format
- **Status:** ✅ Fixed in this session
- **File:** VeoVideoService.ts
- **Change:** Changed `bytesBase64Encoded` to `imageBytes`

---

## Impact Analysis

### Before Fix
- ❌ Image-to-video completely non-functional
- ❌ All Image Panel → Motion Director connections failed
- ❌ Users could not animate images

### After Fix
- ✅ Image-to-video fully functional
- ✅ Image Panel → Motion Director connections work
- ✅ Users can animate uploaded images

### Backward Compatibility
- ✅ No breaking changes
- ✅ Standalone video generation unaffected
- ✅ Text context handling unaffected
- ✅ All existing workflows continue to work

---

## Official Documentation Sources

1. **Google AI for Developers - Video Generation**
   - URL: https://ai.google.dev/gemini-api/docs/video
   - Confirms `imageBytes` field name

2. **@google/genai NPM Package**
   - Version: 1.22.0
   - TypeScript definitions include `Image` interface

3. **Vertex AI VEO-3 Documentation**
   - URL: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation
   - Shows SDK usage examples

---

## Lessons Learned

### Key Takeaway
**Always check SDK documentation over REST API documentation** when using an SDK. Field names and structures may differ between:
- Raw REST API calls
- SDK wrapper libraries

### SDK vs REST API Differences

| Aspect | REST API | SDK |
|--------|----------|-----|
| Field names | May differ | Abstracted |
| Error messages | Low-level | High-level |
| Type safety | None | TypeScript types |
| Documentation | Comprehensive | SDK-specific |

### Best Practices
1. ✅ Check SDK TypeScript type definitions
2. ✅ Test with actual API calls early
3. ✅ Log request payloads for debugging
4. ✅ Monitor console for API errors
5. ✅ Keep unit tests in sync with implementation

---

## Debugging Tips

### How to Debug Similar Issues

**Step 1: Check Console Logs**
```javascript
logger.debug('Video generation request:', {
  model: videoRequest.model,
  hasImage: !!videoRequest.image
});
```

**Step 2: Inspect Network Tab**
- Open DevTools → Network
- Filter for `predictLongRunning`
- Check request payload
- Verify field names match SDK expectations

**Step 3: Review Error Message**
```
"Input instance with `image` should contain both
`bytesBase64Encoded` and `mimeType` in underlying struct value."
```
This error specifically indicates wrong field names.

**Step 4: Check TypeScript Types**
```typescript
// In node_modules/@google/genai/dist/index.d.ts
interface Image {
  imageBytes?: string;  // ← This is the correct field name
  mimeType?: string;
}
```

---

## Quick Reference

### Working Image-to-Video Code

```typescript
// Parse image from data URL
const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
if (matches) {
  videoRequest.image = {
    imageBytes: matches[2],   // Base64 string (no prefix)
    mimeType: matches[1]      // e.g., "image/png"
  };
}

// Generate video
const operation = await this.client.models.generateVideos({
  model: 'veo-3.0-fast-generate-001',
  prompt: 'Bring this image to life',
  image: {
    imageBytes: '...',
    mimeType: 'image/png'
  },
  config: {
    aspectRatio: '16:9'
  }
});
```

---

## Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| VeoVideoService.ts | ✅ Fixed | Changed to `imageBytes` |
| Unit tests | ✅ Updated | All passing |
| Documentation | ✅ Updated | This document |
| Manual testing | ✅ Verified | Image-to-video works |

---

**Fix Applied:** 2025-10-08
**Verified By:** Comprehensive testing
**Status:** ✅ RESOLVED
