import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, ChevronDown, Crosshair, FileText, Layers, Maximize2, Minus, MoveUpRight, Pause, Play, Plus, RotateCcw, ScanLine, Search, Upload, X } from 'lucide-react';

import FindingChat from './components/FindingChat';
import type { ReportNote } from './lib/agentClient';
import { surveyImage, type Survey, type SurveyRegion } from './lib/imageSurvey';

const sample = '/assets/synthetic-colon-he.png';
const sampleRegions = [
  { id: '17', x: .64, y: .38, title: 'Gland architecture', detail: 'Closely spaced glandular structures.', zoom: 2.7 },
  { id: '08', x: .32, y: .62, title: 'Stromal comparison', detail: 'A separate region for comparison.', zoom: 3.3 },
  { id: '23', x: .73, y: .7, title: 'Tissue boundary', detail: 'Review the transition between regions.', zoom: 3.8 },
];
const sampleEvents = [
  { title: 'Surveying the tissue', detail: 'Establishing an overview before selecting regions.', tag: 'Overview', region: -1 },
  { title: 'Inspecting gland architecture', detail: 'Region 17 selected for a closer look at the glandular pattern.', tag: 'Region 17', region: 0 },
  { title: 'Comparing a second region', detail: 'Checking whether the surrounding tissue supports the same finding.', tag: 'Region 08', region: 1 },
  { title: 'Reviewing the tissue boundary', detail: 'Inspecting the transition before assembling the evidence.', tag: 'Region 23', region: 2 },
  { title: 'Draft ready for review', detail: 'Three evidence regions linked to the research report.', tag: 'Report', region: -1 },
];

