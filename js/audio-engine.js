// js/audio-engine.js
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.sounds = {}; // objects indexed by id
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

        // Parámetros internos
        this._generatedNodes = {}; // para ruidos generados (processor + gain)
    }

    // ---------------------------------------------------------
    // 🔥 INICIALIZACIÓN
    // ---------------------------------------------------------
    async initialize() {
        try {
            // Crear AudioContext (compatibilidad)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // masterGain fijo que controla volumen global
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.7;
            this.masterGain.connect(this.audioContext.destination);

            // inicializar ruidos generados y cargar samples
            await this._initGeneratedNoises();
            await this._loadSampleSounds();

            this.initialized = true;
            console.log("AudioEngine: inicializado correctamente");
        } catch (e) {
            console.error("AudioEngine - Error inicializando audio:", e);
            this.initialized = false;
        }
    }

    // ---------------------------------------------------------
    // 🔥 Asegurar que el contexto esté corriendo (resume)
    // ---------------------------------------------------------
    async ensureAudioContextRunning() {
        if (!this.audioContext) return;
        if (this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                // console.log('AudioContext resumed');
            } catch (e) {
                // Puede requerir interacción del usuario en algunos navegadores
                console.warn('AudioEngine: no se pudo reanudar AudioContext automáticamente. Llamar resumeAudioContext() desde un gesto de usuario.', e);
            }
        }
    }

    // Método público: intentar reanudar desde un gesto de usuario (ej. click)
    async resumeAudioContext() {
        if (!this.audioContext) return;
        try {
            await this.audioContext.resume();
            // console.log('AudioContext resumed by user gesture.');
        } catch (e) {
            console.warn('AudioEngine: resumeAudioContext fallo', e);
        }
    }

    // ---------------------------------------------------------
    // 🔥 Crear/registrar ruidos generados (internal)
    // ---------------------------------------------------------
    async _initGeneratedNoises() {
        // Cada ruido generado devolverá un objeto con: source (processor), gain, volume, playing
        // NOTA: createScriptProcessor está deprecado; para producción migrar a AudioWorklet.
        this._generatedNodes["white-noise"] = this._createWhiteNoiseNode();
        this._generatedNodes["pink-noise"]  = this._createPinkNoiseNode();
        this._generatedNodes["brown-noise"] = this._createBrownNoiseNode();
        this._generatedNodes["blue-noise"]  = this._createBlueNoiseNode();
        this._generatedNodes["violet-noise"]= this._createVioletNoiseNode();

        // Registrar en this.sounds para interfaz común
        for (const id of Object.keys(this._generatedNodes)) {
            const n = this._generatedNodes[id];
            this.sounds[id] = {
                type: 'generated',
                source: n.processor,
                gain: n.gain,
                playing: false,
                volume: n.volume
            };
            // Por defecto gain 0 (silenciado) — se mostrará volumen real en .volume
            n.gain.gain.value = 0;
        }
    }

    // ---------------------------------------------------------
    // 🔥 Cargar samples de audio de carpeta /sounds/
    // ---------------------------------------------------------
    async _loadSampleSounds() {
        const entries = Object.entries(this.soundConfig)
            .filter(([id, cfg]) => cfg.type === "sample");

        for (const [id, cfg] of entries) {
            try {
                const audioBuffer = await this._fetchAndDecode(`/sounds/${cfg.file}`);
                if (audioBuffer) {
                    // Registramos sample como objeto que contiene buffer + gain + estado
                    const gainNode = this.audioContext.createGain();
                    gainNode.gain.value = 0; // inicialmente silenciado
                    gainNode.connect(this.masterGain);

                    this.sounds[id] = {
                        type: 'sample',
                        buffer: audioBuffer,
                        gain: gainNode,
                        currentSource: null, // se creará al reproductor
                        volume: 0.7,
                        playing: false
                    };
                } else {
                    console.warn(`AudioEngine: no se pudo cargar sample ${id} (${cfg.file})`);
                }
            } catch (e) {
                console.warn(`AudioEngine: fallo cargando sample ${id} (${cfg.file})`, e);
            }
        }
    }

    async _fetchAndDecode(url) {
        if (!this.audioContext) return null;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const arrayBuffer = await res.arrayBuffer();

            // decodeAudioData en la mayoría de navegadores devuelve una Promise
            // pero algunos implementaciones antiguas usan callbacks; soportamos ambos casos:
            if (typeof this.audioContext.decodeAudioData === 'function') {
                // Promise-based:
                try {
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    return audioBuffer;
                } catch (err) {
                    // Fallback a callback style (por si acaso)
                    return await new Promise((resolve, reject) => {
                        this.audioContext.decodeAudioData(arrayBuffer,
                            (buf) => resolve(buf),
                            (err2) => reject(err2)
                        );
                    });
                }
            } else {
                // improbable, pero defensivo
                return null;
            }
        } catch (e) {
            console.error('AudioEngine: error fetch/decoding', url, e);
            return null;
        }
    }

    // ---------------------------------------------------------
    // 🔥 Helpers: creación de BufferSource a demanda (samples)
    // ---------------------------------------------------------
    _createAndStartBufferSourceForSample(soundObj) {
        if (!this.audioContext || !soundObj || soundObj.type !== 'sample' || !soundObj.buffer) return null;

        // Si ya existe una fuente, detenerla primero (pero no desconectar ganancia)
        if (soundObj.currentSource) {
            try {
                soundObj.currentSource.stop();
            } catch (e) {
                // ignore
            }
            try { soundObj.currentSource.disconnect(); } catch (e) {}
            soundObj.currentSource = null;
        }

        const src = this.audioContext.createBufferSource();
        src.buffer = soundObj.buffer;
        src.loop = true;
        src.connect(soundObj.gain);
        src.start(0);

        soundObj.currentSource = src;
        return src;
    }

    // ---------------------------------------------------------
    // 🔥 Nodos de ruidos (ScriptProcessor) - helpers internos
    // Nota: ScriptProcessor está deprecado; usar AudioWorklet para producción.
    // ---------------------------------------------------------
    _createNoiseProcessor(processFn, volume = 0.2, bufferSize = 4096) {
        if (!this.audioContext) return null;

        const node = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
        node.onaudioprocess = (e) => {
            try {
                processFn(e);
            } catch (err) {
                console.error('AudioEngine: error en onaudioprocess', err);
            }
        };

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0;
        node.connect(gainNode);
        gainNode.connect(this.masterGain);

        return { processor: node, gain: gainNode, volume };
    }

    _createWhiteNoiseNode() {
        const size = 2 * (this.audioContext ? this.audioContext.sampleRate : 44100);
        const buffer = (this.audioContext) ? this.audioContext.createBuffer(1, size, this.audioContext.sampleRate) : null;
        if (buffer) {
            const data = buffer.getChannelData(0);
            for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
        }

        // Reutilizamos como bufferSource (con loop) para mejor calidad si hay buffer
        if (buffer && this.audioContext) {
            // Creamos un node 'virtual' similar a sample: buffer + gain
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0;
            gainNode.connect(this.masterGain);

            const src = this.audioContext.createBufferSource();
            src.buffer = buffer;
            src.loop = true;
            src.connect(gainNode);
            src.start(0);

            return { processor: src, gain: gainNode, volume: 0.2 };
        } else {
            // Fallback al processor
            return this._createNoiseProcessor((e) => {
                const out = e.outputBuffer.getChannelData(0);
                for (let i = 0; i < out.length; i++) out[i] = Math.random() * 2 - 1;
            }, 0.2);
        }
    }

    _createPinkNoiseNode() {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        return this._createNoiseProcessor((e) => {
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

    _createBrownNoiseNode() {
        let lastOut = 0;
        return this._createNoiseProcessor((e) => {
            const output = e.outputBuffer.getChannelData(0);
            for (let i = 0; i < output.length; i++) {
                const white = Math.random() * 2 - 1;
                output[i] = (lastOut + 0.02 * white) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5;
            }
        }, 0.2);
    }

    _createBlueNoiseNode() {
        let last = 0;
        return this._createNoiseProcessor((e) => {
            const out = e.outputBuffer.getChannelData(0);
            for (let i = 0; i < out.length; i++) {
                const white = Math.random() * 2 - 1;
                out[i] = (white - last) * 1.2;
                last = white;
            }
        }, 0.12);
    }

    _createVioletNoiseNode() {
        let last = 0;
        return this._createNoiseProcessor((e) => {
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
    async togglePlayback() {
        if (!this.initialized) return false;

        // Intentar reanudar contexto si está suspended
        await this.ensureAudioContextRunning();

        if (this.isPlaying) {
            this.stopAll();
        } else {
            this.startAllEnabled();
        }

        this.isPlaying = !this.isPlaying;
        return this.isPlaying;
    }

    startAllEnabled() {
        for (const id in this.sounds) {
            const s = this.sounds[id];
            if (!s) continue;
            if (s.playing) {
                // Si es sample, crear source si no existe
                if (s.type === 'sample') {
                    // crear y arrancar source
                    this._createAndStartBufferSourceForSample(s);
                    // aplicar volumen con rampa
                    this._rampGainTo(s.gain, this._clamp(s.volume, 0, 1), 1.5);
                } else {
                    // generated => su gain ya está conectado; rampa
                    this._rampGainTo(s.gain, this._clamp(s.volume, 0, 1), 1.5);
                }
            }
        }
    }

    stopAll() {
        for (const id in this.sounds) {
            const s = this.sounds[id];
            if (!s) continue;
            this.fadeOut(id);
        }
    }

    // toggleSound espera id y boolean enable
    async toggleSound(id, enable) {
        if (!this.sounds[id]) return;
        this.sounds[id].playing = !!enable;

        if (!this.isPlaying) return;

        if (enable) this.fadeIn(id);
        else this.fadeOut(id);
    }

    setSoundVolume(id, v) {
        if (!this.sounds[id]) return;
        const value = this._clamp(Number(v), 0, 1);
        const s = this.sounds[id];
        s.volume = value;

        if (s.gain) {
            this._rampGainTo(s.gain, value, 0.1);
        }
    }

    fadeIn(id) {
        const s = this.sounds[id];
        if (!s || !s.gain) return;

        // Si es sample y no hay currentSource, crearlo
        if (s.type === 'sample' && !s.currentSource) {
            this._createAndStartBufferSourceForSample(s);
        }

        this._rampGainTo(s.gain, this._clamp(s.volume, 0, 1), 1.5);
    }

    fadeOut(id) {
        const s = this.sounds[id];
        if (!s || !s.gain) return;

        // Bajar a 0
        this._rampGainTo(s.gain, 0, 1.5);

        // Si es sample, detener la fuente después de la rampa
        if (s.type === 'sample' && s.currentSource) {
            // planificar stop en N segundos (1.6 para asegurar rampa)
            const stopDelay = 1.6;
            try {
                s.currentSource.stop(this.audioContext.currentTime + stopDelay);
            } catch (e) { /* ignore */ }
            // desconectar en un timeout (defensivo)
            setTimeout(() => {
                try { if (s.currentSource) s.currentSource.disconnect(); } catch (e) {}
                s.currentSource = null;
            }, stopDelay * 1000 + 100);
        }
    }

    // ---------------------------------------------------------
    // 🔥 Helpers de rampa y utilidades
    // ---------------------------------------------------------
    _rampGainTo(gainNode, value, timeSeconds = 0.5) {
        if (!gainNode || !this.audioContext) return;
        const now = this.audioContext.currentTime;
        try {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.linearRampToValueAtTime(value, now + timeSeconds);
        } catch (e) {
            // algunos nodos o navegadores pueden fallar en operaciones de rampa; fallback:
            try { gainNode.gain.setValueAtTime(value, now); } catch (ee) {}
        }
    }

    _clamp(v, a, b) {
        if (Number.isNaN(v)) return a;
        return Math.max(a, Math.min(b, v));
    }

    // ---------------------------------------------------------
    // 🔥 Métodos necesarios para UI Controller
    // ---------------------------------------------------------
    getSoundConfig() {
        return this.soundConfig;
    }

    getState() {
        const state = {
            isPlaying: this.isPlaying,
            sounds: {}
        };

        Object.keys(this.sounds).forEach(soundId => {
            const s = this.sounds[soundId];
            state.sounds[soundId] = {
                volume: (s && typeof s.volume !== 'undefined') ? s.volume : 0,
                playing: (s && !!s.playing)
            };
        });

        return state;
    }

    loadState(state) {
        if (!state || !state.sounds) return;

        Object.keys(state.sounds).forEach(soundId => {
            const cfg = state.sounds[soundId];
            const s = this.sounds[soundId];
            if (!s) return;

            if (typeof cfg.volume === 'number') {
                s.volume = this._clamp(cfg.volume, 0, 1);
            }
            s.playing = !!cfg.playing;

            // Aplicar volumen/estado según si el motor está reproduciendo
            if (this.isPlaying && s.playing) {
                // si sample, crear source si es necesario y hacer rampa
                if (s.type === 'sample' && !s.currentSource) this._createAndStartBufferSourceForSample(s);
                if (s.gain) this._rampGainTo(s.gain, s.volume, 0.1);
            } else {
                // Silenciar ganancia inmediatamente
                if (s.gain) {
                    try { s.gain.gain.setValueAtTime(0, this.audioContext.currentTime); } catch (e) {}
                }
            }
        });
    }

    setMasterVolume(volume) {
        if (!this.masterGain || !this.audioContext) return;
        const now = this.audioContext.currentTime;
        try {
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.linearRampToValueAtTime(this._clamp(Number(volume), 0, 1), now + 0.1);
        } catch (e) {
            try { this.masterGain.gain.setValueAtTime(this._clamp(Number(volume), 0, 1), now); } catch (ee) {}
        }
    }

    // ---------------------------------------------------------
    // 🔥 Limpieza
    // ---------------------------------------------------------
    cleanup() {
        try {
            // detener y desconectar samples
            for (const id in this.sounds) {
                const s = this.sounds[id];
                if (!s) continue;
                try {
                    if (s.type === 'sample' && s.currentSource) {
                        try { s.currentSource.stop(); } catch (e) {}
                        try { s.currentSource.disconnect(); } catch (e) {}
                        s.currentSource = null;
                    } else if (s.type === 'generated' && s.source) {
                        try { s.source.disconnect(); } catch (e) {}
                        if (s.source.onaudioprocess) s.source.onaudioprocess = null;
                    }
                    if (s.gain) try { s.gain.disconnect(); } catch (e) {}
                } catch (e) { /* ignore */ }
            }
        } catch (e) {
            console.warn('AudioEngine cleanup parcial fallo', e);
        }

        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch (e) { /* ignore */ }
        }

        this.audioContext = null;
        this.masterGain = null;
        this.sounds = {};
        this.initialized = false;
        this.isPlaying = false;
    }
}

// Si quieres usar módulos (ESM), puedes exportar:
// export default AudioEngine;
