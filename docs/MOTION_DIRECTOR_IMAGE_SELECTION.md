# Motion Director Image Selection Logic

## Question
**When Motion Director generates a video, which image does it use for animation?**
- The first image in the chain?
- The immediate/most recent image from the previous panel?

## Answer: Most Recent (Last) Image

Motion Director uses **the most recent (last) image** in the context chain as the **primary image** for video animation.

## How It Works

### Image Collection Process

1. **Context Traversal**: The service (`VeoVideoService.ts`) scans through all messages in the context
2. **Image Collection**: All images found in the message chain are collected in order
3. **Primary Selection**: The **last image encountered** becomes the primary image for animation
4. **Multiple Image Handling**: If multiple images exist, they're all described in the prompt, but only the most recent is actually animated

### Code Logic

```typescript
// From VeoVideoService.ts lines ~148-175

for (let msgIndex = 0; msgIndex < context.messages.length; msgIndex++) {
  const msg = context.messages[msgIndex];
  if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (part.type === 'image' && part.imageUrl) {
        allImages.push({
          part,
          messageIndex: msgIndex,
          description: `Image from step ${msgIndex + 1}`
        });
        // Keep track of the most recent image as primary
        primaryImagePart = part;      // ← THIS GETS OVERWRITTEN WITH EACH NEW IMAGE
        primaryImageIndex = msgIndex;  // ← KEEPS TRACK OF POSITION
      }
    }
  }
}
```

The key is that `primaryImagePart` **keeps getting overwritten** as the loop progresses, so the **last image** wins.

## Example Flow Scenarios

### Scenario 1: Simple Linear Chain
```
Image Panel → Motion Director
```
- **Result**: Uses the image from Image Panel ✓

### Scenario 2: Chain with Art Director
```
Image Panel → Art Director → Motion Director
```
- **Result**: Uses the **generated image from Art Director** (most recent) ✓
- The original Image Panel image is mentioned in the prompt but NOT animated

### Scenario 3: Multiple Images Connected
```
Image Panel A ─┐
                ├→ Motion Director
Image Panel B ─┘
```
- **Result**: Depends on connection order and context flow
- The **last image processed** in the context becomes primary
- Typically the **most recently connected** or **bottom input**

### Scenario 4: Complex Chain
```
Image Panel → Art Director → Creative Director → Motion Director
```
- **Result**: Uses the **Art Director's generated image** (if it's still in context)
- Creative Director's text output doesn't replace the image context

## Multiple Image Enhancement

When multiple images are detected:
1. **Prompt Enhancement**: All images are described in the prompt
   ```
   "Multiple visual references available: Image 1 (from step 1), Image 2 (from step 3). 
   Primary image for animation: Image 2 (most recent)."
   ```
2. **Single Animation**: Only the **most recent image** is sent to VEO-3 API
3. **Context Awareness**: The model is informed about all images for better understanding

## Why This Design?

### Advantages:
- **Pipeline Logic**: In a typical workflow, you want to animate the **latest generated content**
- **Refinement Flow**: Allows image-to-image-to-video pipelines where you refine an image before animating
- **Contextual Awareness**: Earlier images still inform the prompt even if not directly animated

### Use Cases:
1. **Direct Animation**: Image Panel → Motion Director (simple)
2. **Refined Animation**: Image Panel → Art Director → Motion Director (refine then animate)
3. **Guided Animation**: Multiple references → Motion Director (use latest, aware of all)

## Recommendations

### To Animate a Specific Image:
1. **Ensure it's the last image** in the connection chain before Motion Director
2. **Use Image Panel directly** connected to Motion Director for basic animation
3. **Chain through Art Director** if you want to refine the image first

### To Control Which Image:
1. **Disconnect other image sources** before generation
2. **Rearrange connections** to ensure desired image is processed last
3. **Check console logs** during generation to see which image was selected:
   ```
   Found N images in context. Using most recent (message X) as primary image.
   ```

## Technical Details

### Location: `src/services/VeoVideoService.ts`
- **Lines 148-190**: Image collection and primary selection logic
- **Line 182**: Primary image is sent to VEO API as `imageBytes`

### API Call Structure:
```typescript
videoRequest = {
  model: 'veo-3.1-flash-preview-generate-001',
  prompt: fullPrompt,                    // Enhanced with all image descriptions
  config: { aspectRatio, durationSeconds },
  image: {                              // Only one image can be sent
    imageBytes: base64Data,             // ← Most recent image
    mimeType: 'image/png'
  }
}
```

## Future Enhancements

Possible improvements to consider:
1. **Image Selector UI**: Allow users to choose which image to animate from available context
2. **Multi-Image Animation**: Support for image sequences or transitions
3. **Visual Indicator**: Show which image will be used before generation
4. **Image Priority System**: Tag images with priority/role metadata

---

**Summary**: Motion Director always uses the **last/most recent image** in the context chain as the primary image for video animation, while all previous images are included as contextual information in the prompt.
