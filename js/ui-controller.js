// js/ui-controller.js

class UIController {
    constructor(audioEngine, visualizer) {
        this.audioEngine = audioEngine;
        this.visualizer = visualizer;
        this.currentState = {
            sounds: {},
            visual: 'none',
            intensity: 50
        };
        
        this.initializeUI();
        this.loadSavedState();
    }

    // Inicializar interfaz de usuario
    initializeUI() {
        this.createSoundCards();
        this.setupEventListeners();
        this.updatePlayButton(false);
    }

    // Crear tarjetas de sonido dinámicamente
    createSoundCards() {
        const soundsGrid = document.getElementById('soundsGrid');
        const soundConfig = this.audioEngine.getSoundConfig();
        
        soundsGrid.innerHTML = '';
        
        Object.keys(soundConfig).forEach(soundId => {
            const sound = soundConfig[soundId];
            const soundCard = this.createSoundCard(soundId, sound);
            soundsGrid.appendChild(soundCard);
        });
    }

    // Crear tarjeta individual de sonido
    createSoundCard(soundId, soundConfig) {
        const card = document.createElement('div');
        card.className = 'sound-card';
        card.innerHTML = `
            <div class="sound-header">
                <div class="sound-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${soundConfig.color}">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                </div>
                <span class="sound-name">${soundConfig.name}</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="toggle-${soundId}">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="volume-control">
                <input type="range" class="volume-slider" id="volume-${soundId}" 
                       min="0" max="1" step="0.01" value="0.5">
            </div>
        `;
        
        return card;
    }

