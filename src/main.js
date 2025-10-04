import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { makeTextSprite } from "./drawingUtils";

const dateElement = document.getElementById("date");
const timeElement = document.getElementById("time");

function updateDateTime() {
  const now = new Date();

  const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = String(now.getDate()).padStart(2, "0");
  const year = now.getFullYear();
  dateElement.textContent = `${month} ${day}, ${year}`;

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  timeElement.textContent = `${hours}:${minutes}:${seconds}`;
}
updateDateTime();
setInterval(updateDateTime, 1000);

const searchBtn = document.getElementById("search");
const searchModal = document.getElementById("searchModal");
const closeSearchModal = document.getElementById("closeSearchModal");

searchBtn.addEventListener("click", () => {
  searchModal.classList.remove("hidden");
  searchModal.classList.add("flex");
});

closeSearchModal.addEventListener("click", () => {
  searchModal.classList.add("hidden");
  searchModal.classList.remove("flex");
});

searchModal.addEventListener("click", (e) => {
  if (e.target === searchModal) {
    searchModal.classList.add("hidden");
    searchModal.classList.remove("flex");
  }
});

const filtersBtn = document.getElementById("filters");
const filtersModal = document.getElementById("filtersModal");
const closeFiltersModal = document.getElementById("closeFiltersModal");

filtersBtn.addEventListener("click", () => {
  filtersModal.classList.remove("hidden");
  filtersModal.classList.add("flex");
});

closeFiltersModal.addEventListener("click", () => {
  filtersModal.classList.add("hidden");
  filtersModal.classList.remove("flex");
});

filtersModal.addEventListener("click", (e) => {
  if (e.target === filtersModal) {
    filtersModal.classList.add("hidden");
    filtersModal.classList.remove("flex");
  }
});

const approachesBtn = document.getElementById("approaches");
const approachesModal = document.getElementById("approachesModal");
const closeApproachesModal = document.getElementById("closeApproachesModal");

approachesBtn.addEventListener("click", () => {
  approachesModal.classList.remove("hidden");
  approachesModal.classList.add("flex");
});

closeApproachesModal.addEventListener("click", () => {
  approachesModal.classList.add("hidden");
  approachesModal.classList.remove("flex");
});

approachesModal.addEventListener("click", (e) => {
  if (e.target === approachesModal) {
    approachesModal.classList.add("hidden");
    approachesModal.classList.remove("flex");
  }
});

// --- Scene & Renderer ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 500000);
const renderer = new THREE.WebGPURenderer();
renderer.outputColorSpace = "srgb";
renderer.toneMapping = THREE.NoToneMapping;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// --- Constants ---
const AU = 149597870.7; // km
const scaleFactor = 0.00005;
const planetScale = 50;
const sunRadius = 300;

// --- Textures ---
const textureLoader = new THREE.TextureLoader();
const sunTexture = textureLoader.load("./assets/textures/sun.webp");
sunTexture.colorSpace = THREE.SRGBColorSpace;
const dayTexture = textureLoader.load("./assets/textures/earth_day.webp");
dayTexture.colorSpace = THREE.SRGBColorSpace;
const bgTexture = textureLoader.load("./assets/textures/milky_way.webp");
bgTexture.colorSpace = THREE.SRGBColorSpace;
scene.background = bgTexture;

// --- Sun ---
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(sunRadius, 64, 64),
  new THREE.MeshBasicMaterial({ map: sunTexture })
);
scene.add(sunMesh);
scene.add(new THREE.DirectionalLight("#ffffff", 2));

// --- Earth (as globe group) ---
const earthRadius = planetScale;
const globe = new THREE.Group();
globe.name = "earth";

// Create Earth mesh and add to globe
const earth = new THREE.Mesh(
  new THREE.SphereGeometry(earthRadius, 32, 32),
  new THREE.MeshStandardMaterial({ map: dayTexture })
);
globe.add(earth);

// Add globe to scene
scene.add(globe);

// --- Camera & Controls ---
// Start camera at a reasonable distance from Earth
camera.position.set(0, 200, 500);

// Set up OrbitControls to orbit around Earth
const controls = new OrbitControls(camera, renderer.domElement);
// DISABLE DAMPING COMPLETELY - this is the key fix
controls.enableDamping = false;
controls.enablePan = true;
controls.screenSpacePanning = false;
controls.minDistance = 50;
controls.maxDistance = 100000;
controls.target.copy(globe.position);

// Track the camera distance manually to prevent any auto-zoom
let currentCameraDistance = camera.position.distanceTo(controls.target);
let isUserInteracting = false;

