// ResizeObserver error suppression
(function() {
  'use strict';
  
  const resizeObserverErr = /ResizeObserver loop completed with undelivered notifications/;
  const resizeObserverErrRe = /ResizeObserver loop limit exceeded/;
  
  // Suppress ResizeObserver errors
  const originalConsoleError = console.error;
  console.error = function() {
    const args = Array.prototype.slice.call(arguments);
    if (args.length > 0) {
      const message = args[0];
      if (typeof message === 'string' && (resizeObserverErr.test(message) || resizeObserverErrRe.test(message))) {
        return; // Suppress this error
      }
    }
    return originalConsoleError.apply(console, args);
  };
  
  // Suppress global error events
  window.addEventListener('error', function(event) {
    if (event.error && event.error.message) {
      if (resizeObserverErr.test(event.error.message) || resizeObserverErrRe.test(event.error.message)) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return false;
      }
    }
    if (typeof event.message === 'string' && (resizeObserverErr.test(event.message) || resizeObserverErrRe.test(event.message))) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }
  }, true);
  
  // Suppress unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message) {
      if (resizeObserverErr.test(event.reason.message) || resizeObserverErrRe.test(event.reason.message)) {
        event.preventDefault();
        return false;
      }
    }
  });
})();