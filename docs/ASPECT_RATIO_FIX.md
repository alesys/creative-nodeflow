# Aspect Ratio Selector Fix

## Problem
The aspect ratio selectors in both the Art Director (ImagePromptNode) and Motion Director (VideoPromptNode) panels were not working correctly:
- **Art Director**: Images were always generated in 1:1 aspect ratio regardless of the selected option
- **Motion Director**: Aspect ratio selection was not being properly passed to the VEO-3 API

## Root Causes

### 1. API Configuration Issues
- **GoogleAIService**: The `imageConfig` parameter wasn't properly structured in the API call
- **VeoVideoService**: The config was being created but needed better logging to confirm it was passed correctly

### 2. State Persistence Issues  
- **ImagePromptNode**: Aspect ratio state was local only and not persisted to node data
- **VideoPromptNode**: 
  - Didn't read `aspectRatio` from `data` prop on initialization
  - Aspect ratio state was not persisted to node data
  - Missing `aspectRatio` field in `VideoPromptNodeData` type definition

## Solutions Implemented

### 1. Type Definitions (`src/types/nodes.ts`)
```typescript
export interface VideoPromptNodeData extends BaseNodeData {
  prompt: string;
  fileContexts?: FileContext[];
  aspectRatio?: string; // ✅ ADDED
}
```

### 2. GoogleAIService (`src/services/GoogleAIService.ts`)

**Updated the API call structure:**
```typescript
// Generate content with aspect ratio config
result = await model.generateContent(
  enhancedContentParts,
  {
    generationConfig: {
      temperature: 0.7,
      candidateCount: 1
    },
    // Aspect ratio config at root level, not inside generationConfig
    imageConfig: {
      aspectRatio: normalizedAspectRatio
    }
  }
);
```

**Key changes:**
- Moved `imageConfig` to root level of config object (not nested in `generationConfig`)
- Added better error handling with fallback to prompt-based aspect ratio
- Enhanced logging to track aspect ratio usage

### 3. VeoVideoService (`src/services/VeoVideoService.ts`)

**Added aspect ratio logging:**
```typescript
const videoRequest: any = {
  model: 'veo-3.0-fast-generate-001',
  prompt: fullPrompt,
  config: {
    aspectRatio: aspectRatio, // VEO-3 supports '16:9' and '9:16'
    negativePrompt: 'low quality, blurry, distorted'
  }
};

logger.debug('VEO-3 config:', { 
  aspectRatio, 
  negativePrompt: videoRequest.config.negativePrompt 
});
```

### 4. ImagePromptNode (`src/components/ImagePromptNode.tsx`)

**Added state persistence:**
```typescript
import { useReactFlow } from '@xyflow/react';

const ImagePromptNode: React.FC<ImagePromptNodeProps> = ({ data, id, isConnectable }) => {
  const { setNodes } = useReactFlow();
  
  // Initialize from node data
  const [aspectRatio, setAspectRatio] = React.useState<string>(data.aspectRatio || '1:1');

  // Persist changes to node data
  const handleAspectRatioChange = useCallback((newRatio: string) => {
    setAspectRatio(newRatio);
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                aspectRatio: newRatio
              }
            }
          : node
      )
    );
  }, [id, setNodes]);

  // Use the handler in the select element
  <select value={aspectRatio} onChange={(e) => handleAspectRatioChange(e.target.value)}>
```

### 5. VideoPromptNode (`src/components/VideoPromptNode.tsx`)

**Same changes as ImagePromptNode:**
```typescript
import { useReactFlow } from '@xyflow/react';

const VideoPromptNode: React.FC<VideoPromptNodeProps> = ({ data, id, isConnectable }) => {
  const { setNodes } = useReactFlow();
  
  // Initialize from node data (was hardcoded to '16:9')
  const [aspectRatio, setAspectRatio] = React.useState<string>(data.aspectRatio || '16:9');

  // Persist changes to node data
  const handleAspectRatioChange = useCallback((newRatio: string) => {
    setAspectRatio(newRatio);
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                aspectRatio: newRatio
              }
            }
          : node
      )
    );
  }, [id, setNodes]);
```

