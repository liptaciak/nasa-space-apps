import * as THREE from 'three'

function latLongToVector3(lat, lon, radius, height = 0) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius + height) * Math.sin(phi) * Math.cos(theta);
    const z = (radius + height) * Math.sin(phi) * Math.sin(theta);
    const y = (radius + height) * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
}

export {latLongToVector3}