/**
 * OpenAI API Routes
 * Proxies requests to OpenAI API with server-side API key
 */

const express = require('express');
const OpenAI = require('openai');
const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Validate API key
const validateApiKey = (req, res, next) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured on server' });
  }
  next();
};

// Input validation middleware
const validateChatRequest = (req, res, next) => {
  const { prompt, systemPrompt, model, context } = req.body;

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
router.post('/chat', validateApiKey, validateChatRequest, async (req, res) => {
  try {
    const { prompt, systemPrompt, model = 'gpt-4o-mini', context } = req.body;

    // Build messages array
    const messages = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Add context messages if provided
    if (context && context.messages && Array.isArray(context.messages)) {
      messages.push(...context.messages);
    }

    // Add user prompt
    messages.push({ role: 'user', content: prompt });

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
        { role: 'assistant', content: responseContent }
      ]
    };

    res.json({
      content: responseContent,
      context: newContext,
      type: 'text',
      model: completion.model,
      usage: completion.usage
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to generate response',
      type: error.type
    });
  }
});

// Vision endpoint
router.post('/vision', validateApiKey, async (req, res) => {
  try {
    const { prompt, imageUrl, model = 'gpt-4o-mini' } = req.body;

    if (!prompt || !imageUrl) {
      return res.status(400).json({ error: 'Prompt and imageUrl are required' });
    }

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
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

  } catch (error) {
    console.error('OpenAI Vision API Error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to analyze image',
      type: error.type
    });
  }
});

module.exports = router;
