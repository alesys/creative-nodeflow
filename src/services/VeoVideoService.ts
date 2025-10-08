// VEO-3 Video Generation Service using @google/genai
// This service uses the newer @google/genai SDK for video generation with VEO-3

import { GoogleGenAI } from '@google/genai';
import { LIMITS } from '../constants/app';
import logger from '../utils/logger';
import type { ChatMessage, ConversationContext } from '../types/api';

interface VeoVideoResponse {
  content: string;
  type: 'video';
  context: ConversationContext;
  videoUrl?: string;
  operationId?: string;
}

class VeoVideoService {
  private client: GoogleGenAI | null;
  private apiKey: string | null;

  constructor() {
    this.client = null;
    this.apiKey = null;
    this.initializeClient();
  }

  initializeClient(): void {
    const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      logger.warn('Google API key not configured for VEO-3 video generation');
      return;
    }

    try {
      this.apiKey = apiKey.trim();
      this.client = new GoogleGenAI({
        apiKey: this.apiKey
      });
      logger.debug('VEO-3 client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize VEO-3 client:', error);
      this.client = null;
      this.apiKey = null;
    }
  }

  async generateVideo(
    prompt: string,
    context: ConversationContext | null = null,
    aspectRatio: string = '16:9'
  ): Promise<VeoVideoResponse> {
    if (!this.client) {
      throw new Error('VEO-3 client not initialized. Please check your Google API key.');
    }

    try {
      // Build the video prompt with context if provided
      let fullPrompt = prompt;

      if (context && context.messages) {
        const contextTexts: string[] = [];

        for (const msg of context.messages) {
          if (typeof msg.content === 'string') {
            if (msg.role !== 'system') {
              contextTexts.push(msg.content);
            }
          } else if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if (part.type === 'text') {
                contextTexts.push(part.text);
              }
            }
          }
        }

        if (contextTexts.length > 0) {
          const contextText = contextTexts.join('\n');
          fullPrompt = `Context: ${contextText}\n\nVideo prompt: ${prompt}`;
        }
      }

      logger.debug('Starting VEO-3 video generation with prompt:', fullPrompt.substring(0, 100));
      logger.debug('Aspect ratio:', aspectRatio);

      // Build the video generation request with image context if available
      const videoRequest: any = {
        model: 'veo-3.0-fast-generate-001', // Using VEO-3 Fast (cheaper and faster)
        prompt: fullPrompt,
        config: {
          aspectRatio: aspectRatio,
          negativePrompt: 'low quality, blurry, distorted'
        }
      };

      // Check if context contains images and add them to the request
      if (context && context.messages) {
        for (const msg of context.messages) {
          if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if (part.type === 'image' && part.imageUrl) {
                // VEO-3 supports image-to-video generation
                logger.debug('Adding image context to video generation');

                // Parse data URL to extract base64 and MIME type
                const dataUrl = part.imageUrl;
                if (dataUrl.startsWith('data:')) {
                  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
                  if (matches) {
                    videoRequest.image = {
                      imageBytes: matches[2],
                      mimeType: matches[1]
                    };
                    logger.debug('Image parsed:', { mimeType: matches[1], base64Length: matches[2].length });
                  } else {
                    logger.warn('Could not parse image data URL');
                  }
                }
                // Only use the first image found
                break;
              }
            }
            if (videoRequest.image) break;
          }
        }
      }

      logger.debug('Video generation request:', {
        model: videoRequest.model,
        hasImage: !!videoRequest.image
      });

      // Start video generation operation
      let operation = await this.client.models.generateVideos(videoRequest);

      logger.debug('VEO-3 operation started, operation ID:', operation.name);

      // Poll for completion (this is a long-running operation)
      let pollCount = 0;
      const maxPolls = 60; // Maximum 10 minutes (60 * 10 seconds)

      while (!operation.done && pollCount < maxPolls) {
        logger.debug(`Polling VEO-3 operation... (${pollCount + 1}/${maxPolls})`);

        // Wait 10 seconds between polls
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Get updated operation status
        operation = await this.client.operations.getVideosOperation({
          operation: operation
        });

        pollCount++;
      }

      // Check if operation completed successfully
      if (!operation.done) {
        throw new Error('Video generation timed out. Please try again later.');
      }

      if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message || 'Unknown error'}`);
      }

      if (!operation.response || !operation.response.generatedVideos || operation.response.generatedVideos.length === 0) {
        throw new Error('No video was generated. Please try a different prompt.');
      }

      // Get the generated video
      const generatedVideo = operation.response.generatedVideos[0];

      logger.debug('Video generated successfully:', generatedVideo.video?.uri || 'No URI');

      // Download the video file and convert to blob URL for playback
      let videoDataUrl: string | undefined;

      if (generatedVideo.video?.uri) {
        try {
          const videoUri = generatedVideo.video.uri;
          logger.debug('Fetching video from URI:', videoUri);

          // Note: VEO-3 returns a gs:// URI which may not be directly fetchable from browser
          // The video URI might be a Google Cloud Storage URL that requires authentication
          // For now, we'll attempt to fetch it and handle CORS/auth errors gracefully

          // Check if it's a Google Cloud Storage URI or Google API URL
          if (videoUri.startsWith('gs://')) {
            // Convert gs:// to https:// URL
            const httpsUrl = videoUri.replace('gs://', 'https://storage.googleapis.com/');
            logger.debug('Converted GCS URI to HTTPS:', httpsUrl);

            // Attempt to fetch with API key in query params
            const urlWithKey = `${httpsUrl}${httpsUrl.includes('?') ? '&' : '?'}key=${this.apiKey}`;
            const response = await fetch(urlWithKey);

            if (response.ok) {
              const blob = await response.blob();

              logger.debug('Video blob details:', {
                size: blob.size,
                type: blob.type,
                isVideo: blob.type.includes('video')
              });

              // Use the blob as-is, browser will handle the format
              videoDataUrl = URL.createObjectURL(blob);

              logger.debug('Blob URL created successfully');
            } else {
              logger.warn('Video fetch failed with status:', response.status, await response.text());
            }
          } else if (videoUri.startsWith('http')) {
            // Direct HTTP/HTTPS URL (likely from generativelanguage.googleapis.com)
            logger.debug('Fetching video from HTTP URL');

            // Add API key as query parameter for Google APIs
            const urlWithKey = videoUri.includes('generativelanguage.googleapis.com')
              ? `${videoUri}${videoUri.includes('?') ? '&' : '?'}key=${this.apiKey}`
              : videoUri;

            logger.debug('Fetching with auth:', urlWithKey.substring(0, 80));

            const response = await fetch(urlWithKey);

            if (response.ok) {
              const blob = await response.blob();

              logger.debug('Video blob details:', {
                size: blob.size,
                type: blob.type
              });

              videoDataUrl = URL.createObjectURL(blob);
              logger.debug('Blob URL created successfully');
            } else {
              logger.error('Video fetch failed:', response.status, await response.text());
            }
          }
        } catch (downloadError) {
          logger.error('Failed to download video:', downloadError);
          logger.info('Video may require authentication or have CORS restrictions');
          // Will fall back to showing error message
        }
      }

      // Create response message
      const responseText = videoDataUrl
        ? 'Video generated successfully and ready to play!'
        : `Video generated but download failed. This might be due to API limitations or CORS restrictions.\n\nVideo URI: ${generatedVideo.video?.uri || 'Not available'}`;

      const updatedMessages: ChatMessage[] = [
        ...(context?.messages || []).slice(-LIMITS.MAX_CONTEXT_MESSAGES),
        {
          role: 'user' as const,
          content: `Video generation request: ${prompt}`
        },
        {
          role: 'assistant' as const,
          content: responseText
        }
      ].slice(-LIMITS.MAX_CONTEXT_MESSAGES);

      return {
        content: videoDataUrl || responseText,
        type: 'video',
        videoUrl: videoDataUrl,
        operationId: operation.name,
        context: {
          messages: updatedMessages
        }
      };
    } catch (error) {
      const errorObj = error as { message?: string; status?: number; statusCode?: number };

      logger.error('VEO-3 Video Generation Error:', {
        message: errorObj.message,
        status: errorObj.status,
        statusCode: errorObj.statusCode
      });

      let errorMessage = `Failed to generate video: ${errorObj.message || 'Unknown error'}`;

      if (errorObj.message?.includes('FAILED_PRECONDITION')) {
        errorMessage += '\n\n💡 Solution: VEO-3 video generation requires billing to be enabled in Google AI Studio.';
      } else if (errorObj.message?.includes('PERMISSION_DENIED')) {
        errorMessage += '\n\n💡 Solution: Your API key may not have access to VEO-3. Check your API key permissions.';
      } else if (errorObj.message?.includes('RESOURCE_EXHAUSTED')) {
        errorMessage += '\n\n💡 Solution: Rate limit exceeded. Please wait before trying again.';
      } else if (errorObj.message?.includes('NOT_FOUND')) {
        errorMessage += '\n\n💡 Solution: VEO-3 may not be available in your region or with your current plan.';
      }

      throw new Error(errorMessage);
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }
}

const veoVideoServiceInstance = new VeoVideoService();
export default veoVideoServiceInstance;
