# Backend integration contract — PathMind

Status: frontend mock integration seam, not an existing deployed API. The shared PathAgent repository currently exposes a batch CLI, not upload/chat/SSE endpoints. This document proposes the minimum transport needed to connect the UI without redesigning the experience.

## Current demo behavior

1. An image opens locally. A 48-tile browser pixel survey runs with visible progress.
2. Three distinct image regions are selected using local contrast. This is not PLIP or a diagnostic model.
3. Hovering a finding highlights its image box. Selecting either opens the same region in the right sidebar and focuses the camera.
4. The sidebar shows the original-pixel crop, measurements, and a conversation for that region.
5. The composer shows the attached region. Each region retains its own thread.
6. Deep research runs simulated stages, then returns explicitly fictional source cards. It never calls Tavily or a model.
7. A completed answer can be added to the report. Region, question, source origin, and mock status are retained in the download.
8. Uploading another image resets all old regions, threads, pending work, and report notes.

## Replace one transport

`src/lib/agentClient.ts` exports `agentClient: AgentClient`. Its current implementation is `MockAgentClient`. `FindingChat` consumes the interface rather than a provider-specific API.

```ts
interface AgentClient {
  followUp(request: FollowUpRequest, signal: AbortSignal): AsyncIterable<FollowUpEvent>;
}
```

A future live client can POST the request to a backend and parse its SSE or NDJSON events. The backend owns credentials, model calls, Tavily, timeouts, and result validation. No endpoint has been fabricated in the current implementation.

Example request:

```json
{
  "caseId": "PM-A1B2C3",
  "requestId": "unique-per-question",
  "question": "What else could explain this finding?",
  "region": {
    "regionId": "17",
    "title": "Primary detail region",
    "observation": "Image-specific evidence summary",
    "x": 0.64,
    "y": 0.38,
    "width": 0.125,
    "height": 0.166667
  },
  "deepResearch": true,
  "history": [
    {"role": "user", "text": "What supports this finding?"},
    {"role": "assistant", "text": "Previous answer for this same region"}
  ]
}
```

`region: null` means the whole-slide conversation. IDs are opaque strings; never derive clinical identity from the filename. The live backend must check that the region belongs to the case and read the stored original crop, rather than trusting a browser observation or accepting an arbitrary crop path.

## Follow-up event stream

```json
{"type":"research.stage","stage":"Searching reference criteria","query":"the actual search query","origin":"live"}
{"type":"answer.delta","text":"A short portion of the answer"}
{"type":"answer.complete","answer":"The complete answer","regionId":"17","sources":[{"id":"source-1","title":"Actual retrieved title","excerpt":"A supported passage or summary","url":"https://actual-source.example/article","origin":"live"}],"origin":"live"}
```

Every stream belongs to its captured request; do not apply it to whatever region happens to be selected later. `answer.complete.regionId` must equal the request's region ID, including null for overview. Return only sources actually retrieved. Keep web evidence separate from image observations; a reference cannot establish that a feature is present in this patient's image. Do not stream hidden chain of thought; stream actions, tool status, concise evidence, and final answers.

AbortSignal must cancel the network stream. On error, fail visibly and allow retry; do not silently fall back to a mock answer. After replacing the provider, move the current hard-coded MOCK badges to the response's verified origin field. Retain explicit demo mode for offline presentations.

## Scan and report events to add

For a production adapter, upload the original once, obtain a backend case ID, then subscribe to scoped events:

| Backend event | Frontend behavior | Existing PathAgent mapping |
| --- | --- | --- |
| `scan.progress` with completed/total | Update sweep and tile counter | Patch preparation and cached feature loading |
| `region.discovered` with geometry and thumbnail URL | Add image box and evidence card | Selected patch filenames and coordinates |
| `region.focus` with region ID | Pan and zoom when Follow agent is enabled | `patches_to_evaluate_names`, `selected_zoom_patch` |
| `finding.updated` with concise observation, evidence sufficiency, origin | Update sidebar finding details | `evaluation_result`, patch descriptions |
| `report.ready` with findings, limitations, evidence region IDs | Enable final report | `pred_answer`, `explanation`, `process` |
| `run.failed` with a user-safe error | Stop progress and offer retry | Exception/failure handling |

These scan event names are proposed, not implemented network endpoints. The current browser survey would be replaced by the live event adapter once available.

The original CLI stores only a final process summary in some branches. Emit events before and after actual operations if a true live trace is needed; replaying final JSON alone is not live processing.

## Coordinate and image contract

- Geometry is normalized to the original decoded, correctly oriented image. Centers `x,y` and sizes `width,height` are all in [0,1].
- Convert original pixel top-left rectangles `(left, top, w, h)` using `x=(left+w/2)/imageWidth`, `y=(top+h/2)/imageHeight`, `width=w/imageWidth`, `height=h/imageHeight`.
- Map crop coordinates back to slide coordinates, accounting for pyramid downsample factors. Existing crop-splitting logic does not itself provide true higher-resolution WSI extraction.
- Keep image dimensions and thumbnail provenance with the case. Serve higher-resolution tiles for WSI zoom; a numeric magnification label alone is insufficient.
- A local contrast score is not tissue classification, evidence sufficiency, or diagnostic confidence. Supply these separately and label their validation status.

## Verification already performed

Build and eight unit tests pass. Browser checks cover local scan progress, image-specific region coordinates, source-resolution zoom cap, hover correspondence, region threads, mock research source cards, stopping responses, adding report notes, and primary controls fitting a 1280×720 desktop without page scrolling. Re-run browser checks after swapping the transport.
