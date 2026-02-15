#!/usr/bin/env python3
"""
Simulador educativo de un qubit con enfoque Monte Carlo.

Modelo:
- Estado inicial |0>
- Aplicamos puerta Hadamard H -> estado |+>
- Medimos muchas veces (shots) para observar frecuencias
- Opcional: ruido de medicion (probabilidad de voltear el bit)
"""

from __future__ import annotations

import math
import random
from typing import Dict, List, Tuple


Vector = List[complex]
Matriz = List[List[complex]]


def estado_cero() -> Vector:
    """Retorna el vector de estado |0>."""
    return [1 + 0j, 0 + 0j]


def estado_sesgado(p0: float) -> Vector:
    """
    Construye un estado puro sin fase:
    |psi> = sqrt(p0)|0> + sqrt(1-p0)|1>
    """
    if not (0.0 <= p0 <= 1.0):
        raise ValueError("p0 debe estar entre 0 y 1.")
    return [math.sqrt(p0) + 0j, math.sqrt(1.0 - p0) + 0j]


def puerta_hadamard() -> Matriz:
    """Matriz H = (1/sqrt(2)) * [[1, 1], [1, -1]]."""
    inv_sqrt2 = 1 / math.sqrt(2)
    return [
        [inv_sqrt2, inv_sqrt2],
        [inv_sqrt2, -inv_sqrt2],
    ]


def aplicar_puerta(matriz: Matriz, estado: Vector) -> Vector:
    """Multiplicacion matriz-vector para 1 qubit."""
    return [
        matriz[0][0] * estado[0] + matriz[0][1] * estado[1],
        matriz[1][0] * estado[0] + matriz[1][1] * estado[1],
    ]


def probabilidades_medicion(estado: Vector) -> Tuple[float, float]:
    """Convierte amplitudes en probabilidades con |a|^2."""
    p0 = abs(estado[0]) ** 2
    p1 = abs(estado[1]) ** 2
    total = p0 + p1
    if total == 0:
        raise ValueError("Estado invalido: probabilidad total cero.")
    return p0 / total, p1 / total


def muestrear_mediciones(shots: int, p0: float, ruido: float = 0.0) -> Dict[str, int]:
    """
    Simula mediciones:
    - Primero samplea resultado cuantico segun p0/p1
    - Luego aplica ruido clasico opcional (flip de bit)
    """
    if not (0.0 <= ruido <= 1.0):
        raise ValueError("El ruido debe estar entre 0 y 1.")

    conteo = {"0": 0, "1": 0}
    for _ in range(shots):
        resultado = "0" if random.random() < p0 else "1"

        # Ruido simple: con cierta probabilidad, se invierte el bit medido.
        if random.random() < ruido:
            resultado = "1" if resultado == "0" else "0"

        conteo[resultado] += 1
    return conteo


def frecuencia(conteo: Dict[str, int], bit: str, shots: int) -> float:
    return conteo[bit] / shots if shots else 0.0


def imprimir_bloque_resultados(shots: int, conteo: Dict[str, int], p0_teoria: float, p1_teoria: float) -> None:
    f0 = frecuencia(conteo, "0", shots)
    f1 = frecuencia(conteo, "1", shots)
    err0 = abs(f0 - p0_teoria)
    err1 = abs(f1 - p1_teoria)

    print(f"\nShots = {shots}")
    print(f"  Conteo -> 0: {conteo['0']:>5} | 1: {conteo['1']:>5}")
    print(f"  Frec.  -> P(0)~{f0:.4f} | P(1)~{f1:.4f}")
    print(f"  Error  -> |dP0|={err0:.4f} | |dP1|={err1:.4f}")


def main() -> None:
    random.seed(42)

    print("=== Monte Carlo Cuantico Educativo: 1 qubit ===")
    print("\n[1] Estado inicial")
    psi = estado_cero()
    print(f"  |psi> = [{psi[0]}, {psi[1]}]  (esto representa |0>)")

    print("\n[2] Aplicamos puerta Hadamard H para crear superposicion")
    h = puerta_hadamard()
    psi = aplicar_puerta(h, psi)
    print(f"  |psi> despues de H = [{psi[0]:.4f}, {psi[1]:.4f}]")

    p0, p1 = probabilidades_medicion(psi)
    print("\n[3] Probabilidades teoricas de medicion")
    print(f"  P(0) teorica = {p0:.4f}")
    print(f"  P(1) teorica = {p1:.4f}")
    print("  Esperado para |+>: aproximadamente 0.5 y 0.5")

    shots_list = [10, 100, 1000, 10000]

    print("\n[4] Experimento A: escenario ideal (sin ruido)")
    for shots in shots_list:
        conteo = muestrear_mediciones(shots, p0, ruido=0.0)
        imprimir_bloque_resultados(shots, conteo, p0, p1)

    ruido = 0.08
    print(f"\n[5] Experimento B: |+> con ruido de medicion (flip={ruido:.0%})")
    for shots in shots_list:
        conteo = muestrear_mediciones(shots, p0, ruido=ruido)
        imprimir_bloque_resultados(shots, conteo, p0, p1)

    print("\n[6] Experimento C: estado sesgado + ruido (efecto mas visible)")
    psi_sesgado = estado_sesgado(0.8)
    p0_s, p1_s = probabilidades_medicion(psi_sesgado)
    print(f"  Estado sesgado teorico -> P(0)={p0_s:.4f}, P(1)={p1_s:.4f}")
    for shots in shots_list:
        conteo = muestrear_mediciones(shots, p0_s, ruido=ruido)
        imprimir_bloque_resultados(shots, conteo, p0_s, p1_s)

    print("\n[7] Conclusiones educativas")
    print("  - Medir un qubit produce resultados probabilisticos.")
    print("  - Con pocos shots hay variacion alta.")
    print("  - Al subir shots, la frecuencia converge a la probabilidad teorica.")
    print("  - En |+>, el ruido simetrico mantiene 50/50 en promedio.")
    print("  - En estados sesgados, el ruido si desplaza resultados.")


if __name__ == "__main__":
    main()
