#!/usr/bin/env bash
# One-command demo: build slides -> describe (VLM) -> embed (PLIP) -> run PathAgent -> score.
set -euo pipefail
: "${NEBIUS_API_KEY:?Export NEBIUS_API_KEY (Nebius Token Factory key) first}"
cd "$(dirname "$0")/.."
PY=${PY:-.venv/bin/python}
KATHER=${KATHER_DIR:-data/Kather_texture_2016_image_tiles_5000}
PLIP_LIB=${PLIP_LIB:-third_party/plip}
OUT=${OUT:-demo_run}

$PY scripts/build_demo_set.py --src "$KATHER" --out "$OUT"
$PY data_preparation_script/describe_patches_api.py --patches_root "$OUT/patches_output" --out_json "$OUT/desc/patches_descriptions.json"
$PY scripts/embed_patches.py --plip_lib_path "$PLIP_LIB" --plip_ckpt vinid/plip --patches_root "$OUT/patches_output" --out_dir "$OUT/img_features"
$PY pathagent.py \
  --plip_lib_path "$PLIP_LIB" --plip_ckpt vinid/plip \
  --descriptions_file "$OUT/desc/patches_descriptions.json" \
  --questions_file "$OUT/questions.json" \
  --feature_dir "$OUT/img_features" --patch_root "$OUT/patches_output" \
  --save_dir "$OUT/results" --dataset_name wsi_vqa ${MAX_CASES:+--max_cases "$MAX_CASES"} \
  || echo "WARNING: some cases failed (see above); scoring the completed ones. Re-run to retry the rest."
$PY scripts/score_demo.py --results_dir "$OUT/results"