controls.addEventListener('start', () => {
  isUserInteracting = true;
});

controls.addEventListener('end', () => {
  isUserInteracting = false;
  // Update our manual distance tracking when user stops interacting
  currentCameraDistance = camera.position.distanceTo(controls.target);
});

// Override the zoom behavior to prevent any damping
controls.zoomSpeed = 1.0;

// --- Planets ---
const planets = [
  { name: "Mercury", radiusAU: 0.387, inclination: 7, color: 0x888888, size: 0.38 },
  { name: "Venus", radiusAU: 0.723, inclination: 3.39, color: 0xe6b856, size: 0.95 },
  { name: "Earth", radiusAU: 1.0, inclination: 0, color: 0x2233ff, size: 1.0 },
  { name: "Mars", radiusAU: 1.524, inclination: 1.85, color: 0xff6633, size: 0.53 },
  { name: "Jupiter", radiusAU: 5.203, inclination: 1.3, color: 0xffaa66, size: 11.2 },
  { name: "Saturn", radiusAU: 9.537, inclination: 2.49, color: 0xffdd99, size: 9.45 },
  { name: "Uranus", radiusAU: 19.191, inclination: 0.77, color: 0x99ddff, size: 4.01 },
  { name: "Neptune", radiusAU: 30.07, inclination: 1.77, color: 0x3366ff, size: 3.88 }
];

const planetMeshes = [];
const planetLabels = [];

// --- Latitude/Longitude to Vector3 function ---
function latLongToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
}

// --- FIXED Text Sprite Function ---
function createFixedTextSprite(text, parameters = {}) {
  const fontsize = parameters.fontsize || 24;
  const fillStyle = parameters.fillStyle || "#ffffff";
  const backgroundColor = parameters.backgroundColor || "rgba(0,0,0,0.8)";
  const padding = parameters.padding || 8;
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Measure text properly
  context.font = `Bold ${fontsize}px Arial`;
  const metrics = context.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontsize;
  
  // Set canvas size with padding
  canvas.width = textWidth + padding * 2;
  canvas.height = textHeight + padding * 2;
  
  // Draw background
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw text
  context.font = `Bold ${fontsize}px Arial`;
  context.fillStyle = fillStyle;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  const material = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true,
    depthTest: false
  });
  
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width / 40, canvas.height / 40, 1);
  
  return sprite;
}

// --- Load Cities ---
async function loadCities() {
  try {
    const res = await fetch("./assets/cities.json");
    const cityData = await res.json();

    cityData.forEach((city) => {
      const lat = city.latitude_deg;
      const lon = city.longitude_deg;

      // Create city dot
      const pos = latLongToVector3(lat, lon, earthRadius * 1.02);

      const dotGeom = new THREE.SphereGeometry(earthRadius * 0.02, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      const dot = new THREE.Mesh(dotGeom, dotMat);
      dot.position.copy(pos);
      globe.add(dot);

      // Create city label with FIXED text sprite
      const label = createFixedTextSprite(city.city, {
        fontsize: 12,
        fillStyle: "white",
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: 4
      });

      if (label) {
        label.position.copy(latLongToVector3(lat + 1, lon, earthRadius * 1.05));
        globe.add(label);
      }
    });
    
    console.log(`Loaded ${cityData.length} cities`);
  } catch (error) {
    console.error("Error loading cities:", error);
  }
}

// --- Draw inclined orbit ---
function drawInclinedOrbit(radiusAU, inclinationDeg, color = 0xffffff) {
  const segments = 256;
  const points = [];
  const incRad = THREE.MathUtils.degToRad(inclinationDeg);
  const radius = radiusAU * AU * scaleFactor;

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    
    const orbitalX = radius * Math.cos(theta);
    const orbitalY = 0;
    const orbitalZ = radius * Math.sin(theta);
    
    const x = orbitalX;
    const y = orbitalY * Math.cos(incRad) - orbitalZ * Math.sin(incRad);
    const z = orbitalY * Math.sin(incRad) + orbitalZ * Math.cos(incRad);
    
    points.push(new THREE.Vector3(x, y, z));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ 
    color, 
    transparent: true, 
    opacity: 0.4 
  });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  scene.add(line);
}

