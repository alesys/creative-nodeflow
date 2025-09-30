# Node Editor Design System Specification

## 1. Core Design Tokens

### 1.1 Color Palette

```
Background Colors:
- canvas-bg: #0A0A0A (neutral-950)
- node-body: #18181B (zinc-900)
- control-bg: #27272A (zinc-800)
- hover-state: #3F3F46 (zinc-700)
- border: #52525B (zinc-600)

Text Colors:
- primary: #F3F4F6 (gray-100)
- secondary: #9CA3AF (gray-400)
- tertiary: #6B7280 (gray-500)
- disabled: #4B5563 (gray-600)

Accent Colors:
- primary-action: #3B82F6 (blue-500)
- success: #10B981 (emerald-500)
- warning: #F59E0B (amber-500)
- error: #EF4444 (red-500)
```

### 1.2 Node Header Gradients

```
Model Loaders: from-purple-600 to-purple-800 (#9333EA → #6B21A8)
Text Encoding (Positive): from-green-700 to-green-900 (#15803D → #14532D)
Text Encoding (Negative): from-red-700 to-red-900 (#B91C1C → #7F1D1D)
Utility/Processing: from-zinc-700 to-zinc-800 (#3F3F46 → #27272A)
Output Nodes: from-amber-700 to-amber-900 (#B45309 → #78350F)
```

### 1.3 Connection Wire Colors

```
MODEL: #FACC15 (yellow-400)
CLIP: #FACC15 (yellow-400)
LATENT: #C084FC (purple-400)
CONDITIONING: #4ADE80 (green-400)
IMAGE: #F87171 (red-400)
VAE: #F87171 (red-400)
```

### 1.4 Spacing Scale

```
xxs: 2px
xs: 4px
sm: 8px
md: 12px
lg: 16px
xl: 24px
2xl: 32px
3xl: 48px
```

### 1.5 Border Radius

```
none: 0px
sm: 4px
md: 8px
lg: 12px
full: 9999px
```

### 1.6 Typography

```
Font Family:
- Primary: system-ui, -apple-system, 'Segoe UI', sans-serif
- Monospace: 'SF Mono', Monaco, Consolas, monospace

Font Sizes:
- xs: 12px
- sm: 14px
- base: 16px
- lg: 18px
- xl: 20px
- 2xl: 24px

Font Weights:
- regular: 400
- medium: 500
- semibold: 600
- bold: 700
```

---

## 2. Node Panel Structure

### 2.1 Anatomy

A complete node consists of four sections:

```
┌─────────────────────────────────┐
│ 1. HEADER (Gradient)            │
├─────────────────────────────────┤
│ 2. INPUT PORTS                  │
│    ● port_name [TYPE]           │
├─────────────────────────────────┤
│ 3. PARAMETER CONTROLS           │
│    ◀ param_name    value ▶      │
│    ◀ slider ━━━━○━━━━ 1.0 ▶     │
├─────────────────────────────────┤
│ 4. OUTPUT PORTS                 │
│    ● [TYPE]                     │
└─────────────────────────────────┘
```

### 2.2 Dimensions & Spacing

```
Node:
- min-width: 280px
- max-width: 400px
- border-radius: 8px (lg)
- border: 1px solid zinc-800
- shadow: lg

Header:
- padding: 10px 16px
- font-size: 14px
- font-weight: 600
- border-radius: 8px 8px 0 0

Body:
- padding: 12px
- background: zinc-900

Port Spacing:
- margin-bottom: 8px
- gap between icon and label: 8px

Control Spacing:
- margin-bottom: 8px
- padding: 4px 0
```

### 2.3 Connection Ports

```
Structure:
[●] [label] [TYPE_BADGE]

Port Circle:
- size: 10px (w-2.5 h-2.5)
- border-radius: full
- color: matches wire color

Type Badge:
- padding: 2px 6px
- font-size: 12px
- font-weight: 500
- border-radius: 4px
- background: [type-color]/20
- text-color: [type-color]

Badge Colors:
- MODEL: yellow-500 bg, yellow-400 text
- LATENT: purple-500 bg, purple-400 text
- CONDITIONING: green-500 bg, green-400 text
- IMAGE: red-500 bg, red-400 text
- CLIP: yellow-500 bg, yellow-400 text
- VAE: red-500 bg, red-400 text
```

