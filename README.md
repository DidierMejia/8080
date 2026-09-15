# Intel 8080 + FPU-32 - Emulador y Ensamblador Web

Extensión académica del proyecto [Intel 8080 CPU Emulator & Assembler](https://github.com/alexeiiw/8080), creada para integrar conceptualmente un coprocesador de punto flotante al Intel 8080.

El proyecto conserva su naturaleza 100 % web: HTML5, CSS3 y JavaScript puro, sin frameworks ni dependencias de ejecución.

## Objetivo

Demostrar cómo un procesador Intel 8080, que no posee una unidad de punto flotante integrada, podría delegar cálculos a un coprocesador externo mediante las instrucciones `IN` y `OUT` y un conjunto definido de puertos de entrada/salida.

La FPU conceptual utiliza precisión simple IEEE-754 de 32 bits y admite:

- Suma
- Resta
- Multiplicación
- División
- Raíz cuadrada
- Detección de cero, negativo, desbordamiento, división por cero y operación inválida

## Arquitectura conceptual

```mermaid
flowchart LR
    ASM[Programa ensamblador] -->|IN / OUT| CPU[Intel 8080]
    CPU <-->|Bus de E/S de 8 bits| FPU[FPU-32 IEEE-754]
```

Como el acumulador `A` del 8080 es de 8 bits, cada operando flotante se transmite en cuatro operaciones de salida. Dos operandos requieren ocho bytes. El resultado se recupera también en cuatro lecturas.

## Mapa de puertos

| Puerto | Dirección | Función |
|---|---|---|
| Datos | `F0h` - salida | Recibe 4 bytes de X y 4 bytes de Y, en orden little-endian |
| Control | `F1h` - salida | Recibe el código de la operación |
| Estado | `F2h` - entrada | Devuelve las banderas de la FPU |
| Resultado | `F3h` - entrada | Entrega los 4 bytes del resultado, en orden little-endian |

### Códigos de operación

| Código | Operación |
|---|---|
| `01h` | Suma: X + Y |
| `02h` | Resta: X - Y |
| `03h` | Multiplicación: X × Y |
| `04h` | División: X ÷ Y |
| `05h` | Raíz cuadrada: √X |
| `06h` | Limpiar la FPU |

### Registro de estado

| Bit | Máscara | Bandera |
|---|---|---|
| 0 | `01h` | READY: resultado disponible |
| 1 | `02h` | ZERO: resultado igual a cero |
| 2 | `04h` | NEG: resultado negativo |
| 3 | `08h` | OVF: resultado infinito/desbordado |
| 4 | `10h` | DIV/0: división por cero |
| 5 | `20h` | INV: operación inválida o NaN |

## Demostración incluida

El editor carga un ejemplo que suma `1.5 + 2.25`:

1. `1.5` se representa como `3FC00000h`, transmitido `00 00 C0 3F`.
2. `2.25` se representa como `40100000h`, transmitido `00 00 10 40`.
3. El comando `01h` solicita la suma.
4. La FPU entrega `00 00 70 40`, que representa `3.75`.
5. Los bytes del resultado quedan además en los registros `B`, `C`, `D` y `E`.

## Interfaz gráfica

El sitio incluye:

- Editor y ensamblador Intel 8080.
- Ejecución continua y paso a paso.
- Registros, banderas, pila y mapa de memoria.
- Panel FPU con operandos, resultado y representación hexadecimal.
- Consola directa para probar todas las operaciones.
- Gráfica dinámica del historial de resultados.
- Diagrama visual del flujo CPU-coprocesador.

## Ejecutar localmente

Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Abrir `http://localhost:8000` en el navegador.

También se puede abrir `index.html` directamente, aunque se recomienda usar un servidor local.

## Pruebas

```bash
node test.js
```

Las pruebas cubren el emulador original, conversión IEEE-754, comunicación `IN`/`OUT`, suma completa y excepciones de la FPU.

## Publicar con GitHub Pages

1. Subir esta rama al fork personal.
2. Abrir **Settings > Pages**.
3. En **Build and deployment**, elegir **Deploy from a branch**.
4. Seleccionar la rama principal y la carpeta `/ (root)`.
5. Guardar y esperar a que GitHub muestre la URL publicada.

## Demostración en video

La guía lista para grabar se encuentra en [VIDEO_DEMO.md](VIDEO_DEMO.md).

## Créditos y alcance

- Proyecto base: [alexeiiw/8080](https://github.com/alexeiiw/8080).
- Extensión: integración conceptual FPU-32 para fines educativos.
- El Intel 8080 histórico no incorporaba una FPU ni trabajaba directamente con IEEE-754. La propuesta no pretende reproducir hardware histórico existente; modela una interfaz externa plausible utilizando la capacidad real de E/S aislada del procesador.
