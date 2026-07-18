import { Point } from './types';

const MIN_PRESSURE_FACTOR = 0.3;
const MIN_POINT_DISTANCE = 0.35;

export function pressureFactor(
	pointerType: string,
	pressure: number,
	enabled: boolean,
): number {
	if (!enabled || pointerType !== 'pen') return 1;

	const normalizedPressure = pressure > 0 ? clamp(pressure, 0, 1) : 0.5;
	return MIN_PRESSURE_FACTOR + ((1 - MIN_PRESSURE_FACTOR) * normalizedPressure);
}

export function smoothPoint(previous: Point, next: Point, smoothing: number): Point {
	const blend = 1 - (clamp(smoothing, 0, 1) * 0.85);

	return {
		x: previous.x + ((next.x - previous.x) * blend),
		y: previous.y + ((next.y - previous.y) * blend),
		pressure: previous.pressure + ((next.pressure - previous.pressure) * blend),
	};
}

export function shouldAppendPoint(previous: Point, next: Point): boolean {
	return Math.hypot(next.x - previous.x, next.y - previous.y) >= MIN_POINT_DISTANCE;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
