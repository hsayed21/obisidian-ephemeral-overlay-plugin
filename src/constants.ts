import { DrawingColor, FadeMode } from './types';

export const DEFAULT_STROKE_WIDTH = 4;
export const DEFAULT_COLOR: DrawingColor = 'red';
export const DEFAULT_FADE_MODE: FadeMode = 'off';

export const MIN_STROKE_WIDTH = 1;
export const MAX_STROKE_WIDTH = 32;

export const INTERACTIVE_SELECTORS = [
	'.cm-editor',
	'.cm-content',
	'.cm-line',
	'.markdown-preview-view',
	'.markdown-reading-view',
	'.view-content',
	'[contenteditable]',
];

export const COLOR_MAP: Record<DrawingColor, string> = {
	red: '#ff0000',
	yellow: '#ffff00',
	blue: '#0000ff',
	green: '#00ff00',
	orange: '#ff8800',
	pink: '#ff69b4',
};

export const FADE_LABELS: Record<FadeMode, string> = {
	off: '🎨 Drawing (Fade: Off)',
	fading: '🎨 Drawing (Fade: 1s)',
	medium: '🎨 Drawing (Fade: 3s)',
	long: '🎨 Drawing (Fade: 5s)',
	verylong: '🎨 Drawing (Fade: 7s)',
};

export const FADE_DURATIONS: Record<FadeMode, number> = {
	off: Infinity,
	fading: 1000,
	medium: 3000,
	long: 5000,
	verylong: 7000,
};

export const FADE_MODES: FadeMode[] = ['off', 'fading', 'medium', 'long', 'verylong'];

export const WIDTH_OPTIONS = [2, 4, 8];

export const COLOR_BUTTONS: Array<{ label: string; color: DrawingColor; hex: string }> = [
	{ label: 'R', color: 'red', hex: COLOR_MAP.red },
	{ label: 'Y', color: 'yellow', hex: COLOR_MAP.yellow },
	{ label: 'B', color: 'blue', hex: COLOR_MAP.blue },
	{ label: 'G', color: 'green', hex: COLOR_MAP.green },
	{ label: 'O', color: 'orange', hex: COLOR_MAP.orange },
	{ label: 'P', color: 'pink', hex: COLOR_MAP.pink },
];


export const FROZEN_CLASS = 'ephemeral-frozen';

