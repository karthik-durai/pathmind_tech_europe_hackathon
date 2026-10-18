import type { SurveyRegion } from './imageSurvey';

export type ResearchSource = { id: string; title: string; excerpt: string; url?: string; origin: 'mock' | 'live' };
export type FindingContext = { regionId: string; title: string; observation: string; x: number; y: number; width: number; height: number };
export type FollowUpRequest = { caseId: string; requestId: string; question: string; region: FindingContext | null; deepResearch: boolean; history: { role: 'user' | 'assistant'; text: string }[] };
export type FollowUpEvent =
  | { type: 'research.stage'; stage: string; query?: string; origin: 'mock' | 'live' }
  | { type: 'answer.delta'; text: string }
  | { type: 'answer.complete'; answer: string; regionId: string | null; sources: ResearchSource[]; origin: 'mock' | 'live' };
export interface AgentClient { followUp(request: FollowUpRequest, signal: AbortSignal): AsyncIterable<FollowUpEvent> }
export type ReportNote = { id: string; regionId: string | null; title: string; question: string; answer: string; sources: ResearchSource[]; origin: 'mock' | 'live' };

export function regionContext(region: SurveyRegion | undefined): FindingContext | null {
  return region ? { regionId: region.id, title: region.title, observation: region.detail, x: region.x, y: region.y, width: region.width ?? .14, height: region.height ?? .18 } : null;
}

const pause = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
  const cancel = () => { globalThis.clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
  const timer = globalThis.setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, ms);
  signal.addEventListener('abort', cancel, { once: true });
});

// Deliberate mock boundary. No fetch, model calls, Tavily calls, or external image transfer.
// Replace this client with the team's streaming transport; retain the request/event types.
export class MockAgentClient implements AgentClient {
  constructor(private delay = 550) {}
  async *followUp(request: FollowUpRequest, signal: AbortSignal): AsyncIterable<FollowUpEvent> {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const location = request.region ? `region ${request.region.regionId}` : 'the slide overview';
    const query = request.region ? `histopathology region review ${request.region.title}: ${request.question}` : `histopathology slide review: ${request.question}`;
    const steps = request.deepResearch ? ['Preparing the research query', 'Searching with Tavily · simulated', 'Comparing reference criteria', 'Assembling the response'] : ['Reading the selected context', 'Assembling the response'];
    for (const stage of steps) {
      yield { type: 'research.stage', stage, query: request.deepResearch ? query : undefined, origin: 'mock' };
      await pause(this.delay, signal);
    }
    let answer: string;
    if (/compar|else|alternative|differential|another/i.test(request.question)) {
      answer = `For ${location}, the next useful step is comparison. Review an adjacent area at the same resolution, then compare the arrangement and consistency of the visible structures. A variation in appearance can reflect tissue composition, sectioning, or image quality; the image alone does not establish which explanation applies.\n\n${request.region ? `The current evidence anchor is “${request.region.title}.” Its measured location is x=${request.region.x.toFixed(3)}, y=${request.region.y.toFixed(3)}. ` : ''}A live agent would inspect the comparison crop before updating its assessment.`;
    } else if (/confidence|certain|sure|diagnos|cancer|malignan/i.test(request.question)) {
      answer = `There is no validated diagnostic confidence for ${location} in this preview. Local contrast selects an area to inspect; it does not measure the probability of disease.\n\nThe report should retain uncertainty until a pathology reader has reviewed the original-resolution crop and the relevant clinical context. The backend can supply evidence sufficiency separately from calibrated diagnostic confidence.`;
    } else if (request.deepResearch || /referen|criteria|research|source|search/i.test(request.question)) {
      answer = `For ${location}, a reference review would compare visible architecture, cellular detail, and tissue boundaries against the criteria relevant to the user's question. Each statement should remain linked to an inspected image region.\n\n${request.region ? `Keep “${request.region.title}” as the image anchor, then inspect a comparison region before drafting a conclusion. ` : ''}The two cards below demonstrate where retrieved criteria and differential-review evidence will appear. They are fictional fixtures, not Tavily search results.`;
    } else {
      answer = `I’m focusing on ${location}${request.region ? `, “${request.region.title}”` : ''}. ${request.region ? `This crop was selected from the uploaded image using local pixel contrast. ${request.region.observation}` : 'The initial survey measures image texture and selects distinct areas for closer inspection.'}\n\nThe next review would examine the arrangement of visible structures, check the image quality, and compare nearby tissue. Select Deep research to see how reference retrieval will support that review. This response is a scripted interaction preview; it is not a model interpretation of the crop.`;
    }
    const sources: ResearchSource[] = request.deepResearch ? [
      { id: `${request.requestId}-criteria`, title: 'Example reference · morphology criteria', excerpt: 'Placeholder for a retrieved passage describing the criteria relevant to this question. No article has been retrieved.', origin: 'mock' },
      { id: `${request.requestId}-comparison`, title: 'Example reference · comparison checklist', excerpt: 'Placeholder for evidence about alternative explanations and the additional observations needed to distinguish them.', origin: 'mock' },
    ] : [];
    for (const chunk of answer.match(/.{1,95}(?:\s|$)/gs) ?? [answer]) { await pause(Math.min(this.delay, 55), signal); yield { type: 'answer.delta', text: chunk }; }
    yield { type: 'answer.complete', answer, regionId: request.region?.regionId ?? null, sources, origin: 'mock' };
  }
}
export const agentClient: AgentClient = new MockAgentClient();
