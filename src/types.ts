/**
 * Type definitions for EphemeralOverlay plugin
 */

/**
 * Available drawing colors
 */
export type DrawingColor = 'red' | 'yellow' | 'blue' | 'green' | 'orange' | 'pink';

/**
 * Fade modes for auto-disappearing strokes
 */
export type FadeMode = 'off' | 'fading' | 'medium' | 'long' | 'verylong';

/**
 * Point representing a coordinate on the canvas
 */
export interface Point {
	x: number;
	y: number;
	/** Normalized width multiplier derived from pen pressure. */
	pressure: number;
}

/**
 * A stroke is a series of connected points with a color
 */
export interface Stroke {
	points: Point[];
	color: DrawingColor;
	width: number;
	timestamp: number; // When the stroke was created (for fading)
}

/**
 * Drawing state for the overlay
 */
export interface DrawingState {
	currentColor: DrawingColor;
	strokeWidth: number;
	isDrawing: boolean;
	currentStroke: Point[];
	strokes: Stroke[];
	fadeMode: FadeMode;
}
