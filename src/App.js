import React, { useEffect } from 'react';
import CreativeNodeFlow from './CreativeNodeFlow';
import ErrorBoundary from './components/ErrorBoundary';
import AlertProvider from './components/AlertProvider';

// Uncomment the line below for environment debugging
// import EnvDiagnostic from './components/EnvDiagnostic';
// import EnvironmentDebugger from './components/EnvironmentDebugger';

function App() {
  useEffect(() => {
    // More comprehensive ResizeObserver error suppression
    const suppressResizeObserverErrors = () => {
      const resizeObserverErr = /ResizeObserver loop completed with undelivered notifications/;
      
      // Override window.onerror
      const originalOnError = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
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
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'error') {
          const wrappedListener = function(event) {
            if (event.error && resizeObserverErr.test(event.error.message)) {
              return true;
            }
            return listener.call(this, event);
          };
          return originalAddEventListener.call(this, type, wrappedListener, options);
        }
        return originalAddEventListener.call(this, type, listener, options);
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
}

export default App;
