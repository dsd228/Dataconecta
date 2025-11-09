// editor/tests/state.test.js
// Jest test for undo/redo in state.js (unit)
import { createState } from '../state.js';
import { JSDOM } from 'jsdom';
import { fabric } from 'fabric';

describe('state undo/redo', () => {
  let dom, canvas, state;
  beforeAll(() => {
    dom = new JSDOM('<!doctype html><html><body><canvas id="canvas"></canvas></body></html>');
    global.document = dom.window.document;
    global.window = dom.window;
    // Minimal Fabric loading in Node is non-trivial; these tests are structural and may use a mock canvas object
  });

  test('history push and undo/redo stacks', () => {
    // Mock canvas with toJSON/loadFromJSON
    const mockCanvas = {
      _snapshots: [],
      toJSON() { return { mock: true, ts: Date.now() }; },
      loadFromJSON(json, cb) { this._snapshots.push(json); cb && cb(); },
      renderAll() {}
    };
    const s = createState({ canvas: mockCanvas });
    s.pushHistory();
    expect(s.state.history.undo.length).toBe(1);
    s.undo();
    expect(s.state.history.redo.length).toBe(1);
  });
});