---

## 3. Parameter Control Components

### 3.1 Dropdown Control

```
Pattern:
◀ label_name    current_value ▶

Structure:
- Arrow left: text-gray-500
- Label: text-gray-400, flex-1
- Value: text-gray-200
- Arrow right: text-gray-500
- Border-bottom: 1px solid zinc-800
- Padding: 8px 0
- Font-size: 12px

Optional Sublabel:
- Indent: 20px (pl-5)
- Color: text-gray-500
- Font-size: 12px
```

### 3.2 Number Input Control

```
Pattern:
◀ parameter_name    897101338625743 ▶

Structure:
- Same as dropdown
- Value uses monospace font
- Value: text-gray-200, font-mono
```

### 3.3 Slider Control

```
Pattern:
◀ parameter_name    5.00 ▶
  ━━━━●━━━━━━━━━━━━━

Structure:
Row 1 (Value Display):
- Same as dropdown/number

Row 2 (Slider Track):
- Height: 4px (h-1)
- Background: zinc-700
- Border-radius: full
- Margin: 4px 16px

Slider Fill:
- Height: 4px
- Background: blue-500
- Border-radius: full
- Width: calculated from value %
```

### 3.4 Toggle Control

```
Pattern:
◀ parameter_name    enable ▶

Structure:
- Same as dropdown
- Value color when enabled: text-green-400
- Value color when disabled: text-red-400
- Values: "enable" | "disable"
```

### 3.5 Text Area Control

```
Structure:
- Background: green-900/30 or red-900/30 (for positive/negative)
- Border: 1px solid green-700/50 or red-700/50
- Border-radius: 4px
- Padding: 8px
- Font-size: 12px
- Line-height: relaxed (1.625)
- Color: text-gray-300
- Margin-top: 4px
- Min-height: 80px
```

---

## 4. Node Type Templates

### 4.1 Model Loader Node

```yaml
title: "Load Diffusion Model" | "LoraLoaderModelOnly"
headerColor: from-purple-600 to-purple-800
inputs:
  - label: model
    type: MODEL
controls:
  - type: dropdown
    label: [model_name]
    sublabel: [secondary_name]
    value: default
outputs:
  - type: MODEL
```

### 4.2 Sampler Node

```yaml
title: "KSampler (Advanced)"
headerColor: from-zinc-700 to-zinc-800
inputs:
  - {label: model, type: MODEL}
  - {label: positive, type: CONDITIONING}
  - {label: negative, type: CONDITIONING}
  - {label: latent_image, type: LATENT}
controls:
  - {type: toggle, label: add_noise, value: enable}
  - {type: number, label: noise_seed, value: string}
  - {type: dropdown, label: control after generate, value: randomize}
  - {type: number, label: steps, value: 4}
  - {type: slider, label: cfg, value: 1.0, min: 0, max: 20}
  - {type: dropdown, label: sampler_name, value: euler}
  - {type: dropdown, label: scheduler, value: simple}
  - {type: number, label: start_at_step, value: 0}
  - {type: number, label: end_at_step, value: 4}
  - {type: toggle, label: return_with_leftover_noise, value: enable}
outputs:
  - type: LATENT
```

### 4.3 CLIP Text Encode Node

```yaml
title: "CLIP Text Encode (Positive Prompt)" | "(Negative Prompt)"
headerColor: from-green-700 to-green-900 (positive) | from-red-700 to-red-900 (negative)
inputs:
  - {label: clip, type: CLIP}
controls:
  - type: textarea
    value: [multiline text content]
    background: green-900/30 (positive) | red-900/30 (negative)
    border: green-700/50 (positive) | red-700/50 (negative)
outputs:
  - type: CONDITIONING
```

### 4.4 Load CLIP Node

```yaml
title: "Load CLIP"
headerColor: from-zinc-700 to-zinc-800
inputs: []
controls:
  - {type: dropdown, label: clip, value: [filename]}
  - {type: dropdown, label: type, value: warn}
  - {type: dropdown, label: device, value: default}
outputs:
  - type: CLIP
```

### 4.5 Model Sampling Node

```yaml
title: "ModelSamplingSD3"
headerColor: from-zinc-700 to-zinc-800
inputs:
  - {label: model, type: MODEL}
controls:
  - {type: slider, label: shift, value: 5.00, min: 0, max: 100}
outputs:
  - type: MODEL
```

