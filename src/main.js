import * as THREE from "three/webgpu";

import { normalWorldGeometry, texture, vec3, vec4, normalize, positionWorld, cameraPosition, color, uniform, mix } from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import i18next from "i18next";

import { makeTextSprite } from "./drawingUtils";
import { latLongToVector3 } from "./mathUtils";

i18next.init({
  lng: "en",
  debug: false,
  resources: {
    en: { translation: { list: "NEOs List" } },
    pl: { translation: { list: "Lista NEO" } },
  },
});

// document.getElementById("list").innerHTML = i18next.t("list");
// i18...

let camera, scene, renderer, controls, globe, clock;

scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

renderer = new THREE.WebGPURenderer();
renderer.outputColorSpace = "srgb";
renderer.toneMapping = THREE.NoToneMapping;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";
renderer.domElement.style.zIndex = "0";
document.body.appendChild(renderer.domElement);

clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();

const sun = new THREE.DirectionalLight("#ffffff", 2);
sun.position.set(0, 0, 3);
scene.add(sun);

const sunTexture = textureLoader.load("assets/textures/sun.webp");
sunTexture.colorSpace = THREE.SRGBColorSpace;
const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
const sunGeometry = new THREE.SphereGeometry(10, 64, 64);
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
sunMesh.position.set(0, 0, 0);
scene.add(sunMesh);

const bgTexture = textureLoader.load("assets/textures/milky_way.webp");
bgTexture.colorSpace = THREE.SRGBColorSpace;
scene.background = bgTexture;

const dayTexture = textureLoader.load("assets/textures/earth_day.webp");
dayTexture.colorSpace = THREE.SRGBColorSpace;
const nightTexture = textureLoader.load("assets/textures/earth_night.webp");
nightTexture.colorSpace = THREE.SRGBColorSpace;

const atmosphereDayColor = uniform(color("#4db2ff"));
const atmosphereTwilightColor = uniform(color("#000000"));

const viewDirection = positionWorld.sub(cameraPosition).normalize();
const fresnel = viewDirection.dot(normalWorldGeometry).abs().oneMinus().toVar();

const lightDir = normalize(vec3(0, 0, 0).sub(positionWorld));
const sunOrientation = normalWorldGeometry.dot(lightDir).toVar();
const atmosphereColor = mix(
  atmosphereTwilightColor,
  atmosphereDayColor,
  sunOrientation.smoothstep(-0.25, 0.75)
);

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

const sphereGeometry = new THREE.SphereGeometry(10 / 109, 64, 64);
globe = new THREE.Mesh(sphereGeometry, globeMaterial);
globe.position.set(500, 0, 0);
scene.add(globe);
camera.position.set(globe.position.x+5, globe.position.y+3, globe.position.z);
camera.lookAt(globe.position);

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

camera.position.set(globe.position.x + 5, globe.position.y + 3, globe.position.z);
camera.lookAt(globe.position);
controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 0.1;
controls.maxDistance = 5000;
controls.target.copy(globe.position);
controls.update();

window.addEventListener("resize", onWindowResize);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

controls.target.copy(globe.position);

async function loadCities() {
  const res = await fetch("assets/cities.json");
  const cityData = await res.json();

  cityData.forEach((city) => {
    const lat = city.latitude_deg;
    const lon = city.longitude_deg;

    const pos = latLongToVector3(lat, lon, 1.02);

    const dotGeom = new THREE.SphereGeometry(0.01, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    const dot = new THREE.Mesh(dotGeom, dotMat);
    dot.position.copy(pos);
    globe.add(dot);

    const label = makeTextSprite(city.city, {
      fontsize: 30,
      fillStyle: "white",
      textAlign: "center",
    });

    label.position.copy(latLongToVector3(lat+1, lon, 1.05));
    globe.add(label);
  });
}
loadCities();

function animate() {
  const delta = clock.getDelta();
  globe.rotation.y += delta * 0.5;
  
  controls.update();
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);