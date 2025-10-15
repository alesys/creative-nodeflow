## Veo Video Duration Options

You can specify the duration of Veo-generated videos using the `durationSeconds` parameter. The available options and defaults depend on the model and feature used:

| Model                | Supported Durations (seconds) | Default Duration | Notes                                                                                 |
|----------------------|-------------------------------|------------------|--------------------------------------------------------------------------------------|
| Veo 3.1 Fast (Preview)| 4, 6, 8                       | 8                | 8s required for reference images, video extension, and interpolation features         |
| Veo 3.0 Fast         | 4, 6, 8                       | 8                | All durations supported for text-to-video and image-to-video                          |

**Note:** If you do not specify `durationSeconds`, the default is **8 seconds**. Some advanced features (reference images, video extension, interpolation) require 8 seconds.
# AI Models and Pricing - Creative NodeFlow

## Current AI Models in Use

### Text Generation

#### OpenAI GPT-5-nano (gpt-5-nano)
- **Model**: `gpt-5-nano`
- **Used In**: Starting Prompt Node, Creative Director Node
- **Purpose**: Text generation and conversation
- **Features**: 
  - Multimodal support (text + vision)
  - Context window: ~128k tokens
  - Fast response times
  - High quality outputs

**Pricing** (as of Oct 2025):
- **Input**: $0.15 per 1M tokens
- **Output**: $0.60 per 1M tokens

**Typical Usage Cost**:
- Average prompt (500 tokens input, 500 tokens output): ~$0.00045
- Per conversation (10 messages): ~$0.0045
- 1,000 prompts: ~$0.45

---

### Image Generation

#### Google Gemini 2.5 Flash Image Preview (gemini-2.5-flash-image-preview)
- **Model**: `gemini-2.5-flash-image-preview` (nicknamed "Nano Banana")
- **Used In**: Art Director Node (Image Prompt)
- **Purpose**: AI image generation from text prompts
- **Features**:
  - High-quality image generation
  - Multiple aspect ratios (1:1, 16:9, 9:16, 3:4, 4:3)
  - Fast generation times
  - Creative and accurate results

**Pricing** (as of Oct 2025):
- **Text Input**: $0.075 per 1M tokens
- **Image Generation**: $0.04 per image
- **Image Input** (when using images as context): $0.30 per 1M tokens

**Typical Usage Cost**:
- Single image generation: ~$0.04
- Image with prompt refinement (200 tokens): ~$0.041
- 100 images: ~$4.00

---

### Video Generation

#### Google Veo 3.1 Fast (Preview)
- **Model**: `veo-3.1-fast-generate-preview` (fallback: `veo-3.0-fast-generate-001`)
- **Used In**: Motion Director Node (Video Prompt)
- **Purpose**: AI video generation from text or image prompts
- **Features**:
  - Text-to-video generation
  - Image-to-video animation
  - Aspect ratios: 16:9 (landscape), 9:16 (portrait)
  - ~5-10 second videos
  - Fast generation (Veo Fast variant)

**Pricing** (as of Oct 2025):
- Veo 3.1 Standard (video with audio): $0.40 per video
- Veo 3.1 Fast (video with audio): $0.15 per video
- You are only charged if a video is successfully generated

**Typical Usage Cost**:
- 1 video (Fast): ~$0.15
- 10 videos (Fast): ~$1.50
- 100 videos (Fast): ~$15.00

**Notes**:
- Veo video generation requires billing to be enabled in Google AI Studio.
- Preview models may change and can have more restrictive limits.

---

## Cost Comparison

### Per Operation

| Operation | Model | Cost |
|-----------|--------------------------|------|
| Text prompt (500 tokens) | GPT-5-nano | ~$0.00045 |
| Image generation | Gemini 2.5 Flash Image | ~$0.04 |
| Single video | Veo 3.1 Fast (Preview) | ~$0.15 |
| Single video | Veo 3.1 Standard (Preview) | ~$0.40 |
| Single video | Veo 3.0 Fast | ~$0.15 |
| Single video | Veo 3.0 Standard | ~$0.40 |

### Typical Workflow Costs

#### Simple Text Workflow
- Starting Prompt → Creative Director → Output
- **Cost**: ~$0.0009 (2 prompts)

#### Image Generation Workflow  
- Starting Prompt → Art Director → Output
- **Cost**: ~$0.0405 (1 prompt + 1 image)

#### Video Generation Workflow
- Starting Prompt → Art Director → Motion Director → Output
- **Cost**: ~$0.1909 (1 prompt + 1 image + 1 video at $0.15)

