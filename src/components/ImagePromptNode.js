// Image Prompt Node - Uses Google Gemini for image generation
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CustomNodeBase from './CustomNodeBase';
import GoogleAIService from '../services/GoogleAIService';

const ImagePromptNode = ({ data, id, isConnectable }) => {
  const [isEditing, setIsEditing] = useState(true);
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [inputContext, setInputContext] = useState(null);
  const [hasReceivedInput, setHasReceivedInput] = useState(false);
  const textareaRef = useRef(null);

  // Listen for incoming context from connected nodes (optional for image generation)
  useEffect(() => {
    if (data.onReceiveInput) {
      data.onReceiveInput((inputData) => {
        setInputContext(inputData.context);
        setHasReceivedInput(true);
        setError(null);
      });
    }
  }, [data]);

  const handleKeyDown = useCallback(async (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      
      // Switch from editing to render mode
      setIsEditing(false);
      setError(null);
      
      if (!prompt.trim()) {
        setError('Please enter an image prompt first');
        return;
      }

      // Trigger main function - send to Google Gemini (Nano Banana)
      try {
        setIsProcessing(true);
        
        if (!GoogleAIService.isConfigured()) {
          throw new Error('Google API key not configured. Please check your .env file.');
        }

        // Generate image using Nano Banana with optional context
        const response = await GoogleAIService.generateImage(prompt, inputContext);
        
        // Emit the response through the output
        if (data.onOutput) {
          data.onOutput({
            nodeId: id,
            content: response.content,
            context: response.context,
            type: 'image'
          });
        }
        
      } catch (err) {
        console.error('Error generating image:', err);
        setError(err.message);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [prompt, id, data, inputContext]);

  const handleEditClick = () => {
    setIsEditing(true);
    setError(null);
    // Focus the textarea after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

  const getConnectionStatus = () => {
    if (hasReceivedInput) {
      return {
        icon: '✅',
        text: 'Context received',
        color: '#059669'
      };
    }
    return {
      icon: '🔗',
      text: 'No input (standalone mode)',
      color: '#6b7280'
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <CustomNodeBase 
      hasInput={true}
      hasOutput={true}
      nodeType="image"
      className={`${isProcessing ? 'processing' : ''} ${error ? 'error' : ''}`}
    >
      <div className="node-header">
        <span>🎨 Image Generator (Nano Banana)</span>
        <span className="helper-text helper-text-small">
          {connectionStatus.icon} {connectionStatus.text}
        </span>
      </div>

      {isEditing ? (
        <div>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the image you want to generate... Press Ctrl+Enter to create"

          />
          <div className="helper-text helper-text-margined">
            Press Ctrl+Enter to generate image • Click outside to preview
          </div>
        </div>
      ) : (
        <div 
          onClick={handleEditClick}
          className="preview-content"
        >
          {prompt ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {prompt}
            </ReactMarkdown>
          ) : (
            <span className="helper-text helper-text-italic">
              Click to add image prompt...
            </span>
          )}
        </div>
      )}

      {inputContext && (
        <details className="details-section">
          <summary className="helper-text summary-clickable">
            Input Context (will influence generation)
          </summary>
          <div className="context-details">
            {inputContext.messages?.slice(-2).map((msg, idx) => (
              <div key={idx} className="output-item">
                <strong>{msg.role}:</strong> {msg.content.substring(0, 80)}
                {msg.content.length > 80 && '...'}
              </div>
            ))}
          </div>
        </details>
      )}

      {isProcessing && (
        <div className="status-indicator processing">
          <span>🔄</span> Generating image with Nano Banana...
        </div>
      )}

      {error && (
        <div className="status-indicator error">
          ⚠️ {error}
        </div>
      )}

      <div className="helper-text image-helper-text">
        Powered by Google Gemini 2.5 Flash Image
      </div>
    </CustomNodeBase>
  );
};

export default ImagePromptNode;