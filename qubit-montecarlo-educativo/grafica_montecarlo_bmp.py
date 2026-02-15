#!/usr/bin/env python3
from __future__ import annotations

import struct
import zlib
from typing import Dict, List, Tuple

from grafica_montecarlo import ejecutar_experimentos


Color = Tuple[int, int, int]


def make_canvas(w: int, h: int, bg: Color) -> List[List[Color]]:
    return [[bg for _ in range(w)] for _ in range(h)]


def put_px(img: List[List[Color]], x: int, y: int, c: Color) -> None:
    h = len(img)
    w = len(img[0]) if h else 0
    if 0 <= x < w and 0 <= y < h:
        img[y][x] = c


def line(img: List[List[Color]], x0: int, y0: int, x1: int, y1: int, c: Color, thick: int = 1) -> None:
    dx = abs(x1 - x0)
    sx = 1 if x0 < x1 else -1
    dy = -abs(y1 - y0)
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    while True:
        for ox in range(-thick // 2, thick // 2 + 1):
            for oy in range(-thick // 2, thick // 2 + 1):
                put_px(img, x0 + ox, y0 + oy, c)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def circle(img: List[List[Color]], cx: int, cy: int, r: int, c: Color) -> None:
    x, y, d = r, 0, 1 - r
    while x >= y:
        for px, py in [
            (cx + x, cy + y), (cx + y, cy + x), (cx - y, cy + x), (cx - x, cy + y),
            (cx - x, cy - y), (cx - y, cy - x), (cx + y, cy - x), (cx + x, cy - y),
        ]:
            put_px(img, px, py, c)
        y += 1
        if d < 0:
            d += 2 * y + 1
        else:
            x -= 1
            d += 2 * (y - x) + 1


def write_bmp(path: str, img: List[List[Color]]) -> None:
    h = len(img)
    w = len(img[0]) if h else 0
    row_pad = (4 - (w * 3) % 4) % 4
    pixel_data_size = (w * 3 + row_pad) * h
    file_size = 14 + 40 + pixel_data_size

    with open(path, "wb") as f:
        f.write(b"BM")
        f.write(struct.pack("<IHHI", file_size, 0, 0, 54))
        f.write(struct.pack("<IIIHHIIIIII", 40, w, h, 1, 24, 0, pixel_data_size, 2835, 2835, 0, 0))

        # BMP guarda filas de abajo hacia arriba y en orden BGR.
        for y in range(h - 1, -1, -1):
            for x in range(w):
                r, g, b = img[y][x]
                f.write(bytes((b, g, r)))
            if row_pad:
                f.write(b"\x00" * row_pad)


def png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)


def write_png(path: str, img: List[List[Color]]) -> None:
    h = len(img)
    w = len(img[0]) if h else 0

    raw = bytearray()
    for y in range(h):
        raw.append(0)  # filtro None por fila
        for x in range(w):
            r, g, b = img[y][x]
            raw.extend((r, g, b))

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)  # RGB, 8-bit
    idat = zlib.compress(bytes(raw), level=9)

    png = bytearray()
    png.extend(b"\x89PNG\r\n\x1a\n")
    png.extend(png_chunk(b"IHDR", ihdr))
    png.extend(png_chunk(b"IDAT", idat))
    png.extend(png_chunk(b"IEND", b""))

    with open(path, "wb") as f:
        f.write(png)


def main() -> None:
    shots = [10, 100, 1000, 10000]
    data = ejecutar_experimentos(shots, ruido=0.08)

    w, h = 960, 540
    img = make_canvas(w, h, (248, 251, 255))

    ml, mr, mt, mb = 90, 50, 50, 80
    pw, ph = w - ml - mr, h - mt - mb

    axis = (46, 52, 64)
    grid = (215, 222, 232)
    colors: Dict[str, Color] = {
        "ideal_plus": (42, 157, 143),
        "plus_ruido": (231, 111, 81),
        "bias_ruido": (38, 70, 83),
    }

    def px_x(i: int) -> int:
        if len(shots) == 1:
            return ml + pw // 2
        return int(round(ml + i * (pw / (len(shots) - 1))))

    def px_y(v: float) -> int:
        return int(round(mt + (1.0 - v) * ph))

    for t in [0.0, 0.25, 0.5, 0.75, 1.0]:
        yy = px_y(t)
        line(img, ml, yy, ml + pw, yy, grid, thick=1)

    line(img, ml, mt, ml, mt + ph, axis, thick=2)
    line(img, ml, mt + ph, ml + pw, mt + ph, axis, thick=2)

    for key, values in data.items():
        pts = [(px_x(i), px_y(v)) for i, v in enumerate(values)]
        for i in range(len(pts) - 1):
            line(img, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], colors[key], thick=3)
        for x, y in pts:
            circle(img, x, y, 4, colors[key])

    out = "qubit-montecarlo-educativo/resultados_montecarlo.bmp"
    write_bmp(out, img)
    out_png = "qubit-montecarlo-educativo/resultados_montecarlo.png"
    write_png(out_png, img)
    print(f"Grafica BMP generada en: {out}")
    print(f"Grafica PNG generada en: {out_png}")


if __name__ == "__main__":
    main()