## API Documentation References

### Gemini Image Generation (Nano Banana)
- **Documentation**: https://ai.google.dev/gemini-api/docs/image-generation
- **Config Structure**: 
  ```typescript
  {
    generationConfig: { ... },
    imageConfig: {
      aspectRatio: "16:9" // or other supported ratios
    }
  }
  ```
- **Supported Aspect Ratios**:
  - 1:1 (1024x1024)
  - 2:3 (832x1248)
  - 3:2 (1248x832)
  - 3:4 (864x1184)
  - 4:3 (1184x864)
  - 4:5 (896x1152)
  - 5:4 (1152x896)
  - 9:16 (768x1344)
  - 16:9 (1344x768)
  - 21:9 (1536x672)

### VEO-3 Video Generation
- **Documentation**: https://ai.google.dev/gemini-api/docs/video
- **Config Structure**:
  ```typescript
  {
    model: 'veo-3.0-fast-generate-001',
    prompt: string,
    config: {
      aspectRatio: "16:9", // or "9:16"
      negativePrompt: string
    }
  }
  ```
- **Supported Aspect Ratios**:
  - 16:9 (720p & 1080p)
  - 9:16 (720p only)

## Testing Checklist

### Art Director (ImagePromptNode)
- [ ] Select different aspect ratios (1:1, 16:9, 9:16, etc.)
- [ ] Generate images with each aspect ratio
- [ ] Verify generated images match selected aspect ratio
- [ ] Check that aspect ratio persists after page reload
- [ ] Verify aspect ratio shows in browser console logs

### Motion Director (VideoPromptNode)
- [ ] Select 16:9 aspect ratio
- [ ] Generate a video
- [ ] Verify video is in 16:9 format
- [ ] Select 9:16 aspect ratio
- [ ] Generate a video
- [ ] Verify video is in 9:16 format
- [ ] Check that aspect ratio persists after page reload
- [ ] Verify aspect ratio shows in browser console logs

## Expected Behavior

### Before Fix
- Art Director always generated 1:1 square images
- Motion Director might not respect aspect ratio selection
- Aspect ratio selection didn't persist when node was modified

### After Fix
- Art Director generates images in the selected aspect ratio
- Motion Director generates videos in the selected aspect ratio (16:9 or 9:16)
- Aspect ratio selection persists in node data
- Aspect ratio is properly passed to both Google APIs
- Console logs show aspect ratio being used in API calls

## Technical Notes

### SDK Versions
- `@google/generative-ai`: ^0.24.1 (for image generation)
- `@google/genai`: ^1.22.0 (for video generation)

### Important Implementation Details
1. **Image Config Placement**: The `imageConfig` must be at the root level of the config object, not nested inside `generationConfig`
2. **State Management**: Using ReactFlow's `setNodes` to persist aspect ratio ensures it survives node updates and re-renders
3. **Initialization**: Both components now read `aspectRatio` from `data` prop, defaulting to '1:1' for images and '16:9' for videos
4. **Fallback Strategy**: GoogleAIService includes aspect ratio in the prompt text as a fallback if API config fails

## Related Files Changed
- `src/types/nodes.ts` - Added aspectRatio to VideoPromptNodeData
- `src/services/GoogleAIService.ts` - Fixed imageConfig API structure
- `src/services/VeoVideoService.ts` - Added config logging
- `src/components/ImagePromptNode.tsx` - Added state persistence
- `src/components/VideoPromptNode.tsx` - Added state persistence and initialization

## Commit Message
```
fix: aspect ratio selectors in Art Director and Motion Director panels

- Fix GoogleAIService imageConfig structure for proper API aspect ratio
- Add aspectRatio to VideoPromptNodeData type definition
- Implement aspect ratio state persistence in both director nodes
- Initialize aspect ratio from node data on mount
- Add debug logging for aspect ratio configuration

Fixes issue where images were always 1:1 and videos didn't respect
aspect ratio selection. Both panels now properly apply and persist
the selected aspect ratio.
```
