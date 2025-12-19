# Label Designer

A professional browser-based label design system with print-accurate output, master/override hierarchy, and support for Avery-style label templates.

## Features

- **Print-Accurate Design**: All measurements in millimeters, converts to pixels at configurable DPI
- **Master/Override System**: Design once, apply to all labels, with per-label customization
- **Template Library**: 8 predefined Avery templates (5160, 5161, 5163, 5164, 5167, 8160, 8163, 8460)
- **Design Elements**: Text, shapes (rectangles, circles, lines), and images
- **Interactive Canvas**: Zoom, pan, and visual editing
- **Professional Typography**: Font family, size, weight, alignment controls
- **Real-time Preview**: What you see is what prints

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Adding Elements

1. Use the left sidebar to add text, shapes, or images to the master label
2. All labels will automatically inherit the master design
3. Select elements to edit their properties in the right panel

### Customizing Individual Labels

1. Click on a specific label to select it
2. Modify elements - changes will only apply to that label
3. Labels with overrides show an orange indicator

### Editing Properties

- **Transform**: Position (X, Y), size (Width, Height), rotation
- **Text**: Content, font family, size, color, alignment
- **Shapes**: Fill color, stroke color, stroke width, opacity

### Zoom and Pan

- **Zoom**: Use mouse wheel or zoom controls in toolbar
- **Pan**: Hold Alt + drag, or use middle mouse button

## Project Structure

```
src/
├── app/                  # Next.js app directory
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main application page
├── components/
│   ├── Canvas/          # Canvas rendering
│   │   └── CanvasRenderer.tsx
│   └── UI/              # UI components
│       ├── Toolbar.tsx
│       ├── ElementTools.tsx
│       └── PropertyPanel.tsx
├── lib/                 # Utility libraries
│   ├── dimensions.ts    # Physical dimension conversions
│   ├── templates.ts     # Label template library
│   ├── masterOverride.ts # Master/override logic
│   └── snapping.ts      # Alignment and snapping
├── store/               # State management
│   └── designStore.ts   # Zustand store
├── styles/              # CSS modules
│   ├── canvas.module.css
│   └── ui.module.css
└── types/               # TypeScript types
    └── index.ts
```

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **State Management**: Zustand
- **Styling**: Vanilla CSS with CSS Modules
- **Canvas**: HTML5 Canvas API
- **PDF Export**: jsPDF (planned)

## Keyboard Shortcuts

- `Ctrl/Cmd + Z`: Undo (planned)
- `Ctrl/Cmd + Y`: Redo (planned)
- `Delete`: Delete selected element
- `Alt + Drag`: Pan canvas
- `Mouse Wheel`: Zoom in/out

## Available Templates

- **Avery 5160**: Address Labels (1" × 2-5/8"), 30 labels
- **Avery 5161**: Address Labels (1" × 4"), 20 labels
- **Avery 5163**: Shipping Labels (2" × 4"), 10 labels
- **Avery 5164**: Shipping Labels (3-1/3" × 4"), 6 labels
- **Avery 5167**: Return Address Labels (1/2" × 1-3/4"), 80 labels
- **Avery 8160**: Address Labels (1" × 2-5/8"), 30 labels
- **Avery 8163**: Shipping Labels (2" × 4"), 10 labels
- **Avery 8460**: Address Labels (1" × 2-5/8"), 30 labels

## Roadmap

- [ ] PDF export with vector accuracy
- [ ] Image upload and management
- [ ] Undo/redo functionality
- [ ] Template selector UI
- [ ] Custom template creation
- [ ] Save/load designs
- [ ] Variable data printing (CSV merge)
- [ ] Barcode and QR code elements
- [ ] Keyboard shortcuts
- [ ] Drag and drop elements on canvas
- [ ] Multi-select and batch operations

## License

MIT
