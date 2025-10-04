import React, { useEffect } from 'react';
import CreativeNodeFlow from './CreativeNodeFlow';
import ErrorBoundary from './components/ErrorBoundary';
import AlertProvider from './components/AlertProvider';

// Uncomment the line below for environment debugging
// import EnvDiagnostic from './components/EnvDiagnostic';
// import EnvironmentDebugger from './components/EnvironmentDebugger';

const App: React.FC = () => {
  useEffect(() => {
    // More comprehensive ResizeObserver error suppression
    const suppressResizeObserverErrors = () => {
      const resizeObserverErr = /ResizeObserver loop completed with undelivered notifications/;

      // Override window.onerror
      const originalOnError = window.onerror;
      window.onerror = (message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error): boolean => {
        if (typeof message === 'string' && resizeObserverErr.test(message)) {
          return true; // Suppress the error
        }
        if (originalOnError) {
          return originalOnError(message, source, lineno, colno, error);
        }
        return false;
      };

      // Override addEventListener for error events
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
      ): void {
        if (type === 'error') {
          const wrappedListener = function(this: EventTarget, event: Event): void {
            if (event instanceof ErrorEvent && event.error && resizeObserverErr.test(event.error.message)) {
              event.preventDefault();
              return;
            }
            if (typeof listener === 'function') {
              listener.call(this, event);
            } else {
              listener.handleEvent.call(this, event);
            }
          };
          return originalAddEventListener.call(this, type, wrappedListener as EventListener, options);
        }
        return originalAddEventListener.call(this, type, listener as EventListener, options);
      };

      return () => {
        window.onerror = originalOnError;
        EventTarget.prototype.addEventListener = originalAddEventListener;
      };
    };

    const cleanup = suppressResizeObserverErrors();
    return cleanup;
  }, []);

  return (
    <AlertProvider>
      <div className="app-container">
        <ErrorBoundary>
          {/* <EnvironmentDebugger /> */}
          {/* <EnvDiagnostic /> */}
          <CreativeNodeFlow />
        </ErrorBoundary>
      </div>
    </AlertProvider>
  );
};

export default App;
