const cpu = new Intel8080();
const assembler = new Assembler8080();
const fpu = new FloatingPointCoprocessor();

cpu.connectIO(
    port => fpu.readPort(port),
    (port, value) => fpu.writePort(port, value)
);

let runInterval = null;
let memoryStart = 0;

const DEMO_CODE = `; DEMOSTRACIÓN: 1.5 + 2.25 = 3.75
; Cada número usa 4 bytes IEEE-754 little-endian.

; Operando X = 1.5 = 3FC00000h
MVI A, 00H
OUT F0H
MVI A, 00H
OUT F0H
MVI A, C0H
OUT F0H
MVI A, 3FH
OUT F0H

; Operando Y = 2.25 = 40100000h
MVI A, 00H
OUT F0H
MVI A, 00H
OUT F0H
MVI A, 10H
OUT F0H
MVI A, 40H
OUT F0H

; Comando 01h = sumar
MVI A, 01H
OUT F1H

; Leer estado y guardarlo en memoria 2000h
IN F2H
STA 2000H

; Leer resultado: 00 00 70 40 = 3.75
IN F3H
MOV B, A
IN F3H
MOV C, A
IN F3H
MOV D, A
IN F3H
MOV E, A
HLT`;

function hex(value, size = 2) {
    return value
        .toString(16)
        .toUpperCase()
        .padStart(size, '0');
}

function formatFloat(value) {
    if (Number.isNaN(value)) {
        return 'NaN';
    }

    if (value === Infinity) {
        return '+∞';
    }

    if (value === -Infinity) {
        return '−∞';
    }

    if (Object.is(value, -0)) {
        return '−0';
    }

    return Number(value.toPrecision(8)).toString();
}

function updateUI() {
    const registers = ['a', 'b', 'c', 'd', 'e', 'h', 'l'];

    registers.forEach(register => {
        document.getElementById(`reg-${register}`).textContent =
            hex(cpu.registers[register]);
    });

    document.getElementById('reg-pc').textContent =
        hex(cpu.registers.pc, 4);

    document.getElementById('reg-sp').textContent =
        hex(cpu.registers.sp, 4);

    document.getElementById('reg-f').textContent =
        hex(cpu.getFlagByte());

    const cpuFlags = ['s', 'z', 'ac', 'p', 'cy'];

    cpuFlags.forEach(flag => {
        const element = document.getElementById(`flag-${flag}`);
        const active = cpu.flags[flag];

        element.textContent = active ? '1' : '0';
        element.parentElement.classList.toggle(
            'active-flag',
            active
        );
    });

    const status = document.getElementById('status-badge');

    if (cpu.halted) {
        status.textContent = 'Finalizado';
        status.className = 'status halted technical-only';
    } else if (runInterval) {
        status.textContent = 'Ejecutando';
        status.className = 'status running technical-only';
    } else {
        status.textContent = 'En espera';
        status.className = 'status idle technical-only';
    }

    renderMemory();
    renderStack();
    updateFpuUI();
}

function updateFpuUI() {
    document.getElementById('fpu-x').textContent =
        formatFloat(fpu.operandX);

    document.getElementById('fpu-y').textContent =
        formatFloat(fpu.operandY);

    document.getElementById('fpu-result').textContent =
        formatFloat(fpu.result);

    document.getElementById('fpu-x-hex').textContent =
        fpu.toHex(fpu.floatToBytes(fpu.operandX));

    document.getElementById('fpu-y-hex').textContent =
        fpu.toHex(fpu.floatToBytes(fpu.operandY));

    document.getElementById('fpu-result-hex').textContent =
        fpu.toHex(fpu.resultBytes);

    document.getElementById('fpu-symbol').textContent =
        fpu.lastCommand ? fpu.lastCommand.symbol : '?';

    const statusMap = {
        ready: 'fpu-ready',
        zero: 'fpu-zero',
        negative: 'fpu-negative',
        overflow: 'fpu-overflow',
        divideByZero: 'fpu-divzero',
        invalid: 'fpu-invalid'
    };

    Object.entries(statusMap).forEach(([property, id]) => {
        const element = document.getElementById(id);
        const active = fpu.status[property];

        element.textContent = active ? '1' : '0';

        element.parentElement.classList.toggle(
            'active-flag',
            active
        );
    });

    renderChart();
}

function renderStack() {
    const table = document.getElementById('stack-table');

    table.innerHTML = '';

    for (let offset = 6; offset >= -4; offset -= 2) {
        const address =
            (cpu.registers.sp + offset) & 0xFFFF;

        const low = cpu.readMemory(address);
        const high = cpu.readMemory(
            (address + 1) & 0xFFFF
        );

        const value = (high << 8) | low;

        const row = document.createElement('div');

        row.className =
            `stack-row${offset === 0 ? ' active' : ''}`;

        const stackPointer =
            offset === 0 ? 'SP → ' : '';

        row.innerHTML = `
            <span class="stack-addr">
                ${stackPointer}${hex(address, 4)}:
            </span>

            <span class="stack-val">
                ${hex(value, 4)}H
                <small>${hex(high)} ${hex(low)}</small>
            </span>
        `;

        table.appendChild(row);
    }
}

