# CSS Architecture Documentation

## Overview
This project uses a modular CSS architecture designed for scalability and maintainability. All styles are organized under `src/styles/` with a clear separation of concerns.

## Structure

```
src/styles/
├── index.css              # Main entry point (imports all other files)
├── base/                  # Base styles and resets
│   └── _reset.css         # Global reset and base styles
├── themes/                # Theme variables and color schemes
│   └── _variables.css     # CSS custom properties for theming
├── utils/                 # Utility classes
│   └── _utilities.css     # Helper classes for spacing, typography, etc.
├── layout/                # Layout components
│   └── _app.css          # Main application layout
└── components/            # UI component styles
    ├── _panels.css        # ReactFlow panel components
    ├── _nodes.css         # ReactFlow node components
    └── _lightbox.css      # Lightbox component styles
```

## Import Order
The styles are imported in a specific order to ensure proper CSS cascade:

1. **Theme Variables** - CSS custom properties that can be reused
2. **Base & Reset** - Global styles and browser reset
3. **Utilities** - Helper classes for common patterns
4. **Layout** - Main layout components
5. **Components** - Specific UI component styles

## CSS Variables
All theme-related values use CSS custom properties defined in `themes/_variables.css`:

### Colors
- `--color-bg-primary`: #1a192b (Main background)
- `--color-bg-secondary`: #2d2d2d (Secondary backgrounds)
- `--color-border`: #555 (Default borders)
- `--color-text-primary`: #fff (Primary text)

### Spacing
- `--spacing-xs` through `--spacing-xl`: 4px to 20px increments
- Consistent spacing scale for padding, margins, and gaps

### Typography
- `--font-family-primary`: Inter font with system fallbacks
- `--font-size-xs` through `--font-size-xl`: 10px to 18px scale
- Line height variants for different use cases

### Border Radius
- `--radius-sm` through `--radius-xl`: 3px to 8px scale
- `--radius-round`: 50% for circular elements

## Usage Guidelines

### Adding New Styles
1. Determine the appropriate category (base, utils, layout, components)
2. Add styles to the relevant file
3. Use CSS variables instead of hardcoded values
4. Follow the existing naming conventions

### Component Styles
- Use semantic class names (`.panel-container`, `.node-header`)
- Leverage CSS variables for consistent theming
- Prefer composition over specificity

### Utility Classes
- Use utility classes for common patterns (spacing, typography)
- Combine utilities for rapid prototyping
- Create component-specific classes for complex styling

## Benefits
- **Maintainable**: Clear separation of concerns
- **Scalable**: Easy to add new components and themes
- **Consistent**: CSS variables ensure design consistency
- **Performant**: Single entry point reduces HTTP requests
- **Developer-friendly**: Logical organization and naming

## Migration from Legacy CSS
The previous CSS files (`App.css`, `CustomNodeBase.css`) have been refactored into this organized structure while maintaining all existing functionality.