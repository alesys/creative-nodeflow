# Aspect Ratio Issue - Root Cause Analysis

## Problem Statement
The aspect ratio selectors in Art Director and Motion Director panels are not working because images are always generated in 1:1 format regardless of the selected aspect ratio.

## Root Cause
The application is using the **DEPRECATED** `@google/generative-ai` SDK (v0.24.1), which **DOES NOT support the `imageConfig` parameter** for aspect ratio control.

### SDK Deprecation Status
```json
{
  "current": "@google/generative-ai": "^0.24.1",  // DEPRECATED
  "new": "@google/genai": "^1.22.0",              // Modern SDK
  "deprecation_date": "November 30, 2025"
}
```

## Technical Details

### Old SDK (@google/generative-ai v0.24.x)
**Does NOT support:**
```typescript
// ❌ This does NOT work with the old SDK
const result = await model.generateContent(content, {
  generationConfig: { ... },
  imageConfig: {                    // NOT supported!
    aspectRatio: "16:9"
  }
});
```

**Current workaround:**
- Aspect ratio MUST be embedded in the prompt text
- Example: "Create an image in 16:9 aspect ratio (wide landscape format). [prompt]"
- This is unreliable and model-dependent

### New SDK (@google/genai v1.22.0)
**Supports:**
```javascript
// ✅ This works with the new SDK  
response = await ai.models.generateContent({
  model: MODEL_ID,
  contents: [prompt],
  config: {
    responseModalities: [Modality.IMAGE],
    imageConfig: {
      aspectRatio: "16:9"    // Properly supported!
    }
  }
});
```

## Current Workaround Limitations

### What We're Currently Doing
1. Embedding aspect ratio in the prompt: "Create an image in 16:9 aspect ratio..."
2. The model interprets this as a suggestion, NOT a requirement
3. Results are inconsistent - model may ignore or misinterpret the aspect ratio request

### Why It's Not Working
- The Gemini model interprets natural language prompts, not API parameters
- Prompt-based aspect ratio is a "best effort" approach
- Without the API parameter, there's no guaranteed aspect ratio control
- The model defaults to 1:1 (square) when unclear

## Solutions

### Solution 1: Upgrade to New SDK (RECOMMENDED)
**Benefits:**
- Proper `imageConfig` support with guaranteed aspect ratio
- Active development and support
- Better TypeScript types
- More reliable results

**Implementation:**
```bash
npm uninstall @google/generative-ai
npm install @google/genai
```

**Migration Required:**
- Update all API calls to new SDK format
- Refactor `GoogleAIService.ts`
- Update imports and interfaces
- Test all image generation features

**Estimated Effort:** 4-8 hours

### Solution 2: Keep Old SDK (NOT RECOMMENDED)
**Current Status:**
- ✅ Aspect ratio IS persisted in node data
- ✅ Aspect ratio IS passed to the service
- ✅ Aspect ratio IS embedded in the prompt
- ❌ Model doesn't reliably respect prompt-based aspect ratio

**Why Not Recommended:**
- SDK will be unsupported after November 30, 2025
- No guarantee of aspect ratio accuracy
- Unreliable user experience
- Security updates will stop

### Solution 3: Use Imagen Instead (ALTERNATIVE)
Imagen 4 has proper aspect ratio support even with the old SDK:

```typescript
// Using Imagen with aspect ratio
import { ImagenClient } from '@google/generative-ai';

const result = await imagenClient.generateImages({
  prompt: userPrompt,
  aspectRatio: '16:9',  // Properly supported
  sampleCount: 1
});
```

**Trade-offs:**
- Different model (Imagen vs Gemini)
- Different pricing structure
- May require separate API integration

## Immediate Action Items

### Short Term (Current Sprint)
1. ✅ Update node components to persist aspect ratio
2. ✅ Document the SDK limitation
3. ⚠️ Add user-facing disclaimer about aspect ratio reliability
4. ❌ Cannot fix aspect ratio without SDK upgrade

### Medium Term (Next Sprint)
1. Migrate to new `@google/genai` SDK
2. Implement proper `imageConfig` support
3. Test aspect ratio functionality
4. Remove disclaimer once confirmed working

### Long Term
1. Monitor new SDK for improvements
2. Consider Imagen 4 as alternative
3. Regular SDK version updates

## Code Changes Needed (For SDK Migration)

### Before (Old SDK):
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const client = new GoogleGenerativeAI(apiKey);
const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
const result = await model.generateContent(prompt);
```

### After (New SDK):
```typescript
import { GoogleGenAI } from '@google/genai';

const client = new GoogleGenAI({ apiKey });
const response = await client.models.generateContent({
  model: 'gemini-2.5-flash-image',
  contents: prompt,
  config: {
    imageConfig: {
      aspectRatio: '16:9'
    }
  }
});
```

## Testing Checklist (Post-Migration)

- [ ] Art Director generates 1:1 square images
- [ ] Art Director generates 16:9 landscape images
- [ ] Art Director generates 9:16 portrait images
- [ ] Art Director generates other ratios (4:3, 3:4, etc.)
- [ ] Motion Director respects 16:9 ratio
- [ ] Motion Director respects 9:16 ratio
- [ ] Aspect ratio persists across node edits
- [ ] Aspect ratio persists across page reloads
- [ ] All aspect ratios work with multi-input workflows

## References

- **Old SDK (Deprecated):** https://github.com/google-gemini/deprecated-generative-ai-js
- **New SDK:** https://github.com/googleapis/js-genai
- **Migration Guide:** https://ai.google.dev/gemini-api/docs/migrate
- **Image Generation Docs:** https://ai.google.dev/gemini-api/docs/image-generation
- **Aspect Ratio Docs:** https://ai.google.dev/gemini-api/docs/image-generation#aspect-ratios
- **Cookbook Examples:** https://github.com/google-gemini/cookbook/tree/main/quickstarts-js/Image_out.js

## Conclusion

The aspect ratio issue **CANNOT be fully fixed** with the current deprecated SDK. The best solution is to migrate to the new `@google/genai` SDK which has proper support for `imageConfig.aspectRatio` parameter. Until then, aspect ratio control will remain unreliable and based on prompt interpretation rather than API guarantees.

**Current Status:** ⚠️ **BLOCKED by deprecated SDK limitations**  
**Recommended Action:** Migrate to `@google/genai` SDK for proper aspect ratio support