function renderMemory() {
    const table = document.getElementById('memory-table');

    table.innerHTML = '';

    const corner = document.createElement('div');
    corner.className = 'mem-cell mem-header';
    table.appendChild(corner);

    for (let column = 0; column < 16; column++) {
        const cell = document.createElement('div');

        cell.className = 'mem-cell mem-header';
        cell.textContent = hex(column, 1);

        table.appendChild(cell);
    }

    for (let row = 0; row < 8; row++) {
        const address =
            (memoryStart + row * 16) & 0xFFFF;

        const addressLabel = document.createElement('div');

        addressLabel.className = 'mem-cell mem-addr';
        addressLabel.textContent = hex(address, 4);

        table.appendChild(addressLabel);

        for (let column = 0; column < 16; column++) {
            const cellAddress =
                (address + column) & 0xFFFF;

            const cell = document.createElement('div');

            cell.className =
                `mem-cell${
                    cellAddress === cpu.registers.pc
                        ? ' current-pc'
                        : ''
                }`;

            cell.textContent =
                hex(cpu.readMemory(cellAddress));

            table.appendChild(cell);
        }
    }
}

function renderChart() {
    const chart = document.getElementById('fpu-chart');
    const history = fpu.history;

    if (!history.length) {
        chart.innerHTML = `
            <div class="chart-empty">
                Ejecuta una operación para generar la gráfica.
            </div>
        `;

        return;
    }

    const finiteResults = history
        .map(item => item.result)
        .filter(Number.isFinite);

    const maximum = Math.max(
        ...finiteResults.map(Math.abs),
        1
    );

    chart.innerHTML = history.map(item => {
        const finiteResult =
            Number.isFinite(item.result);

        const width = finiteResult
            ? Math.max(
                (Math.abs(item.result) / maximum) * 100,
                3
            )
            : 100;

        const negativeClass =
            item.result < 0 ? ' negative' : '';

        const specialClass =
            finiteResult ? '' : ' special';

        return `
            <div class="chart-row">
                <span>#${item.id} ${item.symbol}</span>

                <div class="bar-track">
                    <div
                        class="bar${negativeClass}${specialClass}"
                        style="width: ${width}%"
                    ></div>
                </div>

                <strong>${formatFloat(item.result)}</strong>
            </div>
        `;
    }).join('');
}

function calculateFromInputs() {
    const xInput =
        document.getElementById('manual-x');

    const yInput =
        document.getElementById('manual-y');

    const operationInput =
        document.getElementById('manual-operation');

    const message =
        document.getElementById('calculation-message');

    if (xInput.value.trim() === '') {
        message.textContent =
            'Debes ingresar un valor para el operando X.';

        message.className = 'error';
        xInput.focus();
        return;
    }

    const operation = Number(operationInput.value);
    const x = Number(xInput.value);

    if (!Number.isFinite(x)) {
        message.textContent =
            'El operando X debe ser un número válido.';

        message.className = 'error';
        xInput.focus();
        return;
    }

    let y = 0;

    if (operation !== 5) {
        if (yInput.value.trim() === '') {
            message.textContent =
                'Debes ingresar un valor para el operando Y.';

            message.className = 'error';
            yInput.focus();
            return;
        }

        y = Number(yInput.value);

        if (!Number.isFinite(y)) {
            message.textContent =
                'El operando Y debe ser un número válido.';

            message.className = 'error';
            yInput.focus();
            return;
        }
    }

    fpu.loadOperands(x, y);

    fpu.writePort(
        FloatingPointCoprocessor.PORT_CONTROL,
        operation
    );

    updateUI();

    if (fpu.status.divideByZero) {
        message.textContent =
            'La FPU detectó una división entre cero.';

        message.className = 'error';
    } else if (fpu.status.invalid) {
        message.textContent =
            'La FPU detectó una operación inválida.';

        message.className = 'error';
    } else {
        message.textContent =
            `Operación realizada correctamente. Resultado: ${
                formatFloat(fpu.result)
            }`;

        message.className = 'success';
    }
}

function updateOperationInputs() {
    const operation = Number(
        document.getElementById('manual-operation').value
    );

    const yInput =
        document.getElementById('manual-y');

    if (operation === 5) {
        yInput.disabled = true;
        yInput.value = '';
        yInput.placeholder = 'No aplica';
    } else {
        yInput.disabled = false;

        if (yInput.value === '') {
            yInput.value = '2.25';
        }

        yInput.placeholder = '';
    }
}

