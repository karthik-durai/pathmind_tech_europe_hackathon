"""Embed patches with PLIP on CPU/MPS and save normalized .npy features."""
import argparse
import os
import sys

import numpy as np
from PIL import Image

EXTS = (".jpg", ".jpeg", ".png")


def embed_slide(plip, slide_dir, out_dir, batch_size=16):
    os.makedirs(out_dir, exist_ok=True)
    names = [f for f in sorted(os.listdir(slide_dir)) if f.lower().endswith(EXTS)]
    todo = [f for f in names if not os.path.exists(os.path.join(out_dir, os.path.splitext(f)[0] + ".npy"))]
    saved = 0
    for i in range(0, len(todo), batch_size):
        batch = todo[i:i + batch_size]
        imgs = [Image.open(os.path.join(slide_dir, f)).convert("RGB") for f in batch]
        embs = np.asarray(plip.encode_images(imgs, batch_size=len(imgs)))
        embs = embs / np.linalg.norm(embs, ord=2, axis=-1, keepdims=True)
        for f, e in zip(batch, embs):
            np.save(os.path.join(out_dir, os.path.splitext(f)[0] + ".npy"), e)
            saved += 1
    return saved


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--plip_lib_path", required=True)
    ap.add_argument("--plip_ckpt", default="vinid/plip")
    ap.add_argument("--patches_root", required=True)
    ap.add_argument("--out_dir", required=True)
    ap.add_argument("--batch_size", type=int, default=16)
    a = ap.parse_args()
    sys.path.insert(0, a.plip_lib_path)
    from plip import PLIP
    plip = PLIP(a.plip_ckpt)
    for slide in sorted(os.listdir(a.patches_root)):
        sd = os.path.join(a.patches_root, slide)
        if os.path.isdir(sd):
            n = embed_slide(plip, sd, os.path.join(a.out_dir, slide), a.batch_size)
            print(f"{slide}: embedded {n} new patches")
