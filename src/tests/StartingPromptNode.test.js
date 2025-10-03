// StartingPromptNode component tests
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { setupTestEnvironment, createMockNodeProps } from './testUtils';
import StartingPromptNode from '../components/StartingPromptNode';

// Mock the services
jest.mock('../services/OpenAIService', () => ({
  isConfigured: jest.fn(() => true),
  generateResponse: jest.fn()
}));

describe('StartingPromptNode', () => {
  setupTestEnvironment();

  let mockProps;
  let mockOpenAIService;

  beforeEach(async () => {
    mockOpenAIService = await import('../services/OpenAIService');
    mockOpenAIService.default.isConfigured.mockReturnValue(true);
    mockOpenAIService.default.generateResponse.mockResolvedValue({
      content: 'Mock AI response',
      context: {
        messages: [
          { role: 'user', content: 'test prompt' },
          { role: 'assistant', content: 'Mock AI response' }
        ]
      }
    });

    mockProps = createMockNodeProps({
      data: {
        prompt: '',
        systemPrompt: 'Test system prompt',
        onOutput: jest.fn()
      }
    });
  });

  test('renders in editing mode by default', () => {
    render(<StartingPromptNode {...mockProps} />);
    
    expect(screen.getByText('🚀 Starting Prompt')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your prompt here/)).toBeInTheDocument();
  });

  test('switches to preview mode when clicking outside', async () => {
    const user = userEvent.setup();
    render(<StartingPromptNode {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText(/Enter your prompt here/);
    await user.type(textarea, 'Test prompt content');
    
    // Click outside to switch to preview mode
    await user.click(document.body);
    
    await waitFor(() => {
      expect(screen.getByText('Test prompt content')).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText(/Enter your prompt here/)).not.toBeInTheDocument();
  });

  test('switches back to editing mode when clicking preview', async () => {
    const user = userEvent.setup();
    mockProps.data.prompt = 'Existing prompt';
    render(<StartingPromptNode {...mockProps} />);
    
    // Start in preview mode
    fireEvent.click(document.body);
    
    await waitFor(() => {
      const previewDiv = screen.getByText('Existing prompt');
      expect(previewDiv).toBeInTheDocument();
    });

    // Click on preview to edit
    const previewDiv = screen.getByText('Existing prompt');
    await user.click(previewDiv);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing prompt')).toBeInTheDocument();
    });
  });

  test('executes prompt with Ctrl+Enter', async () => {
    const user = userEvent.setup();
    render(<StartingPromptNode {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText(/Enter your prompt here/);
    await user.type(textarea, 'Test prompt');
    
    // Simulate Ctrl+Enter
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    
    await waitFor(() => {
      expect(mockOpenAIService.default.generateResponse).toHaveBeenCalledWith(
        'Test prompt',
        'Test system prompt'
      );
    });

    await waitFor(() => {
      expect(mockProps.data.onOutput).toHaveBeenCalledWith({
        nodeId: mockProps.id,
        content: 'Mock AI response',
        context: expect.any(Object),
        type: 'text'
      });
    });
  });

  test('shows processing indicator during API call', async () => {
    // Make the API call hang
    let resolvePromise;
    const hangingPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    mockOpenAIService.default.generateResponse.mockReturnValue(hangingPromise);

    const user = userEvent.setup();
    render(<StartingPromptNode {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText(/Enter your prompt here/);
    await user.type(textarea, 'Test prompt');
    
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    
    await waitFor(() => {
      expect(screen.getByText(/Processing with OpenAI/)).toBeInTheDocument();
    });

    // Resolve the promise
    resolvePromise({
      content: 'Response',
      context: { messages: [] }
    });

    await waitFor(() => {
      expect(screen.queryByText(/Processing with OpenAI/)).not.toBeInTheDocument();
    });
  });

  test('shows error message when API call fails', async () => {
    mockOpenAIService.default.generateResponse.mockRejectedValue(
      new Error('API Error occurred')
    );

    const user = userEvent.setup();
    render(<StartingPromptNode {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText(/Enter your prompt here/);
    await user.type(textarea, 'Test prompt');
    
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    
    await waitFor(() => {
      expect(screen.getByText(/API Error occurred/)).toBeInTheDocument();
    });
  });

  test('shows error when OpenAI is not configured', async () => {
    mockOpenAIService.default.isConfigured.mockReturnValue(false);

    const user = userEvent.setup();
    render(<StartingPromptNode {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText(/Enter your prompt here/);
    await user.type(textarea, 'Test prompt');
    
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    
    await waitFor(() => {
      expect(screen.getByText(/OpenAI API key not configured/)).toBeInTheDocument();
    });
  });

  test('shows error when prompt is empty', async () => {
    const user = userEvent.setup();
    render(<StartingPromptNode {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText(/Enter your prompt here/);
    
    // Try to execute without entering text
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    
    await waitFor(() => {
      expect(screen.getByText(/Please enter a prompt first/)).toBeInTheDocument();
    });
  });

  test('uses default system prompt when not provided', () => {
    const propsWithoutSystem = {
      ...mockProps,
      data: {
        ...mockProps.data,
        systemPrompt: undefined
      }
    };

    render(<StartingPromptNode {...propsWithoutSystem} />);
    expect(screen.getByText('🚀 Starting Prompt')).toBeInTheDocument();
  });
});