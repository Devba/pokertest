#!/usr/bin/env python3
"""
Genera una grafica SVG para comparar P(0) estimada en distintos escenarios:
- Ideal |+>
- |+> con ruido simetrico
- Estado sesgado (P0=0.8) con ruido
"""

from __future__ import annotations

import random
from typing import Dict, List, Tuple

from simulador_qubit import (
    estado_cero,
    estado_sesgado,
    puerta_hadamard,
    aplicar_puerta,
    probabilidades_medicion,
    muestrear_mediciones,
)


def p0_observada(conteo: Dict[str, int], shots: int) -> float:
    return conteo["0"] / shots if shots else 0.0


def ejecutar_experimentos(shots_list: List[int], ruido: float) -> Dict[str, List[float]]:
    random.seed(42)

    # Estado |+> generado desde |0> aplicando H.
    psi_plus = aplicar_puerta(puerta_hadamard(), estado_cero())
    p0_plus, _ = probabilidades_medicion(psi_plus)

    # Estado sesgado con P(0)=0.8.
    psi_bias = estado_sesgado(0.8)
    p0_bias, _ = probabilidades_medicion(psi_bias)

    serie_ideal: List[float] = []
    serie_plus_ruido: List[float] = []
    serie_bias_ruido: List[float] = []

    for shots in shots_list:
        c_ideal = muestrear_mediciones(shots, p0_plus, ruido=0.0)
        c_plus_ruido = muestrear_mediciones(shots, p0_plus, ruido=ruido)
        c_bias_ruido = muestrear_mediciones(shots, p0_bias, ruido=ruido)

        serie_ideal.append(p0_observada(c_ideal, shots))
        serie_plus_ruido.append(p0_observada(c_plus_ruido, shots))
        serie_bias_ruido.append(p0_observada(c_bias_ruido, shots))

    return {
        "ideal_plus": serie_ideal,
        "plus_ruido": serie_plus_ruido,
        "bias_ruido": serie_bias_ruido,
    }


def to_svg(shots: List[int], data: Dict[str, List[float]], output_path: str) -> None:
    width, height = 980, 560
    ml, mr, mt, mb = 90, 40, 70, 80
    plot_w = width - ml - mr
    plot_h = height - mt - mb

    def x(i: int) -> float:
        if len(shots) == 1:
            return ml + plot_w / 2
        return ml + i * (plot_w / (len(shots) - 1))

    def y(v: float) -> float:
        # Escala fija [0,1]
        return mt + (1.0 - v) * plot_h

    grid_lines = []
    for t in [0.0, 0.25, 0.5, 0.75, 1.0]:
        yy = y(t)
        grid_lines.append(
            f'<line x1="{ml}" y1="{yy:.2f}" x2="{ml + plot_w}" y2="{yy:.2f}" '
            'stroke="#d8dee9" stroke-width="1" />'
        )

    x_ticks = []
    for i, s in enumerate(shots):
        xx = x(i)
        x_ticks.append(
            f'<line x1="{xx:.2f}" y1="{mt + plot_h}" x2="{xx:.2f}" y2="{mt + plot_h + 6}" '
            'stroke="#2e3440" stroke-width="1.2" />'
        )
        x_ticks.append(
            f'<text x="{xx:.2f}" y="{mt + plot_h + 24}" text-anchor="middle" '
            'font-size="14" fill="#2e3440">{s}</text>'
        )

    y_ticks = []
    for t in [0.0, 0.25, 0.5, 0.75, 1.0]:
        yy = y(t)
        y_ticks.append(
            f'<line x1="{ml - 6}" y1="{yy:.2f}" x2="{ml}" y2="{yy:.2f}" stroke="#2e3440" stroke-width="1.2" />'
        )
        y_ticks.append(
            f'<text x="{ml - 12}" y="{yy + 5:.2f}" text-anchor="end" font-size="13" fill="#2e3440">{t:.2f}</text>'
        )

    series_style: List[Tuple[str, str, str]] = [
        ("ideal_plus", "#2a9d8f", "Ideal |+>"),
        ("plus_ruido", "#e76f51", "|+> con ruido 8%"),
        ("bias_ruido", "#264653", "Sesgado P(0)=0.8 con ruido 8%"),
    ]

    paths = []
    dots = []
    legend = []

    lx, ly = ml + 10, 24
    for idx, (key, color, label) in enumerate(series_style):
        points = [(x(i), y(v)) for i, v in enumerate(data[key])]
        path_d = " ".join(
            [f"M {points[0][0]:.2f} {points[0][1]:.2f}"]
            + [f"L {px:.2f} {py:.2f}" for px, py in points[1:]]
        )
        paths.append(f'<path d="{path_d}" fill="none" stroke="{color}" stroke-width="3" />')

        for px, py in points:
            dots.append(f'<circle cx="{px:.2f}" cy="{py:.2f}" r="4.5" fill="{color}" />')

        yy = ly + idx * 24
        legend.append(
            f'<line x1="{lx}" y1="{yy}" x2="{lx + 28}" y2="{yy}" stroke="{color}" stroke-width="4" />'
        )
        legend.append(
            f'<text x="{lx + 36}" y="{yy + 5}" font-size="14" fill="#2e3440">{label}</text>'
        )

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <rect width="100%" height="100%" fill="#f8fbff" />
  <text x="{width/2:.1f}" y="36" text-anchor="middle" font-size="24" font-weight="700" fill="#1b263b">
    Monte Carlo Cuantico - Evolucion de P(0) observada
  </text>
  <text x="{width/2:.1f}" y="58" text-anchor="middle" font-size="14" fill="#3d5a80">
    Comparacion por numero de shots (mismo seed para reproducibilidad)
  </text>

  {''.join(grid_lines)}

  <line x1="{ml}" y1="{mt}" x2="{ml}" y2="{mt + plot_h}" stroke="#2e3440" stroke-width="1.5" />
  <line x1="{ml}" y1="{mt + plot_h}" x2="{ml + plot_w}" y2="{mt + plot_h}" stroke="#2e3440" stroke-width="1.5" />

  {''.join(x_ticks)}
  {''.join(y_ticks)}

  <text x="{ml + plot_w/2:.2f}" y="{height - 24}" text-anchor="middle" font-size="16" fill="#2e3440">Shots</text>
  <text x="22" y="{mt + plot_h/2:.2f}" text-anchor="middle" font-size="16" fill="#2e3440"
        transform="rotate(-90, 22, {mt + plot_h/2:.2f})">P(0) observada</text>

  {''.join(paths)}
  {''.join(dots)}
  {''.join(legend)}
</svg>
"""

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(svg)


def main() -> None:
    shots = [10, 100, 1000, 10000]
    ruido = 0.08
    data = ejecutar_experimentos(shots, ruido)
    output = "qubit-montecarlo-educativo/resultados_montecarlo.svg"
    to_svg(shots, data, output)
    print(f"Grafica generada en: {output}")


if __name__ == "__main__":
    main()
