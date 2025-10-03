// ResizeObserver and SES lockdown error suppression
(function() {
  'use strict';

  // ResizeObserver error patterns
  const resizeObserverErr = /ResizeObserver loop completed with undelivered notifications/;
  const resizeObserverErrRe = /ResizeObserver loop limit exceeded/;

  // SES lockdown error patterns (from browser extensions like MetaMask)
  const sesLockdownErr = /SES_UNCAUGHT_EXCEPTION/i;
  const lockdownInstallErr = /lockdown-install/i;

  // Helper to check if error should be suppressed
  const shouldSuppressError = (message) => {
    if (typeof message !== 'string') return false;
    return resizeObserverErr.test(message) ||
           resizeObserverErrRe.test(message) ||
           sesLockdownErr.test(message) ||
           lockdownInstallErr.test(message);
  };

  // Suppress ResizeObserver and SES errors in console
  const originalConsoleError = console.error;
  console.error = function() {
    const args = Array.prototype.slice.call(arguments);
    if (args.length > 0) {
      const message = String(args[0]);
      if (shouldSuppressError(message)) {
        return; // Suppress this error
      }
    }
    return originalConsoleError.apply(console, args);
  };

  // Suppress global error events
  window.addEventListener('error', function(event) {
    // Check error object message
    if (event.error && event.error.message) {
      if (shouldSuppressError(event.error.message)) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return false;
      }
    }
    // Check event message
    if (event.message && shouldSuppressError(event.message)) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }
  }, true);

  // Suppress unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason) {
      const message = event.reason.message || String(event.reason);
      if (shouldSuppressError(message)) {
        event.preventDefault();
        return false;
      }
    }
  });
})();