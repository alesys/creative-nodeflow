/**
 * OpenAI API Routes
 * Proxies requests to OpenAI API with server-side API key
 */

import express, { Request, Response, NextFunction, Router } from 'express';
import OpenAI from 'openai';

const router: Router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface ChatRequestBody {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  context?: {
    messages?: Array<{ role: string; content: string }>;
  };
}

interface VisionRequestBody {
  prompt: string;
  imageUrl: string;
  model?: string;
}

// Validate API key
const validateApiKey = (_req: Request, res: Response, next: NextFunction): Response | void => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured on server' });
  }
  next();
};

// Input validation middleware
const validateChatRequest = (req: Request<{}, {}, ChatRequestBody>, res: Response, next: NextFunction): Response | void => {
  const { prompt, systemPrompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt' });
  }

  if (prompt.length > 50000) {
    return res.status(400).json({ error: 'Prompt exceeds maximum length of 50,000 characters' });
  }

  if (systemPrompt && typeof systemPrompt !== 'string') {
    return res.status(400).json({ error: 'Invalid system prompt' });
  }

  if (systemPrompt && systemPrompt.length > 10000) {
    return res.status(400).json({ error: 'System prompt exceeds maximum length of 10,000 characters' });
  }

  next();
};

// Chat completion endpoint
router.post('/chat', validateApiKey, validateChatRequest, async (req: Request<{}, {}, ChatRequestBody>, res: Response) => {
  try {
    const { prompt, systemPrompt, model = 'gpt-4o-mini', context } = req.body;

    // Build messages array
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system' as const, content: systemPrompt });
    }

    // Add context messages if provided
    if (context?.messages && Array.isArray(context.messages)) {
      messages.push(...context.messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>);
    }

    // Add user prompt
    messages.push({ role: 'user' as const, content: prompt });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 4000,
    });

    const responseContent = completion.choices[0].message.content;

    // Build context for next request
    const newContext = {
      messages: [
        ...messages,
        { role: 'assistant' as const, content: responseContent || '' }
      ]
    };

    res.json({
      content: responseContent,
      context: newContext,
      type: 'text',
      model: completion.model,
      usage: completion.usage
    });

  } catch (error: unknown) {
    console.error('OpenAI API Error:', error);
    const err = error as { status?: number; message?: string; type?: string };
    res.status(err.status || 500).json({
      error: err.message || 'Failed to generate response',
      type: err.type
    });
  }
});

// Vision endpoint
router.post('/vision', validateApiKey, async (req: Request<{}, {}, VisionRequestBody>, res: Response) => {
  try {
    const { prompt, imageUrl, model = 'gpt-4o-mini' } = req.body;

    if (!prompt || !imageUrl) {
      return res.status(400).json({ error: 'Prompt and imageUrl are required' });
    }

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: prompt },
            { type: 'image_url' as const, image_url: { url: imageUrl } }
          ]
        }
      ],
      max_tokens: 2000,
    });

    res.json({
      content: response.choices[0].message.content,
      type: 'text',
      model: response.model,
      usage: response.usage
    });

  } catch (error: unknown) {
    console.error('OpenAI Vision API Error:', error);
    const err = error as { status?: number; message?: string; type?: string };
    res.status(err.status || 500).json({
      error: err.message || 'Failed to analyze image',
      type: err.type
    });
  }
});

export default router;
