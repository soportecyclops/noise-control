// js/audio-engine.js
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.sounds = {};
        this.isPlaying = false;
        this.initialized = false;

        // Configuración completa de sonidos
        this.soundConfig = {

            // ---------------- RUIDOS GENERADOS ---------------
            'white-noise': { type: 'generated', name: 'Ruido Blanco', color: '#4a6fa5' },
            'pink-noise':  { type: 'generated', name: 'Ruido Rosa', color: '#9f7aea' },
            'brown-noise': { type: 'generated', name: 'Ruido Marrón', color: '#8B4513' },
            'blue-noise':  { type: 'generated', name: 'Ruido Azul', color: '#1E90FF' },
            'violet-noise':{ type: 'generated', name: 'Ruido Violeta', color: '#8A2BE2' },

            // ------------------- SAMPLES ----------------------
            'rain':            { type: 'sample', name: 'Lluvia Suave', file: 'rain.mp3' },
            'rain-heavy':      { type: 'sample', name: 'Lluvia Fuerte', file: 'rain-heavy.mp3' },
            'forest':          { type: 'sample', name: 'Bosque', file: 'forest.mp3' },
            'waves':           { type: 'sample', name: 'Olas del Mar', file: 'waves.mp3' },
            'wind':            { type: 'sample', name: 'Viento', file: 'wind.mp3' },
            'fire':            { type: 'sample', name: 'Fogata', file: 'fire.mp3' },
            'birds':           { type: 'sample', name: 'Pájaros', file: 'birds.mp3' },
            'fan':             { type: 'sample', name: 'Ventilador', file: 'fan.mp3' },
            'city':            { type: 'sample', name: 'Ciudad Lejana', file: 'city.mp3' },
            'coffee-shop':     { type: 'sample', name: 'Cafetería', file: 'coffee.mp3' },
        };
    }

    // ---------------------------------------------------------
    // 🔥 INICIALIZACIÓN
    // ---------------------------------------------------------
    async initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.7;

            await this.initGeneratedNoises();
            await this.loadSampleSounds();

            this.initialized = true;
            console.log("AudioEngine OK");
        } catch (e) {
            console.error("Error inicializando audio:", e);
        }
    }

    // ---------------------------------------------------------
    // 🔥 Crear ruidos generados
    // ---------------------------------------------------------
    async initGeneratedNoises() {
        this.sounds["white-noise"] = this.createWhiteNoise();
        this.sounds["pink-noise"]  = this.createPinkNoise();
        this.sounds["brown-noise"] = this.createBrownNoise();
        this.sounds["blue-noise"]  = this.createBlueNoise();
        this.sounds["violet-noise"]= this.createVioletNoise();
    }

    // ---------------------------------------------------------
    // 🔥 Cargar samples de audio de carpeta /sounds/
    // ---------------------------------------------------------
    async loadSampleSounds() {
        const entries = Object.entries(this.soundConfig)
            .filter(([id, cfg]) => cfg.type === "sample");

        for (const [id, cfg] of entries) {
            this.sounds[id] = await this.loadSample(`/sounds/${cfg.file}`);
        }
    }

    async loadSample(url) {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        return this.createBufferSound(audioBuffer, 0.7);
    }

    // ---------------------------------------------------------
    // 🔥 Nodos de sonido
    // ---------------------------------------------------------
    createBufferSound(buffer, defaultVolume = 0.5) {
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0;

        source.connect(gainNode);
        gainNode.connect(this.masterGain);

        source.start();

        return { source, gain: gainNode, volume: defaultVolume, playing: false };
    }

    createNoiseProcessor(processFn, volume = 0.2) {
        const bufferSize = 4096;
        const node = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
        node.onaudioprocess = processFn;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0;

        node.connect(gainNode);
        gainNode.connect(this.masterGain);

        return { source: node, gain: gainNode, volume, playing: false };
    }

    createWhiteNoise() {
        const size = 2 * this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, size, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;

        return this.createBufferSound(buffer, 0.2);
    }

    createPinkNoise() {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

        return this.createNoiseProcessor((e) => {
            const output = e.outputBuffer.getChannelData(0);

            for (let i = 0; i < output.length; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;

                output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                b6 = white * 0.115926;
            }
        }, 0.15);
    }

    createBrownNoise() {
        let lastOut = 0;

        return this.createNoiseProcessor((e) => {
            const output = e.outputBuffer.getChannelData(0);

            for (let i = 0; i < output.length; i++) {
                const white = Math.random() * 2 - 1;
                output[i] = (lastOut + 0.02 * white) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5;
            }
        }, 0.2);
    }

    createBlueNoise() {
        let last = 0;

        return this.createNoiseProcessor((e) => {
            const out = e.outputBuffer.getChannelData(0);

            for (let i = 0; i < out.length; i++) {
                const white = Math.random() * 2 - 1;
                out[i] = (white - last) * 1.2;
                last = white;
            }
        }, 0.12);
    }

    createVioletNoise() {
        let last = 0;

        return this.createNoiseProcessor((e) => {
            const out = e.outputBuffer.getChannelData(0);

            for (let i = 0; i < out.length; i++) {
                const white = Math.random() * 2 - 1;
                out[i] = (white - last) * 1.6;
                last = white;
            }
        }, 0.08);
    }

    // ---------------------------------------------------------
    // 🔥 Playback
    // ---------------------------------------------------------
    togglePlayback() {
        if (!this.initialized) return false;

        if (this.isPlaying) this.stopAll();
        else this.startAllEnabled();

        this.isPlaying = !this.isPlaying;
        return this.isPlaying;
    }

    startAllEnabled() {
        for (const id in this.sounds)
            if (this.sounds[id].playing) this.fadeIn(id);
    }

    stopAll() {
        for (const id in this.sounds)
            this.fadeOut(id);
    }

    toggleSound(id, enable) {
        if (!this.sounds[id]) return;
        this.sounds[id].playing = enable;

        if (!this.isPlaying) return;

        enable ? this.fadeIn(id) : this.fadeOut(id);
    }

    setSoundVolume(id, v) {
        if (!this.sounds[id]) return;

        const s = this.sounds[id];
        s.volume = v;
        s.gain.gain.linearRampToValueAtTime(v, this.audioContext.currentTime + 0.1);
    }

    fadeIn(id) {
        const s = this.sounds[id];
        s.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
        s.gain.gain.linearRampToValueAtTime(s.volume, this.audioContext.currentTime + 1.5);
    }

    fadeOut(id) {
        const s = this.sounds[id];
        s.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
        s.gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1.5);
    }
}
