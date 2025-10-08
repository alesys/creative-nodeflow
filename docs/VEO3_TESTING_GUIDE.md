# VEO-3 Video Generation - Comprehensive Testing Guide

## Overview
This document provides comprehensive testing procedures for the VEO-3 video generation system, including unit tests, integration tests, and manual testing scenarios.

## Test Environment Setup

### Prerequisites
1. Valid Google API key with VEO-3 access
2. Billing enabled in Google AI Studio
3. Node.js environment with all dependencies installed
4. React development server running

### Environment Configuration
```bash
# .env file
REACT_APP_GOOGLE_API_KEY=your-google-api-key-here
```

---

## Unit Tests

### Running Unit Tests
```bash
npm test -- VeoVideoService.test.ts
```

### Test Coverage

#### 1. Initialization Tests
- ✅ Client initialization with valid API key
- ✅ Client initialization without API key
- ✅ API key whitespace trimming
- ✅ Error handling during initialization

#### 2. Parameter Validation Tests
- ✅ Aspect ratio 16:9 (Landscape)
- ✅ Aspect ratio 9:16 (Portrait)
- ✅ Default aspect ratio (16:9)
- ✅ Invalid aspect ratio rejection (1:1)
- ✅ Client not initialized error

#### 3. Standalone Mode Tests (No Input Connection)
- ✅ Video generation with prompt only
- ✅ No image parameter when no context
- ✅ Correct model usage (veo-3.0-fast-generate-001)
- ✅ Negative prompt inclusion

#### 4. Text Context Mode Tests
- ✅ Text context inclusion in prompt
- ✅ System message filtering
- ✅ Multimodal text content handling
- ✅ Multiple message concatenation

#### 5. Image-to-Video Mode Tests
- ✅ Image extraction from context
- ✅ PNG image support
- ✅ JPEG image support
- ✅ First image selection (when multiple)
- ✅ Invalid image URL handling
- ✅ Base64 encoding verification

#### 6. Long Running Operation Tests
- ✅ Polling until completion
- ✅ Timeout handling (10 minutes max)
- ✅ Operation error handling
- ✅ Missing video response handling

#### 7. Error Handling Tests
- ✅ FAILED_PRECONDITION (billing required)
- ✅ PERMISSION_DENIED (API key issues)
- ✅ RESOURCE_EXHAUSTED (rate limits)
- ✅ NOT_FOUND (regional availability)
- ✅ Aspect ratio validation errors

#### 8. Video Download Tests
- ✅ Blob URL creation from successful download
- ✅ gs:// URI conversion to HTTPS
- ✅ HTTP/HTTPS URL handling
- ✅ Download failure graceful handling
- ✅ CORS error handling

#### 9. Context Management Tests
- ✅ Context message limit enforcement
- ✅ User request addition to context
- ✅ Assistant response addition to context

---

## Integration Tests (Manual)

### Test Case 1: Standalone Video Generation (No Connections)

**Objective:** Verify video generation works without any input connections

**Steps:**
1. Start the application
2. Add a Motion Director node to the canvas
3. Click the node to enter edit mode
4. Enter prompt: "A serene beach at sunset with gentle waves"
5. Verify aspect ratio is set to 16:9
6. Press Ctrl+Enter to generate

**Expected Results:**
- ✅ Node shows "Generating video with VEO3..." status
- ✅ Progress bar appears and animates
- ✅ After ~30-60 seconds, video generation completes
- ✅ No errors displayed
- ✅ Console shows successful operation

**Pass Criteria:**
- No errors in console
- Operation completes within timeout
- Status indicator updates correctly

---

### Test Case 2: Text-to-Video with Context

**Objective:** Verify video generation incorporates text context from connected nodes

**Steps:**
1. Add a Starting Prompt node
2. Add a Motion Director node
3. Connect Starting Prompt → Motion Director
4. In Starting Prompt, enter: "Create a cinematic scene for a sci-fi movie"
5. Press Ctrl+Enter on Starting Prompt
6. Wait for response
7. In Motion Director, enter: "A futuristic city skyline at night"
8. Press Ctrl+Enter on Motion Director

**Expected Results:**
- ✅ Motion Director receives context from Starting Prompt
- ✅ Status shows "Context received" (green)
- ✅ Input Context section shows the context messages
- ✅ Video generation uses context in prompt construction
- ✅ Generated video reflects both the context and specific prompt

