// js/audio-engine.js

class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.masterGain = null;
        this.isPlaying = false;
        this.initialized = false;
        
        // Configuración de sonidos disponibles
        this.soundConfig = {
            'white-noise': { name: 'Ruido Blanco', color: '#4a6fa5', type: 'generated' },
            'pink-noise': { name: 'Ruido Rosa', color: '#9f7aea', type: 'generated' },
            'brown-noise': { name: 'Ruido Marrón', color: '#ed8936', type: 'generated' },
            'rain': { name: 'Lluvia', color: '#4299e1', type: 'sample' },
            'forest': { name: 'Bosque', color: '#48bb78', type: 'sample' },
            'waves': { name: 'Olas', color: '#38b2ac', type: 'sample' },
            'fan': { name: 'Ventilador', color: '#a0aec0', type: 'sample' },
            'fireplace': { name: 'Chimenea', color: '#e53e3e', type: 'sample' }
        };
    }

    // Inicializar el motor de audio
    async initialize() {
        try {
            // Crear contexto de audio
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Crear nodo de ganancia maestro
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.7; // Volumen por defecto
            
            // Inicializar sonidos generados
            await this.initializeGeneratedSounds();
            
            this.initialized = true;
            console.log('Motor de audio inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar el motor de audio:', error);
            throw error;
        }
    }

    // Inicializar sonidos generados (ruidos)
    initializeGeneratedSounds() {
        return new Promise((resolve) => {
            // Ruido blanco
            this.sounds['white-noise'] = this.createWhiteNoise();
            
            // Ruido rosa
            this.sounds['pink-noise'] = this.createPinkNoise();
            
            // Ruido marrón
            this.sounds['brown-noise'] = this.createBrownNoise();
            
            resolve();
        });
    }

    // Crear ruido blanco
    createWhiteNoise() {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0;
        
        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        source.start();
        
        return {
            source: source,
            gain: gainNode,
            volume: 0,
            playing: false
        };
    }

    // Crear ruido rosa (aproximación)
    createPinkNoise() {
        const bufferSize = 4096;
        const b0 = [], b1 = [], b2 = [], b3 = [], b4 = [], b5 = [], b6 = [];
        
        for (let i = 0; i < 7; i++) {
            b0[i] = b1[i] = b2[i] = b3[i] = b4[i] = b5[i] = b6[i] = 0.0;
        }
        
        const node = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
        node.onaudioprocess = (e) => {
            const output = e.outputBuffer.getChannelData(0);
            const input = e.inputBuffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0[0] = 0.99886 * b0[0] + white * 0.0555179;
                b1[0] = 0.99332 * b1[0] + white * 0.0750759;
                b2[0] = 0.96900 * b2[0] + white * 0.1538520;
                b3[0] = 0.86650 * b3[0] + white * 0.3104856;
                b4[0] = 0.55000 * b4[0] + white * 0.5329522;
                b5[0] = -0.7616 * b5[0] - white * 0.0168980;
                output[i] = b0[0] + b1[0] + b2[0] + b3[0] + b4[0] + b5[0] + b6[0] + white * 0.5362;
                output[i] *= 0.11; // Ajustar ganancia
                b6[0] = white * 0.115926;
            }
        };
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0;
        
        node.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        return {
            source: node,
            gain: gainNode,
            volume: 0,
            playing: false
        };
    }

    // Crear ruido marrón (aproximación)
    createBrownNoise() {
        const bufferSize = 4096;
        let lastOut = 0.0;
        
        const node = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
        node.onaudioprocess = (e) => {
            const output = e.outputBuffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5; // Ajustar ganancia
            }
        };
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0;
        
        node.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        return {
            source: node,
            gain: gainNode,
            volume: 0,
            playing: false
        };
    }

    // Reproducir/pausar todos los sonidos
    togglePlayback() {
        if (!this.initialized) return false;
        
        if (this.isPlaying) {
            this.stopAllSounds();
        } else {
            this.startEnabledSounds();
        }
        
        this.isPlaying = !this.isPlaying;
        return this.isPlaying;
    }

    // Iniciar sonidos habilitados
    startEnabledSounds() {
        Object.keys(this.sounds).forEach(soundId => {
            const sound = this.sounds[soundId];
            if (sound.playing && sound.gain.gain.value === 0) {
                this.fadeInSound(soundId);
            }
        });
    }

    // Detener todos los sonidos
    stopAllSounds() {
        Object.keys(this.sounds).forEach(soundId => {
            const sound = this.sounds[soundId];
            if (sound.playing && sound.gain.gain.value > 0) {
                this.fadeOutSound(soundId);
            }
        });
    }

    // Activar/desactivar sonido específico
    toggleSound(soundId, enable) {
        if (!this.sounds[soundId]) return;
        
        const sound = this.sounds[soundId];
        sound.playing = enable;
        
        if (this.isPlaying) {
            if (enable) {
                this.fadeInSound(soundId);
            } else {
                this.fadeOutSound(soundId);
            }
        }
    }

    // Ajustar volumen de sonido específico
    setSoundVolume(soundId, volume) {
        if (!this.sounds[soundId]) return;
        
        const sound = this.sounds[soundId];
        sound.volume = volume;
        
        if (this.audioContext) {
            const now = this.audioContext.currentTime;
            sound.gain.gain.cancelScheduledValues(now);
            sound.gain.gain.setValueAtTime(sound.gain.gain.value, now);
            sound.gain.gain.linearRampToValueAtTime(volume, now + 0.1);
        }
    }

    // Ajustar volumen maestro
    setMasterVolume(volume) {
        if (this.masterGain) {
            const now = this.audioContext.currentTime;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
            this.masterGain.gain.linearRampToValueAtTime(volume, now + 0.1);
        }
    }

    // Transición suave de entrada para sonido
    fadeInSound(soundId) {
        const sound = this.sounds[soundId];
        if (!sound) return;
        
        const now = this.audioContext.currentTime;
        sound.gain.gain.cancelScheduledValues(now);
        sound.gain.gain.setValueAtTime(0, now);
        sound.gain.gain.linearRampToValueAtTime(sound.volume, now + 1.5);
    }

    // Transición suave de salida para sonido
    fadeOutSound(soundId) {
        const sound = this.sounds[soundId];
        if (!sound) return;
        
        const now = this.audioContext.currentTime;
        sound.gain.gain.cancelScheduledValues(now);
        sound.gain.gain.setValueAtTime(sound.gain.gain.value, now);
        sound.gain.gain.linearRampToValueAtTime(0, now + 1.5);
    }

    // Obtener configuración de sonidos
    getSoundConfig() {
        return this.soundConfig;
    }

    // Obtener estado actual
    getState() {
        const state = {
            isPlaying: this.isPlaying,
            sounds: {}
        };
        
        Object.keys(this.sounds).forEach(soundId => {
            state.sounds[soundId] = {
                volume: this.sounds[soundId].volume,
                playing: this.sounds[soundId].playing
            };
        });
        
        return state;
    }

    // Cargar estado guardado
    loadState(state) {
        if (!state) return;
        
        Object.keys(state.sounds).forEach(soundId => {
            if (this.sounds[soundId]) {
                this.sounds[soundId].volume = state.sounds[soundId].volume;
                this.sounds[soundId].playing = state.sounds[soundId].playing;
                
                // Aplicar cambios si está reproduciendo
                if (this.isPlaying && state.sounds[soundId].playing) {
                    this.setSoundVolume(soundId, state.sounds[soundId].volume);
                } else {
                    this.sounds[soundId].gain.gain.value = 0;
                }
            }
        });
    }

    // Limpiar recursos
    cleanup() {
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}
