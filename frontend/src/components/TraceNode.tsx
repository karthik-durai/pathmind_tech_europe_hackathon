import { FileCheck2, ScanSearch, TriangleAlert, Waypoints } from 'lucide-react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export type TraceNodeData = {
  tone: 'system1' | 'system2' | 'alert' | 'success';
  eyebrow: string;
  title: string;
  description: string;
  metric: string;
  icon: 'brain' | 'triangle-alert' | 'scan-search' | 'file-check-2';
  report?: {
    finding: string;
    evidence: string;
    caveat: string;
  };
};

const toneStyles = {
  system1: 'border-cyan-400/90 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.22)]',
  system2: 'border-purple-400/90 text-purple-200 shadow-[0_0_22px_rgba(168,85,247,0.24)]',
  alert: 'border-rose-400/90 text-rose-200 shadow-[0_0_22px_rgba(248,113,113,0.24)]',
  success: 'border-emerald-400/90 text-emerald-200 shadow-[0_0_22px_rgba(74,222,128,0.22)]',
};

const iconMap = {
  brain: Waypoints,
  'triangle-alert': TriangleAlert,
  'scan-search': ScanSearch,
  'file-check-2': FileCheck2,
};

export default function TraceNode({ data }: NodeProps) {
  const nodeData = data as TraceNodeData;
  const Icon = iconMap[nodeData.icon];

  return (
    <article
      className={`w-[244px] rounded-2xl border bg-slate-950/90 p-4 backdrop-blur-xl ${toneStyles[nodeData.tone]}`}
      aria-label={`${nodeData.title}: ${nodeData.description}`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-current" />
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] opacity-70">{nodeData.eyebrow}</p>
          <h3 className="mt-1 text-sm font-semibold uppercase tracking-wide">{nodeData.title}</h3>
        </div>
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      </div>
      <p className="font-mono text-sm text-slate-100">{nodeData.description}</p>
      <p className="mt-2 text-xs text-slate-400">{nodeData.metric}</p>

      {nodeData.report ? (
        <dl className="mt-3 space-y-1 border-t border-emerald-400/20 pt-3 text-[11px]">
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Finding</dt><dd className="text-right text-slate-200">{nodeData.report.finding}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Evidence</dt><dd className="text-right text-slate-200">{nodeData.report.evidence}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">Safety</dt><dd className="text-right text-amber-300">{nodeData.report.caveat}</dd></div>
        </dl>
      ) : null}

      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-current" />
    </article>
  );
}
