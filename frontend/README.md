# PathMind interactive dashboard

A local, non-clinical hackathon demo with a restrained clinical workspace. On first load and on image upload, a real browser-side pixel survey measures 48 tiles, selects three distinct regions by local contrast, navigates to their coordinates, and prepares an evidence-linked image survey report. A visible tile sweep and progress card show the first stage directly over the image.

## Try the interaction

- The image survey starts automatically. Its visible scan lasts about five seconds, then the camera visits the selected regions automatically.
- Use the stage markers to jump through the replay, or pause and inspect manually.
- Drag to pan, scroll or use +/- to zoom, and use the minimap to return to the overview.
- Select an evidence card to revisit its region. Follow agent restores automatic navigation.
- At completion, open Report, select a linked region, or download the image survey report as text.
- Open image accepts local PNG, JPEG, and WebP files up to 25 MB. Each upload runs its own pixel survey and replaces all previous regions. No image is sent to an external service.
- Zoom is capped at the source image's native resolution. The viewer preserves the original aspect ratio, and evidence thumbnails are cropped directly from the original decoded image.
- The microphone uses browser speech recognition when available. Text questions explain the demo's connection status; a live assistant backend is not connected. Browser speech recognition may use the browser vendor's service.

## Run

Requirements: Node.js 20+

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:4175>.

## Verify

```bash
npm test
npm run build
```

## Important limitations

- The tissue image is AI-generated synthetic artwork for the UI fixture; it is not patient data.
- The scan and local contrast measurements are real. The subsequent sequence demonstrates the PathAgent workflow, rather than running PLIP, Nemotron, Qwen, or a clinical classifier. The report contains pixel measurements and explicitly marks model interpretation as pending.
- Viewer zoom uses the existing raster image. It does not fetch higher-resolution whole-slide tiles or claim optical magnification.
- The original React Flow fixture utilities remain in src/lib and src/components as integration references. The visible workspace uses a compact activity feed.
- No diagnosis, medical advice, or autonomous sign-out is performed.
- A future live adapter should preserve these UI states while sourcing evidence from real, independently validated tools.

## Backend context

See [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) for the typed chat/research contract, proposed scan events, coordinate mapping, and upstream field mapping. [AGENTS.md](AGENTS.md) records integration instructions for the next coding session.

## Findings and follow-up demo

- Hover a region box or finding card to highlight its matching evidence.
- Click either to focus the camera and open the right sidebar, with no image-covering dialog.
- The sidebar contains finding details, a separate conversation per region, and an attached-region chip above the question box.
- Ask a suggested question or type a follow-up. Deep research simulates Tavily stages and returns explicitly fictional source fixtures.
- Add a useful response to the report, then download it with region context and mock labels preserved.
- The desktop workspace fits the viewport; long logs, conversations, and report text scroll inside their panels.

## Upstream status

The latest shared main was inspected at `83a87c7` from `karthik-durai/pathmind_tech_europe_hackathon`. That repository currently provides a batch CLI: PLIP patch retrieval, Qwen sufficiency decisions, additional patch selection, crop-based zoom, and final JSON answers. It does not yet expose a browser upload API or streaming progress events. The local UI's contrast selection is explicitly a preview substitute, not PLIP retrieval. Higher-resolution whole-slide tiles require a WSI reader/backend.

## Asset provenance

`public/assets/synthetic-colon-he.png` was generated for this project using OpenAI's built-in image generation tool. Prompt intent: a realistic-looking but fully synthetic, unlabeled H&E-style colon tissue field for a non-clinical dashboard placeholder.