### 4.6 Load Image/VAE Node

```yaml
title: "Load Image" | "Load VAE"
headerColor: from-zinc-700 to-zinc-800
inputs: []
controls:
  - {type: text, label: T: 0.00s, sublabel: 1.0}
  - {type: text, label: N: 24 (14), sublabel: 0.48}
  - {type: text, label: FPS:142.86}
outputs:
  - type: IMAGE | VAE
```

---

## 5. Interaction States

### 5.1 Node States

```
Default:
- border: 1px solid zinc-800
- opacity: 1
- cursor: default

Hover:
- border: 1px solid zinc-700
- transition: border-color 200ms

Selected:
- border: 2px solid blue-500
- box-shadow: 0 0 0 3px blue-500/20

Disabled:
- opacity: 0.5
- pointer-events: none
```

### 5.2 Control States

```
Default:
- background: transparent
- border-bottom: 1px solid zinc-800

Hover:
- background: zinc-800/50
- cursor: pointer

Active/Focus:
- background: zinc-800
- outline: none

Disabled:
- opacity: 0.5
- cursor: not-allowed
```

---

## 6. Implementation Guidelines

### 6.1 Component Hierarchy

```
<NodePanel>
  <NodeHeader gradient={color} />
  <NodeBody>
    <InputPortsSection>
      {inputs.map(input => <ConnectionPort />)}
    </InputPortsSection>
    
    <ControlsSection>
      {controls.map(control => <ParameterControl />)}
    </ControlsSection>
    
    <OutputPortsSection>
      {outputs.map(output => <ConnectionPort />)}
    </OutputPortsSection>
  </NodeBody>
</NodePanel>
```

### 6.2 Responsive Behavior

```
Canvas:
- Infinite scrolling in all directions
- Zoom levels: 25%, 50%, 75%, 100%, 150%, 200%
- Pan with middle mouse or space+drag

Node Width:
- Default: 280px - 320px
- With long text: expands to max 400px
- Text area controls: expand to fill width
```

### 6.3 Accessibility

```
- All controls keyboard navigable
- Focus indicators: 2px solid blue-500 outline
- Screen reader labels on all inputs
- Color is not the only indicator (use icons + text)
- Minimum contrast ratio: 4.5:1 for text
- Touch targets minimum: 44x44px
```

---

## 7. Code Examples

### 7.1 Node Panel Component (React + Tailwind)

```jsx
<div className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 shadow-xl w-80">
  {/* Header */}
  <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-2.5">
    <h3 className="font-semibold text-sm">Load Diffusion Model</h3>
  </div>

  {/* Body */}
  <div className="p-3 space-y-2">
    {/* Input Port */}
    <div className="flex items-center gap-2 text-xs">
      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
      <span className="text-gray-400">model</span>
      <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">MODEL</span>
    </div>

    {/* Dropdown Control */}
    <div className="flex items-center gap-2 py-1 text-xs">
      <span className="text-gray-500">◀</span>
      <span className="text-gray-400 flex-1">model</span>
      <span className="text-gray-200">warp2_2_i2v_high_noise</span>
      <span className="text-gray-500">▶</span>
    </div>

    {/* Output Port */}
    <div className="flex items-center gap-2 text-xs pt-1">
      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
      <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">MODEL</span>
    </div>
  </div>
</div>
```

### 7.2 Connection Wire (SVG)

```jsx
<svg className="absolute pointer-events-none">
  <path
    d="M 0,0 C 100,0 100,100 200,100"
    stroke="#FACC15"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
  />
</svg>
```

---

## 8. Design Principles

### 8.1 Visual Hierarchy
- Use gradient headers to categorize node types
- Connection type colors are consistent and meaningful
- Text size and weight indicate importance
- Spacing creates clear visual groupings

### 8.2 Information Density
- Compact controls maximize canvas space
- All parameters visible without scrolling (when possible)
- Type badges provide quick identification
- Connection ports show type at a glance

### 8.3 Consistency
- All nodes follow the same 4-section structure
- Control patterns are reusable across node types
- Color coding is systematic and predictable
- Spacing and sizing use the defined scale

### 8.4 Clarity
- High contrast for readability
- Distinct colors for different connection types
- Clear visual feedback for interactions
- Semantic naming for all components