# Backend API Server

Secure backend server for proxying AI API requests with server-side API key management.

## Features

- **Secure API Key Storage**: API keys are stored server-side, never exposed to the client
- **Rate Limiting**: 60 requests/minute for general API, 10 uploads/minute
- **Input Validation**: All requests are validated before forwarding to AI services
- **CORS Protection**: Only allows requests from configured frontend URL
- **Helmet Security**: Additional security headers for protection
- **Error Handling**: Comprehensive error handling and logging

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and add your API keys:

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
OPENAI_API_KEY=your_actual_openai_key
GOOGLE_API_KEY=your_actual_google_key
```

⚠️ **NEVER commit the `.env` file to git!**

### 3. Run the Server

Development mode (with auto-reload):
```bash
npm run server:dev
```

Production mode:
```bash
npm run server
```

Run both frontend and backend together:
```bash
npm run dev
```

## API Endpoints

### Health Check
```
GET /health
```

Returns server status.

### OpenAI Endpoints

#### Chat Completion
```
POST /api/openai/chat
Content-Type: application/json

{
  "prompt": "Your prompt here",
  "systemPrompt": "Optional system prompt",
  "model": "gpt-4o-mini",
  "context": {
    "messages": [...] // Optional conversation context
  }
}
```

#### Vision
```
POST /api/openai/vision
Content-Type: application/json

{
  "prompt": "Describe this image",
  "imageUrl": "data:image/jpeg;base64,...",
  "model": "gpt-4o-mini"
}
```

### Google AI Endpoints

#### Image Generation
```
POST /api/googleai/generate-image
Content-Type: application/json

{
  "prompt": "A beautiful sunset",
  "model": "gemini-2.5-flash-image-preview"
}
```

#### Chat
```
POST /api/googleai/chat
Content-Type: application/json

{
  "prompt": "Your prompt here",
  "systemPrompt": "Optional system prompt",
  "model": "gemini-2.0-flash-exp"
}
```

## Security Features

### Rate Limiting
- General API: 60 requests per minute per IP
- Upload endpoints: 10 requests per minute per IP

### Input Validation
- Maximum prompt length: 50,000 characters
- Maximum system prompt length: 10,000 characters
- Content type validation
- Sanitization of all user inputs

### CORS Configuration
- Only accepts requests from configured `FRONTEND_URL`
- Credentials support enabled

### Headers Security
- Helmet.js for security headers
- Content Security Policy
- XSS Protection

## Migration from Client-Side API Calls

The frontend services now use the backend API instead of direct API calls:

**Before (Insecure):**
```javascript
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true  // ⚠️ Security risk!
});
```

**After (Secure):**
```javascript
import backendAPIService from './services/BackendAPIService';

const response = await backendAPIService.openaiChat(
  prompt,
  systemPrompt,
  context
);
```

## Environment Variables

### Required
- `OPENAI_API_KEY`: Your OpenAI API key
- `GOOGLE_API_KEY`: Your Google AI API key

### Optional
- `PORT`: Server port (default: 3001)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)
- `NODE_ENV`: Environment (development/production)

## Deployment

### Production Checklist
1. Set `NODE_ENV=production` in `.env`
2. Configure production `FRONTEND_URL`
3. Use process manager (PM2, systemd) for server
4. Set up SSL/TLS certificates
5. Configure firewall rules
6. Enable production logging
7. Set up monitoring/alerting

### Example PM2 Configuration
```bash
pm2 start server/index.js --name creative-nodeflow-api
pm2 save
pm2 startup
```

## Troubleshooting

### Server won't start
- Check if port 3001 is already in use
- Verify `.env` file exists in `server/` directory
- Ensure all dependencies are installed

### CORS errors
- Verify `FRONTEND_URL` matches your frontend URL exactly
- Check browser console for specific CORS errors
- Ensure credentials are included in requests

### API key errors
- Confirm API keys are set in `server/.env`
- Check that `.env` file is in the correct location
- Verify API keys are valid and have proper permissions

## Development

### Adding New Endpoints
1. Create route file in `server/routes/`
2. Add validation middleware
3. Implement endpoint logic
4. Register route in `server/index.js`
5. Update this README

### Testing
```bash
# Test health endpoint
curl http://localhost:3001/health

# Test OpenAI chat
curl -X POST http://localhost:3001/api/openai/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello, world!"}'
```
