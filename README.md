# Creative NodeFlow - AI-Powered Prompt Chain Builder

A visual, node-based interface for building and executing AI prompt chains using ReactFlow. Create complex AI workflows by connecting different types of nodes that can process text, generate images, and chain responses together.

## ✨ Features

- **🚀 Starting Prompt Node**: Entry point for prompt chains with OpenAI GPT-4o-mini integration
- **🤖 Agent Prompt Node**: Continuation prompts that receive context from previous nodes  
- **🎨 Image Prompt Node**: Generate images using Google's Gemini 2.5 Flash Image (Nano Banana)
- **📄 Output Node**: Display text (rendered as Markdown) or images from AI responses
- **🔗 Context Flow**: Seamless context passing between connected nodes
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

4. **Start the development server**:
   ```bash
   npm start
   ```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

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

### Creating Your First Workflow

1. **Add Starting Prompt**: Click "🚀 Starting Prompt" in the left panel
2. **Enter Your Prompt**: Click in the text area and type your prompt
3. **Execute**: Press `Ctrl+Enter` to send to OpenAI
4. **Auto Output**: An output node will automatically appear with the response

### Chaining Prompts

1. **Add Agent Prompt**: Click "🤖 Agent Prompt" to add a follow-up prompt
2. **Connect Nodes**: Drag from the output handle (right side) of one node to the input handle (left side) of another
3. **Context Flow**: Agent prompts automatically receive context from connected nodes

### Generating Images

1. **Add Image Prompt**: Click "🎨 Image Prompt" to add image generation
2. **Describe Image**: Enter a description of the image you want
3. **Execute**: Press `Ctrl+Enter` to generate with Nano Banana
4. **View Result**: The image will appear in the connected output node

### Node Controls

- **Edit Mode**: Click on any node content to edit
- **Preview Mode**: Click outside the text area to see Markdown preview  
- **Execute**: Press `Ctrl+Enter` in any prompt node to process
- **Context View**: Expand context details in Agent and Image prompt nodes

## 🏗️ Architecture

### Node Types

- **Starting Prompt**: No input, has output. Uses OpenAI GPT-4o-mini
- **Agent Prompt**: Has input and output. Receives context from previous nodes
- **Image Prompt**: Has input and output. Uses Google Gemini 2.5 Flash Image
- **Output**: Has input and output. Displays results and passes context through

### Context Flow

Context flows through the node chain as a message history, allowing each subsequent node to understand the full conversation context.

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

- **"API key not configured"**: Ensure your `.env` file has the correct API keys
- **"Failed to generate response"**: Check your OpenAI billing and API key validity
- **"Failed to generate image"**: Verify your Google API key has access to Gemini models
- **Nodes not connecting**: Make sure to drag from output (right) to input (left) handles

### Getting Help

- Check the browser console for detailed error messages
- Verify API keys are correctly set in `.env`
- Ensure you have billing set up for OpenAI if required
- Test API keys independently to verify they work

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
