#!/usr/bin/env python3
"""Derive shipped report figures from a source folder into public/report-images/.

design/ is gitignored (Netlify never sees it), so the small, optimized webp files under
public/ are the only copies that ship — this script is a manual regeneration step to run
whenever an original changes, not part of `npm run build`. Pass a source folder as the
first argument to process a handover delivery directly.

Ships webp only, no jpg/png fallback: package.json's browserslist targets ">0.2%, not
dead", and every such browser has supported webp for years (Safari since 14.1, 2021), so
a fallback format would be dead weight. It also isn't a free addition — re-encoding these
map/photo figures losslessly as PNG after a resize actually *grows* the file (resizing
smooths hard map edges into thousands of new antialiased colours, defeating PNG's
flat-region compression), and adding a second lossy format alongside webp roughly doubles
the shipped footprint for a format modern browsers never fetch.

Caps the *width* at 2400px — 1220px is report.image's CSS max-width (ReportPage.css), so
2400px covers a 2x retina display with no loss of sharpness. Width, not the long edge: the
figures that scale down are laid out to the column's width whatever their aspect, and the
3-4 Sept delivery added two portrait table plates (1.5 and 2.1) where a long-edge cap
would have constrained the height and left the dense table text at ~2000px wide, under 2x.
Every landscape asset is 16:9, so this changes none of their output dimensions.

Requires the `cwebp` CLI and Pillow (used to avoid upscaling source images).
"""
import sys
from pathlib import Path

import subprocess

from PIL import Image

SRC_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("design/report_images")
OUT_DIR = Path("public/report-images")
MAX_WIDTH = 2400
WEBP_QUALITY = "82"

# Final delivery filenames map to the 25 October report's figure numbers and animation
# states. The Waypoints-02..09 series is the per-aircraft gallery at Figure 2.5.
RENAMES = {
    "00_Diagram.png": "Figure_1.0_diagram.png",
    "Figure1.1_Map_1.png": "Figure_1.1_Map_1.png",
    "Figure1.1_Map_2.png": "Figure_1.1_Map_2.png",
    "Figure1.2_Map_1.png": "Figure_1.2_Map_1.png",
    "Figure1.2_Map_2.png": "Figure_1.2_Map_2.png",
    "Figure1.2_Map_3.png": "Figure_1.2_Map_3.png",
    "Figure1.3_Map_1.png": "Figure_1.3_Map_1.png",
    "Figure1.3_Map_2.png": "Figure_1.3_Map_2.png",
    "Figure1.3_Map_3.png": "Figure_1.3_Map_3.png",
    "Figure1.4_Assets_NEW.png": "Figure_1.4.png",
    **{f"Figure1.5_{n}.png": f"Figure_1.5-{n}.png" for n in range(1, 5)},
    "Figure2.1_Contracts.png": "Figure_2.1.png",
    "Figure2.2_Aircraft.png": "Figure_2.2.png",
    "Figure2.3_FlightHours.png": "Figure_2.3.png",
    "Figure2.3_Waypoints_all.jpg": "Figure_2.4.png",
    **{
        f"Figure2.4_Waypoints-{n + 1:02d}.png": f"Figure_2.5-{n}.png"
        for n in range(1, 9)
    },
    "Figure2.5_Interceptions.png": "Figure_2.6.png",
}


def process(src_path, out_stem):
    out_path = OUT_DIR / f"{out_stem}.webp"
    with Image.open(src_path) as image:
        resize = ["-resize", str(MAX_WIDTH), "0"] if image.width > MAX_WIDTH else []
    subprocess.run([
        "cwebp", "-quiet", *resize,
        "-q", WEBP_QUALITY, "-metadata", "none",
        str(src_path), "-o", str(out_path),
    ], check=True)
    return out_path


def main():
    if not SRC_DIR.is_dir():
        sys.exit(f"{SRC_DIR} not found (it's gitignored — copy the originals in locally first)")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    total_in = total_out = 0
    for src_path in sorted(SRC_DIR.iterdir()):
        if not src_path.is_file() or src_path.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        out_name = RENAMES.get(src_path.name)
        if out_name is None:
            sys.exit(f"No figure mapping for {src_path.name}")
        out_path = process(src_path, Path(out_name).stem)
        in_size = src_path.stat().st_size
        out_size = out_path.stat().st_size
        total_in += in_size
        total_out += out_size
        print(f"{src_path.name} -> {out_path.name}  ({in_size/1e6:.2f}MB -> {out_size/1e6:.2f}MB)")

    print(f"\ntotal: {total_in/1e6:.1f}MB -> {total_out/1e6:.1f}MB")


if __name__ == "__main__":
    main()
