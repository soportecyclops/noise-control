// js/visualizer.js

class Visualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isActive = false;
        this.currentVisual = 'none';
        this.intensity = 0.5;
        this.animationId = null;
        
        // Configuración de partículas para visualización
        this.particles = [];
        this.waveData = new Array(128).fill(0);
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    // Ajustar tamaño del canvas
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // Activar/desactivar visualización
    setActive(active) {
        this.isActive = active;
        
        if (active && this.currentVisual !== 'none') {
            this.startAnimation();
        } else {
            this.stopAnimation();
            this.clearCanvas();
        }
    }

    // Cambiar tipo de visualización
    setVisual(type) {
        this.currentVisual = type;
        
        // Reinicializar según el tipo
        switch(type) {
            case 'particles':
                this.initParticles();
                break;
            case 'waves':
                this.waveData = new Array(128).fill(0);
                break;
            case 'gradient':
                // No necesita inicialización especial
                break;
        }
        
        // Reiniciar animación si está activa
        if (this.isActive && type !== 'none') {
            this.startAnimation();
        } else if (type === 'none') {
            this.stopAnimation();
            this.clearCanvas();
        }
    }

    // Establecer intensidad
    setIntensity(intensity) {
        this.intensity = intensity / 100;
    }

    // Inicializar partículas
    initParticles() {
        this.particles = [];
        const particleCount = Math.floor(50 * this.intensity);
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 2,
                speedY: (Math.random() - 0.5) * 2,
                color: `hsl(${Math.random() * 60 + 200}, 70%, 60%)` // Tonos azules
            });
        }
    }

    // Iniciar animación
    startAnimation() {
        if (this.animationId) return;
        
        const animate = () => {
            this.clearCanvas();
            
            switch(this.currentVisual) {
                case 'waves':
                    this.drawWaves();
                    break;
                case 'particles':
                    this.drawParticles();
                    break;
                case 'gradient':
                    this.drawGradient();
                    break;
            }
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        animate();
    }

    // Detener animación
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    // Limpiar canvas
    clearCanvas() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Dibujar ondas
    drawWaves() {
        // Simular datos de audio para las ondas
        for (let i = 0; i < this.waveData.length - 1; i++) {
            this.waveData[i] = this.waveData[i + 1];
        }
        this.waveData[this.waveData.length - 1] = Math.random() * 2 - 1;
        
        this.ctx.strokeStyle = `hsla(220, 70%, 60%, ${0.3 + this.intensity * 0.7})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        const sliceWidth = this.canvas.width / (this.waveData.length - 1);
        let x = 0;
        
        for (let i = 0; i < this.waveData.length; i++) {
            const v = this.waveData[i] * this.intensity;
            const y = this.canvas.height / 2 + v * this.canvas.height / 4;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.stroke();
    }

    // Dibujar partículas
    drawParticles() {
        // Actualizar y dibujar partículas
        this.particles.forEach(particle => {
            // Mover partícula
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Rebotar en los bordes
            if (particle.x < 0 || particle.x > this.canvas.width) {
                particle.speedX *= -1;
            }
            if (particle.y < 0 || particle.y > this.canvas.height) {
                particle.speedY *= -1;
            }
            
            // Dibujar partícula
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    // Dibujar degradado animado
    drawGradient() {
        const time = Date.now() * 0.001;
        
        // Crear gradiente radial
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2,
            this.canvas.height / 2,
            0,
            this.canvas.width / 2,
            this.canvas.height / 2,
            Math.max(this.canvas.width, this.canvas.height) * 0.6
        );
        
        // Colores que cambian suavemente con el tiempo
        const hue1 = (Math.sin(time * 0.1) * 30 + 200) % 360;
        const hue2 = (Math.cos(time * 0.15) * 30 + 220) % 360;
        
        gradient.addColorStop(0, `hsla(${hue1}, 70%, 60%, ${0.1 + this.intensity * 0.3})`);
        gradient.addColorStop(1, `hsla(${hue2}, 70%, 50%, ${0.05 + this.intensity * 0.2})`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Limpiar recursos
    cleanup() {
        this.stopAnimation();
    }
}
