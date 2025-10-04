import * as THREE from 'three'

function makeTextSprite(message, parameters = {}) {
    const fontface = parameters.fontface || 'Arial';
    const fontsize = parameters.fontsize || 40;
    const fillStyle = parameters.fillStyle || 'white';

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;

    const context = canvas.getContext('2d');
    context.font = `${fontsize}px ${fontface}`;
    context.fillStyle = fillStyle;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(message, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.5, 0.25, 1);
    return sprite;
}

function createOrbit() {

}

export {makeTextSprite}