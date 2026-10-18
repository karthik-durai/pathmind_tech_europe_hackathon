import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, Crosshair, FilePlus2, Globe2, Loader2, MessageSquare, Mic, Paperclip, Square, X } from 'lucide-react';
import { agentClient, regionContext, type FindingContext, type FollowUpRequest, type ReportNote, type ResearchSource } from '../lib/agentClient';
import type { SurveyRegion } from '../lib/imageSurvey';

type Message = { id: string; role: 'user' | 'assistant'; text: string; question: string; region: FindingContext | null; sources: ResearchSource[]; complete?: boolean; stage?: string; query?: string; added?: boolean; stopped?: boolean };
type Props = { caseId: string; region: SurveyRegion | null; disabled: boolean; onLocate: (regionId: string) => void; onClear: () => void; onAddNote: (note: ReportNote) => void; researchTrigger: number };

export default function FindingChat({ caseId, region, disabled, onLocate, onClear, onAddNote, researchTrigger }: Props) {
  const [threads, setThreads] = useState<Record<string, Message[]>>({});
  const [question, setQuestion] = useState('');
  const [deepResearch, setDeepResearch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const active = useRef<AbortController | null>(null);
  const lastMessage = useRef<HTMLDivElement>(null);
  const key = region?.id ?? 'overview';
  const messages = threads[key] ?? [];
  useEffect(() => { setQuestion(''); setNotice(''); return () => active.current?.abort(); }, [key]);
  useEffect(() => { if (researchTrigger) setDeepResearch(true); }, [researchTrigger]);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => { if (messages.length) lastMessage.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); else lastMessage.current?.parentElement?.scrollTo({ top: 0 }); }, [key, messages.length, messages.at(-1)?.text, messages.at(-1)?.stage]);
  const update = (thread: string, id: string, patch: Partial<Message>) => setThreads(all => ({ ...all, [thread]: (all[thread] ?? []).map(m => m.id === id ? { ...m, ...patch } : m) }));

  const ask = async (text = question, forceResearch = deepResearch) => {
    if (!text.trim() || disabled || busy) return;
    const controller = new AbortController(); active.current = controller;
    const requestId = crypto.randomUUID(), answerId = `${requestId}-answer`, capturedKey = key, context = regionContext(region ?? undefined);
    const request: FollowUpRequest = { caseId, requestId, question: text.trim(), region: context, deepResearch: forceResearch, history: messages.filter(m => m.complete || m.role === 'user').map(m => ({ role: m.role, text: m.text })) };
    setThreads(all => ({ ...all, [capturedKey]: [...(all[capturedKey] ?? []), { id: requestId, role: 'user', text: text.trim(), question: text.trim(), region: context, sources: [], complete: true }, { id: answerId, role: 'assistant', text: '', question: text.trim(), region: context, sources: [], stage: 'Reading the selected context' }] }));
    setQuestion(''); setBusy(true);
    let partial = '';
    try {
      for await (const event of agentClient.followUp(request, controller.signal)) {
        if (controller.signal.aborted) break;
        if (event.type === 'research.stage') update(capturedKey, answerId, { stage: event.stage, query: event.query });
        if (event.type === 'answer.delta') { partial += event.text; update(capturedKey, answerId, { text: partial }); }
        if (event.type === 'answer.complete') {
          if (event.regionId !== (context?.regionId ?? null)) throw new Error('The response does not match the selected region.');
          update(capturedKey, answerId, { text: event.answer, sources: event.sources, complete: true, stage: undefined });
        }
      }
    } catch (error) {
      update(capturedKey, answerId, { text: controller.signal.aborted ? 'Response stopped. You can ask a new question in this region.' : error instanceof Error ? error.message : 'Response unavailable. Try again.', stopped: true, stage: undefined });
    } finally { if (active.current === controller) { active.current = null; setBusy(false); } }
  };
  const voice = () => {
    type Recognition = { lang: string; start(): void; onresult: ((event: { results: { transcript: string }[][] }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; stop(): void };
    const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Speech = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Speech) { setNotice('Voice input is unavailable here. Type your follow-up below.'); return; }
    const recognition = new Speech(); recognition.lang = 'en-US';
    recognition.onresult = e => { setQuestion(e.results[0][0].transcript); setNotice(''); };
    recognition.onerror = () => setNotice('Microphone unavailable. You can type instead.');
    recognition.onend = () => setNotice(n => n === 'Listening…' ? '' : n);
    setNotice('Listening…'); recognition.start();
  };
  return <section className="finding-chat" aria-label="Finding conversation">
    <div className="chat-context">{region?.thumbnail ? <img src={region.thumbnail} alt={`Context crop for region ${region.id}`}/> : <div className="chat-overview-icon"><ScanIcon/></div>}<div><span>CONVERSATION CONTEXT</span><strong>{region ? `Region ${region.id} · ${region.title}` : 'Whole-slide overview'}</strong></div>{region && <><button aria-label="Locate conversation region" onClick={() => onLocate(region.id)}><Crosshair size={15}/></button><button aria-label="Switch to whole-slide conversation" onClick={onClear}><X size={13}/></button></>}</div>
    <div className="chat-scroll">
      {region && <section className="sidebar-finding" aria-label={`Finding details for region ${region.id}`}><div className="sidebar-finding-heading"><span>SELECTED FINDING</span><span>Review pending</span></div><div className="sidebar-finding-overview">{region.thumbnail && <img src={region.thumbnail} alt={`Evidence crop for region ${region.id}`}/>}<div><h3>{region.title}</h3><p>Original-pixel crop · R{region.id}</p><button onClick={() => onLocate(region.id)}><Crosshair size={11}/>Locate on slide</button></div></div><details><summary>View image evidence and measurements</summary><p>{region.detail}</p><span>Local image survey · model interpretation pending</span></details></section>}
      {!messages.length && <div className="chat-welcome"><span className="chat-welcome-icon"><MessageSquare size={19}/></span><h3>{region ? 'Discuss this region.' : 'Explore the evidence.'}</h3><p>{region ? 'Questions stay attached to this crop. Ask for an explanation, compare alternatives, or research the evidence.' : 'Select a finding on the image to discuss that specific region, or ask about the whole-slide review.'}</p><div className="suggested-questions">{['What supports this finding?', 'What else could explain this?', 'Find reference criteria'].map((q, i) => <button key={q} disabled={disabled || busy} onClick={() => { if (i === 2) setDeepResearch(true); void ask(q, i === 2 || deepResearch); }}>{i === 2 ? <Globe2 size={13}/> : <ArrowRight size={13}/>} {q}</button>)}</div><span className="mock-explainer">Mock agent responses · no external requests</span></div>}
      {messages.map(message => <article key={message.id} className={`chat-message ${message.role}`}><div className="message-label">{message.role === 'user' ? 'YOU' : 'PATHMIND'}{message.region && <button onClick={() => onLocate(message.region!.regionId)}>R{message.region.regionId}<Crosshair size={10}/></button>}{message.role === 'assistant' && <span>MOCK</span>}</div>{message.stage && <div className="research-progress"><span className="research-progress-head"><Loader2 size={13} className="spin"/>{message.stage}</span>{message.query && <p>{message.query}</p>}<div className="research-trace"><span className="done">Context</span><span className={message.stage.includes('Tavily') || message.stage.includes('Comparing') || message.stage.includes('Assembling') ? 'done' : ''}>Search</span><span className={message.stage.includes('Assembling') ? 'done' : ''}>Synthesis</span></div></div>}{message.text && <p className="answer-text">{message.text}</p>}{message.sources.length > 0 && <div className="source-list"><div className="source-list-heading"><BookOpen size={12}/>Reference preview<span>Fictional fixtures</span></div>{message.sources.map((source, i) => <div className="source-card" key={source.id}><span className="source-index">{i + 1}</span><div><strong>{source.title}</strong><p>{source.excerpt}</p><small>Mock source · not retrieved from Tavily</small></div></div>)}</div>}{message.complete && message.role === 'assistant' && <button className="add-to-report" disabled={message.added} onClick={() => { onAddNote({ id: message.id, regionId: message.region?.regionId ?? null, title: message.region?.title ?? 'Slide overview', question: message.question, answer: message.text, sources: message.sources, origin: 'mock' }); update(key, message.id, { added: true }); }}>{message.added ? <Check size={12}/> : <FilePlus2 size={12}/>} {message.added ? 'Added to report' : 'Add to report'}</button>}</article>)}
      <div ref={lastMessage}/>
    </div>
    <div className="chat-composer-area">{notice && <div className="notice">{notice}<button aria-label="Dismiss voice notice" onClick={() => setNotice('')}><X size={12}/></button></div>}<div className="research-toggle-row"><button type="button" role="switch" aria-checked={deepResearch} aria-label="Deep research" className={deepResearch ? 'research-switch enabled' : 'research-switch'} onClick={() => setDeepResearch(v => !v)}><Globe2 size={13}/>Deep research<span/></button><small>Tavily · mock</small></div><div className="composer-context-chip" aria-label="Attached question context"><Paperclip size={11}/><span>{region ? `Region ${region.id} · ${region.title}` : 'Whole-slide overview'}</span><span>Attached</span></div><form className="composer" onSubmit={e => { e.preventDefault(); void ask(); }}><textarea aria-label="Ask about selected finding" placeholder={region ? `Ask about region ${region.id}…` : 'Ask about the slide…'} value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(); } }}/><div><span>{region ? `Attached to region ${region.id}` : 'Whole-slide context'}</span><button type="button" aria-label="Voice follow-up" onClick={voice}><Mic size={16}/></button>{busy ? <button type="button" className="send" aria-label="Stop response" onClick={() => active.current?.abort()}><Square size={11}/></button> : <button type="submit" className="send" aria-label="Send finding question" disabled={!question.trim() || disabled}><ArrowRight size={16}/></button>}</div></form><p className="composer-footnote">Demonstration responses. No live model or Tavily calls.</p></div>
  </section>;
}
function ScanIcon() { return <Crosshair size={18}/>; }
