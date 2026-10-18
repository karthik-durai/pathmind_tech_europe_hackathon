import { describe, expect, it, vi } from 'vitest';
import { MockAgentClient, regionContext, type FollowUpEvent, type FollowUpRequest } from './agentClient';

const request = (regionId = '17', deepResearch = false): FollowUpRequest => ({ caseId: 'case-A', requestId: 'request-A', question: 'What supports this finding?', region: { regionId, title: 'Primary detail region', observation: 'Local contrast 31/255.', x: .25, y: .5, width: .125, height: .1667 }, deepResearch, history: [] });
const collect = async (input: FollowUpRequest) => { const events: FollowUpEvent[] = []; for await (const e of new MockAgentClient(0).followUp(input, new AbortController().signal)) events.push(e); return events; };

describe('mock agent transport contract', () => {
  it('preserves the selected region and streams the exact completed answer', async () => {
    const events = await collect(request('39'));
    const final = events.at(-1);
    expect(final?.type).toBe('answer.complete');
    if (final?.type !== 'answer.complete') throw Error('Missing answer');
    expect(final.regionId).toBe('39'); expect(final.answer).toContain('region 39'); expect(final.origin).toBe('mock');
    expect(events.flatMap(e => e.type === 'answer.delta' ? [e.text] : []).join('')).toBe(final.answer);
    expect(final.sources).toEqual([]);
  });
  it('simulates Tavily with fictional sources and makes no network requests', async () => {
    const network = vi.spyOn(globalThis, 'fetch');
    try {
      const events = await collect(request('08', true));
      expect(events.some(e => e.type === 'research.stage' && e.stage.includes('Tavily'))).toBe(true);
      const final = events.at(-1); if (final?.type !== 'answer.complete') throw Error('Missing answer');
      expect(final.sources).toHaveLength(2); expect(final.sources.every(s => s.origin === 'mock' && !s.url)).toBe(true);
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); }
  });
  it('aborts research without issuing a completed answer', async () => {
    const controller = new AbortController(); const events: FollowUpEvent[] = [];
    await expect((async () => { for await (const event of new MockAgentClient(20).followUp(request('17', true), controller.signal)) { events.push(event); controller.abort(); } })()).rejects.toMatchObject({ name: 'AbortError' });
    expect(events.some(e => e.type === 'answer.complete')).toBe(false);
  });
  it('keeps a whole-slide request separate from a region request', async () => {
    const events = await collect({ ...request(), region: null }); const final = events.at(-1);
    if (final?.type !== 'answer.complete') throw Error('Missing answer');
    expect(final.regionId).toBeNull(); expect(final.answer).toContain('slide overview');
    expect(regionContext(undefined)).toBeNull();
  });
});
