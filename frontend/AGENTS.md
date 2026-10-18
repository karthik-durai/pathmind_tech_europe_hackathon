# PathMind UI handoff

Read `BACKEND_INTEGRATION.md` before integrating a backend. The UI currently uses real browser-side pixel measurements for region navigation and a deliberately mocked follow-up/research client.

- Keep mock mode visible in research stages, source cards, chat, and exported notes. Never rename mock data to live data merely because a key or endpoint is present.
- `src/lib/agentClient.ts` defines the typed follow-up request and streamed response contract. Replace the `agentClient` export with a transport implementing `AgentClient` when the backend is ready. UI components must not contain provider keys or call Tavily directly.
- A question is scoped by `caseId`, `requestId`, and `region.regionId`. Preserve that scope through streamed updates, sources, and report notes. Reject a response for a different region. Abort old requests on case change and context switch.
- Chat and details belong in the right sidebar. Do not reintroduce floating chat/inspection dialogs over the tissue image.
- Region geometry uses normalized original-image coordinates. `x,y` are the center, and `width,height` are the region size. The viewer preserves image aspect ratio.
- Keep primary controls and the composer inside the desktop viewport. Scroll long content within panels. Preserve the mobile layout and reduced-motion support.
- Native image detail is limited by source pixels. Higher magnification requires real higher-resolution WSI tiles, not artificial upscaling.
- Run `npm run build` and `npm test`. Test hover correspondence, region chat isolation, cancellation, a new upload clearing state, report note export, and a 1280×720 viewport.

The shared upstream was inspected at `83a87c7` on main. Its PathAgent CLI has not been changed or published by this UI work.
