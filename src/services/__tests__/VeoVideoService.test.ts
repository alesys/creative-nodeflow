/**
 * VEO-3 Video Generation Service Unit Tests
 * Comprehensive test suite for VeoVideoService
 */

import VeoVideoService from '../VeoVideoService';
import type { ConversationContext } from '../../types/api';

// Mock the Google GenAI SDK
jest.mock('@google/genai');

describe('VeoVideoService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Reset service instance
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid API key', () => {
      process.env.REACT_APP_GOOGLE_API_KEY = 'test-api-key';

      // Re-initialize service
      const service = new (VeoVideoService.constructor as any)();

      expect(service.isConfigured()).toBe(true);
    });

    it('should not initialize without API key', () => {
      delete process.env.REACT_APP_GOOGLE_API_KEY;

      const service = new (VeoVideoService.constructor as any)();

      expect(service.isConfigured()).toBe(false);
    });

    it('should trim whitespace from API key', () => {
      process.env.REACT_APP_GOOGLE_API_KEY = '  test-api-key  ';

      const service = new (VeoVideoService.constructor as any)();

      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('generateVideo - Parameter Validation', () => {
    beforeEach(() => {
      process.env.REACT_APP_GOOGLE_API_KEY = 'test-api-key';
    });

    it('should throw error if client not initialized', async () => {
      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = null;

      await expect(
        service.generateVideo('test prompt')
      ).rejects.toThrow('VEO-3 client not initialized');
    });

    it('should accept valid aspect ratio 16:9', async () => {
      // This test verifies the aspect ratio is passed correctly
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      await service.generateVideo('test prompt', null, '16:9');

      expect(mockClient.models.generateVideos).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            aspectRatio: '16:9'
          })
        })
      );
    });

    it('should accept valid aspect ratio 9:16', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      await service.generateVideo('test prompt', null, '9:16');

      expect(mockClient.models.generateVideos).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            aspectRatio: '9:16'
          })
        })
      );
    });

    it('should use default aspect ratio 16:9 when not provided', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      await service.generateVideo('test prompt');

      expect(mockClient.models.generateVideos).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            aspectRatio: '16:9'
          })
        })
      );
    });
  });

  describe('generateVideo - Standalone Mode (No Context)', () => {
    it('should generate video with just prompt', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      const result = await service.generateVideo('A cat playing piano');

      expect(mockClient.models.generateVideos).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'veo-3.0-fast-generate-001',
          prompt: 'A cat playing piano',
          config: expect.objectContaining({
            aspectRatio: '16:9',
            negativePrompt: 'low quality, blurry, distorted'
          })
        })
      );

      expect(result).toMatchObject({
        type: 'video',
        operationId: 'operation-123'
      });
    });

    it('should not include image parameter when no context provided', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      await service.generateVideo('test prompt', null);

      const callArgs = mockClient.models.generateVideos.mock.calls[0][0];
      expect(callArgs.image).toBeUndefined();
    });
  });

  describe('generateVideo - Text Context Mode', () => {
    it('should include text context in prompt', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      const context: ConversationContext = {
        messages: [
          { role: 'user', content: 'Make it dramatic' },
          { role: 'assistant', content: 'I understand, adding cinematic effects' }
        ]
      };

      await service.generateVideo('A sunset scene', context);

      const callArgs = mockClient.models.generateVideos.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Context:');
      expect(callArgs.prompt).toContain('Make it dramatic');
      expect(callArgs.prompt).toContain('Video prompt: A sunset scene');
    });

    it('should filter out system messages from context', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      const context: ConversationContext = {
        messages: [
          { role: 'system', content: 'You are a video generator' },
          { role: 'user', content: 'Make it epic' }
        ]
      };

      await service.generateVideo('A mountain', context);

      const callArgs = mockClient.models.generateVideos.mock.calls[0][0];
      expect(callArgs.prompt).not.toContain('You are a video generator');
      expect(callArgs.prompt).toContain('Make it epic');
    });

    it('should handle multimodal text content in context', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      const context: ConversationContext = {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Add motion to this' }
            ]
          }
        ]
      };

      await service.generateVideo('Animate this', context);

      const callArgs = mockClient.models.generateVideos.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Add motion to this');
    });
  });

  describe('generateVideo - Image-to-Video Mode', () => {
    it('should extract and include image from context', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      const context: ConversationContext = {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Animate this image' },
              { type: 'image', imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANS' }
            ]
          }
        ]
      };

      await service.generateVideo('Add motion', context);

      const callArgs = mockClient.models.generateVideos.mock.calls[0][0];
      expect(callArgs.image).toBeDefined();
      expect(callArgs.image.mimeType).toBe('image/png');
      expect(callArgs.image.imageBytes).toBe('iVBORw0KGgoAAAANS');
    });

    it('should only use first image when multiple images in context', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      const context: ConversationContext = {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', imageUrl: 'data:image/png;base64,FIRST_IMAGE' },
              { type: 'image', imageUrl: 'data:image/png;base64,SECOND_IMAGE' }
            ]
          }
        ]
      };

      await service.generateVideo('Animate', context);

      const callArgs = mockClient.models.generateVideos.mock.calls[0][0];
      expect(callArgs.image.imageBytes).toBe('FIRST_IMAGE');
    });

    it('should handle JPEG images', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      const context: ConversationContext = {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', imageUrl: 'data:image/jpeg;base64,JPEG_DATA' }
            ]
          }
        ]
      };

      await service.generateVideo('Animate', context);

      const callArgs = mockClient.models.generateVideos.mock.calls[0][0];
      expect(callArgs.image.mimeType).toBe('image/jpeg');
    });

    it('should skip invalid image data URLs', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      const context: ConversationContext = {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', imageUrl: 'invalid-url' }
            ]
          }
        ]
      };

      await service.generateVideo('Animate', context);

      const callArgs = mockClient.models.generateVideos.mock.calls[0][0];
      expect(callArgs.image).toBeUndefined();
    });
  });

  describe('generateVideo - Long Running Operation Polling', () => {
    it('should poll until operation completes', async () => {
      let pollCount = 0;
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: false
          })
        },
        operations: {
          getVideosOperation: jest.fn().mockImplementation(() => {
            pollCount++;
            if (pollCount >= 3) {
              return Promise.resolve({
                name: 'operation-123',
                done: true,
                response: {
                  generatedVideos: [{
                    video: { uri: 'https://example.com/video.mp4' }
                  }]
                }
              });
            }
            return Promise.resolve({
              name: 'operation-123',
              done: false
            });
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      // Mock setTimeout to avoid actual waiting
      jest.useFakeTimers();

      const promise = service.generateVideo('test');

      // Advance timers for each poll
      for (let i = 0; i < 3; i++) {
        await jest.advanceTimersByTimeAsync(10000);
      }

      const result = await promise;

      expect(mockClient.operations.getVideosOperation).toHaveBeenCalledTimes(3);
      expect(result.operationId).toBe('operation-123');

      jest.useRealTimers();
    });

    it('should timeout after maximum polls', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: false
          })
        },
        operations: {
          getVideosOperation: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: false
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      jest.useFakeTimers();

      const promise = service.generateVideo('test');

      // Advance timers past max polls (60 * 10 seconds)
      for (let i = 0; i < 61; i++) {
        await jest.advanceTimersByTimeAsync(10000);
      }

      await expect(promise).rejects.toThrow('Video generation timed out');

      jest.useRealTimers();
    });

    it('should handle operation errors', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            error: {
              message: 'API quota exceeded'
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      await expect(
        service.generateVideo('test')
      ).rejects.toThrow('Video generation failed: API quota exceeded');
    });

    it('should handle missing video response', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: []
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      await expect(
        service.generateVideo('test')
      ).rejects.toThrow('No video was generated');
    });
  });

  describe('generateVideo - Error Handling', () => {
    it('should provide helpful error for FAILED_PRECONDITION', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockRejectedValue({
            message: 'FAILED_PRECONDITION: Billing not enabled'
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      await expect(
        service.generateVideo('test')
      ).rejects.toThrow('VEO-3 video generation requires billing');
    });

    it('should provide helpful error for PERMISSION_DENIED', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockRejectedValue({
            message: 'PERMISSION_DENIED: API key invalid'
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      await expect(
        service.generateVideo('test')
      ).rejects.toThrow('Your API key may not have access to VEO-3');
    });

    it('should provide helpful error for RESOURCE_EXHAUSTED', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockRejectedValue({
            message: 'RESOURCE_EXHAUSTED: Rate limit exceeded'
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      await expect(
        service.generateVideo('test')
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should provide helpful error for NOT_FOUND', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockRejectedValue({
            message: 'NOT_FOUND: Model not available'
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      await expect(
        service.generateVideo('test')
      ).rejects.toThrow('VEO-3 may not be available in your region');
    });

    it('should handle aspect ratio validation errors', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockRejectedValue({
            message: '`aspectRatio` does not support `1:1` as a valid value',
            status: 400
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      await expect(
        service.generateVideo('test', null, '1:1')
      ).rejects.toThrow('aspectRatio');
    });
  });

  describe('Video Download and Blob URL Creation', () => {
    it('should create blob URL from successful video download', async () => {
      // Mock successful video generation
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://generativelanguage.googleapis.com/video.mp4' }
              }]
            }
          })
        }
      };

      // Mock fetch for video download
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['video data'], { type: 'video/mp4' }))
      }) as jest.Mock;

      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:http://localhost/video-123');

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      const result = await service.generateVideo('test');

      expect(result.videoUrl).toBe('blob:http://localhost/video-123');
      expect(result.content).toContain('Video generated successfully');
    });

    it('should handle gs:// URIs and convert to HTTPS', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'gs://bucket/video.mp4' }
              }]
            }
          })
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['video data'], { type: 'video/mp4' }))
      }) as jest.Mock;

      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:http://localhost/video-123');

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      await service.generateVideo('test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://storage.googleapis.com/bucket/video.mp4')
      );
    });

    it('should handle download failures gracefully', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Access denied')
      }) as jest.Mock;

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      const result = await service.generateVideo('test');

      expect(result.videoUrl).toBeUndefined();
      expect(result.content).toContain('Video generated but download failed');
    });
  });

  describe('Context Message Management', () => {
    it('should limit context messages in response', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      const context: ConversationContext = {
        messages: Array.from({ length: 20 }, (_, i) => ({
          role: 'user' as const,
          content: `Message ${i}`
        }))
      };

      const result = await service.generateVideo('test', context);

      // Should limit messages based on LIMITS.MAX_CONTEXT_MESSAGES
      expect(result.context.messages.length).toBeLessThanOrEqual(22); // 20 context + 2 new
    });

    it('should add user request and assistant response to context', async () => {
      const mockClient = {
        models: {
          generateVideos: jest.fn().mockResolvedValue({
            name: 'operation-123',
            done: true,
            response: {
              generatedVideos: [{
                video: { uri: 'https://example.com/video.mp4' }
              }]
            }
          })
        }
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['video data'], { type: 'video/mp4' }))
      }) as jest.Mock;

      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:http://localhost/video-123');

      const service = new (VeoVideoService.constructor as any)();
      (service as any).client = mockClient;
      (service as any).apiKey = 'test-key';

      const result = await service.generateVideo('Create sunset video');

      const messages = result.context.messages;
      const lastTwoMessages = messages.slice(-2);

      expect(lastTwoMessages[0].role).toBe('user');
      expect(lastTwoMessages[0].content).toContain('Create sunset video');
      expect(lastTwoMessages[1].role).toBe('assistant');
      expect(lastTwoMessages[1].content).toContain('Video generated successfully');
    });
  });
});
