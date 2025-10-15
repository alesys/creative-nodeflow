// Creative NodeFlow - Application Constants
// Contains all magic numbers, strings, and configuration values

// Timing constants
export const TIMING = {
  HANDLER_REGISTRATION_DELAY: 100, // ms - delay for registering node handlers
  FOCUS_DELAY: 0, // ms - delay before focusing textarea
  DEBOUNCE_DELAY: 300, // ms - general debounce delay
} as const;

// Limits and constraints
export const LIMITS = {
  MAX_CONTEXT_MESSAGES: 20, // Maximum messages to keep in conversation context
  PREVIEW_TEXT_LENGTH: 80, // Characters to show in preview
  PREVIEW_TEXT_LENGTH_LONG: 100, // Characters for longer previews
  MAX_PROMPT_LENGTH: 10000, // Maximum allowed prompt length
  MAX_TOKENS: 2000, // Maximum tokens for API requests
} as const;

// API Models
export const MODELS = {
  OPENAI: 'gpt-5-nano',
  OPENAI_VISION: 'gpt-5-nano', // GPT-5-nano supports both text and vision
  GOOGLE_IMAGE: 'gemini-2.5-flash-image-preview', // "Nano Banana"
  GOOGLE_TEXT: 'gemini-2.5-flash',
  GOOGLE_VIDEO: 'veo-3.1-fast-generate-preview', // Veo 3.1 Fast (Preview) for video generation
} as const;

// API Error Messages
export const API_ERRORS = {
  OPENAI_NOT_CONFIGURED: 'OpenAI API key not configured. Please check your .env file and ensure REACT_APP_OPENAI_API_KEY is set.',
  GOOGLE_NOT_CONFIGURED: 'Google API key not configured. Please check your .env file and ensure REACT_APP_GOOGLE_API_KEY is set.',
  CLIENT_NOT_INITIALIZED: 'AI client not initialized. Please check your API key configuration.',
  BILLING_REQUIRED: 'Image generation requires billing to be enabled on your Google Cloud account.',
  RATE_LIMIT: 'Rate limit exceeded. Please wait before making another request.',
  INVALID_REQUEST: 'Invalid request. Please check your input and try again.',
} as const;

// Node Types
export const NODE_TYPES = {
  STARTING_PROMPT: 'startingPrompt',
  AGENT_PROMPT: 'agentPrompt',
  IMAGE_PROMPT: 'imagePrompt',
  CUSTOM_OUTPUT: 'customOutput',
} as const;

export type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES];

// Default positions for new nodes
export const DEFAULT_POSITIONS = {
  STARTING_PROMPT: { x: 250, y: 100 },
  AGENT_PROMPT: { x: 250, y: 250 },
  IMAGE_PROMPT: { x: 250, y: 400 },
  OUTPUT: { x: 500, y: 200 },
} as const;

// CSS Classes
export const CSS_CLASSES = {
  CONNECTED_INPUT: 'connected-input',
  CONNECTED_OUTPUT: 'connected-output',
  PROCESSING: 'processing',
  ERROR: 'error',
} as const;

// Default system prompts
export const SYSTEM_PROMPTS = {
  DEFAULT: 'You are a helpful AI assistant.',
  CREATIVE: 'You are a creative AI assistant specializing in imaginative and innovative responses.',
  TECHNICAL: 'You are a technical AI assistant with expertise in programming and technology.',
} as const;

// Validation patterns
export const VALIDATION = {
  API_KEY_PATTERNS: {
    OPENAI: /^sk-[a-zA-Z0-9]{32,}$/,
    GOOGLE: /^[a-zA-Z0-9_-]{39}$/,
  },
  MIN_PROMPT_LENGTH: 1,
  MAX_NODE_NAME_LENGTH: 50,
} as const;

// UI Dimensions (keep in sync with CSS variables)
export const UI_DIMENSIONS = {
  NODE_MIN_WIDTH: 320, // Must match --node-min-width in CSS
  NODE_MIN_HEIGHT: 320, // Must match --node-min-height in CSS (now same as width for square nodes)
} as const;

// Default values
export const DEFAULTS = {
  TEMPERATURE: 0.7,
  NODE_WIDTH: 300,
  NODE_HEIGHT: 'auto' as const,
  ZOOM_LEVEL: 1,
} as const;

const constants = {
  TIMING,
  LIMITS,
  MODELS,
  API_ERRORS,
  NODE_TYPES,
  DEFAULT_POSITIONS,
  CSS_CLASSES,
  SYSTEM_PROMPTS,
  VALIDATION,
  UI_DIMENSIONS,
  DEFAULTS,
} as const;

export default constants;
