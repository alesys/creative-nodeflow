/**
 * VEO-3 Video Generation Service Unit Tests
 * Comprehensive test suite for the corrected VeoVideoService
 */

import VeoVideoService from '../VeoVideoService';
import type { ConversationContext } from '../../types/api';
import { GoogleGenAI } from '@google/genai';

// Mock the Google GenAI SDK
jest.mock('@google/genai');

const mockGoogleGenAI = GoogleGenAI as jest.Mock;

describe('VeoVideoService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();

    // Mock the entire GoogleGenAI class structure
    const mockClient = {
      models: {
        generateVideos: jest.fn(),
      },
      operations: {
        get: jest.fn(),
      },
      files: {
        download: jest.fn(),
      },
    };
    mockGoogleGenAI.mockImplementation(() => mockClient);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid API key', () => {
      process.env.REACT_APP_GOOGLE_API_KEY = 'test-api-key';
      const service = new (VeoVideoService.constructor as any)();
      expect(service.isConfigured()).toBe(true);
      expect(mockGoogleGenAI).toHaveBeenCalledWith('test-api-key');
    });

    it('should not initialize without API key', () => {
      delete process.env.REACT_APP_GOOGLE_API_KEY;
      const service = new (VeoVideoService.constructor as any)();
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('generateVideo', () => {
    let service: any;
    let mockClient: any;

    beforeEach(() => {
      process.env.REACT_APP_GOOGLE_API_KEY = 'test-api-key';
      service = new (VeoVideoService.constructor as any)();
      mockClient = service.client; // Get the mocked client instance

      // Mock global URL.createObjectURL
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:http://localhost/video-123');
    });

    it('should throw error if client not initialized', async () => {
      service.client = null;
      await expect(service.generateVideo('test prompt')).rejects.toThrow('VEO-3 client not initialized');
    });

    it('should correctly call generateVideos with prompt and model', async () => {
      const operationName = 'operations/123';
      mockClient.models.generateVideos.mockResolvedValue({ name: operationName });
      mockClient.operations.get.mockResolvedValue({
        name: operationName,
        done: true,
        response: {
          generatedVideos: [{ video: { uri: 'videos/456' } }],
        },
      });
      mockClient.files.download.mockResolvedValue(new Uint8Array([1, 2, 3]));

      await service.generateVideo('A cat playing piano');

      expect(mockClient.models.generateVideos).toHaveBeenCalledWith({
        model: 'veo-3.0-generate-001',
        prompt: 'A cat playing piano',
        config: {
          aspectRatio: '16:9',
          negativePrompt: 'low quality, blurry, distorted',
        },
      });
    });

    it('should poll for operation completion', async () => {
      const operationName = 'operations/123';
      mockClient.models.generateVideos.mockResolvedValue({ name: operationName });

      // Simulate polling
      mockClient.operations.get
        .mockResolvedValueOnce({ name: operationName, done: false })
        .mockResolvedValueOnce({ name: operationName, done: false })
        .mockResolvedValueOnce({
          name: operationName,
          done: true,
          response: { generatedVideos: [{ video: { uri: 'videos/456' } }] },
        });

      mockClient.files.download.mockResolvedValue(new Uint8Array());

      jest.useFakeTimers();
      const promise = service.generateVideo('test');
      await jest.advanceTimersByTimeAsync(20000); // 2 polls
      await promise;
      jest.useRealTimers();

      expect(mockClient.operations.get).toHaveBeenCalledTimes(3);
      expect(mockClient.operations.get).toHaveBeenCalledWith(operationName);
    });

    it('should download the video file and create a blob URL', async () => {
      const operationName = 'operations/123';
      const videoObject = { uri: 'videos/456' };
      const videoData = new Uint8Array([1, 2, 3, 4]);

      mockClient.models.generateVideos.mockResolvedValue({ name: operationName });
      mockClient.operations.get.mockResolvedValue({
        name: operationName,
        done: true,
        response: { generatedVideos: [{ video: videoObject }] },
      });
      mockClient.files.download.mockResolvedValue(videoData);

      const result = await service.generateVideo('test');

      expect(mockClient.files.download).toHaveBeenCalledWith({ file: videoObject });
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(result.videoUrl).toBe('blob:http://localhost/video-123');
      expect(result.content).toBe('Video generated successfully and ready to play!');
    });

    it('should handle video generation timeout', async () => {
      const operationName = 'operations/123';
      mockClient.models.generateVideos.mockResolvedValue({ name: operationName });
      mockClient.operations.get.mockResolvedValue({ name: operationName, done: false });

      jest.useFakeTimers();
      const promise = service.generateVideo('test');
      // Exceed max polls
      await jest.advanceTimersByTimeAsync(61 * 10000);
      await expect(promise).rejects.toThrow('Video generation timed out');
      jest.useRealTimers();
    });

    it('should handle errors during video generation', async () => {
      const operationName = 'operations/123';
      mockClient.models.generateVideos.mockResolvedValue({ name: operationName });
      mockClient.operations.get.mockResolvedValue({
        name: operationName,
        done: true,
        error: { message: 'Something went wrong' },
      });

      await expect(service.generateVideo('test')).rejects.toThrow('Video generation failed: Something went wrong');
    });

    it('should include text context in the prompt', async () => {
        const operationName = 'operations/123';
        mockClient.models.generateVideos.mockResolvedValue({ name: operationName });
        mockClient.operations.get.mockResolvedValue({
          name: operationName,
          done: true,
          response: { generatedVideos: [{ video: { uri: 'videos/456' } }] },
        });
        mockClient.files.download.mockResolvedValue(new Uint8Array());
  
        const context: ConversationContext = {
          messages: [{ role: 'user', content: 'Make it cinematic' }],
        };
  
        await service.generateVideo('A dog on a skateboard', context);
  
        expect(mockClient.models.generateVideos).toHaveBeenCalledWith(expect.objectContaining({
          prompt: 'Context: Make it cinematic\n\nVideo prompt: A dog on a skateboard',
        }));
      });
  });
});