import {
	DEFAULT_COLOR,
	DEFAULT_FADE_MODE,
	DEFAULT_STROKE_WIDTH,
	MAX_STROKE_WIDTH,
	MIN_STROKE_WIDTH,
} from './constants';
import { DrawingColor, FadeMode } from './types';

export interface ToolbarPosition {
	/** Horizontal position as a fraction of the overlay width. */
	x: number;
	/** Vertical position as a fraction of the overlay height. */
	y: number;
}

export interface PluginSettings {
	penOnlyMode: boolean;
	clearOnScroll: boolean;
	rememberLastTool: boolean;
	lastColor: DrawingColor;
	lastStrokeWidth: number;
	lastFadeMode: FadeMode;
	pressureSensitivity: boolean;
	strokeSmoothing: number;
	toolbarPosition: ToolbarPosition | null;
	toolbarCollapsed: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	penOnlyMode: false,
	clearOnScroll: false,
	rememberLastTool: true,
	lastColor: DEFAULT_COLOR,
	lastStrokeWidth: DEFAULT_STROKE_WIDTH,
	lastFadeMode: DEFAULT_FADE_MODE,
	pressureSensitivity: true,
	strokeSmoothing: 0.35,
	toolbarPosition: null,
	toolbarCollapsed: false,
};

const DRAWING_COLORS: DrawingColor[] = ['red', 'yellow', 'blue', 'green', 'orange', 'pink'];
const FADE_MODES: FadeMode[] = ['off', 'fading', 'medium', 'long', 'verylong'];

export function normalizeSettings(saved: unknown): PluginSettings {
	const input = isRecord(saved) ? saved : {};

	return {
		penOnlyMode: readBoolean(input.penOnlyMode, DEFAULT_SETTINGS.penOnlyMode),
		clearOnScroll: readBoolean(input.clearOnScroll, DEFAULT_SETTINGS.clearOnScroll),
		rememberLastTool: readBoolean(input.rememberLastTool, DEFAULT_SETTINGS.rememberLastTool),
		lastColor: DRAWING_COLORS.includes(input.lastColor as DrawingColor)
			? input.lastColor as DrawingColor
			: DEFAULT_SETTINGS.lastColor,
		lastStrokeWidth: clampNumber(
			input.lastStrokeWidth,
			MIN_STROKE_WIDTH,
			MAX_STROKE_WIDTH,
			DEFAULT_SETTINGS.lastStrokeWidth,
		),
		lastFadeMode: FADE_MODES.includes(input.lastFadeMode as FadeMode)
			? input.lastFadeMode as FadeMode
			: DEFAULT_SETTINGS.lastFadeMode,
		pressureSensitivity: readBoolean(
			input.pressureSensitivity,
			DEFAULT_SETTINGS.pressureSensitivity,
		),
		strokeSmoothing: clampNumber(input.strokeSmoothing, 0, 1, DEFAULT_SETTINGS.strokeSmoothing),
		toolbarPosition: normalizeToolbarPosition(input.toolbarPosition),
		toolbarCollapsed: readBoolean(input.toolbarCollapsed, DEFAULT_SETTINGS.toolbarCollapsed),
	};
}

function normalizeToolbarPosition(value: unknown): ToolbarPosition | null {
	if (!isRecord(value) || typeof value.x !== 'number' || typeof value.y !== 'number') {
		return null;
	}

	return {
		x: clamp(value.x, 0, 1),
		y: clamp(value.y, 0, 1),
	};
}

function readBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value)
		? clamp(value, min, max)
		: fallback;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