#### Complex Multi-step Workflow
- Starting Prompt → Creative Director (×3) → Art Director → Motion Director → Output
- **Cost**: ~$0.5423 (4 prompts + 1 image + 1 5-second video)

---

## Cost Optimization Tips

### 1. Text Generation
- ✅ Use **Brand Voice** feature - injected once per thread, saves 900-4500 tokens per 10 messages
- ✅ Keep prompts concise and specific
- ✅ Reuse threads instead of creating new conversations
- ✅ Set MAX_CONTEXT_MESSAGES limit (default: 20) to control context size

### 2. Image Generation
- ✅ Refine prompts before generating (text is much cheaper)
- ✅ Use specific, detailed prompts to get desired results on first try
- ✅ Consider aspect ratio carefully to avoid re-generation

### 3. Video Generation
- ✅ VEO-3 Fast is cheaper than standard VEO-3 (~50% savings)
- ✅ Generate shorter videos when possible (5 seconds vs 10 seconds = 50% cost)
- ✅ Use image-to-video when you have a base image (more predictable results)
- ✅ Test prompts with image generation first (much cheaper) before video

### 4. Overall System
- ✅ Use thread management to reduce token usage
- ✅ Clear context when starting unrelated tasks
- ✅ Monitor usage in OpenAI and Google Cloud dashboards
- ✅ Set spending limits in API provider accounts

---

## Free Tier Information

### OpenAI
- **Free Credits**: $5 for new accounts (expires after 3 months)
- **After Free Tier**: Pay-as-you-go billing required
- **Rate Limits**: Varies by account tier

### Google AI Studio
- **Free Tier**: 15 requests per minute for most models
- **Image Generation**: Limited free tier (check Google AI Studio)
- **Video Generation (VEO-3)**: Requires billing enabled (no free tier)

---

## Monthly Cost Estimates

### Light Usage (Personal/Testing)
- 100 text prompts
- 10 images
- 5 videos (5 seconds each)
- **Total**: ~$3.15/month

### Moderate Usage (Small Projects)
- 500 text prompts
- 50 images  
- 20 videos (5 seconds each)
- **Total**: ~$12.65/month

### Heavy Usage (Production/Business)
- 2,000 text prompts
- 200 images
- 100 videos (5 seconds each)
- **Total**: ~$58.90/month

---

## Monitoring & Tracking

### OpenAI Dashboard
- View usage: https://platform.openai.com/usage
- Set billing limits: https://platform.openai.com/account/billing/limits
- View API keys: https://platform.openai.com/api-keys

### Google Cloud Console  
- View usage: https://console.cloud.google.com/apis/dashboard
- Set budgets: https://console.cloud.google.com/billing/budgets
- Monitor costs: https://console.cloud.google.com/billing

---

## Billing Requirements

### OpenAI
- ✅ Credit card required after free credits expire
- ✅ Minimum charge: $5
- ✅ Auto-reload available
- ✅ Can set hard caps to prevent overspending

### Google AI Studio / Google Cloud
- ✅ Credit card required for VEO-3 video generation
- ✅ Gemini Image generation available on free tier (limited)
- ✅ Billing account must be active for video features
- ✅ Budget alerts recommended

---

## Cost Savings with Thread Management

Our Thread Management system provides significant cost savings:

### Without Thread Management
- Brand Voice re-injected every prompt: 300-1500 tokens per message
- 10-message conversation: 3,000-15,000 extra tokens
- **Cost per 10 messages**: $0.00135-$0.0675 extra

### With Thread Management  
- Brand Voice injected once per thread: 300-1500 tokens total
- 10-message conversation: 300-1500 tokens total
- **Cost per 10 messages**: $0.00015-$0.00075 total
- **Savings**: 90-98% reduction in Brand Voice token usage

### Annual Savings Example
- 1,000 conversations per year (10 messages each)
- Without thread management: $13.50-$67.50
- With thread management: $1.50-$7.50  
- **Total Savings**: $12-$60 per year (or more for heavy usage)

---

## Notes

1. **Pricing Subject to Change**: AI model pricing may change. Check official documentation:
   - OpenAI: https://openai.com/api/pricing/
   - Google AI: https://ai.google.dev/pricing

2. **Regional Variations**: Some pricing may vary by region

3. **Volume Discounts**: Contact providers for enterprise pricing

4. **Rate Limits**: Free and paid tiers have different rate limits

5. **Cost Control**: Always set billing alerts and spending limits

Last Updated: October 2025
