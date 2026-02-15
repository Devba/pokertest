# Proyecto: Monte Carlo Cuantico Educativo (1 qubit)

Este proyecto te ensena, paso a paso, como funciona una medicion cuantica con simulacion Monte Carlo.

## Conceptos que cubre

- Estado base `|0>`
- Puerta Hadamard (`H`) para crear superposicion `|+>`
- Probabilidades de medicion a partir de amplitudes complejas
- Simulacion por `shots` (repeticiones)
- Convergencia estadistica al aumentar shots
- Ruido simple de medicion (error clasico)

## Requisitos

- Python 3.8+ (no usa librerias externas)

## Ejecutar

```bash
cd qubit-montecarlo-educativo
python3 simulador_qubit.py
```

## Que veras al ejecutar

1. Estado inicial del qubit.
2. Aplicacion de la puerta `H`.
3. Probabilidades teoricas (`P(0)` y `P(1)`).
4. Experimentos Monte Carlo con distintos shots.
5. Caso `|+>` con y sin ruido.
6. Caso sesgado (`P(0)=0.8`) con ruido para ver el efecto mas claramente.

## Interpretacion rapida

- En ideal, para `|+>`, deberias acercarte a 50/50 entre `0` y `1`.
- Con pocos shots, hay variacion grande.
- Con muchos shots, se acerca a la teoria.
- En `|+>`, un ruido simetrico de flip no cambia el promedio 50/50.
- En estados sesgados, el ruido si mueve las frecuencias respecto al ideal.
