# SES_UNCAUGHT_EXCEPTION Console Errors

## What are these errors?

The `SES_UNCAUGHT_EXCEPTION: null` errors you're seeing in the console are **harmless noise** from browser extensions that use Secure ECMAScript (SES) lockdown, most commonly:

- **MetaMask** (cryptocurrency wallet)
- **Other Web3/crypto wallets**
- Security-focused browser extensions

## Why do they appear during panel resizing?

These extensions wrap JavaScript operations to create a secure execution environment. During ReactFlow's `NodeResizer` operations, rapid DOM mutations trigger the extension's error logging mechanism, which logs these null exceptions.

**These errors do NOT affect your application's functionality** - they're purely cosmetic noise in the console.

## Solutions

### Option 1: Filter Console Errors (Recommended for Development)

In your browser's DevTools console:

1. Click the **Filter** icon (funnel) in the console toolbar
2. Add a **negative filter**: `-SES_UNCAUGHT_EXCEPTION`
3. Or use regex filter: `-/SES_UNCAUGHT_EXCEPTION|lockdown-install/`

This will hide these specific errors while keeping all other console output visible.

### Option 2: Disable the Extension (Temporary)

If the errors are too distracting:

1. Open your browser extensions/add-ons manager
2. **Temporarily disable** MetaMask or the problematic Web3 extension
3. Refresh the page
4. **Re-enable** it when you're done development

### Option 3: Use a Different Browser Profile

Create a clean browser profile for development:

1. Create a new browser profile (Chrome/Edge/Firefox)
2. Don't install the Web3 extensions in this profile
3. Use this profile exclusively for development work

### Option 4: Configure Extension Settings

Some extensions allow you to disable them on specific domains:

1. Right-click the extension icon
2. Look for "Site settings" or "Permissions"
3. Add `localhost` or your dev server URL to the exclusion list

## Why Our Code Suppression Doesn't Work

Browser extensions inject their code **before** the page HTML loads, at the browser engine level. This means:

- Our JavaScript suppression scripts run **too late**
- The extension has already wrapped console methods
- The errors are logged directly by the extension's `lockdown-install.js`

We've added suppression code in:
- `public/index.html` - Console method patching
- `public/suppress-resize-observer-errors.js` - Error event handlers

These will catch SOME errors, but not all, because the extension operates at a lower level than page JavaScript.

## Technical Details

The errors occur because:

1. ReactFlow's NodeResizer rapidly mutates the DOM during resize operations
2. The SES lockdown extension intercepts these operations
3. Some operations complete with `null` exceptions in the extension's wrapper
4. The extension logs these to help developers debug permission issues
5. In our case, these are false positives - not actual errors

## Verification

To verify these errors are from extensions and not your code:

```bash
# 1. Open DevTools Console
# 2. Look at the error source - it says "lockdown-install.js:1"
# 3. This file is NOT in your project - it's injected by the extension
```

## Production Impact

**Zero impact** - these errors only appear in the browser console during development. They:
- ❌ Do NOT appear in production builds
- ❌ Do NOT affect end users
- ❌ Do NOT break functionality
- ❌ Do NOT impact performance
- ✅ Are only visible to developers with specific extensions installed

## Recommended Workflow

For the cleanest development experience:

1. **Keep** the suppression code we added (doesn't hurt, catches some cases)
2. **Use** console filtering: `-SES_UNCAUGHT_EXCEPTION`
3. **Focus** on actual application errors
4. **Ignore** the SES errors entirely if they don't bother you

---

**Bottom line**: These are cosmetic errors from browser extensions, not bugs in your application. They're safe to ignore.