// --- Create planets ---
planets.forEach(p => {
  if (p.name === "Earth") return;

  const radius = planetScale * p.size;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 32),
    new THREE.MeshStandardMaterial({ color: p.color })
  );

  const orbitalRadius = p.radiusAU * AU * scaleFactor;
  const angle = Math.random() * Math.PI * 2;
  const incRad = THREE.MathUtils.degToRad(p.inclination);

  mesh.userData = {
    orbitalRadius: orbitalRadius,
    orbitSpeed: 0.005 + Math.random() * 0.01,
    angle: angle,
    inclination: incRad
  };

  const orbitalX = orbitalRadius * Math.cos(angle);
  const orbitalY = 0;
  const orbitalZ = orbitalRadius * Math.sin(angle);

  const x = orbitalX;
  const y = orbitalY * Math.cos(incRad) - orbitalZ * Math.sin(incRad);
  const z = orbitalY * Math.sin(incRad) + orbitalZ * Math.cos(incRad);

  mesh.position.set(x, y, z);
  scene.add(mesh);
  planetMeshes.push(mesh);

  // Create planet label with FIXED text sprite
  const label = createFixedTextSprite(p.name, {
    fontsize: 16,
    fillStyle: "#ffffff",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 6
  });

  if (label) {
    label.userData.planet = mesh;
    label.position.copy(mesh.position);
    label.position.y += radius * 3;
    scene.add(label);
    planetLabels.push(label);
  }

  drawInclinedOrbit(p.radiusAU, p.inclination, p.color);
});

// Add Earth's orbit
drawInclinedOrbit(1.0, 0, 0x2233ff);

// Add Earth label with FIXED text sprite
const earthLabel = createFixedTextSprite("Earth", {
  fontsize: 18,
  fillStyle: "#ffffff",
  backgroundColor: "rgba(0,0,0,0.8)",
  padding: 6
});

if (earthLabel) {
  earthLabel.userData.planet = globe;
  earthLabel.position.copy(globe.position);
  earthLabel.position.y += earthRadius * 3;
  scene.add(earthLabel);
  planetLabels.push(earthLabel);
}

// --- FIXED Animate function ---
function animate() {
  const delta = clock.getDelta();

  globe.rotateY(delta*0.5);

  // Store Earth's previous position to calculate movement
  const previousEarthPosition = globe.position.clone();

  // Update planets
  planetMeshes.forEach(mesh => {
    const data = mesh.userData;
    data.angle += data.orbitSpeed * delta * 10;

    const orbitalRadius = data.orbitalRadius;
    const angle = data.angle;
    const incRad = data.inclination;

    const orbitalX = orbitalRadius * Math.cos(angle);
    const orbitalY = 0;
    const orbitalZ = orbitalRadius * Math.sin(angle);

    const x = orbitalX;
    const y = orbitalY * Math.cos(incRad) - orbitalZ * Math.sin(incRad);
    const z = orbitalY * Math.sin(incRad) + orbitalZ * Math.cos(incRad);

    mesh.position.set(x, y, z);
  });

  // Update Earth position
  if (!globe.userData.angle) {
    globe.userData.angle = 0;
    globe.userData.orbitSpeed = 0.01;
  }
  
  globe.userData.angle += globe.userData.orbitSpeed * delta * 10;
  const earthOrbitalRadius = 1.0 * AU * scaleFactor;
  const earthX = earthOrbitalRadius * Math.cos(globe.userData.angle);
  const earthZ = earthOrbitalRadius * Math.sin(globe.userData.angle);
  globe.position.set(earthX, 0, earthZ);

  // Calculate how much Earth moved this frame
  const earthMovement = new THREE.Vector3().subVectors(globe.position, previousEarthPosition);

  // Move camera with Earth to maintain position
  camera.position.add(earthMovement);
  
  // Update controls target
  controls.target.copy(globe.position);

  // Update planet labels
  planetLabels.forEach(label => {
    if (label.userData.planet) {
      const planet = label.userData.planet;
      let planetRadius = earthRadius;
      
      if (planet !== globe) {
        planetRadius = planet.geometry.parameters.radius;
      }

      label.position.copy(planet.position);
      label.position.y += planetRadius * 3;
      
      // Fixed label rotation - always face camera
      label.lookAt(camera.position);
      
      // Better scaling
      const distance = camera.position.distanceTo(planet.position);
      const scale = Math.max(10, distance * 0.005);
      label.scale.setScalar(scale);
    }
  });

  // Update city labels
  globe.children.forEach(child => {
    if (child.isSprite) {
      child.lookAt(camera.position);
      // Scale city labels appropriately
      const distance = camera.position.distanceTo(child.position);
      const scale = Math.max(5, distance * 0.003);
      child.scale.setScalar(scale);
    }
  });

  // NO controls.update() since we disabled damping
  // This prevents any automatic camera movement
  renderer.render(scene, camera);
}

// Start the animation and load cities
renderer.setAnimationLoop(animate);
loadCities();

// --- Handle window resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});