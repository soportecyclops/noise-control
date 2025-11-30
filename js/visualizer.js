// js/visualizer.js — versión unificada, optimizada y estable

class Visualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        this.isActive = false;
        this.currentVisual = 'spectrum';
        this.intensity = 0.5;
        this.animationId = null;

        // Ajustes visuales unificados
        this.visualSettings = {
            primaryColor: '#4a6fa5',
            secondaryColor: '#9f7aea',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            particleCount: 50,
            waveComplexity: 3
        };

        // Datos de audio simulados
        this.audioData = new Array(128).fill(0);

        // Partículas genéricas (para varios efectos)
        this.particles = [];
        this.time = 0;

        // Inicialización
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.initParticles();
    }

    // ========== CONFIGURACIONES BÁSICAS ==========

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setColors(primary, secondary) {
        this.visualSettings.primaryColor = primary;
        this.visualSettings.secondaryColor = secondary;
    }

    setIntensity(intensity) {
        this.intensity = intensity / 100;

        // Ajustes dependientes de intensidad
        this.visualSettings.particleCount = Math.floor(50 * this.intensity);
        this.visualSettings.waveComplexity = Math.max(1, Math.floor(3 * this.intensity));

        this.initParticles();
    }

    setActive(active) {
        this.isActive = active;

        if (active && this.currentVisual !== 'none') {
            this.startAnimation();
        } else {
            this.stopAnimation();
            this.clearCanvas();
        }
    }

    setVisual(type) {
        this.currentVisual = type;

        switch(type) {
            case 'particles':
            case 'bubbles':
            case 'stars':
                this.initParticles();
                break;

            case 'spectrum':
            case 'wave':
            case 'circular':
                this.audioData = new Array(128).fill(0);
                break;
        }

        if (this.isActive && type !== 'none') {
            this.startAnimation();
        } else {
            this.stopAnimation();
            this.clearCanvas();
        }
    }

    // ========== SISTEMA DE PARTÍCULAS ==========

    initParticles() {
        this.particles = [];
        const count = this.visualSettings.particleCount;

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 4 + 1,
                speedX: (Math.random() - 0.5) * 2,
                speedY: (Math.random() - 0.5) * 2,
                color: this.getRandomColor(),
                life: 1
            });
        }
    }

    getRandomColor() {
        const colors = [
            this.visualSettings.primaryColor,
            this.visualSettings.secondaryColor,
            '#48bb78', '#ed8936', '#e53e3e', '#38b2ac'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // ========== ANIMACIÓN PRINCIPAL ==========

    startAnimation() {
        if (this.animationId) return;

        const animate = () => {
            this.clearCanvas();
            this.time += 0.01;

            this.simulateAudioData();

            switch (this.currentVisual) {
                case 'spectrum': this.drawSpectrum(); break;
                case 'wave': this.drawWave(); break;
                case 'particles': this.drawParticles(); break;
                case 'bubbles': this.drawBubbles(); break;
                case 'circular': this.drawCircular(); break;
                case 'gradient': this.drawAnimatedGradient(); break;
                case 'stars': this.drawStars(); break;
                case 'fluid': this.drawFluid(); break;
            }

            this.animationId = requestAnimationFrame(animate);
        };

        animate();
    }

    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    clearCanvas() {
        this.ctx.fillStyle = this.visualSettings.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    cleanup() {
        this.stopAnimation();
    }

    // ========== AUDIO SIMULADO ==========

    simulateAudioData() {
        for (let i = 0; i < this.audioData.length - 1; i++) {
            this.audioData[i] = this.audioData[i + 1];
        }
        this.audioData[this.audioData.length - 1] = Math.random() * 2 - 1;
    }

    // ========== VISUALIZACIONES COMPLETAS ==========

    drawSpectrum() {
        const centerY = this.canvas.height / 2;
        const barWidth = this.canvas.width / this.audioData.length;
        
        this.audioData.forEach((value, i) => {
            const barHeight = Math.abs(value) * this.canvas.height * 0.4 * this.intensity;
            const hue = (i / this.audioData.length * 360 + this.time * 50) % 360;

            this.ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${0.7 * this.intensity})`;
            this.ctx.fillRect(i * barWidth, centerY - barHeight / 2, barWidth - 1, barHeight);
        });
    }

    drawWave() {
        this.ctx.strokeStyle = this.visualSettings.primaryColor;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        const sliceWidth = this.canvas.width / (this.audioData.length - 1);
        let x = 0;

        for (let i = 0; i < this.audioData.length; i++) {
            const v = this.audioData[i] * this.intensity;
            const y = this.canvas.height / 2 + v * this.canvas.height / 3;

            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);

            x += sliceWidth;
        }

        this.ctx.stroke();
    }

    drawParticles() {
        this.particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;

            if (p.x < 0 || p.x > this.canvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.speedY *= -1;

            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawBubbles() {
        this.particles.forEach(b => {
            b.y -= b.speedY;
            b.x += Math.sin(this.time + b.x * 0.01) * 0.5;

            if (b.y < -b.size) {
                b.y = this.canvas.height + b.size;
                b.x = Math.random() * this.canvas.width;
            }

            const gradient = this.ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size);
            gradient.addColorStop(0, `${b.color}80`);
            gradient.addColorStop(1, `${b.color}20`);

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawCircular() {
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const maxR = Math.min(cx, cy) * 0.8;

        this.ctx.strokeStyle = this.visualSettings.primaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        for (let i = 0; i < this.audioData.length; i++) {
            const angle = (i / this.audioData.length) * Math.PI * 2;
            const radius = maxR * (1 + this.audioData[i] * 0.3 * this.intensity);
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;

            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }

        this.ctx.closePath();
        this.ctx.stroke();
    }

    drawAnimatedGradient() {
        const time = this.time;

        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2 + Math.sin(time) * 100,
            this.canvas.height / 2 + Math.cos(time) * 100,
            0,
            this.canvas.width / 2,
            this.canvas.height / 2,
            Math.max(this.canvas.width, this.canvas.height) * 0.8
        );

        const hue1 = (Math.sin(time * 0.5) * 60 + 200) % 360;
        const hue2 = (Math.cos(time * 0.3) * 60 + 280) % 360;

        gradient.addColorStop(0, `hsla(${hue1}, 80%, 60%, ${0.3 * this.intensity})`);
        gradient.addColorStop(1, `hsla(${hue2}, 80%, 50%, ${0.1 * this.intensity})`);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawStars() {
        this.ctx.fillStyle = 'rgba(10, 10, 30, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(star => {
            const brightness = 0.5 + Math.sin(this.time * 5 + star.x) * 0.5;

            this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness * this.intensity})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawFluid() {
        const time = this.time;

        for (let y = 0; y < this.canvas.height; y += 20) {
            for (let x = 0; x < this.canvas.width; x += 20) {
                const w1 = Math.sin(x * 0.01 + time) * 10;
                const w2 = Math.cos(y * 0.01 + time) * 10;
                const w3 = Math.sin((x + y) * 0.005 + time * 2) * 5;

                const disp = (w1 + w2 + w3) * this.intensity;
                const hue = (Math.atan2(y - this.canvas.height / 2, x - this.canvas.width / 2) * 180 / Math.PI + 360 + time * 50) % 360;

                this.ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${0.6 * this.intensity})`;
                this.ctx.beginPath();
                this.ctx.arc(x + disp, y + disp, 8 * this.intensity, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
}
