# Veo 3.1 Research (Features, Pricing, Migration)

Last updated: 2025-10-15

## What is new in Veo 3.1

- Native audio + video generation improvements (better realism, physics, prompt adherence)
- New creative controls (per DeepMind page):
  - Style reference images
  - Character consistency via reference images
  - Camera controls (move/zoom)
  - First/last frame transitions
  - Outpainting to new aspect ratios
  - Add/remove objects
  - Motion controls and character controls
  - Extend/continue scenes

Authoritative sources:
- DeepMind Veo page: https://deepmind.google/technologies/veo/
- Gemini API video docs: https://ai.google.dev/gemini-api/docs/video
- Pricing: https://ai.google.dev/pricing#video (Veo 3.1)

## Pricing (Gemini API, Paid tier)

- Veo 3.1 Standard (video with audio): $0.40
- Veo 3.1 Fast (video with audio): $0.15
- Preview models may change before stabilizing and can have more restrictive limits.
- Note: You are only charged if a video is successfully generated.

These prices match Veo 3.0 Standard/Fast as listed, but 3.1 brings quality and control improvements.

## Model strings

- Standard: `veo-3.1-generate-preview`
- Fast: `veo-3.1-fast-generate-preview`
- Previous default we used: `veo-3.0-fast-generate-001`

We now default to `veo-3.1-fast-generate-preview` to retain speed/cost profile while benefiting from 3.1 quality and controls.

## API compatibility notes

- Aspect ratios: 16:9 and 9:16 supported (others via outpainting workflows)
- Inputs: text-to-video, image-to-video (inline/base64 or via Files API); include mimeType for images
- Long-running operation: start -> poll operation until `done`
- Returns video URI (often GCS). Browser fetch may require authenticated proxy; handle CORS
- Errors to surface helpfully: FAILED_PRECONDITION (billing), PERMISSION_DENIED (access), RESOURCE_EXHAUSTED (rate limits), NOT_FOUND (region/plan)

## Migration plan (our repo)

- Constants: switched GOOGLE_VIDEO to `veo-3.1-fast-generate-preview`
- Service: reference constants.MODELS.GOOGLE_VIDEO instead of hardcoding
- Behavior: unchanged call shape; prompt/context and image handling continue to work
- Risks: Preview model availability/rate limits; if unavailable, fall back to `veo-3.0-fast-generate-001`

## Follow-ups

- Optional: add a runtime fallback if generateVideos fails with NOT_FOUND to retry with 3.0 Fast
- Document camera/style/character controls once the public API parameters are exposed in SDK/docs
- Add an environment flag to pin model (e.g., REACT_APP_GOOGLE_VEO_MODEL)