**Pass Criteria:**
- Context is visible in Input Context section
- No connection errors
- Video generation completes successfully

---

### Test Case 3: Image-to-Video Generation

**Objective:** Verify image-to-video generation with VEO-3

**Steps:**
1. Add an Image Panel node
2. Add a Motion Director node
3. Connect Image Panel → Motion Director
4. Upload an image to Image Panel (landscape orientation preferred)
5. In Motion Director, enter prompt: "Add gentle camera movement and bring this scene to life"
6. Press Ctrl+Enter

**Expected Results:**
- ✅ Motion Director shows "Context received" status
- ✅ Input Context section shows "[Image]" indicator
- ✅ Console logs show "Adding image context to video generation"
- ✅ Console logs show image MIME type and base64 length
- ✅ API request includes image parameter
- ✅ Generated video animates the input image

**Pass Criteria:**
- Image is detected and included in request
- No base64 encoding errors
- Video generation incorporates the image

---

### Test Case 4: Aspect Ratio Testing (16:9 Landscape)

**Objective:** Verify 16:9 aspect ratio works correctly

**Steps:**
1. Add Motion Director node
2. Set aspect ratio to "16:9 (Landscape)"
3. Enter prompt: "A wide cinematic shot of mountains"
4. Press Ctrl+Enter

**Expected Results:**
- ✅ Video generates successfully
- ✅ Output video has 16:9 aspect ratio
- ✅ No aspect ratio validation errors

**Pass Criteria:**
- No API errors
- Video completes generation
- Correct aspect ratio in output

---

### Test Case 5: Aspect Ratio Testing (9:16 Portrait)

**Objective:** Verify 9:16 aspect ratio works correctly

**Steps:**
1. Add Motion Director node
2. Set aspect ratio to "9:16 (Portrait)"
3. Enter prompt: "A vertical shot of a waterfall cascading down"
4. Press Ctrl+Enter

**Expected Results:**
- ✅ Video generates successfully
- ✅ Output video has 9:16 aspect ratio (portrait/vertical)
- ✅ No aspect ratio validation errors

**Pass Criteria:**
- No API errors
- Video completes generation
- Correct portrait aspect ratio in output

---

### Test Case 6: Aspect Ratio Switching

**Objective:** Verify changing aspect ratio mid-session works

**Steps:**
1. Add Motion Director node
2. Generate video with 16:9
3. Wait for completion
4. Change aspect ratio to 9:16
5. Generate another video
6. Compare outputs

**Expected Results:**
- ✅ Both videos generate successfully
- ✅ First video is landscape (16:9)
- ✅ Second video is portrait (9:16)
- ✅ No state persistence issues

**Pass Criteria:**
- Both generations complete
- Different aspect ratios respected
- No errors between generations

---

### Test Case 7: Error Handling - No API Key

**Objective:** Verify graceful error handling when API key is missing

**Steps:**
1. Remove or invalidate REACT_APP_GOOGLE_API_KEY from .env
2. Restart application
3. Add Motion Director node
4. Attempt to generate video

**Expected Results:**
- ✅ Error message: "Google API key not configured"
- ✅ Error displayed in node status area
- ✅ Red error styling applied
- ✅ No application crash

**Pass Criteria:**
- Clear error message
- Application remains functional
- No uncaught exceptions

---

### Test Case 8: Error Handling - Invalid API Key

**Objective:** Verify error handling for permission issues

**Steps:**
1. Set REACT_APP_GOOGLE_API_KEY to invalid value
2. Restart application
3. Add Motion Director node
4. Attempt to generate video

**Expected Results:**
- ✅ Error message includes "PERMISSION_DENIED" or similar
- ✅ Helpful solution message: "Your API key may not have access to VEO-3"
- ✅ Error displayed in node
- ✅ No application crash

**Pass Criteria:**
- Descriptive error message
- Helpful troubleshooting hint
- Graceful failure

---

### Test Case 9: Error Handling - Rate Limiting

**Objective:** Verify rate limit error handling

**Steps:**
1. Generate 10+ videos rapidly in succession
2. Observe behavior when rate limit is hit

**Expected Results:**
- ✅ Error message: "Rate limit exceeded"
- ✅ Helpful solution: "Please wait before trying again"
- ✅ Previous successful generations remain visible
- ✅ Can retry after waiting

