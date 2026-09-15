/**
 * Coprocesador FPU-32 conceptual para el Intel 8080.
 *
 * Se comunica por instrucciones IN/OUT, como un periférico externo:
 *   F0h (OUT): flujo de operandos IEEE-754, little-endian (4 bytes X + 4 bytes Y)
 *   F1h (OUT): comando (01 suma, 02 resta, 03 multiplicación, 04 división,
 *              05 raíz cuadrada, 06 limpiar)
 *   F2h (IN):  registro de estado
 *   F3h (IN):  flujo del resultado IEEE-754, little-endian (4 bytes)
 */
class FloatingPointCoprocessor {
    static PORT_DATA = 0xF0;
    static PORT_CONTROL = 0xF1;
    static PORT_STATUS = 0xF2;
    static PORT_RESULT = 0xF3;

    static COMMANDS = {
        0x01: { name: 'SUMA', symbol: '+' },
        0x02: { name: 'RESTA', symbol: '−' },
        0x03: { name: 'MULTIPLICACIÓN', symbol: '×' },
        0x04: { name: 'DIVISIÓN', symbol: '÷' },
        0x05: { name: 'RAÍZ CUADRADA', symbol: '√' }
    };

    constructor() {
        this.listeners = new Set();
        this.reset();
    }

    reset() {
        this.inputBytes = [];
        this.operandX = 0;
        this.operandY = 0;
        this.result = 0;
        this.resultBytes = [0, 0, 0, 0];
        this.resultReadIndex = 0;
        this.status = {
            ready: true,
            zero: true,
            negative: false,
            overflow: false,
            divideByZero: false,
            invalid: false
        };
        this.lastCommand = null;
        this.history = [];
        this.notify();
    }

    writePort(port, value) {
        value &= 0xFF;
        if (port === FloatingPointCoprocessor.PORT_DATA) {
            if (this.inputBytes.length >= 8) this.inputBytes = [];
            this.inputBytes.push(value);
            if (this.inputBytes.length >= 4) {
                this.operandX = this.bytesToFloat(this.inputBytes.slice(0, 4));
            }
            if (this.inputBytes.length >= 8) {
                this.operandY = this.bytesToFloat(this.inputBytes.slice(4, 8));
            }
            this.notify();
            return;
        }

        if (port === FloatingPointCoprocessor.PORT_CONTROL) {
            if (value === 0x06) {
                this.reset();
            } else {
                this.execute(value);
            }
        }
    }

    readPort(port) {
        if (port === FloatingPointCoprocessor.PORT_STATUS) return this.getStatusByte();
        if (port === FloatingPointCoprocessor.PORT_RESULT) {
            const byte = this.resultBytes[this.resultReadIndex];
            this.resultReadIndex = (this.resultReadIndex + 1) % 4;
            this.notify();
            return byte;
        }
        return 0;
    }

    execute(commandCode) {
        const command = FloatingPointCoprocessor.COMMANDS[commandCode];
        this.lastCommand = command || { name: 'COMANDO INVÁLIDO', symbol: '?' };
        this.status.ready = false;
        this.status.divideByZero = false;
        this.status.invalid = false;
        this.status.overflow = false;

        if (!command) {
            this.result = NaN;
            this.status.invalid = true;
        } else if (this.inputBytes.length < 4) {
            this.result = NaN;
            this.status.invalid = true;
        } else {
            switch (commandCode) {
                case 0x01: this.result = this.operandX + this.operandY; break;
                case 0x02: this.result = this.operandX - this.operandY; break;
                case 0x03: this.result = this.operandX * this.operandY; break;
                case 0x04:
                    if (this.operandY === 0) this.status.divideByZero = true;
                    this.result = this.operandX / this.operandY;
                    break;
                case 0x05:
                    if (this.operandX < 0) this.status.invalid = true;
                    this.result = Math.sqrt(this.operandX);
                    break;
            }
        }

        // La simulación redondea cada resultado a precisión simple IEEE-754.
        this.result = Math.fround(this.result);
        this.status.zero = Object.is(this.result, 0) || Object.is(this.result, -0);
        this.status.negative = this.result < 0 || Object.is(this.result, -0);
        this.status.overflow = !Number.isFinite(this.result) && !Number.isNaN(this.result);
        this.status.invalid = this.status.invalid || Number.isNaN(this.result);
        this.status.ready = true;
        this.resultBytes = this.floatToBytes(this.result);
        this.resultReadIndex = 0;

        this.history.push({
            id: this.history.length + 1,
            operation: command ? command.name : 'INVÁLIDA',
            symbol: command ? command.symbol : '?',
            x: this.operandX,
            y: this.operandY,
            result: this.result
        });
        if (this.history.length > 12) this.history.shift();
        this.inputBytes = [];
        this.notify();
    }

    loadOperands(x, y) {
        this.inputBytes = [...this.floatToBytes(x), ...this.floatToBytes(y)];
        this.operandX = Math.fround(Number(x));
        this.operandY = Math.fround(Number(y));
        this.notify();
    }

    getStatusByte() {
        return (this.status.ready ? 0x01 : 0) |
            (this.status.zero ? 0x02 : 0) |
            (this.status.negative ? 0x04 : 0) |
            (this.status.overflow ? 0x08 : 0) |
            (this.status.divideByZero ? 0x10 : 0) |
            (this.status.invalid ? 0x20 : 0);
    }

    floatToBytes(value) {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setFloat32(0, Number(value), true);
        return Array.from(new Uint8Array(buffer));
    }

    bytesToFloat(bytes) {
        const buffer = new ArrayBuffer(4);
        new Uint8Array(buffer).set(bytes);
        return new DataView(buffer).getFloat32(0, true);
    }

    toHex(bytes) {
        return bytes.map(byte => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        if (!this.listeners) return;
        this.listeners.forEach(listener => listener(this));
    }
}

if (typeof module !== 'undefined') {
    module.exports = FloatingPointCoprocessor;
}
