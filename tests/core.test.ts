import assert from 'node:assert/strict';
import test from 'node:test';
import { isEditableTarget, shouldStartDrawing } from '../src/input-policy';
import { normalizeSettings } from '../src/settings-model';
import { pressureFactor, shouldAppendPoint, smoothPoint } from '../src/stroke-utils';
import { nearestDockEdge, toolbarOrientation } from '../src/toolbar-docking';

test('normalizes old and invalid settings safely', () => {
	const settings = normalizeSettings({
		penOnlyMode: true,
		lastColor: 'purple',
		lastStrokeWidth: 100,
		strokeSmoothing: -5,
		toolbarPosition: { x: 2, y: -1 },
	});

	assert.equal(settings.penOnlyMode, true);
	assert.equal(settings.lastColor, 'red');
	assert.equal(settings.lastStrokeWidth, 32);
	assert.equal(settings.strokeSmoothing, 0);
	assert.deepEqual(settings.toolbarPosition, { x: 1, y: 0 });
	assert.equal(settings.rememberLastTool, true);
});

test('keeps finger gestures for navigation and accepts Pencil input', () => {
	assert.equal(shouldStartDrawing('touch', 0, false), false);
	assert.equal(shouldStartDrawing('touch', 0, true), false);
	assert.equal(shouldStartDrawing('pen', 0, true), true);
	assert.equal(shouldStartDrawing('mouse', 0, false), true);
	assert.equal(shouldStartDrawing('mouse', 0, true), false);
	assert.equal(shouldStartDrawing('pen', 2, true), false);
});

test('recognizes editable targets without relying on the main window realm', () => {
	const editorTarget = {
		closest: (selector: string) => selector.includes('.cm-content') ? {} : null,
	} as unknown as EventTarget;

	assert.equal(isEditableTarget(editorTarget), true);
	assert.equal(isEditableTarget(null), false);
});

test('maps Pencil pressure while keeping mouse width stable', () => {
	assert.equal(pressureFactor('mouse', 0.1, true), 1);
	assert.equal(pressureFactor('pen', 0.7, false), 1);
	assert.ok(pressureFactor('pen', 0.9, true) > pressureFactor('pen', 0.1, true));
	assert.ok(pressureFactor('pen', 0, true) > 0);
});

test('smooths points and rejects insignificant duplicates', () => {
	const previous = { x: 0, y: 0, pressure: 0.5 };
	const raw = { x: 10, y: 10, pressure: 1 };
	const smoothed = smoothPoint(previous, raw, 0.5);

	assert.ok(smoothed.x > 0 && smoothed.x < raw.x);
	assert.ok(smoothed.pressure > previous.pressure && smoothed.pressure < raw.pressure);
	assert.equal(shouldAppendPoint(previous, { x: 0.1, y: 0.1, pressure: 0.5 }), false);
	assert.equal(shouldAppendPoint(previous, smoothed), true);
});

test('selects toolbar orientation from the nearest docking edge', () => {
	assert.equal(nearestDockEdge({ x: 0.02, y: 0.5 }, 1000, 800), 'left');
	assert.equal(nearestDockEdge({ x: 0.98, y: 0.5 }, 1000, 800), 'right');
	assert.equal(nearestDockEdge({ x: 0.5, y: 0.02 }, 1000, 800), 'top');
	assert.equal(nearestDockEdge({ x: 0.5, y: 0.98 }, 1000, 800), 'bottom');
	assert.equal(toolbarOrientation('left'), 'vertical');
	assert.equal(toolbarOrientation('right'), 'vertical');
	assert.equal(toolbarOrientation('top'), 'horizontal');
	assert.equal(toolbarOrientation('bottom'), 'horizontal');
});