**Pass Criteria:**
- Clear rate limit message
- Application doesn't freeze
- Retry capability preserved

---

### Test Case 10: Long Running Operation Timeout

**Objective:** Verify timeout handling for stuck operations

**Steps:**
1. Monitor a video generation that takes longer than expected
2. Wait for maximum timeout period (10 minutes)

**Expected Results:**
- ✅ Operation polls regularly (every 10 seconds)
- ✅ Console shows polling progress
- ✅ After 60 polls (10 minutes), timeout error occurs
- ✅ Error message: "Video generation timed out"

**Pass Criteria:**
- Timeout triggers correctly
- Clear error message
- No infinite loops

---

### Test Case 11: Video Download and Playback

**Objective:** Verify video download and blob URL creation

**Steps:**
1. Generate a video successfully
2. Connect Motion Director to Output node
3. Observe video playback in Output node

**Expected Results:**
- ✅ Console shows "Fetching video from URI"
- ✅ Console shows blob details (size, type)
- ✅ Console shows "Blob URL created successfully"
- ✅ Video is playable in Output node
- ✅ Video controls work (play/pause)

**Pass Criteria:**
- Video downloads successfully
- Blob URL created
- Video plays without errors

---

### Test Case 12: CORS/Download Failure Handling

**Objective:** Verify graceful handling of download failures

**Steps:**
1. Generate video in environment with CORS restrictions
2. Observe fallback behavior

**Expected Results:**
- ✅ Video generation completes
- ✅ Download attempt is made
- ✅ If download fails, error is logged but not thrown
- ✅ Fallback message: "Video generated but download failed"
- ✅ Video URI is displayed in message

**Pass Criteria:**
- No application crash
- Informative fallback message
- URI available for manual access

---

### Test Case 13: Multimodal Context Handling

**Objective:** Verify complex context with text and images

**Steps:**
1. Create flow: Starting Prompt → Image Panel → Motion Director
2. Starting Prompt: "Create a fantasy landscape"
3. Get AI response
4. Upload fantasy landscape image to Image Panel
5. Motion Director: "Animate with magical particles"
6. Generate video

**Expected Results:**
- ✅ Motion Director receives both text and image context
- ✅ Text context influences video style
- ✅ Image is used as base for animation
- ✅ Both contexts are visible in Input Context section
- ✅ Video generation succeeds

**Pass Criteria:**
- Multiple context types handled correctly
- No context conflicts
- Video incorporates all inputs

---

### Test Case 14: Empty Prompt Validation

**Objective:** Verify validation of empty prompts

**Steps:**
1. Add Motion Director node
2. Leave prompt field empty
3. Press Ctrl+Enter

**Expected Results:**
- ✅ Error message: "Please enter video direction first"
- ✅ No API call made
- ✅ Error displayed in node status
- ✅ Can correct and retry

**Pass Criteria:**
- Validation prevents empty submissions
- Clear error message
- No wasted API calls

---

### Test Case 15: Context Message Limit

**Objective:** Verify context message limiting works

**Steps:**
1. Create long conversation chain (20+ messages)
2. Connect to Motion Director
3. Observe context handling

**Expected Results:**
- ✅ Only recent messages included in context
- ✅ Context stays within LIMITS.MAX_CONTEXT_MESSAGES
- ✅ Input Context section shows limited messages
- ✅ No performance degradation

**Pass Criteria:**
- Message limiting works
- No memory issues
- Performance acceptable

---

## Console Debugging Checklist

When testing, monitor browser console for these debug messages:

### Successful Generation
```
[DEBUG] VEO-3 client initialized successfully
[DEBUG] Starting VEO-3 video generation with prompt: ...
[DEBUG] Aspect ratio: 16:9
[DEBUG] Video generation request: {model: 'veo-3.0-fast-generate-001', hasImage: false}
[DEBUG] VEO-3 operation started, operation ID: ...
[DEBUG] Polling VEO-3 operation... (1/60)
[DEBUG] Video generated successfully: ...
[DEBUG] Fetching video from URI: ...
[DEBUG] Video blob details: {size: ..., type: 'video/mp4'}
[DEBUG] Blob URL created successfully
```

### Image-to-Video Generation
```
[DEBUG] Adding image context to video generation
[DEBUG] Image parsed: {mimeType: 'image/png', base64Length: 123456}
[DEBUG] Video generation request: {model: 'veo-3.0-fast-generate-001', hasImage: true}
```

