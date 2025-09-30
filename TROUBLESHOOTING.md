# API Key Detection and Setup Troubleshooting Guide

## Issue Diagnosis

The error "OpenAI API key not configured. Please check your .env file" indicates that the React app is not reading the environment variables properly.

## Root Cause

In React applications, environment variables are loaded at **build time**, not runtime. This means:

1. Environment variables must be present when `npm start` is executed
2. If you add or modify `.env` after starting the server, you must restart it
3. Variables must be prefixed with `REACT_APP_`

## Step-by-Step Fix

### Step 1: Verify .env File Location
- Ensure `.env` is in the project root: `creative-nodeflow/.env`
- NOT in parent directory: `reactflow-creative-prompt-tree/.env`

### Step 2: Verify .env File Content Format
```bash
# No spaces around = sign
REACT_APP_OPENAI_API_KEY=sk-proj-your-key-here
REACT_APP_GOOGLE_API_KEY=your-google-key-here
REACT_APP_DEFAULT_SYSTEM_PROMPT=You are a helpful AI assistant.
```

### Step 3: Restart Development Server
**CRITICAL:** Must restart after any .env changes:
```bash
# Stop current server (Ctrl+C)
# Then restart:
npm start
```

### Step 4: Use Environment Diagnostic
The app now includes a debug panel (top-left) that shows:
- ✅/❌ API key detection status  
- Service initialization status
- All available environment variables

### Step 5: Browser Console Check
Open DevTools (F12) → Console to see initialization logs:
```
=== ENVIRONMENT DIAGNOSTIC ===
OpenAI Key: sk-proj...
Google Key: AIzaSyD...
OpenAI Service Configured: true
Google Service Configured: true
==============================
```

## Alternative Solutions

### Option A: Manual Environment Check
Add this to any component for debugging:
```javascript
console.log('API Keys:', {
  openai: process.env.REACT_APP_OPENAI_API_KEY ? 'FOUND' : 'MISSING',
  google: process.env.REACT_APP_GOOGLE_API_KEY ? 'FOUND' : 'MISSING'
});
```

### Option B: Environment Validation Script
Create `scripts/validate-env.js`:
```javascript
const requiredVars = [
  'REACT_APP_OPENAI_API_KEY',
  'REACT_APP_GOOGLE_API_KEY'
];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing: ${varName}`);
  } else {
    console.log(`✅ Found: ${varName}`);
  }
});
```

## Quick Test Commands

### Test Environment Loading:
```bash
# From creative-nodeflow directory:
node -e "console.log('OpenAI:', process.env.REACT_APP_OPENAI_API_KEY ? 'FOUND' : 'MISSING')"
```

### Test API Key Format:
```bash
# OpenAI keys should start with 'sk-'
# Google keys should be 39+ characters
```

## Common Issues & Fixes

1. **Server not restarted** → Restart `npm start`
2. **Wrong directory** → Ensure `.env` in `creative-nodeflow/`  
3. **Spaces in .env** → No spaces around `=` sign
4. **Missing prefix** → Must start with `REACT_APP_`
5. **IDE caching** → Close/reopen IDE after .env changes

## Production Notes

- Environment variables are embedded at build time
- Use backend proxy for production (not `dangerouslyAllowBrowser`)
- Never commit `.env` files to version control
- Use hosting platform environment variable settings for deployment