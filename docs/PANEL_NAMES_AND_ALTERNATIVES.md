# Panel Names and Alternative Suggestions

This document lists all the panels/nodes in the Creative NodeFlow application with their current names and suggested alternatives.

## Current Panel Names

### 1. **Starting Prompt** *(Currently Hidden)*
- **Purpose**: Initial prompt that creates a new thread with Brand Voice
- **Current Status**: Hidden from menu and initial state (kept in backburner)
- **Alternative Names**:
  - Origin Prompt
  - Foundation Prompt
  - Root Prompt
  - Base Prompt
  - Launch Prompt

### 2. **Creative Director**
- **Purpose**: Continuation prompt with context input from other nodes; uses OpenAI for creative direction
- **Icon**: Palette icon
- **Alternative Names**:
  - Creative Lead
  - Creative Advisor
  - Copywriter
  - Content Director
  - Creative Strategist
  - Text Director
  - **Recommended**: Keep as "Creative Director" (well-established term)

### 3. **Art Director**
- **Purpose**: Image generation node using Google AI (Gemini)
- **Icon**: Image icon
- **Alternative Names**:
  - Image Generator
  - Visual Director
  - Design Director
  - Graphics Director
  - **Recommended**: Keep as "Art Director" (matches creative agency roles)

### 4. **Motion Director**
- **Purpose**: Video generation node using VEO-3
- **Icon**: Video camera icon
- **Alternative Names**:
  - Video Director
  - Video Generator
  - Animation Director
  - Visual Effects Director
  - Cinematographer
  - **Recommended**: Keep as "Motion Director" (industry-standard term)

### 5. **Output**
- **Purpose**: Display final results/outputs from other nodes
- **Icon**: Output icon
- **Alternative Names**:
  - Result
  - Preview
  - Viewer
  - Display
  - Canvas
  - **Recommended**: Keep as "Output" (clear and simple)

### 6. **Image Panel**
- **Purpose**: Upload or paste images to use as context/resources
- **Alternative Names**:
  - Image Resource
  - Image Input
  - Media Panel
  - Visual Asset
  - Asset Panel
  - Resource Image
  - **Recommended**: "Image Resource" or keep "Image Panel" (both work well)

## Naming Consistency Patterns

The current naming follows a **creative agency/production team** metaphor:
- **Directors**: Creative Director, Art Director, Motion Director
- **Resources/Panels**: Image Panel, Output
- **Workflow**: Directors make creative decisions, panels provide resources

### Recommendations:
1. **Keep the "Director" naming** - It's intuitive and follows industry conventions
2. **Consider renaming "Image Panel"** to "Image Resource" or "Visual Asset" to better distinguish it from the director nodes
3. **Keep "Output"** as-is - simple and clear
4. **Starting Prompt remains hidden** until use case is clarified

## Potential New Panel Names (Future)

If expanding the application, consider:
- **Audio Director** - for audio/music generation
- **Brand Voice Panel** - dedicated brand guidelines input (currently in File Panel)
- **Style Director** - for style transfer or artistic direction
- **Script Director** - for narrative/screenplay generation
- **Production Manager** - for workflow orchestration

## Node Type Reference

For developers:

```typescript
type CustomNodeType = 
  | 'startingPrompt'   // Hidden
  | 'agentPrompt'      // Creative Director
  | 'imagePrompt'      // Art Director
  | 'videoPrompt'      // Motion Director
  | 'customOutput'     // Output
  | 'imagePanel';      // Image Panel
```

---

**Last Updated**: October 17, 2025  
**Status**: Starting Prompt hidden; Creative Director used as initial node
