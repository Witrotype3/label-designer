// ============================================================================
// Physical Dimension Types
// ============================================================================

export type Unit = 'mm' | 'inch' | 'px';

export interface PhysicalDimension {
    value: number;
    unit: Unit;
}

// ============================================================================
// Sheet Configuration
// ============================================================================

export type PageSize = 'Letter' | 'A4' | 'Legal' | 'Custom';
export type Orientation = 'portrait' | 'landscape';

export interface SheetConfig {
    pageSize: PageSize;
    orientation: Orientation;
    width: number; // in mm
    height: number; // in mm
    marginTop: number; // in mm
    marginRight: number; // in mm
    marginBottom: number; // in mm
    marginLeft: number; // in mm
}

// ============================================================================
// Label Template
// ============================================================================

export interface LabelTemplate {
    id: string;
    name: string;
    description?: string;

    // Grid layout
    rows: number;
    columns: number;

    // Label dimensions (in mm)
    labelWidth: number;
    labelHeight: number;

    // Spacing (in mm)
    horizontalSpacing: number;
    verticalSpacing: number;

    // Offsets from printable area (in mm)
    offsetTop: number;
    offsetLeft: number;

    // Sheet configuration
    sheetConfig: SheetConfig;
}

// ============================================================================
// Design Elements
// ============================================================================

export type ElementType = 'text' | 'image' | 'shape' | 'placeholder';
export type ShapeType = 'rectangle' | 'circle' | 'line';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
export type FontStyle = 'normal' | 'italic';

export interface Transform {
    x: number; // in mm
    y: number; // in mm
    width: number; // in mm
    height: number; // in mm
    rotation: number; // in degrees
}

export interface BaseElement {
    id: string;
    type: ElementType;
    transform: Transform;
    zIndex: number;
    visible: boolean;
    locked: boolean;
}

export interface ElementBinding {
    property: string; // 'content', 'color', etc.
    columnId: string | null;
}

export interface TextElement extends BaseElement {
    type: 'text';
    content: string;
    fontFamily: string;
    fontSize: number; // in pt
    fontWeight: FontWeight;
    fontStyle: FontStyle;
    textAlign: TextAlign;
    color: string; // hex color
    lineHeight: number; // multiplier
    letterSpacing: number; // in em
    bindings?: ElementBinding[]; // Data bindings for this element
}

export interface ImageElement extends BaseElement {
    type: 'image';
    src: string; // data URL or URL
    originalWidth: number; // in px
    originalHeight: number; // in px
    cropX: number; // 0-1
    cropY: number; // 0-1
    cropWidth: number; // 0-1
    cropHeight: number; // 0-1
    maintainAspectRatio: boolean;
}

export interface ShapeElement extends BaseElement {
    type: 'shape';
    shapeType: ShapeType;
    fillColor: string; // hex color
    strokeColor: string; // hex color
    strokeWidth: number; // in mm
    cornerRadius?: number; // in mm, for rectangles
    opacity: number; // 0-1
}

export interface PlaceholderElement extends BaseElement {
    type: 'placeholder';
    placeholderType: 'image' | 'qrCode';
    // For image placeholders: name of the asset to look up (static)
    imageName?: string;
    // For image placeholders: binding to data column for image name (dynamic)
    imageNameBinding?: ElementBinding;
    // For image placeholders: how the image should fit within the placeholder
    imageFit?: 'fitVertical' | 'fitHorizontal' | 'stretch';
    // For QR code placeholders: binding to data column for QR value
    qrValueBinding?: ElementBinding;
    // Display text (shown in design mode)
    displayText: string;
    // Styling for placeholder rectangle
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
}

export type DesignElement = TextElement | ImageElement | ShapeElement | PlaceholderElement;

// ============================================================================
// Master Label & Overrides
// ============================================================================

export interface MasterLabel {
    elements: DesignElement[];
    backgroundColor?: string;
}

export interface ElementOverride {
    elementId: string;
    overrides: Partial<DesignElement>;
}

export interface LabelOverride {
    labelIndex: number; // row * columns + col
    elementOverrides: ElementOverride[];
    hiddenElementIds: string[];
    additionalElements: DesignElement[];
}

// ============================================================================
// Design State
// ============================================================================

export interface DesignState {
    // Sheet and template
    template: LabelTemplate;

    // Master label
    masterLabel: MasterLabel;

    // Per-label overrides
    labelOverrides: Map<number, LabelOverride>;

    // Selection state
    selectedLabelIndex: number | null;
    selectedElementIds: string[];

    // View state
    zoom: number; // 0.1 to 5.0
    panX: number; // in px
    panY: number; // in px

    // History
    canUndo: boolean;
    canRedo: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface SnapGuide {
    type: 'vertical' | 'horizontal';
    position: number; // in mm
    label?: string;
}

export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
