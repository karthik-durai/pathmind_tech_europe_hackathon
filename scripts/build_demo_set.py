"""Turn the Kather 2016 labelled tiles into WSI-VQA-shaped demo slides.

Each slide mixes mostly one tissue class with tiles from the others; the question asks for the dominant tissue.
"""
import argparse
import json
import math
import os
import random
from glob import glob

from PIL import Image

CLASS_NAMES = {
    "01_TUMOR": "tumor epithelium",
    "02_STROMA": "simple stroma",
    "03_COMPLEX": "complex stroma",
    "04_LYMPHO": "immune cells (lymphocytes)",
    "05_DEBRIS": "debris",
    "06_MUCOSA": "normal mucosal glands",
    "07_ADIPOSE": "adipose tissue",
    "08_EMPTY": "background (empty)",
}
QUESTION = "What is the dominant tissue type in this slide?"
TILE = 150


def build_demo_set(src_dir, out_dir, seed=0, tiles_per_slide=24, n_dominant=16):
    rng = random.Random(seed)
    files = {c: sorted(glob(os.path.join(src_dir, c, "*.tif"))) for c in sorted(CLASS_NAMES)}
    patches_root = os.path.join(out_dir, "patches_output")
    os.makedirs(patches_root, exist_ok=True)

    slides, questions = [], []
    for n, cls in enumerate(sorted(CLASS_NAMES), start=1):
        slide_id = f"DEMO{n:04d}-DX1"  # 12 chars, contains DX1 (required by load_all_vqa_pairs)
        others = [f for c, fs in files.items() if c != cls for f in fs]
        tiles = rng.sample(files[cls], n_dominant) + rng.sample(others, tiles_per_slide - n_dominant)
        rng.shuffle(tiles)

        cols = math.ceil(math.sqrt(len(tiles)))
        slide_dir = os.path.join(patches_root, slide_id)
        os.makedirs(slide_dir, exist_ok=True)
        for idx, tile in enumerate(tiles):
            x, y = (idx % cols) * TILE, (idx // cols) * TILE
            Image.open(tile).convert("RGB").save(os.path.join(slide_dir, f"{x}_{y}.jpg"), quality=95)

        slides.append(slide_id)
        questions.append({
            "Id": slide_id[:12],
            "Question": QUESTION,
            "Choice": list(CLASS_NAMES.values()),
            "Answer": CLASS_NAMES[cls],
        })

    with open(os.path.join(out_dir, "questions.json"), "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=2)
    with open(os.path.join(out_dir, "slides.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(sorted(slides)) + "\n")
    return slides


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="Kather_texture_2016_image_tiles_5000 directory")
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=0)
    a = ap.parse_args()
    ids = build_demo_set(a.src, a.out, seed=a.seed)
    print(f"Built {len(ids)} demo slides in {a.out}")
