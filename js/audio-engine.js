/******************************************************
 *  AUDIO-ENGINE.JS — VERSIÓN COMPLETA, ESTABLE Y CORREGIDA
 ******************************************************/

class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;

        this.noiseBuffers = {};
        this.generatedNoiseNodes = {};
        this.activeNodes = {};

        this.effects = {
            distortion: null,
            lowpass: null,
            delay: null
        };

        this.isWorkletAvailable = false;
    }

    /******************************************************
     * INIT
     ******************************************************/
    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 1.0;
            this.masterGain.connect(this.audioContext.destination);

            await this._setupEffects();
            await this._loadBuiltInNoises();
            await this._initGeneratedNoises();

            console.log("Noise/Stim AudioEngine inicializado.");
        } catch (err) {
            console.error("Error inicializando AudioEngine:", err);
        }
    }

    /******************************************************
     * EFFECT CHAIN
     ******************************************************/
    async _setupEffects() {
        const ctx = this.audioContext;

        this.effects.lowpass = ctx.createBiquadFilter();
        this.effects.lowpass.type = "lowpass";
        this.effects.lowpass.frequency.value = 20000;

        this.effects.distortion = ctx.createWaveShaper();
        this.effects.distortion.curve = new Float32Array([0, 1]);

        this.effects.delay = ctx.createDelay(5.0);
        this.effects.delay.delayTime.value = 0.0;

        this.effects.lowpass.connect(this.effects.distortion);
        this.effects.distortion.connect(this.effects.delay);
        this.effects.delay.connect(this.masterGain);
    }

    /******************************************************
     * BUILT-IN NOISES
     ******************************************************/
    async _loadBuiltInNoises() {
        const ctx = this.audioContext;
        const sr = ctx.sampleRate;
        const dur = 3.0;

        this.noiseBuffers.white = this._generateWhiteNoise(sr, dur);
        this.noiseBuffers.pink  = this._generatePinkNoise(sr, dur);
        this.noiseBuffers.brown = this._generateBrownNoise(sr, dur);
    }

    _generateWhiteNoise(sr, dur) {
        const buffer = this.audioContext.createBuffer(1, sr * dur, sr);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        return buffer;
    }

    _generatePinkNoise(sr, dur) {
        const buffer = this.audioContext.createBuffer(1, sr * dur, sr);
        const out = buffer.getChannelData(0);

        let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;

        for (let i = 0; i < out.length; i++) {
            const w = Math.random() * 2 - 1;

            b0 = 0.99886 * b0 + w * 0.0555179;
            b1 = 0.99332 * b1 + w * 0.0750759;
            b2 = 0.96900 * b2 + w * 0.1538520;
            b3 = 0.86650 * b3 + w * 0.3104856;
            b4 = 0.55000 * b4 + w * 0.5329522;
            b5 = -0.7616 * b5 - w * 0.0168980;

            out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
            b6 = w * 0.115926;
        }

        return buffer;
    }

    _generateBrownNoise(sr, dur) {
        const buffer = this.audioContext.createBuffer(1, sr * dur, sr);
        const out = buffer.getChannelData(0);

        let last = 0;

        for (let i = 0; i < out.length; i++) {
            const w = Math.random() * 2 - 1;
            last = (last + 0.02 * w) / 1.02;
            out[i] = last * 3.5;
        }

        return buffer;
    }

    /******************************************************
     * GENERATED NOISES (AudioWorklet + fallback)
     ******************************************************/
    async _initGeneratedNoises() {
        try {
            await this.audioContext.audioWorklet.addModule("js/worklet-noise-generator.js");
            this.isWorkletAvailable = true;
            console.log("AudioWorklet cargado correctamente.");
        } catch (err) {
            this.isWorkletAvailable = false;
            console.warn("AudioWorklet no disponible. Fallback ScriptProcessor.");
        }
    }

    _createGeneratedNoise(type) {
        if (this.isWorkletAvailable) {
            const node = new AudioWorkletNode(this.audioContext, "noise-generator");

            node.port.postMessage({ type });

            return node;
        }

        // FALLBACK
        const bufferSize = 4096;
        const sp = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

        sp.onaudioprocess = (e) => {
            const out = e.outputBuffer.getChannelData(0);

            if (type === "white") {
                for (let i = 0; i < out.length; i++) out[i] = Math.random() * 2 - 1;
            }
            else if (type === "pink") {
                let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
                for (let i = 0; i < out.length; i++) {
                    const w = Math.random() * 2 - 1;
                    b0 = 0.99886 * b0 + w * 0.0555179;
                    b1 = 0.99332 * b1 + w * 0.0750759;
                    b2 = 0.96900 * b2 + w * 0.1538520;
                    b3 = 0.86650 * b3 + w * 0.3104856;
                    b4 = 0.55000 * b4 + w * 0.5329522;
                    b5 = -0.7616 * b5 - w * 0.0168980;

                    out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
                    b6 = w * 0.115926;
                }
            }
            else if (type === "brown") {
                let last = 0;
                for (let i = 0; i < out.length; i++) {
                    const w = Math.random() * 2 - 1;
                    last = (last + 0.02 * w) / 1.02;
                    out[i] = last * 3.5;
                }
            }
        };

        return sp;
    }

    playGeneratedNoise(type) {
        const node = this._createGeneratedNoise(type);

        // ⭐ FIX Nº1 — CONEXIÓN REAL
        node.connect(this.effects.lowpass);

        this.generatedNoiseNodes[type] = node;

        // ⭐ FIX Nº2 — para Worklet no hay "start", pero ScriptProcessor sí requiere estar conectado
    }

    stopGeneratedNoise(type) {
        if (this.generatedNoiseNodes[type]) {
            try {
                this.generatedNoiseNodes[type].disconnect();
            } catch (err) {}
            delete this.generatedNoiseNodes[type];
        }
    }

    /******************************************************
     * BUILT-IN BUFFER NOISE
     ******************************************************/
    playBufferedNoise(type) {
        if (!this.noiseBuffers[type]) return;

        const src = this.audioContext.createBufferSource();
        src.buffer = this.noiseBuffers[type];
        src.loop = true;

        src.connect(this.effects.lowpass);
        src.start();

        this.activeNodes[type] = src;
    }

    stopBufferedNoise(type) {
        if (this.activeNodes[type]) {
            this.activeNodes[type].stop();
            delete this.activeNodes[type];
        }
    }

    /******************************************************
     * MASTER CONTROLS
     ******************************************************/
    setVolume(v) {
        this.masterGain.gain.value = v;
    }

    setLowpass(f) {
        this.effects.lowpass.frequency.value = f;
    }

    setDelay(t) {
        this.effects.delay.delayTime.value = t;
    }

    setDistortion(a) {
        const curve = new Float32Array([0, a]);
        this.effects.distortion.curve = curve;
    }

    /******************************************************
     * SOUND FILE LOADING (FIX ruta)
     ******************************************************/
    async loadSound(cfg) {
        const url = `sounds/${cfg.file}`;

        const res = await fetch(url);
        const arr = await res.arrayBuffer();
        return await this.audioContext.decodeAudioData(arr);
    }

    playSoundOnce(buffer) {
        const src = this.audioContext.createBufferSource();
        src.buffer = buffer;
        src.connect(this.effects.lowpass);
        src.start();
    }
}

window.AudioEngine = AudioEngine;