function setInterfaceMode(mode) {
    const simpleMode = mode === 'simple';

    const simpleButton =
        document.getElementById('btn-simple-mode');

    const technicalButton =
        document.getElementById('btn-technical-mode');

    const workspaceTitle =
        document.getElementById('workspace-title');

    const simpleDescription =
        document.getElementById('simple-description');

    document.body.classList.toggle(
        'simple-mode',
        simpleMode
    );

    simpleButton.classList.toggle(
        'active',
        simpleMode
    );

    technicalButton.classList.toggle(
        'active',
        !simpleMode
    );

    if (simpleMode) {
        workspaceTitle.textContent =
            'Calculadora FPU-32';

        simpleDescription.textContent =
            'Ingresa dos números, selecciona una operación y observa cómo el coprocesador representa el resultado en formato IEEE-754.';
    } else {
        workspaceTitle.textContent =
            'Panel de ejecución';

        simpleDescription.textContent =
            'Ejecuta el programa ensamblador y observa la comunicación entre el Intel 8080 y el coprocesador FPU-32.';
    }

    localStorage.setItem(
        '8080-interface-mode',
        mode
    );
}

/* BOTÓN PARA CARGAR EL EJEMPLO */

document
    .getElementById('btn-example')
    .addEventListener('click', () => {
        document.getElementById('code-editor').value =
            DEMO_CODE;

        const output =
            document.getElementById('assembler-output');

        output.textContent =
            'Ejemplo cargado. Ahora presiona “Ensamblar y cargar”.';

        output.className = 'info';
    });

/* ENSAMBLAR */

document
    .getElementById('btn-assemble')
    .addEventListener('click', () => {
        const output =
            document.getElementById('assembler-output');

        try {
            const source =
                document.getElementById('code-editor').value;

            const result =
                assembler.assemble(source);

            cpu.memory.set(result.binary);
            cpu.registers.pc = 0;
            cpu.halted = false;

            fpu.reset();

            output.textContent =
                `Ensamblado correcto: ${
                    result.maxAddr
                } bytes cargados en memoria.`;

            output.className = 'success';

            updateUI();
        } catch (error) {
            output.textContent =
                `Error: ${error.message}`;

            output.className = 'error';
        }
    });

/* LIMPIAR CÓDIGO */

document
    .getElementById('btn-clear-code')
    .addEventListener('click', () => {
        document.getElementById('code-editor').value =
            '';

        const output =
            document.getElementById('assembler-output');

        output.textContent = '';
        output.className = '';
    });

/* EJECUTAR PASO A PASO */

document
    .getElementById('btn-step')
    .addEventListener('click', () => {
        cpu.step();
        updateUI();
    });

/* EJECUTAR PROGRAMA */

document
    .getElementById('btn-run')
    .addEventListener('click', () => {
        if (runInterval || cpu.halted) {
            return;
        }

        runInterval = setInterval(() => {
            for (
                let instruction = 0;
                instruction < 16 && !cpu.halted;
                instruction++
            ) {
                cpu.step();
            }

            if (cpu.halted) {
                clearInterval(runInterval);
                runInterval = null;
            }

            updateUI();
        }, 80);

        updateUI();
    });

/* DETENER */

document
    .getElementById('btn-stop')
    .addEventListener('click', () => {
        if (runInterval) {
            clearInterval(runInterval);
        }

        runInterval = null;
        updateUI();
    });

/* REINICIAR */

document
    .getElementById('btn-reset')
    .addEventListener('click', () => {
        if (runInterval) {
            clearInterval(runInterval);
        }

        runInterval = null;
        memoryStart = 0;

        cpu.reset();
        fpu.reset();

        document.getElementById(
            'mem-start-addr'
        ).value = '0000';

        document.getElementById(
            'assembler-output'
        ).textContent = '';

        document.getElementById(
            'calculation-message'
        ).textContent = '';

        updateUI();
    });

/* BUSCAR POSICIÓN DE MEMORIA */

document
    .getElementById('btn-mem-go')
    .addEventListener('click', () => {
        const address =
            document.getElementById(
                'mem-start-addr'
            ).value;

        memoryStart =
            parseInt(address, 16) || 0;

        renderMemory();
    });

/* CAMBIO DE OPERACIÓN */

document
    .getElementById('manual-operation')
    .addEventListener(
        'change',
        updateOperationInputs
    );

/* CALCULAR */

document
    .getElementById('btn-calculate')
    .addEventListener(
        'click',
        calculateFromInputs
    );

/* EJEMPLOS RÁPIDOS */

document
    .querySelectorAll('.example-operation')
    .forEach(button => {
        button.addEventListener('click', () => {
            const x = button.dataset.x;
            const y = button.dataset.y;
            const operation =
                button.dataset.operation;

            document.getElementById(
                'manual-x'
            ).value = x;

            document.getElementById(
                'manual-operation'
            ).value = operation;

            document.getElementById(
                'manual-y'
            ).value = y;

            updateOperationInputs();
            calculateFromInputs();
        });
    });

/* CAMBIAR A MODO SENCILLO */

document
    .getElementById('btn-simple-mode')
    .addEventListener('click', () => {
        setInterfaceMode('simple');
    });

/* CAMBIAR A MODO TÉCNICO */

document
    .getElementById('btn-technical-mode')
    .addEventListener('click', () => {
        setInterfaceMode('technical');
    });

/* INICIALIZACIÓN */

fpu.subscribe(updateFpuUI);

document.getElementById('code-editor').value =
    DEMO_CODE;

const savedMode =
    localStorage.getItem('8080-interface-mode');

setInterfaceMode(savedMode || 'simple');
updateOperationInputs();
updateUI();