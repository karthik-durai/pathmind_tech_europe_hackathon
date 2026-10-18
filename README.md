# PathMind — pathology research workspace

This branch adds the interactive React frontend under `frontend/` alongside the existing Python PathAgent pipeline. The original backend files remain unchanged.

## Run the UI

Use Node.js 22.12+ (or a newer supported Node LTS release).

```bash
git checkout feat/pathmind-investigation-ui
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:4175. No API keys are needed for the frontend demo.

The sample image is synthetic. You can also open a local PNG, JPEG, or WebP image. A visible scan measures 48 tiles, selects coordinate-linked regions, and navigates to them. Hover a finding or image box to highlight it; click to open details and a contextual conversation in the right sidebar.

Deep research demonstrates a mocked Tavily workflow with explicitly fictional source cards. Responses can be added to the report while preserving their region and mock labels. These are interaction previews, not diagnostic findings or live model outputs.

## Connect the backend

- Start with [frontend/BACKEND_INTEGRATION.md](frontend/BACKEND_INTEGRATION.md): event types, normalized coordinates, upstream field mapping, cancellation, and case/region isolation.
- Replace the `agentClient` export in [frontend/src/lib/agentClient.ts](frontend/src/lib/agentClient.ts) with a streaming transport implementing the same interface.
- Follow [frontend/AGENTS.md](frontend/AGENTS.md) when continuing with a coding agent.
- The current Python batch entry point remains `pathagent.py`, with Nebius calls in `models/llm_client.py` and demo preparation in `scripts/`.

The existing backend has no browser upload/chat/SSE API yet. The integration document describes the proposed boundary; it does not claim these endpoints already exist. Provider keys belong on the server, never in React or Git.

## Verify the frontend

```bash
cd frontend
npm test
npm run build
```

Eight unit tests cover the fixture graph and mock follow-up transport, including source labels, region identity, streaming text, and cancellation. Browser checks covered scanning, image-specific regions, sidebar chat, hover links, report notes, and viewport-contained desktop controls.

See [frontend/README.md](frontend/README.md) for the interaction guide and synthetic-image provenance.
