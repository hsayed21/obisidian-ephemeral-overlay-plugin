import { Point, DrawingColor } from './types';
import { COLOR_MAP } from './constants';

export class CanvasRenderer {
	private ctx: CanvasRenderingContext2D;
	private cachedRect: DOMRect | null = null;
	private pixelRatio = 1;

	constructor(private canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('Failed to get canvas context');
		}
		this.ctx = ctx;
		this.setupContext();
	}

	private setupContext(): void {
		this.ctx.lineCap = 'round';
		this.ctx.lineJoin = 'round';
	}

	resize(): void {
		const rect = this.canvas.getBoundingClientRect();
		this.cachedRect = rect;
		this.pixelRatio = Math.max(1, this.canvas.ownerDocument.defaultView?.devicePixelRatio ?? 1);
		this.canvas.width = Math.round(rect.width * this.pixelRatio);
		this.canvas.height = Math.round(rect.height * this.pixelRatio);
		this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
		this.setupContext();
	}

	clear(): void {
		this.ctx.save();
		this.ctx.setTransform(1, 0, 0, 1, 0, 0);
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.restore();
	}

	getCanvasPoint(clientX: number, clientY: number, pressure: number = 1): Point {
		const rect = this.cachedRect || this.canvas.getBoundingClientRect();
		return {
			x: clientX - rect.left,
			y: clientY - rect.top,
			pressure,
		};
	}

	drawStroke(points: Point[], color: DrawingColor, width: number, opacity: number = 1.0): void {
		if (points.length === 0) return;

		this.ctx.save();
		this.ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
		this.ctx.fillStyle = COLOR_MAP[color];
		this.ctx.strokeStyle = COLOR_MAP[color];
		const firstPoint = points[0];
		if (!firstPoint) {
			this.ctx.restore();
			return;
		}

		if (points.length === 1) {
			this.drawDot(firstPoint, width);
			this.ctx.restore();
			return;
		}

		for (let i = 1; i < points.length; i++) {
			const previous = points[i - 1];
			const point = points[i];
			if (!previous || !point) continue;

			this.ctx.lineWidth = width * ((previous.pressure + point.pressure) / 2);
			this.ctx.beginPath();
			this.ctx.moveTo(previous.x, previous.y);
			this.ctx.lineTo(point.x, point.y);
			this.ctx.stroke();
		}
		this.ctx.restore();
	}

	private drawDot(point: Point, width: number): void {
		this.ctx.beginPath();
		this.ctx.arc(point.x, point.y, Math.max(0.5, width * point.pressure / 2), 0, Math.PI * 2);
		this.ctx.fill();
	}
}
