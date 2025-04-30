import * as THREE from 'three';

export class TextSprite {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private texture: THREE.CanvasTexture;
    public sprite: THREE.Sprite;

    constructor(initialText: string, width = 512, height = 256) {
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        const context = this.canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get 2D context');
        }
        this.context = context;

        // Create texture and sprite
        this.texture = new THREE.CanvasTexture(this.canvas);
        const material = new THREE.SpriteMaterial({ map: this.texture });
        this.sprite = new THREE.Sprite(material);

        // Draw initial text
        this.updateText(initialText);
    }

    updateText(newText: string) {
        // Clear canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw new text
        this.context.font = '48px Arial';
        this.context.fillStyle = 'white';
        this.context.textAlign = 'left';
        this.context.textBaseline = 'bottom';
        this.context.fillText(newText, this.canvas.width / 2, this.canvas.height / 2);

        // Update the texture
        this.texture.needsUpdate = true;
    }
}
