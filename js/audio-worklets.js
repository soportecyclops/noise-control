// AudioWorklets para reemplazar ScriptProcessorNode
class NoiseWorklet extends AudioWorkletProcessor {
    constructor() {
        super();
        this.lastOut = 0;
        this.b0 = this.b1 = this.b2 = this.b3 = this.b4 = this.b5 = this.b6 = 0;
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const channel = output[0];
        
        const noiseType = parameters.noiseType ? parameters.noiseType[0] : 0;
        
        for (let i = 0; i < channel.length; i++) {
            switch (noiseType) {
                case 0: // White
                    channel[i] = Math.random() * 2 - 1;
                    break;
                case 1: // Pink
                    const white = Math.random() * 2 - 1;
                    this.b0 = 0.99886 * this.b0 + white * 0.0555179;
                    this.b1 = 0.99332 * this.b1 + white * 0.0750759;
                    this.b2 = 0.96900 * this.b2 + white * 0.1538520;
                    this.b3 = 0.86650 * this.b3 + white * 0.3104856;
                    this.b4 = 0.55000 * this.b4 + white * 0.5329522;
                    this.b5 = -0.7616 * this.b5 - white * 0.0168980;
                    channel[i] = (this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362) * 0.11;
                    this.b6 = white * 0.115926;
                    break;
                case 2: // Brown
                    const whiteBrown = Math.random() * 2 - 1;
                    channel[i] = (this.lastOut + 0.02 * whiteBrown) / 1.02;
                    this.lastOut = channel[i];
                    channel[i] *= 3.5;
                    break;
                case 3: // Blue
                    const whiteBlue = Math.random() * 2 - 1;
                    channel[i] = (whiteBlue - this.lastOut) * 1.2;
                    this.lastOut = whiteBlue;
                    break;
                case 4: // Violet
                    const whiteViolet = Math.random() * 2 - 1;
                    channel[i] = (whiteViolet - this.lastOut) * 1.6;
                    this.lastOut = whiteViolet;
                    break;
            }
        }
        return true;
    }
}

registerProcessor('noise-worklet', NoiseWorklet);
