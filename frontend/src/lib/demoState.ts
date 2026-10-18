import type { Edge, Node } from '@xyflow/react';
import type { TraceNodeData } from '../components/TraceNode';

export type DemoStep = 1 | 2 | 3 | 4;
export type SlideView = 'overview' | 'roi';

const allNodes: Node<TraceNodeData>[] = [
  {
    id: 'system-1',
    type: 'trace',
    position: { x: 36, y: 126 },
    data: {
      tone: 'system1',
      eyebrow: 'FAST PATH · 1.2s',
      title: 'System 1',
      description: 'Hypothesis: Adenoma',
      metric: '37% confidence',
      icon: 'brain',
    },
  },
  {
    id: 'router',
    type: 'trace',
    position: { x: 328, y: 126 },
    data: {
      tone: 'alert',
      eyebrow: 'POLICY GATE',
      title: 'Router',
      description: 'ESCALATE_REASONING',
      metric: 'Regional disagreement',
      icon: 'triangle-alert',
    },
  },
  {
    id: 'system-2',
    type: 'trace',
    position: { x: 620, y: 126 },
    data: {
      tone: 'system2',
      eyebrow: 'TOOL CALL · NEMOTRON',
      title: 'System 2',
      description: 'inspect_region([ROI_17])',
      metric: 'New visual evidence requested',
      icon: 'scan-search',
    },
  },
  {
    id: 'resolution',
    type: 'trace',
    position: { x: 620, y: 354 },
    data: {
      tone: 'success',
      eyebrow: 'STRUCTURED DRAFT',
      title: 'Resolution',
      description: 'Suspicious glandular lesion',
      metric: 'ACTION: ACCEPT_FOR_DRAFT',
      report: {
        finding: 'Adenoma favored',
        evidence: 'ROI_17 reviewed',
        caveat: 'Human confirmation required',
      },
      icon: 'file-check-2',
    },
  },
];

const allEdges: Edge[] = [
  {
    id: 's1-router',
    source: 'system-1',
    target: 'router',
    animated: true,
    style: { stroke: '#fb7185', strokeWidth: 2 },
  },
  {
    id: 'router-s2',
    source: 'router',
    target: 'system-2',
    animated: true,
    style: { stroke: '#c084fc', strokeWidth: 2 },
  },
  {
    id: 's2-resolution',
    source: 'system-2',
    target: 'resolution',
    animated: true,
    style: { stroke: '#4ade80', strokeWidth: 2 },
  },
];

export const STEP_COPY: Record<DemoStep, { label: string; detail: string }> = {
  1: { label: 'System 1 pass', detail: 'Fast visual model proposes an initial hypothesis.' },
  2: { label: 'Escalation', detail: 'The router detects regional disagreement.' },
  3: { label: 'System 2 tool call', detail: 'Nemotron requests a fresh inspection of ROI_17.' },
  4: { label: 'Resolution', detail: 'New evidence is linked to a reviewable draft.' },
};

export function getVisibleGraph(step: DemoStep) {
  const nodeCount = step;
  const edgeCount = Math.max(0, step - 1);
  return {
    nodes: allNodes.slice(0, nodeCount),
    edges: allEdges.slice(0, edgeCount),
  };
}

export function getDefaultSlideView(step: DemoStep): SlideView {
  return step >= 3 ? 'roi' : 'overview';
}
