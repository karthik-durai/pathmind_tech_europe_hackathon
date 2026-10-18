export type SurveyRegion = { id: string; x: number; y: number; title: string; detail: string; zoom: number; thumbnail?: string; width?: number; height?: number };
export type Survey = { width: number; height: number; tiles: number; regions: SurveyRegion[]; lowDetail: boolean };

// Local pixel inspection only. This does not classify pathology or measure clinical confidence.
export async function surveyImage(src: string, signal: AbortSignal, progress: (count: number, total: number) => void): Promise<Survey> {
  const image = new Image(); image.src = src;
  await image.decode();
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = Math.max(192, Math.min(1024, Math.round(768 * image.naturalHeight / image.naturalWidth)));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Image inspection is unavailable in this browser.');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const cols = 8, rows = 6, total = cols * rows;
  const patches: { index: number; x: number; y: number; variance: number; brightness: number; thumbnail: string }[] = [];
  const thumb = document.createElement('canvas');
  thumb.width = Math.max(1, Math.min(1024, Math.round(image.naturalWidth / cols)));
  thumb.height = Math.max(1, Math.round(thumb.width * image.naturalHeight / rows / (image.naturalWidth / cols)));
  const thumbCtx = thumb.getContext('2d')!;
  for (let index = 0; index < total; index++) {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const col = index % cols, row = Math.floor(index / cols);
    const x = Math.floor(col * canvas.width / cols), y = Math.floor(row * canvas.height / rows);
    const w = Math.floor(canvas.width / cols), h = Math.floor(canvas.height / rows);
    const pixels = ctx.getImageData(x, y, w, h).data;
    let sum = 0, squared = 0;
    for (let p = 0; p < pixels.length; p += 4) {
      const luminance = .2126 * pixels[p] + .7152 * pixels[p + 1] + .0722 * pixels[p + 2];
      sum += luminance; squared += luminance * luminance;
    }
    const count = pixels.length / 4, brightness = sum / count;
    thumbCtx.drawImage(image, col * image.naturalWidth / cols, row * image.naturalHeight / rows, image.naturalWidth / cols, image.naturalHeight / rows, 0, 0, thumb.width, thumb.height);
    patches.push({ index, x: (col + .5) / cols, y: (row + .5) / rows, variance: Math.max(0, squared / count - brightness ** 2), brightness, thumbnail: thumb.toDataURL('image/png') });
    progress(index + 1, total);
    // Yield between real tile measurements so the browser paints the survey as it progresses.
    await new Promise(resolve => window.setTimeout(resolve, 95));
  }
  const ranked = [...patches].sort((a, b) => b.variance - a.variance);
  const selected: typeof patches = [];
  for (const patch of ranked) {
    if (selected.every(other => Math.hypot(other.x - patch.x, other.y - patch.y) > .24)) selected.push(patch);
    if (selected.length === 3) break;
  }
  const lowDetail = ranked[0].variance < 8;
  return { width: image.naturalWidth, height: image.naturalHeight, tiles: total, lowDetail, regions: selected.map((p, i) => ({
    id: String(p.index + 1).padStart(2, '0'), x: p.x, y: p.y, zoom: [2.7, 3.3, 3.8][i], width: 1 / cols, height: 1 / rows,
    title: p.variance < 8 ? `Low-detail region ${i + 1}` : ['Primary detail region', 'Comparison region', 'Additional detail region'][i],
    detail: `Pixel location (${Math.round(p.x * image.naturalWidth)}, ${Math.round(p.y * image.naturalHeight)}). Local contrast ${Math.sqrt(p.variance).toFixed(1)}/255. Selected by image texture; model interpretation pending.`,
    thumbnail: p.thumbnail,
  })) };
}
