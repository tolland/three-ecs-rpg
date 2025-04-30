import * as THREE from 'three';

export class DebugHudSprite {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private texture: THREE.CanvasTexture;
    public sprite: THREE.Sprite;
    private visible: boolean = true;

    constructor(initialData: Record<string, string | number>, width = 512, height = 156) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        const context = this.canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get 2D context');
        }
        this.context = context;

        this.texture = new THREE.CanvasTexture(this.canvas);
        const material = new THREE.SpriteMaterial({ map: this.texture, transparent: true });
        this.sprite = new THREE.Sprite(material);
        this.sprite.center.set(0, 0);

        this.updateData(initialData);
    }

    updateData(data: Record<string, string | number>) {
        const { context, canvas } = this;
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Draw semi-transparent background
        context.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Black with 50% opacity
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.font = '24px monospace';
        context.fillStyle = 'black';
        context.textAlign = 'left';
        context.textBaseline = 'top';

        const lineHeight = 30;
        let y = 10;

        for (const [key, value] of Object.entries(data)) {
            const text = `${key}: ${value}`;
            context.fillText(text, 10, y);
            y += lineHeight;
        }

        this.texture.needsUpdate = true;
    }

    toggleVisible() {
        this.visible = !this.visible;
        this.sprite.visible = this.visible;
    }
}
