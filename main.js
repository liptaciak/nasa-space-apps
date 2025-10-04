import * as THREE from "three/webgpu";
import { normalWorldGeometry, texture, vec3, vec4, normalize, positionWorld, cameraPosition, color, uniform, mix } from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import i18next from "i18next";
import {makeTextSprite} from './drawingUtils'
import {latLongToVector3} from './mathUtils'
i18next.init({
  lng: "en",
  debug: true,
  resources: {
    en: {
      translation: {
        hello: "hello world",
      },
    },
    pl: {
      translation: {
        hello: "witaj świecie",
      },
    },
  },
});

document.getElementById("hello").innerHTML = i18next.t("hello");
let camera, scene, renderer, controls, globe, clock;
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

let labelSprites = [];

renderer = new THREE.WebGPURenderer()
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();
const sun = new THREE.DirectionalLight("#ffffff", 2);
sun.position.set(0, 0, 3);
scene.add(sun);
const sunTexture = textureLoader.load("./textures/sun.webp");
sunTexture.colorSpace = THREE.SRGBColorSpace;
sunTexture.anisotropy = 8;
const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
const sunGeometry = new THREE.SphereGeometry(10, 64, 64);
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
sunMesh.position.set(0, 0, 0);
scene.add(sunMesh);
const atmosphereDayColor = uniform(color("#4db2ff"));
const atmosphereTwilightColor = uniform(color("#000000"));
const roughnessLow = uniform(0.25);
const roughnessHigh = uniform(0.35);

const bgTexture = textureLoader.load("./textures/milky_way.webp");
bgTexture.colorSpace = THREE.SRGBColorSpace;
scene.background = bgTexture;

const dayTexture = textureLoader.load("./textures/earth_day.webp");
dayTexture.colorSpace = THREE.SRGBColorSpace;
dayTexture.anisotropy = 8;

const nightTexture = textureLoader.load("./textures/earth_night.webp");
nightTexture.colorSpace = THREE.SRGBColorSpace;
nightTexture.anisotropy = 8;

const viewDirection = positionWorld.sub(cameraPosition).normalize();
const fresnel = viewDirection.dot(normalWorldGeometry).abs().oneMinus().toVar();

const lightDir = normalize(vec3(0, 0, 0).sub(positionWorld));
const sunOrientation = normalWorldGeometry.dot(lightDir).toVar();
const atmosphereColor = mix(atmosphereTwilightColor, atmosphereDayColor, sunOrientation.smoothstep(-0.25, 0.75));

const globeMaterial = new THREE.MeshStandardNodeMaterial();
globeMaterial.colorNode = texture(dayTexture);

const night = texture(nightTexture);
const day = texture(dayTexture);
const dayStrength = sunOrientation.smoothstep(-0.25, 0.5);

const atmosphereDayStrength = sunOrientation.smoothstep(-0.5, 1);
const atmosphereMix = atmosphereDayStrength.mul(fresnel.pow(2)).clamp(0, 1);

let finalOutput = mix(night.rgb, day.rgb, dayStrength);
finalOutput = mix(finalOutput, atmosphereColor, atmosphereMix);

globeMaterial.outputNode = vec4(finalOutput, 1.0);

const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
globe = new THREE.Mesh(sphereGeometry, globeMaterial);
globe.position.set(500, 0, 0);
scene.add(globe);
camera.position.set(globe.position.x+5, globe.position.y+3, globe.position.z);
camera.lookAt(globe.position);
// camera.zoom(1.5)
const atmosphereMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, transparent: true });
let alpha = fresnel.remap(0.73, 1, 1, 0).pow(3);
const lightFactor = sunOrientation.smoothstep(-0.5, 1).clamp(0, 1);
const litColor = atmosphereDayColor;
const darkColor = color("#001020");
const finalColor = mix(darkColor, litColor, lightFactor);
alpha = alpha.mul(mix(0.3, 1.0, lightFactor));
atmosphereMaterial.outputNode = vec4(finalColor, alpha);

const atmosphere = new THREE.Mesh(sphereGeometry, atmosphereMaterial);
atmosphere.scale.setScalar(1.06);
globe.add(atmosphere);

const nyLabel = makeTextSprite("New York", { fontsize: 80, fillStyle: "yellow" });
nyLabel.position.copy(latLongToVector3(40.7128, -74.0060, 1.05).add(globe.position));
scene.add(nyLabel);
labelSprites.push(nyLabel);

const parisLabel = makeTextSprite("Paris", { fontsize: 80, fillStyle: "lightblue" });
parisLabel.position.copy(latLongToVector3(48.8566, 2.3522, 1.05)).add(globe.position);
scene.add(parisLabel);
labelSprites.push(parisLabel);

renderer = new THREE.WebGPURenderer();
renderer.outputColorSpace = 'srgb';
renderer.toneMapping = THREE.NoToneMapping;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 0.1;
controls.maxDistance = 5000;

controls.update();
window.addEventListener("resize", onWindowResize);




function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


controls.target.copy(globe.position);
function animate() {
  const delta = clock.getDelta();
  globe.rotation.y += delta * 0.5;
  console.log(globe.position)
  
  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