    // Configurar event listeners
    setupEventListeners() {
        // Botón play/pause
        document.getElementById('playPauseButton').addEventListener('click', () => {
            this.togglePlayback();
        });
        
        // Selector de visualizaciones
        document.querySelectorAll('.visual-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectVisual(option.dataset.visual);
            });
        });
        
        // Control de intensidad visual
        document.getElementById('intensitySlider').addEventListener('input', (e) => {
            this.setVisualIntensity(e.target.value);
        });
        
        // Botones de preset
        document.querySelectorAll('.preset-button').forEach(button => {
            button.addEventListener('click', () => {
                this.applyPreset(button.dataset.preset);
            });
        });
        
        // Modal de ayuda
        document.querySelector('.help-button').addEventListener('click', () => {
            this.showHelpModal();
        });
        
        document.getElementById('closeHelpModal').addEventListener('click', () => {
            this.hideHelpModal();
        });
        
        // Cerrar modal al hacer clic fuera
        document.getElementById('helpModal').addEventListener('click', (e) => {
            if (e.target.id === 'helpModal') {
                this.hideHelpModal();
            }
        });
        
        // Delegación de eventos para sonidos (se agregan dinámicamente)
        document.getElementById('soundsGrid').addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const soundId = e.target.id.replace('toggle-', '');
                this.toggleSound(soundId, e.target.checked);
            }
        });
        
        document.getElementById('soundsGrid').addEventListener('input', (e) => {
            if (e.target.classList.contains('volume-slider')) {
                const soundId = e.target.id.replace('volume-', '');
                this.setSoundVolume(soundId, parseFloat(e.target.value));
            }
        });
    }

    // Alternar reproducción
    async togglePlayback() {
        try {
            if (!this.audioEngine.initialized) {
                await this.audioEngine.initialize();
            }
            
            const isPlaying = this.audioEngine.togglePlayback();
            this.updatePlayButton(isPlaying);
            this.updateStatusIndicator(isPlaying);
            
            // Activar/desactivar visualización
            this.visualizer.setActive(isPlaying && this.currentState.visual !== 'none');
            
            this.saveState();
        } catch (error) {
            console.error('Error al alternar reproducción:', error);
            this.updateStatusIndicator(false, 'Error al iniciar audio');
        }
    }

    // Alternar sonido específico
    toggleSound(soundId, enabled) {
        this.audioEngine.toggleSound(soundId, enabled);
        this.currentState.sounds[soundId] = this.currentState.sounds[soundId] || {};
        this.currentState.sounds[soundId].enabled = enabled;
        this.saveState();
    }

    // Establecer volumen de sonido específico
    setSoundVolume(soundId, volume) {
        this.audioEngine.setSoundVolume(soundId, volume);
        this.currentState.sounds[soundId] = this.currentState.sounds[soundId] || {};
        this.currentState.sounds[soundId].volume = volume;
        this.saveState();
    }

    // Seleccionar visualización
    selectVisual(visualType) {
        this.currentState.visual = visualType;
        
        // Actualizar UI
        document.querySelectorAll('.visual-option').forEach(option => {
            option.classList.toggle('active', option.dataset.visual === visualType);
        });
        
        // Aplicar al visualizador
        this.visualizer.setVisual(visualType);
        
        // Si está reproduciendo, activar/desactivar visualización
        if (this.audioEngine.isPlaying) {
            this.visualizer.setActive(visualType !== 'none');
        }
        
        this.saveState();
    }

    // Establecer intensidad visual
    setVisualIntensity(intensity) {
        this.currentState.intensity = intensity;
        this.visualizer.setIntensity(intensity);
        this.saveState();
    }

    // Aplicar preset
    applyPreset(presetName) {
        switch(presetName) {
            case 'focus':
                this.applyFocusPreset();
                break;
            case 'calm':
                this.applyCalmPreset();
                break;
            case 'sleep':
                this.applySleepPreset();
                break;
            case 'reset':
                this.applyResetPreset();
                break;
        }
        
        this.updateUIFromState();
        this.saveState();
    }

    // Preset para concentración
    applyFocusPreset() {
        this.currentState = {
            sounds: {
                'white-noise': { enabled: true, volume: 0.6 },
                'rain': { enabled: true, volume: 0.4 }
            },
            visual: 'waves',
            intensity: 40
        };
    }

    // Preset para calma
    applyCalmPreset() {
        this.currentState = {
            sounds: {
                'pink-noise': { enabled: true, volume: 0.5 },
                'forest': { enabled: true, volume: 0.3 },
                'waves': { enabled: true, volume: 0.4 }
            },
            visual: 'gradient',
            intensity: 30
        };
    }

    // Preset para dormir
    applySleepPreset() {
        this.currentState = {
            sounds: {
                'brown-noise': { enabled: true, volume: 0.4 },
                'fan': { enabled: true, volume: 0.3 }
            },
            visual: 'none',
            intensity: 0
        };
    }

    // Preset para reiniciar
    applyResetPreset() {
        this.currentState = {
            sounds: {},
            visual: 'none',
            intensity: 50
        };
        
        if (this.audioEngine.isPlaying) {
            this.togglePlayback();
        }
    }

    // Actualizar UI desde el estado actual
    updateUIFromState() {
        // Actualizar interruptores de sonido
        Object.keys(this.currentState.sounds).forEach(soundId => {
            const toggle = document.getElementById(`toggle-${soundId}`);
            const volumeSlider = document.getElementById(`volume-${soundId}`);
            
            if (toggle && this.currentState.sounds[soundId]) {
                toggle.checked = this.currentState.sounds[soundId].enabled;
                this.audioEngine.toggleSound(soundId, this.currentState.sounds[soundId].enabled);
            }
            
            if (volumeSlider && this.currentState.sounds[soundId]) {
                volumeSlider.value = this.currentState.sounds[soundId].volume;
                this.audioEngine.setSoundVolume(soundId, this.currentState.sounds[soundId].volume);
            }
        });
        
        // Actualizar visualización seleccionada
        document.querySelectorAll('.visual-option').forEach(option => {
            option.classList.toggle('active', option.dataset.visual === this.currentState.visual);
        });
        
        // Actualizar intensidad visual
        document.getElementById('intensitySlider').value = this.currentState.intensity;
        
        // Aplicar al visualizador
        this.visualizer.setVisual(this.currentState.visual);
        this.visualizer.setIntensity(this.currentState.intensity);
    }

    // Actualizar botón de play/pause
    updatePlayButton(isPlaying) {
        const button = document.getElementById('playPauseButton');
        const playIcon = document.getElementById('play-icon');
        const pauseIcon1 = document.getElementById('pause-icon');
        const pauseIcon2 = document.getElementById('pause-icon-2');
        
        if (isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon1.style.display = 'block';
            pauseIcon2.style.display = 'block';
            button.setAttribute('aria-label', 'Pausar');
        } else {
            playIcon.style.display = 'block';
            pauseIcon1.style.display = 'none';
            pauseIcon2.style.display = 'none';
            button.setAttribute('aria-label', 'Reproducir');
        }
    }

    // Actualizar indicador de estado
    updateStatusIndicator(isPlaying, customMessage = null) {
        const indicator = document.getElementById('statusIndicator');
        
        if (customMessage) {
            indicator.textContent = customMessage;
            return;
        }
        
        if (isPlaying) {
            const activeSounds = Object.keys(this.currentState.sounds).filter(
                soundId => this.currentState.sounds[soundId]?.enabled
            ).length;
            
            if (activeSounds === 0) {
                indicator.textContent = 'Reproduciendo (sin sonidos activos)';
            } else {
                indicator.textContent = `Reproduciendo ${activeSounds} sonido(s)`;
            }
        } else {
            indicator.textContent = 'Pausado';
        }
    }

    // Mostrar modal de ayuda
    showHelpModal() {
        document.getElementById('helpModal').classList.add('active');
    }

    // Ocultar modal de ayuda
    hideHelpModal() {
        document.getElementById('helpModal').classList.remove('active');
    }

    // Guardar estado en localStorage
    saveState() {
        try {
            localStorage.setItem('noiseStimControlState', JSON.stringify(this.currentState));
        } catch (error) {
            console.warn('No se pudo guardar el estado:', error);
        }
    }

    // Cargar estado guardado
    loadSavedState() {
        try {
            const saved = localStorage.getItem('noiseStimControlState');
            if (saved) {
                this.currentState = JSON.parse(saved);
                this.updateUIFromState();
            }
        } catch (error) {
            console.warn('No se pudo cargar el estado guardado:', error);
        }
    }

    // Limpiar recursos
    cleanup() {
        this.audioEngine.cleanup();
        this.visualizer.cleanup();
    }
}
