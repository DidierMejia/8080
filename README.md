# Intel 8080 + Coprocesador FPU-32

Proyecto académico desarrollado para el curso de Arquitectura de Computadoras II de la Universidad Mariano Gálvez de Guatemala.

Esta aplicación amplía un emulador del procesador Intel 8080 mediante la integración conceptual de un coprocesador de punto flotante FPU-32.

## Sitio web

La demostración interactiva del proyecto se encuentra disponible en:

[https://didiermejia.github.io/8080/](https://didiermejia.github.io/8080/)

## Descripción

El Intel 8080 es un procesador de 8 bits que no cuenta con una unidad de punto flotante integrada.

Este proyecto demuestra cómo el procesador podría delegar operaciones matemáticas con números decimales a un coprocesador externo mediante las instrucciones de entrada y salida `IN` y `OUT`.

La comunicación se realiza byte por byte utilizando puertos de entrada y salida, respetando la arquitectura de 8 bits del procesador.

## Características

- Emulador del procesador Intel 8080.
- Ensamblador integrado.
- Ejecución automática y paso a paso.
- Visualización de registros y banderas.
- Visualización de la pila.
- Mapa dinámico de memoria RAM.
- Coprocesador conceptual FPU-32.
- Representación IEEE-754 de precisión simple.
- Calculadora de punto flotante.
- Modo sencillo para usuarios generales.
- Modo técnico para observar la arquitectura.
- Gráfica dinámica de resultados.
- Detección de operaciones especiales y errores.

## Operaciones de la FPU

El coprocesador permite realizar:

- Suma.
- Resta.
- Multiplicación.
- División.
- Raíz cuadrada.

También identifica los siguientes estados:

- Resultado disponible.
- Resultado igual a cero.
- Resultado negativo.
- Desbordamiento.
- División entre cero.
- Operación inválida.

## Modos de uso

### Modo sencillo

Permite utilizar la FPU como una calculadora.

El usuario solamente debe:

1. Ingresar el operando X.
2. Seleccionar una operación.
3. Ingresar el operando Y.
4. Presionar **Calcular en FPU**.

El sistema muestra:

- Resultado decimal.
- Representación hexadecimal IEEE-754.
- Banderas de estado.
- Historial gráfico de operaciones.

### Modo técnico 8080

Permite observar la integración completa entre el procesador y el coprocesador.

Incluye:

- Editor de código ensamblador.
- Ejecución continua.
- Ejecución paso a paso.
- Registros del Intel 8080.
- Banderas del procesador.
- Memoria RAM.
- Pila.
- Puertos de entrada y salida.
- Diagrama de arquitectura.

## Arquitectura conceptual

El programa ensamblador es ejecutado por el Intel 8080. Cuando se necesita realizar una operación de punto flotante, el procesador envía los operandos y el comando correspondiente a la FPU.

```text
Programa ensamblador
          |
        IN / OUT
          |
     Intel 8080
          |
    Bus de E/S de 8 bits
          |
       FPU-32
```

El Intel 8080 conserva el control del programa, mientras que el coprocesador se encarga del cálculo especializado.

## Mapa de puertos

| Puerto | Dirección | Función |
|---|---|---|
| Datos | `F0h` | Recibe los bytes de los operandos |
| Control | `F1h` | Recibe el código de la operación |
| Estado | `F2h` | Devuelve las banderas de la FPU |
| Resultado | `F3h` | Devuelve los bytes del resultado |

## Códigos de operación

| Código | Operación |
|---|---|
| `01h` | Suma |
| `02h` | Resta |
| `03h` | Multiplicación |
| `04h` | División |
| `05h` | Raíz cuadrada |
| `06h` | Limpiar coprocesador |

## Ejemplo de funcionamiento

La demostración incluida realiza:

```text
1.5 + 2.25 = 3.75
```

Los operandos se representan en formato IEEE-754:

```text
1.5  = 00 00 C0 3F
2.25 = 00 00 10 40
```

El resultado obtenido es:

```text
3.75 = 00 00 70 40
```

Los cuatro bytes del resultado también son transferidos a los registros del Intel 8080:

```text
B = 00
C = 00
D = 70
E = 40
```

## Tecnologías utilizadas

- HTML5.
- CSS3.
- JavaScript.
- Ensamblador Intel 8080.
- Representación IEEE-754.
- Git y GitHub.
- GitHub Pages.

El proyecto no utiliza frameworks ni dependencias externas para funcionar.

## Ejecución local

El proyecto puede abrirse con la extensión Live Server de Visual Studio Code.

También puede ejecutarse con un servidor web local:

```bash
python -m http.server 8000
```

Después debe abrirse:

```text
http://localhost:8000
```

## Alcance conceptual

El Intel 8080 histórico no incorporaba una unidad de punto flotante ni ejecutaba directamente operaciones IEEE-754.

La FPU-32 incluida en este proyecto es una propuesta educativa que simula cómo un procesador de 8 bits podría comunicarse con hardware especializado mediante puertos de entrada y salida.

## Autor

**Didier Javier Mejía Anleu**

Estudiante de Ingeniería en Sistemas  
Universidad Mariano Gálvez de Guatemala

Enlace: https://didiermejia.github.io/8080/

## Créditos

Proyecto original:

[alexeiiw/8080](https://github.com/alexeiiw/8080)

Este repositorio corresponde a un fork académico que amplía el proyecto original con una interfaz renovada y un coprocesador conceptual de punto flotante.