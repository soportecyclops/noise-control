// js/app.js

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Crear instancias de los módulos
    const audioEngine = new AudioEngine();
    const visualizer = new Visualizer('visualizerCanvas');
    const uiController = new UIController(audioEngine, visualizer);
    
    // Hacer disponibles globalmente para depuración (opcional)
    window.app = {
        audioEngine,
        visualizer,
        uiController
    };
    
    console.log('Noise/Stim Control inicializado correctamente');
    
    // Manejar cierre de la página
    window.addEventListener('beforeunload', () => {
        uiController.cleanup();
    });
});
