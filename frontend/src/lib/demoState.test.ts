import { describe, expect, it } from 'vitest';
import { getDefaultSlideView, getVisibleGraph } from './demoState';

describe('PathMind demo state', () => {
  it('starts with only the System 1 node', () => {
    const graph = getVisibleGraph(1);
    expect(graph.nodes.map((node) => node.id)).toEqual(['system-1']);
    expect(graph.edges).toHaveLength(0);
  });

  it('reveals the complete trace at resolution', () => {
    const graph = getVisibleGraph(4);
    expect(graph.nodes.map((node) => node.id)).toEqual([
      'system-1',
      'router',
      'system-2',
      'resolution',
    ]);
    expect(graph.edges).toHaveLength(3);
    expect(graph.edges.every((edge) => edge.animated)).toBe(true);
  });

  it('adds the Nemotron tool call at step three', () => {
    const graph = getVisibleGraph(3);
    expect(graph.nodes.at(-1)?.data.description).toBe('inspect_region([ROI_17])');
  });

  it('automatically focuses the requested region when System 2 inspects it', () => {
    expect(getDefaultSlideView(2)).toBe('overview');
    expect(getDefaultSlideView(3)).toBe('roi');
    expect(getDefaultSlideView(4)).toBe('roi');
  });
});
