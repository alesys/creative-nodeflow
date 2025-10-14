# Creative NodeFlow - AI-Powered Prompt Chain Builder

A visual, node-based interface for building and executing AI prompt chains using ReactFlow. Create complex AI workflows by connecting different types of nodes that can process text, generate images, and chain responses together.

## ✨ Features

- **🚀 Starting Prompt Node**: Entry point for prompt chains with OpenAI GPT-4o-mini integration
- **🤖 Creative Director Node**: Continuation prompts that receive context from previous nodes  
- **🎨 Art Director Node**: Generate images using Google's Gemini 2.5 Flash Image (Nano Banana)
- **🎬 VEO-3 Video Node**: Generate videos using Google's VEO-3 Fast model
- **📄 Output Node**: Display text (rendered as Markdown), images, or videos from AI responses
- **🖼️ Image Panel**: Upload or paste images to use as context in prompts
- **📁 File Panel**: Upload documents, images, and text files with AI-powered processing
- **🎙️ Brand Voice**: Define your brand's personality and writing style (auto-applied to all prompts)
- **🧵 Thread Management**: Smart conversation threading with efficient Brand Voice injection
- **🔗 Context Flow**: Seamless context passing between connected nodes with multimodal support
- **⚡ Auto-Output**: Automatic output node creation when no output is connected
- **🎯 Interactive UI**: Click to edit, Ctrl+Enter to execute, real-time processing feedback

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- OpenAI API key
- Google Gemini API key

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd creative-nodeflow
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env with your API keys
   ```

3. **Configure your API keys** (see setup instructions below)

4. **Validate your environment**:
   ```bash
   npm run validate-env
   ```

5. **Start the development server**:
   ```bash
   npm start
   ```

⚠️ **Important**: If you see "API key not configured" errors, restart the server after setting up your `.env` file.

Open [http://localhost:3001](http://localhost:3001) to view it in your browser.

## 🔑 API Key Setup

### OpenAI API Key

1. **Go to OpenAI Platform**: Visit [https://platform.openai.com/](https://platform.openai.com/)
2. **Sign up/Login**: Create an account or log in to your existing account
3. **Navigate to API Keys**: Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
4. **Create New Key**: Click "Create new secret key"
5. **Copy the Key**: Copy the generated key (starts with `sk-`)
6. **Add to .env file**:
   ```bash
   REACT_APP_OPENAI_API_KEY=sk-your-openai-key-here
   ```

**Note**: You'll need to add billing information to your OpenAI account to use the API.

### Google Gemini API Key

1. **Go to Google AI Studio**: Visit [https://aistudio.google.com/](https://aistudio.google.com/)
2. **Sign in**: Use your Google account to sign in
3. **Get API Key**: Click "Get API key" in the top navigation
4. **Create New Key**: Click "Create API key in new project" or use an existing project
5. **Copy the Key**: Copy the generated API key
6. **Add to .env file**:
   ```bash
   REACT_APP_GOOGLE_API_KEY=your-google-gemini-key-here
   ```

**Note**: Google AI Studio provides free tier access to Gemini models including image generation.

### Complete .env File Example

```bash
# OpenAI Configuration
REACT_APP_OPENAI_API_KEY=sk-your-openai-key-here

# Google Gemini Configuration  
REACT_APP_GOOGLE_API_KEY=your-google-gemini-key-here

