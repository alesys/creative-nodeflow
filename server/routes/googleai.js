/**
 * Google AI (Gemini) API Routes
 * Proxies requests to Google AI API with server-side API key
 */

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// Initialize Google AI client
let genAI = null;
if (process.env.GOOGLE_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
}

// Validate API key
const validateApiKey = (req, res, next) => {
  if (!process.env.GOOGLE_API_KEY || !genAI) {
    return res.status(500).json({ error: 'Google AI API key not configured on server' });
  }
  next();
};

// Input validation middleware
const validateImageRequest = (req, res, next) => {
  const { prompt, model } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid prompt' });
  }

  if (prompt.length > 50000) {
    return res.status(400).json({ error: 'Prompt exceeds maximum length of 50,000 characters' });
  }

  next();
};

// Image generation endpoint
router.post('/generate-image', validateApiKey, validateImageRequest, async (req, res) => {
  try {
    const { prompt, model = 'gemini-2.5-flash-image-preview' } = req.body;

    const geminiModel = genAI.getGenerativeModel({ model });

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;

    // Check for safety blocks
    if (response.promptFeedback?.blockReason) {
      return res.status(400).json({
        error: 'Content was blocked',
        reason: response.promptFeedback.blockReason,
        safetyRatings: response.promptFeedback.safetyRatings
      });
    }

    const candidate = response.candidates?.[0];
    if (!candidate) {
      return res.status(500).json({ error: 'No response generated' });
    }

    // Check finish reason
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      return res.status(400).json({
        error: 'Generation stopped',
        reason: candidate.finishReason,
        safetyRatings: candidate.safetyRatings
      });
    }

    // Extract image data
    let imageData = null;
    let textContent = null;

    for (const part of candidate.content.parts) {
      // Check for camelCase inlineData (newer format)
      if (part.inlineData?.data) {
        imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
      // Check for snake_case inline_data (older format)
      else if (part.inline_data?.data) {
        imageData = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
        break;
      }
      // Check for text content
      else if (part.text) {
        textContent = part.text;
      }
    }

    if (!imageData) {
      return res.status(500).json({
        error: 'No image data in response',
        textContent,
        availableParts: candidate.content.parts.map(p => Object.keys(p))
      });
    }

    res.json({
      imageUrl: imageData,
      textContent,
      type: 'image',
      model
    });

  } catch (error) {
    console.error('Google AI API Error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to generate image',
      details: error.errorDetails
    });
  }
});

// Text generation endpoint
router.post('/chat', validateApiKey, async (req, res) => {
  try {
    const { prompt, systemPrompt, model = 'gemini-2.0-flash-exp', context } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const geminiModel = genAI.getGenerativeModel({ model });

    // Build full prompt
    let fullPrompt = prompt;
    if (systemPrompt) {
      fullPrompt = `${systemPrompt}\n\n${prompt}`;
    }

    const result = await geminiModel.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      content: text,
      type: 'text',
      model
    });

  } catch (error) {
    console.error('Google AI API Error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to generate response',
      details: error.errorDetails
    });
  }
});

module.exports = router;