### Expected Errors (When Testing Error Handling)
```
[ERROR] VEO-3 Video Generation Error: {message: '...', status: 400}
[ERROR] Failed to download video: ...
```

---

## Performance Benchmarks

### Expected Timings
- **API Call Initiation:** < 1 second
- **Video Generation (Fast):** 30-90 seconds
- **Polling Interval:** 10 seconds
- **Video Download:** 2-10 seconds (depends on size)
- **Total Time (Typical):** 45-120 seconds

### Resource Usage
- **Memory:** Should not exceed +50MB per video generation
- **Network:** 1-5MB download per video
- **CPU:** Minimal (mostly waiting on API)

---

## Known Limitations

1. **Aspect Ratios:** Only 16:9 and 9:16 supported (1:1 removed)
2. **Video Duration:** Fixed at 8 seconds
3. **Frame Rate:** Fixed at 24 FPS
4. **Language:** English prompts only
5. **Rate Limits:** Max 10 requests per minute
6. **Timeout:** 10 minutes maximum per generation
7. **Image Format:** PNG and JPEG only
8. **Region:** May not be available in all regions

---

## Troubleshooting Guide

### Issue: "aspectRatio does not support 1:1"
**Solution:** Use only 16:9 or 9:16. The 1:1 option has been removed.

### Issue: "FAILED_PRECONDITION"
**Solution:** Enable billing in Google AI Studio for your project.

### Issue: "PERMISSION_DENIED"
**Solution:** Verify API key has VEO-3 access. Check Google AI Studio permissions.

### Issue: "Video generation timed out"
**Solution:** Retry the generation. Peak times may cause delays.

### Issue: "Video generated but download failed"
**Solution:** Check console for CORS errors. Video may require additional authentication.

### Issue: No context received
**Solution:** Ensure nodes are properly connected. Check connection handles.

### Issue: Image not included
**Solution:** Verify image is valid data URL. Check console for parsing errors.

---

## Test Result Documentation Template

```markdown
## Test Session: [Date]

### Environment
- Node Version:
- Browser:
- API Key Status: Valid/Invalid
- Billing Status: Enabled/Disabled

### Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC1: Standalone Generation | ✅/❌ | |
| TC2: Text Context | ✅/❌ | |
| TC3: Image-to-Video | ✅/❌ | |
| TC4: 16:9 Aspect Ratio | ✅/❌ | |
| TC5: 9:16 Aspect Ratio | ✅/❌ | |
| TC6: Aspect Ratio Switch | ✅/❌ | |
| TC7: No API Key Error | ✅/❌ | |
| TC8: Invalid API Key | ✅/❌ | |
| TC9: Rate Limiting | ✅/❌ | |
| TC10: Timeout Handling | ✅/❌ | |
| TC11: Video Playback | ✅/❌ | |
| TC12: Download Failure | ✅/❌ | |
| TC13: Multimodal Context | ✅/❌ | |
| TC14: Empty Prompt | ✅/❌ | |
| TC15: Context Limit | ✅/❌ | |

### Issues Found
[List any bugs or unexpected behavior]

### Performance Metrics
- Average generation time:
- Success rate:
- Error rate:

### Recommendations
[Any improvements or fixes needed]
```

---

## Automated Test Execution

Run all unit tests:
```bash
npm test -- --coverage
```

Run specific test suite:
```bash
npm test -- VeoVideoService.test.ts
```

Run tests in watch mode:
```bash
npm test -- --watch
```

---

## Continuous Integration

For CI/CD pipelines, ensure:
1. Mock API key in test environment
2. Skip actual API calls in unit tests
3. Use test fixtures for video responses
4. Set appropriate timeouts for async tests
5. Check code coverage thresholds

---

## Summary

This testing guide covers:
- ✅ 9 categories of unit tests (60+ test cases)
- ✅ 15 manual integration test cases
- ✅ Console debugging procedures
- ✅ Performance benchmarks
- ✅ Troubleshooting guide
- ✅ Test documentation templates

**Total Test Coverage:**
- Unit Tests: ~60 test cases
- Integration Tests: 15 comprehensive scenarios
- Error Cases: All major error conditions covered
- Edge Cases: Context limits, timeouts, invalid inputs

Use this guide to ensure comprehensive testing of the VEO-3 video generation system.
