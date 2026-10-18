"""Describe every patch with the Token Factory VLM (replaces the Quilt-LLaVA step)."""
import argparse
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from PIL import Image

SYSTEM = (
    "You are an expert pathology assistant. Describe only what is visible in the H&E image patch: "
    "tissue architecture, cell types, nuclear morphology, staining, and any notable features. "
    "Be factual, 2-4 sentences. Do not give a diagnosis."
)
PROMPT = "Describe the histological features visible in this patch."
EXTS = (".jpg", ".jpeg", ".png")


def _describe_one(llm, path):
    """Return (text, error). Empty replies count as failures so they are retried on the next run."""
    name = os.path.basename(path)
    try:
        text = llm.vision(Image.open(path).convert("RGB"), PROMPT, system=SYSTEM, max_tokens=512)
    except Exception as exc:
        return None, f"{name}: {exc}"
    if not text or not text.strip():
        return None, f"{name}: empty reply from the vision model"
    return text, None


def _save(results, out_json):
    tmp = out_json + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    os.replace(tmp, out_json)  # atomic: a crash never leaves a truncated file


def describe_patches(llm, patches_root, out_json, workers=4, failures=None):
    """Describe every patch; finished work is saved after each slide and failures are collected, not fatal."""
    failures = failures if failures is not None else []
    results = {}
    if os.path.exists(out_json):
        try:
            results = json.load(open(out_json, encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"{out_json} is corrupt ({exc}). Fix or delete it explicitly; refusing to overwrite earlier work."
            ) from exc
    os.makedirs(os.path.dirname(os.path.abspath(out_json)), exist_ok=True)

    for slide in sorted(os.listdir(patches_root)):
        slide_dir = os.path.join(patches_root, slide)
        if not os.path.isdir(slide_dir):
            continue
        done = results.setdefault(slide, {})
        todo = [f for f in sorted(os.listdir(slide_dir)) if f.lower().endswith(EXTS) and not done.get(f)]
        if todo:
            with ThreadPoolExecutor(max_workers=workers) as pool:
                outcomes = list(pool.map(lambda f: _describe_one(llm, os.path.join(slide_dir, f)), todo))
            for fname, (text, err) in zip(todo, outcomes):
                if err:
                    failures.append(f"{slide}/{err}")
                else:
                    done[fname] = text
            _save(results, out_json)
        print(f"{slide}: {len(done)} patches described")
    _save(results, out_json)
    return results


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--patches_root", required=True)
    ap.add_argument("--out_json", required=True)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--vlm_model", default=None)
    a = ap.parse_args()
    from models.llm_client import LLMClient
    failed = []
    describe_patches(LLMClient(vlm_model=a.vlm_model), a.patches_root, a.out_json, a.workers, failures=failed)
    if failed:
        print(f"\n{len(failed)} patch(es) failed and were not saved; re-run to retry them:")
        for line in failed:
            print("  -", line)
        sys.exit(1)
