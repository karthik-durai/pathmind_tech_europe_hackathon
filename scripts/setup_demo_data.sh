#!/usr/bin/env bash
# Fetch the two things the demo needs: the PLIP library and the public Kather 2016 tiles (CC BY 4.0, ~246 MiB).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data third_party

if [ ! -f third_party/plip/plip.py ]; then
  mkdir -p third_party/plip
  curl -fsSL https://github.com/PathologyFoundation/plip/archive/refs/heads/main.tar.gz |
    tar -xz --strip-components=1 -C third_party/plip
fi

TILES=data/Kather_texture_2016_image_tiles_5000
if [ ! -d "$TILES" ]; then
  curl -fsSL -o data/kather_tiles.zip \
    "https://zenodo.org/api/records/53169/files/Kather_texture_2016_image_tiles_5000.zip/content"
  unzip -q data/kather_tiles.zip -d data
  rm data/kather_tiles.zip
fi
echo "Ready: $(find "$TILES" -name '*.tif' | wc -l | tr -d ' ') tiles in $TILES, PLIP in third_party/plip"
