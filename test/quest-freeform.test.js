import test from 'node:test';
import assert from 'node:assert/strict';
import { applyQuestLayouts, buildQuestChapter } from '../src/quest-map.js';

test('freeform chapter layout injects handwritten positions without changing other chapters', () => {
  const config = {
    chapters: [
      { id: 'auto', nodes: [{ id: 'a' }] },
      { id: 'exceptions-debugging', nodes: [{ id: 'try-catch' }, { id: 'nullref', kind: 'support', attachedTo: 'try-catch' }] }
    ]
  };
  const layouts = {
    'exceptions-debugging': {
      mode: 'freeform',
      display: 'compact',
      nodes: {
        'try-catch': { x: 320, y: 220, preset: 'goal' },
        nullref: { x: 620, y: 120 }
      }
    }
  };

  const result = applyQuestLayouts(config, layouts);
  assert.equal(result.chapters[0].layout, undefined);
  assert.equal(result.chapters[1].layout, 'freeform');
  assert.equal(result.chapters[1].display, 'compact');
  assert.deepEqual(result.chapters[1].nodes[0], {
    id: 'try-catch', x: 320, y: 220, preset: 'goal'
  });
  assert.deepEqual(result.chapters[1].nodes[1], {
    id: 'nullref', kind: 'support', attachedTo: 'try-catch', x: 620, y: 120
  });
});

test('freeform quest chapters preserve handwritten coordinates instead of auto-layout', () => {
  const graph = buildQuestChapter(
    [
      { id: 'root', type: 'concept', title: 'Root', short: 'Root' },
      { id: 'child', type: 'concept', title: 'Child', short: 'Child' }
    ],
    {
      id: 'demo',
      layout: 'freeform',
      display: 'compact',
      nodes: [
        { id: 'root', x: 400, y: 300, preset: 'goal' },
        { id: 'child', x: 700, y: 140, prerequisites: ['root'] }
      ]
    }
  );

  assert.equal(graph.layout, 'freeform');
  assert.equal(graph.display, 'compact');
  assert.deepEqual(graph.nodes.map(node => [node.id, node.x, node.y]), [
    ['root', 400, 300],
    ['child', 700, 140]
  ]);
});