# Optional: Default system prompt
REACT_APP_DEFAULT_SYSTEM_PROMPT=You are a helpful AI assistant. Respond clearly and concisely.
```

## 🎯 How to Use

### Setting Up Brand Voice (Optional but Recommended)

1. **Open File Panel**: Click the "📁" icon on the right side
2. **Switch to Brand Voice Tab**: Click the "Brand Voice" tab
3. **Define Your Brand**:
   ```
   You are a professional technical writer.
   - Tone: Clear and concise
   - Style: Active voice, short sentences
   - Avoid: Jargon, overly formal language
   ```
4. **Auto-Save**: Your Brand Voice is automatically saved and applied to all prompts

**How It Works**: Brand Voice is injected as a system message only when you create a new thread (Starting Prompt). Follow-up prompts (Creative Director) continue the thread without re-injecting Brand Voice, saving tokens and maintaining consistency.

### Creating Your First Workflow

1. **Add Starting Prompt**: Click "🚀 Starting Prompt" in the left panel
2. **Enter Your Prompt**: Click in the text area and type your prompt
3. **Execute**: Press `Ctrl+Enter` to send to OpenAI
4. **Auto Output**: An output node will automatically appear with the response

**Behind the Scenes**: Starting Prompt creates a new conversation thread with your Brand Voice (if defined) as the first system message.

### Chaining Prompts

1. **Add Creative Director**: Click "🤖 Creative Director" to add a follow-up prompt
2. **Connect Nodes**: Drag from the output handle (right side) of one node to the input handle (left side) of another
3. **Context Flow**: Creative Director automatically receives context from connected nodes
4. **Thread Continuity**: The Creative Director continues the existing thread without re-injecting Brand Voice

**Token Savings**: By not re-injecting Brand Voice on every follow-up, you save 100-500 tokens per message (900-4500 tokens per 10-message conversation)!

### Generating Images

1. **Add Art Director**: Click "🎨 Art Director" to add image generation
2. **Describe Image**: Enter a description of the image you want
3. **Execute**: Press `Ctrl+Enter` to generate with Nano Banana
4. **View Result**: The image will appear in the connected output node

### Node Controls

- **Edit Mode**: Click on any node content to edit
- **Preview Mode**: Click outside the text area to see Markdown preview  
- **Execute**: Press `Ctrl+Enter` in any prompt node to process
- **Context View**: Expand context details in Agent and Art Director nodes

## 🏗️ Architecture

### Node Types

- **Starting Prompt**: No input, has output. Creates new thread with Brand Voice. Uses OpenAI GPT-4o-mini
- **Creative Director**: Has input and output. Continues existing thread. Receives context from previous nodes
- **Art Director**: Has input and output. Uses Google Gemini 2.5 Flash Image (Nano Banana)
- **VEO-3 Video**: Has input and output. Uses Google VEO-3 Fast for video generation
- **Output**: Has input and output. Displays results and passes context through
- **Image Panel**: No input, has output. Upload or paste images for use as context

### Thread Management

**How Threads Work**:
- Starting Prompt creates a **new thread** with Brand Voice as the first system message
- Creative Director **continues the thread** from upstream nodes
- Thread ID is passed through the node chain via context
- Brand Voice is **never re-injected** in follow-up prompts

**Example Flow**:
```
Starting Prompt: "Write about AI" 
  ↓ Creates Thread-123 with Brand Voice
  ↓ Sends context (threadId=Thread-123)
Creative Director: "Make it more technical"
  ↓ Uses Thread-123 (Brand Voice already present)
  ↓ Adds message to existing thread
Output: Displays final result
```

### Context Flow

Context flows through the node chain as a message history with thread tracking, allowing each subsequent node to understand the full conversation context while maintaining token efficiency.

## 🛠️ Development

### Available Scripts

- `npm start` - Development server with hot reload
- `npm test` - Run test suite  
- `npm run build` - Production build
- `npm run eject` - Eject from Create React App (one-way operation)

### Project Structure

```
src/
├── components/           # Custom node components
│   ├── CustomNodeBase.js       # Base node component
│   ├── StartingPromptNode.js   # Starting prompt node
│   ├── AgentPromptNode.js      # Agent prompt node  
│   ├── ImagePromptNode.js      # Image generation node
│   └── OutputNode.js           # Output display node
├── services/            # API integration services
│   ├── OpenAIService.js        # OpenAI API client
│   └── GoogleAIService.js      # Google Gemini API client
├── CreativeNodeFlow.js  # Main ReactFlow component
└── App.js              # Root component
```

## 🔒 Security Notes

- API keys are stored in environment variables
- **Important**: Never commit `.env` file to version control
- For production deployments, use a backend proxy instead of calling APIs directly from the browser
- The current implementation uses `dangerouslyAllowBrowser: true` for development only

## 🚀 Deployment

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy the `build` folder** to your hosting service

3. **Set environment variables** in your hosting platform's settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes  
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

#### "OpenAI API key not configured" Error
1. **Check .env file location**: Must be in `creative-nodeflow/.env` (not parent directory)
2. **Verify .env format**: No spaces around `=` sign
   ```bash
   REACT_APP_OPENAI_API_KEY=sk-proj-your-key-here
   ```
3. **Restart server**: **CRITICAL** - Must restart `npm start` after .env changes
4. **Validate environment**: Run `npm run validate-env` to check setup
5. **Check browser console**: Look for initialization logs and errors

#### Other Issues
- **"Failed to generate response"**: Check your OpenAI billing and API key validity
- **"Failed to generate image"**: Verify your Google API key has access to Gemini models
- **Nodes not connecting**: Make sure to drag from output (right) to input (left) handles
- **Blank/broken UI**: Check browser console for JavaScript errors

### Environment Debugging

Enable the diagnostic panel by uncommenting this line in `src/App.js`:
```javascript
// <EnvDiagnostic />  // Remove // to enable
```

The diagnostic panel shows:
- ✅/❌ API key detection status
- Service initialization status
- Environment variable details

### Validation Commands

```bash
# Check environment setup
npm run validate-env

# Start with environment check
npm run dev:debug

# View available scripts
npm run
```

### Getting Help

1. **Check browser console** (F12) for detailed error messages
2. **Run validation script**: `npm run validate-env`
3. **Verify API keys** are correctly set and server restarted
4. **Check TROUBLESHOOTING.md** for detailed debugging steps
5. **Ensure billing** is set up for OpenAI if required

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
