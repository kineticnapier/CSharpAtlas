import test from 'node:test';
import assert from 'node:assert/strict';
import { roundedQuestPath } from '../src/quest-view.js';

test('roundedQuestPath rounds orthogonal routing corners with bounded quadratic Beziers', () => {
  const path = roundedQuestPath([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 80 },
    { x: 200, y: 80 }
  ], 18);

  assert.equal(path, 'M 0 0 L 82 0 Q 100 0 100 18 L 100 62 Q 100 80 118 80 L 200 80');
});

test('roundedQuestPath removes redundant waypoints and leaves a straight route straight', () => {
  const path = roundedQuestPath([
    { x: 0, y: 0 },
    { x: 60, y: 0 },
    { x: 60, y: 0 },
    { x: 120, y: 0 },
    { x: 200, y: 0 }
  ], 18);

  assert.equal(path, 'M 0 0 L 200 0');
});
