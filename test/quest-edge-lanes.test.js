import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignEdgeRouteOffsets,
  routeQuestEdgePoints
} from '../src/quest-map.js';

test('overlapping edges in the same channel get compact separate lanes while unrelated edges can reuse center', () => {
  const nodes = [
    { id: 'a', depth: 0, x: 120, y: 100, width: 220, height: 100 },
    { id: 'b', depth: 0, x: 120, y: 420, width: 220, height: 100 },
    { id: 'c', depth: 1, x: 450, y: 160, width: 220, height: 100 },
    { id: 'd', depth: 1, x: 450, y: 210, width: 220, height: 100 },
    { id: 'e', depth: 1, x: 450, y: 430, width: 220, height: 100 }
  ];
  const edges = [
    { source: 'a', target: 'c', kind: 'prerequisite' },
    { source: 'a', target: 'd', kind: 'support' },
    { source: 'b', target: 'e', kind: 'prerequisite' }
  ];

  const offsets = assignEdgeRouteOffsets(edges, nodes);
  assert.equal(offsets[0], 0, 'main prerequisite should keep the center lane');
  assert.notEqual(offsets[1], 0, 'overlapping support edge should move off the center lane');
  assert.ok(Math.abs(offsets[1]) <= 24, 'lane separation should stay compact');
  assert.equal(offsets[2], 0, 'non-overlapping edge should be able to reuse the center lane');
});

test('adjacent-depth routing applies its route offset to the shared corridor', () => {
  const source = { id: 'source', depth: 0, x: 120, y: 120, width: 220, height: 100 };
  const target = { id: 'target', depth: 1, x: 450, y: 220, width: 220, height: 100 };
  const nodes = [source, target];

  const centered = routeQuestEdgePoints(source, target, nodes, 0);
  const shifted = routeQuestEdgePoints(source, target, nodes, 8);

  assert.notEqual(centered[1].x, shifted[1].x);
  assert.equal(shifted[1].x - centered[1].x, 8);
  assert.equal(shifted[1].x, shifted[2].x);
});