export default function App() {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [scanning, setScanning] = useState(true);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState('');
  const [scanKey, setScanKey] = useState(0);
  const [frame, setFrame] = useState({ width: 1, height: 1 });
  const [imageSize, setImageSize] = useState({ width: 1536, height: 1024 });
  const regions: SurveyRegion[] = survey?.regions ?? sampleRegions;
  const events = sampleEvents.map((event, i) => i > 0 && i < 4 && survey ? {
    ...event, title: ['Selecting the primary region', 'Comparing image regions', 'Inspecting additional detail'][i - 1],
    detail: regions[i - 1].detail, tag: 'Region ' + regions[i - 1].id,
  } : i === 0 && survey ? { ...event, title: 'Image survey complete', detail: `${survey.tiles} tiles measured. ${survey.width.toLocaleString()} × ${survey.height.toLocaleString()} pixels. Navigation preview; model interpretation pending.` } : i === 4 && survey ? { ...event, title: 'Preview report ready', detail: 'Image measurements and three coordinate-linked regions assembled. Model findings pending.' } : event);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState<'investigation' | 'report' | 'chat'>('investigation');
  const [follow, setFollow] = useState(true);
  const [camera, setCamera] = useState({ x: .5, y: .5, z: 1 });
  const [selected, setSelected] = useState<number | null>(null);
  const [src, setSrc] = useState(sample);
  const [fileName, setFileName] = useState('Colorectal tissue · H&E');
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [chatRegionId, setChatRegionId] = useState<string | null>(null);
  const [researchTrigger, setResearchTrigger] = useState(0);
  const [reportNotes, setReportNotes] = useState<ReportNote[]>([]);
  const [caseId, setCaseId] = useState('PM-0241');
  const [notice, setNotice] = useState('');
  const [showRegions, setShowRegions] = useState(true);
  const viewport = useRef<HTMLDivElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const isSample = src === sample;
  const complete = step === 4 && !scanning;
  useEffect(() => {
    const controller = new AbortController();
    setScanning(true); setScanProgress(0); setSurvey(null); setScanError(''); setHoveredRegion(null); setChatRegionId(null); setReportNotes([]);
    setPlaying(false); setStep(0); setSelected(null); setFollow(true); setCamera({ x: .5, y: .5, z: 1 });
    surveyImage(src, controller.signal, (count, total) => { if (!controller.signal.aborted) setScanProgress(count / total); })
      .then(result => {
        if (controller.signal.aborted) return;
        setSurvey(result); setImageSize({ width: result.width, height: result.height }); setScanning(false); setPlaying(true);
        if (result.lowDetail) setNotice('This image contains little texture. Regions are for navigation only; no tissue interpretation is available.');
      }).catch(error => {
        if (controller.signal.aborted) return;
        setScanning(false); setScanError('This image could not be decoded. Please open a valid PNG, JPEG or WebP image.'); setNotice(error instanceof Error ? 'Could not read this image. Please choose a valid PNG, JPEG or WebP.' : 'Image could not be opened.');
      });
    return () => controller.abort();
  }, [src, scanKey]);
  useEffect(() => {
    if (!viewport.current) return;
    const observer = new ResizeObserver(([entry]) => setFrame({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(viewport.current); return () => observer.disconnect();
  }, []);
  const ratio = imageSize.width / imageSize.height;
  const fittedWidth = Math.min(frame.width, frame.height * ratio);
  const fittedHeight = fittedWidth / ratio;

  const focus = (index: number) => { const r = regions[index]; setSelected(index); setCamera(boundCamera({ x: r.x, y: r.y, z: Math.min(r.zoom, nativeZoom) })); };
  useEffect(() => {
    if (!playing || scanning) return;
    const timer = window.setTimeout(() => { if (step < 4) setStep(step + 1); else setPlaying(false); }, 4200);
    return () => window.clearTimeout(timer);
  }, [playing, step, scanning]);
  useEffect(() => {
    if (!follow || scanning) return;
    const region = events[step].region;
    if (region >= 0) focus(region);
    else { setCamera({ x: .5, y: .5, z: 1 }); setSelected(null); }
  }, [step, follow, scanning]);
  useEffect(() => () => { if (src.startsWith('blob:')) URL.revokeObjectURL(src); }, [src]);
  const nativeZoom = Math.max(1, Math.min(6, imageSize.width / Math.max(1, fittedWidth)));
  function boundCamera(value: { x: number; y: number; z: number }) {
    const z = Math.max(1, Math.min(nativeZoom, value.z));
    const hx = Math.min(.5, frame.width / (2 * Math.max(1, fittedWidth) * z));
    const hy = Math.min(.5, frame.height / (2 * Math.max(1, fittedHeight) * z));
    return { x: Math.max(hx, Math.min(1 - hx, value.x)), y: Math.max(hy, Math.min(1 - hy, value.y)), z };
  }
  useEffect(() => { setCamera(c => boundCamera(c)); }, [frame.width, frame.height, imageSize.width, imageSize.height]);
  const zoom = (delta: number) => { setFollow(false); setCamera(c => boundCamera({ ...c, z: c.z + delta })); };
  const replay = () => { setScanKey(k => k + 1); setTab('investigation'); };
  const inspect = (index: number) => { focus(index); setFollow(false); setPlaying(false); setChatRegionId(regions[index].id); setTab('chat'); };
  const discuss = (index: number | null, research = false) => {
    setChatRegionId(index === null ? null : regions[index].id); setTab('chat'); setPlaying(false); setFollow(false);
    if (research) setResearchTrigger(n => n + 1);
  };
  const addNote = (note: ReportNote) => { setReportNotes(notes => notes.some(n => n.id === note.id) ? notes : [...notes, note]); setNotice('Follow-up added to the report with its region and mock source labels.'); };
  const download = () => {
    const body = `PathMind — research report\nCase ${caseId}\n\nLOCAL IMAGE SURVEY · MODEL INTERPRETATION PENDING\n\nObservations\n${regions.map(r => `${r.title}: ${r.detail} (Region ${r.id})`).join('\n')}\n\nThis report describes local pixel measurements and image navigation. It contains no model-verified pathology findings.\nStatus: Human review required. No diagnostic conclusion.\n\nFOLLOW-UP NOTES (MOCK)\n${reportNotes.map(n => `Region ${n.regionId ?? 'overview'} · ${n.question}\n${n.answer}\nSources: ${n.sources.map(s => `${s.title} [${s.origin}]`).join('; ')}`).join('\n\n')}\n`;
    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = 'PathMind-PM-0241-report.txt'; a.click(); URL.revokeObjectURL(url);
  };
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="/" aria-label="PathMind home"><span className="brand-mark"><ScanLine size={20}/></span>pathmind<span className="brand-divider"/><span className="workspace-name">Research workspace</span></a><div className="header-actions"><span className="demo-label"><span/>Interactive demo</span><span className="avatar">PM</span></div></header>
    <div className="casebar"><div className="case-title"><ArrowLeft size={17} className="back-icon"/><div><div className="breadcrumb">Cases <span>/</span> {caseId}</div><h1>{fileName}</h1></div><span className="case-badge">{complete ? 'Draft ready' : 'Research case'}</span></div><div className="case-actions"><span className="saved"><Check size={13}/>Local session</span><button className="button secondary" onClick={() => upload.current?.click()}><Upload size={15}/>Open image</button><button className="button primary" disabled={!complete} onClick={() => setTab('report')}><FileText size={15}/>Review report<ArrowRight size={14}/></button></div>
      <input ref={upload} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => {
        const f = e.target.files?.[0]; if (!f) return;
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) { setNotice('This viewer accepts PNG, JPEG, or WebP. Whole-slide files need the backend.'); return; }
        if (f.size > 25 * 1024 * 1024) { setNotice('Please choose an image smaller than 25 MB.'); return; }
        setCaseId(`PM-${crypto.randomUUID().slice(0, 6).toUpperCase()}`); setSrc(URL.createObjectURL(f)); setFileName(f.name); setPlaying(false); setStep(0); setSelected(null); setCamera({ x: .5, y: .5, z: 1 }); setTab('investigation'); setNotice('Local image survey. Model interpretation is not connected.'); e.target.value = '';
      }}/>
    </div>
    <main className="workspace">
      <section className="viewer-column" aria-label="Slide viewer">
        <div className="viewer-topline"><div><span className="status-dot"/>{isSample ? 'Sample slide' : 'Uploaded image'}<span className="viewer-meta">{isSample ? 'Synthetic H&E · local survey' : 'Local image · local survey'}</span></div><button className={`follow-button ${follow ? 'following' : ''}`} onClick={() => setFollow(v => !v)}><Crosshair size={13}/>{follow ? 'Following agent' : 'Follow agent'}</button></div>
        <div ref={viewport} className={`slide-viewport ${scanning ? 'is-scanning' : ''}`} data-testid="slide-viewer" onWheel={e => { if (!scanning) zoom(e.deltaY < 0 ? .1 : -.1); }} onPointerDown={e => { if (scanning || (e.target as HTMLElement).closest('button')) return; setFollow(false); drag.current = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!drag.current || !viewport.current) return; setCamera(c => boundCamera({ ...c, x: drag.current!.cx - (e.clientX - drag.current!.x) / fittedWidth / c.z, y: drag.current!.cy - (e.clientY - drag.current!.y) / fittedHeight / c.z })); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
          <div className={`slide-world ${drag.current ? 'is-dragging' : ''}`} style={{ width: fittedWidth, height: fittedHeight, left: (frame.width - fittedWidth) / 2, top: (frame.height - fittedHeight) / 2, transform: `translate(${(.5 - camera.x) * camera.z * 100}%, ${(.5 - camera.y) * camera.z * 100}%) scale(${camera.z})` }}><img src={src} alt={isSample ? 'Synthetic colon tissue for a local image survey' : 'User uploaded image'} onLoad={e => setImageSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })} draggable={false}/>{!scanning && !scanError && showRegions && regions.map((r, i) => <button key={r.id} aria-label={`Inspect region ${r.id}`} className={`region ${selected === i ? 'selected' : ''} ${hoveredRegion === r.id ? 'hovered' : ''}`} onPointerEnter={() => setHoveredRegion(r.id)} onPointerLeave={() => setHoveredRegion(null)} onFocus={() => setHoveredRegion(r.id)} onBlur={() => setHoveredRegion(null)} style={{ left: `${(r.x - (r.width ?? .14) / 2) * 100}%`, top: `${(r.y - (r.height ?? .18) / 2) * 100}%`, width: `${(r.width ?? .14) * 100}%`, height: `${(r.height ?? .18) * 100}%` }} onClick={() => inspect(i)}><span style={{ transform: `scale(${1 / Math.max(1, camera.z * .65)})`, transformOrigin: 'bottom left' }}>R{r.id}</span></button>)}</div>
          {scanning && <div className="scan-overlay" aria-label="Scanning uploaded image">
            <div className="scan-tiles">{Array.from({ length: 48 }, (_, i) => <span key={i} className={i < Math.round(scanProgress * 48) ? 'scanned' : ''}/>)}</div>
            <div className="scan-sweep" style={{ top: `${Math.floor(Math.max(0, scanProgress * 48 - 1) / 8) / 6 * 100}%` }}/>
            <div className="scan-indicator"><span className="scan-spinner"/><div><strong>Surveying the image</strong><span>Measuring image texture · selecting regions</span></div><b>{Math.round(scanProgress * 100)}%</b><div className="scan-progress"><span style={{ width: `${scanProgress * 100}%` }}/></div><small>{Math.round(scanProgress * 48)} of 48 tiles inspected · local preview</small></div>
          </div>}
          <div className="slide-corner-label"><span className="corner-square"/>{caseId}<span>01 / 01</span></div>{selected !== null && <div className="region-caption"><span className="caption-dot"/>Region {regions[selected].id}<span>{regions[selected].title}</span></div>}
          {!scanning && !scanError && <div className="findings-hint"><Check size={12}/>Hover to highlight · select to discuss in the sidebar</div>}
          <div className="viewer-tools"><button aria-label="Zoom in" disabled={camera.z >= nativeZoom - .01} title="Zoom is limited to the source image resolution" onClick={() => zoom(.25)}><Plus size={18}/></button><span>{camera.z.toFixed(1)}×</span><button aria-label="Zoom out" onClick={() => zoom(-.25)}><Minus size={18}/></button><i/><button aria-label="Fit slide" onClick={() => { setHoveredRegion(null); setFollow(false); setSelected(null); setCamera({ x: .5, y: .5, z: 1 }); }}><Maximize2 size={16}/></button><button aria-label="Toggle regions" aria-pressed={showRegions} onClick={() => setShowRegions(v => !v)}><Layers size={17}/></button></div>
          <button className="minimap" aria-label="Return to slide overview" onClick={() => { setHoveredRegion(null); setFollow(false); setCamera({ x: .5, y: .5, z: 1 }); setSelected(null); }}><img src={src} alt="Slide overview"/><span style={{ width: `${100 / camera.z}%`, height: `${100 / camera.z}%`, left: `${Math.max(0, Math.min(100 - 100 / camera.z, camera.x * 100 - 50 / camera.z))}%`, top: `${Math.max(0, Math.min(100 - 100 / camera.z, camera.y * 100 - 50 / camera.z))}%` }}/></button><div className="scale-bar" title={`${imageSize.width} × ${imageSize.height} source pixels. Zoom does not create additional detail.`}><span/>{camera.z >= nativeZoom - .01 ? 'Native resolution' : `Viewer zoom · ${camera.z.toFixed(1)}×`}</div>
        </div>
        <div className="playback"><button className="play-toggle" disabled={scanning || !!scanError} aria-label={playing ? 'Pause replay' : 'Play replay'} onClick={() => { if (complete || !survey) replay(); else setPlaying(v => !v); }}>{playing ? <Pause size={16}/> : <Play size={16} fill="currentColor"/>}</button><div className="playback-copy"><strong>{scanning ? 'Surveying the image' : scanError ? 'Image could not be loaded' : playing ? 'Investigation preview in progress' : complete ? 'Preview complete' : 'Explore the image'}</strong><span>{scanning ? `${Math.round(scanProgress * 48)} / 48 tiles · local pixel survey` : playing ? events[step].title : 'Image-based navigation preview · 5 stages'}</span></div><div className="timeline">{events.map((e, i) => <button key={i} disabled={scanning || !!scanError} title={e.title} aria-label={`Go to stage ${i + 1}: ${e.title}`} className={i <= step ? 'passed' : ''} onClick={() => { setStep(i); setFollow(true); }}/>)}</div><span className="stage-count">0{step + 1} / 05</span><button className="icon-button" disabled={scanning || !!scanError} aria-label="Restart replay" onClick={replay}><RotateCcw size={15}/></button></div>
        <div className="evidence-strip"><div className="strip-heading"><span>Findings & evidence <span className="inline-mock">Preview</span></span><span>{scanning ? 'Selecting regions…' : `${regions.length} regions`}</span></div><div className="evidence-items">{!scanning && !scanError ? regions.map((r, i) => <button key={r.id} className={`evidence-card ${selected === i ? 'active' : ''} ${hoveredRegion === r.id ? 'hovered' : ''}`} onPointerEnter={() => setHoveredRegion(r.id)} onPointerLeave={() => setHoveredRegion(null)} onFocus={() => setHoveredRegion(r.id)} onBlur={() => setHoveredRegion(null)} onClick={() => inspect(i)}><div className="evidence-image" style={{ backgroundImage: `url(${r.thumbnail || src})`, backgroundSize: r.thumbnail ? 'cover' : '350%', backgroundPosition: `${r.x * 100}% ${r.y * 100}%` }}/><div><span>REGION {r.id}</span><strong>{r.title}</strong><small>{'Inspect & discuss'}<MoveUpRight size={11}/></small></div></button>) : <p className="empty-evidence">Scanning the image to select candidate regions…</p>}</div></div>
      </section>
      <aside className="agent-panel"><div className="panel-tabs"><button className={tab === 'investigation' ? 'active' : ''} onClick={() => setTab('investigation')}>Investigation<span>{scanning ? '…' : step + 1}</span></button><button className={tab === 'report' ? 'active' : ''} onClick={() => setTab('report')}>Report{complete && <span className="report-dot"/>}</button><button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>Discuss<span>{chatRegionId ? 'R' + chatRegionId : '↗'}</span></button><span className="panel-menu"><ChevronDown size={15}/></span></div>
        <div className="panel-scroll" hidden={tab === 'chat'}>{tab === 'investigation' ? <><div className="panel-intro"><div className="eyebrow">PATHMIND ASSISTANT</div><h2>A closer look,<br/>with every step in view.</h2><p>Follow the investigation from the first overview to the supporting evidence.</p></div><div className="question-card"><span>INVESTIGATION QUESTION</span><p>What tissue patterns are visible, and which regions need a closer look?</p><div><span className="tiny-dot"/>Local survey · model interpretation pending</div></div><div className="feed-heading"><h3>Activity</h3><span>{scanning ? 'Scanning image' : 'Navigation preview'}</span></div><div className="activity-feed" aria-live="polite">{scanning ? <div className="scan-activity"><div className="scan-activity-title"><ScanLine size={16}/><strong>Scanning uploaded pixels</strong></div><p>Dividing the image into 48 tiles, measuring local contrast, and selecting distinct regions for a closer look.</p><div className="scan-progress"><span style={{ width: `${scanProgress * 100}%` }}/></div><span>{Math.round(scanProgress * 48)} tiles inspected</span></div> : !scanError ? events.slice(0, step + 1).map((event, i) => <div className={`activity-item ${i === step ? 'current' : ''}`} key={i}><div className="activity-marker">{i < step || complete ? <Check size={12}/> : <Search size={12}/>}</div><div className="activity-body"><div className="activity-meta">{i === 0 ? 'SURVEY' : i === 4 ? 'DRAFT' : 'INSPECT'}<span>00:{String(i * 4).padStart(2, '0')}</span></div><h4>{event.title}</h4><p>{event.detail}</p>{event.region >= 0 && <button className="region-link" onClick={() => inspect(event.region)}><ScanLine size={12}/>{event.tag}<MoveUpRight size={11}/></button>}{i === 4 && <button className="report-link" onClick={() => setTab('report')}>Open draft report<ArrowRight size={14}/></button>}</div></div>) : <p className="empty-evidence">Please open a valid image to start the preview.</p>}</div></> : <div className="report-content"><div className="eyebrow">CASE {caseId}</div><h2>Research report</h2><div className="report-status">{complete ? <><Check size={13}/>Local survey ready · model findings pending</> : 'Complete the sample replay to prepare a draft'}</div>{complete ? <><p className="report-lead">Image survey & region review</p><div className="report-section"><h3>Observations</h3>{regions.map((r, i) => <div className={`report-finding ${hoveredRegion === r.id ? 'hovered' : ''}`} key={r.id} onPointerEnter={() => setHoveredRegion(r.id)} onPointerLeave={() => setHoveredRegion(null)}><strong>{r.title}</strong><p>{r.detail}</p><button className="region-link" onClick={() => inspect(i)}><ScanLine size={12}/>View region {r.id}<MoveUpRight size={11}/></button></div>)}</div><div className="report-section"><h3>Evidence & limitations</h3><p>Regions were selected from this image using local pixel contrast. The camera movements and image crops use the measured coordinates. PathAgent model interpretation is not connected.</p><p>No diagnostic conclusion or calibrated confidence score is available.</p></div>{reportNotes.length > 0 && <div className="report-section report-notes"><h3>Follow-up notes · mock</h3>{reportNotes.map(note => <div key={note.id} className="report-note"><div><span>{note.regionId ? 'REGION ' + note.regionId : 'SLIDE OVERVIEW'}</span><button aria-label="Remove report note" onClick={() => setReportNotes(notes => notes.filter(n => n.id !== note.id))}><X size={12}/></button></div><strong>{note.question}</strong><p>{note.answer}</p>{note.sources.length > 0 && <small>{note.sources.length} fictional source fixtures · not retrieved</small>}<button className="region-link" onClick={() => { const index = regions.findIndex(r => r.id === note.regionId); if (index >= 0) inspect(index); discuss(index >= 0 ? index : null); }}>Revisit conversation<ArrowRight size={11}/></button></div>)}</div>}<button className="button primary report-download" onClick={download}><ArrowDownToLine size={15}/>Download research draft</button></> : <button className="button secondary" disabled={scanning || !!scanError} onClick={replay}><Play size={14}/>Start image survey</button>}</div>}</div>
        <div className="chat-surface" hidden={tab !== 'chat'}><FindingChat key={src + ':' + scanKey} caseId={caseId} region={regions.find(r => r.id === chatRegionId) ?? null} disabled={scanning || !!scanError} onLocate={id => { const index = regions.findIndex(r => r.id === id); if (index >= 0) inspect(index); }} onClear={() => setChatRegionId(null)} onAddNote={addNote} researchTrigger={researchTrigger}/></div>
        <div className="composer-area" hidden={tab === 'chat'}>{notice && <div className="notice">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={12}/></button></div>}<div className="discuss-launcher"><div><strong>{selected !== null ? 'Questions about this finding?' : 'Explore a finding in more detail'}</strong><p>{selected !== null ? 'Keep the image region attached to your follow-up.' : 'Select a marked region or discuss the whole slide.'}</p></div><button className="button primary" disabled={scanning || !!scanError} onClick={() => discuss(selected)}>Discuss{selected !== null ? ' R' + regions[selected].id : ' slide'}<ArrowRight size={14}/></button></div><p className="composer-footnote">Research preview. Findings require expert review.</p></div>
      </aside>
    </main><footer className="app-footer"><span><span className="status-dot"/>Local demo<span className="footer-separator">/</span>Local pixel survey · model findings pending</span><span>PathMind<span className="footer-separator">/</span>Tech Europe 2026</span></footer>
  </div>;
}
