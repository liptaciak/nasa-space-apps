import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { makeTextSprite } from "./drawingUtils";

// --- Constants ---
const AU = 149597870.7; // km
const scaleFactor = 0.00005;
const planetScale = 50;
const sunRadius = 300;

// --- Orbit Colors ---
const ORBIT_COLOR = 0xffffff; // White for regular planets
const NEO_ORBIT_COLOR = 0xff4444; // Red for NEOs

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

// --- Textures ---
const textureLoader = new THREE.TextureLoader();
const sunTexture = textureLoader.load("assets/textures/sun.webp");
sunTexture.colorSpace = THREE.SRGBColorSpace;
const dayTexture = textureLoader.load("assets/textures/earth_day.webp");
dayTexture.colorSpace = THREE.SRGBColorSpace;
const bgTexture = textureLoader.load("assets/textures/milky_way.webp");
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
let manualZoomScale = 1;
const originalZoom = controls.zoomSpeed;
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
    const res = await fetch("assets/cities.json");
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
function drawInclinedOrbit(radiusAU, inclinationDeg, color = ORBIT_COLOR) {
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

  drawInclinedOrbit(p.radiusAU, p.inclination, ORBIT_COLOR);
});

// Add Earth's orbit
drawInclinedOrbit(1.0, 0, ORBIT_COLOR);

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

// --- NEOs Data Structure ---
const neos = [
  {
    name: "Apophis",
    semiMajorAxis: 0.922, // AU
    eccentricity: 0.191,
    inclination: 3.3, // degrees
    longitudeOfAscendingNode: 204.4, // degrees
    argumentOfPeriapsis: 126.4, // degrees
    meanAnomaly: 180, // degrees
    radius: 0.2, // relative to Earth
    color: 0xff4444
  },
  {
    name: "Bennu",
    semiMajorAxis: 1.126, // AU
    eccentricity: 0.204,
    inclination: 6.0, // degrees
    longitudeOfAscendingNode: 82.3, // degrees
    argumentOfPeriapsis: 66.2, // degrees
    meanAnomaly: 120, // degrees
    radius: 0.15, // relative to Earth
    color: 0x884400
  },
  {
    name: "2006 QV89",
    semiMajorAxis: 1.064, // AU
    eccentricity: 0.181,
    inclination: 1.1, // degrees
    longitudeOfAscendingNode: 168.5, // degrees
    argumentOfPeriapsis: 245.3, // degrees
    meanAnomaly: 45, // degrees
    radius: 0.08, // relative to Earth
    color: 0x888888
  }
];

const neoMeshes = [];
const neoLabels = [];

// --- Draw NEO Function ---
function drawNEO(neoData, name, radius) {
  const {
    semiMajorAxis,
    eccentricity,
    inclination,
    longitudeOfAscendingNode,
    argumentOfPeriapsis,
    meanAnomaly,
    color = 0xaaaaaa
  } = neoData;

  // Convert angles to radians
  const incRad = THREE.MathUtils.degToRad(inclination);
  const omegaRad = THREE.MathUtils.degToRad(longitudeOfAscendingNode);
  const wRad = THREE.MathUtils.degToRad(argumentOfPeriapsis);
  const M0Rad = THREE.MathUtils.degToRad(meanAnomaly);

  // Calculate orbital parameters
  const a = semiMajorAxis * AU * scaleFactor; // semi-major axis in scene units
  const e = eccentricity;
  
  // Calculate mean motion (simplified - for more accuracy, use actual orbital period)
  const orbitalPeriod = Math.sqrt(Math.pow(semiMajorAxis, 3)); // Kepler's third law (years)
  const meanMotion = (2 * Math.PI) / (orbitalPeriod * 365.25); // radians per day (simplified)

  // Create NEO mesh
  const neoRadius = planetScale * radius;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(neoRadius, 16, 16),
    new THREE.MeshBasicMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.9
    })
  );

  // Store orbital data for animation
  mesh.userData = {
    name: name,
    semiMajorAxis: a,
    eccentricity: e,
    inclination: incRad,
    longitudeOfAscendingNode: omegaRad,
    argumentOfPeriapsis: wRad,
    meanAnomaly: M0Rad,
    meanMotion: meanMotion,
    trueAnomaly: 0,
    orbitalPeriod: orbitalPeriod
  };

  // Calculate initial position
  updateNEOPosition(mesh, 0);
  
  scene.add(mesh);
  neoMeshes.push(mesh);

  // Create NEO label
  const label = createFixedTextSprite(name, {
    fontsize: 12,
    fillStyle: "#ff8888",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 4
  });

  if (label) {
    label.userData.neo = mesh;
    label.position.copy(mesh.position);
    label.position.y += neoRadius * 5; // Larger offset for better visibility
    scene.add(label);
    neoLabels.push(label);
  }

  // Draw NEO orbit with NEO_ORBIT_COLOR
  drawNEOOrbit(neoData, NEO_ORBIT_COLOR);

  console.log(`Added NEO: ${name} at radius ${radius}`);
}

// --- Update NEO Position using Keplerian Elements ---
function updateNEOPosition(neoMesh, deltaTime) {
  const data = neoMesh.userData;
  
  // Update mean anomaly (simplified - in real simulation, you'd solve Kepler's equation)
  data.meanAnomaly += data.meanMotion * deltaTime * 100; // Speed factor
  
  // Keep mean anomaly in [0, 2π] range
  data.meanAnomaly = data.meanAnomaly % (2 * Math.PI);
  
  // Solve Kepler's equation for eccentric anomaly (using iterative approximation)
  let E = data.meanAnomaly; // Initial guess
  for (let i = 0; i < 10; i++) { // Newton-Raphson iteration
    E = E - (E - data.eccentricity * Math.sin(E) - data.meanAnomaly) / (1 - data.eccentricity * Math.cos(E));
  }
  
  // Calculate true anomaly
  const trueAnomaly = 2 * Math.atan2(
    Math.sqrt(1 + data.eccentricity) * Math.sin(E / 2),
    Math.sqrt(1 - data.eccentricity) * Math.cos(E / 2)
  );
  
  // Calculate distance from focus
  const r = data.semiMajorAxis * (1 - data.eccentricity * Math.cos(E));
  
  // Position in orbital plane
  const xOrbital = r * Math.cos(trueAnomaly);
  const yOrbital = 0;
  const zOrbital = r * Math.sin(trueAnomaly);
  
  // Apply orbital orientation transformations
  // 1. Apply argument of periapsis (rotation around Z in orbital plane)
  const x1 = xOrbital * Math.cos(data.argumentOfPeriapsis) - zOrbital * Math.sin(data.argumentOfPeriapsis);
  const z1 = xOrbital * Math.sin(data.argumentOfPeriapsis) + zOrbital * Math.cos(data.argumentOfPeriapsis);
  
  // 2. Apply inclination (rotation around X)
  const x2 = x1;
  const y2 = yOrbital * Math.cos(data.inclination) - z1 * Math.sin(data.inclination);
  const z2 = yOrbital * Math.sin(data.inclination) + z1 * Math.cos(data.inclination);
  
  // 3. Apply longitude of ascending node (rotation around Y)
  const x3 = x2 * Math.cos(data.longitudeOfAscendingNode) - z2 * Math.sin(data.longitudeOfAscendingNode);
  const y3 = y2;
  const z3 = x2 * Math.sin(data.longitudeOfAscendingNode) + z2 * Math.cos(data.longitudeOfAscendingNode);
  
  neoMesh.position.set(x3, y3, z3);
  data.trueAnomaly = trueAnomaly;
}

// --- Draw NEO Orbit ---
function drawNEOOrbit(neoData, color = NEO_ORBIT_COLOR) {
  const {
    semiMajorAxis,
    eccentricity,
    inclination,
    longitudeOfAscendingNode,
    argumentOfPeriapsis
  } = neoData;

  // Convert to radians
  const incRad = THREE.MathUtils.degToRad(inclination);
  const omegaRad = THREE.MathUtils.degToRad(longitudeOfAscendingNode);
  const wRad = THREE.MathUtils.degToRad(argumentOfPeriapsis);

  const a = semiMajorAxis * AU * scaleFactor;
  const e = eccentricity;
  const b = a * Math.sqrt(1 - e * e); // semi-minor axis
  
  const segments = 512;
  const points = [];

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    
    // Elliptical coordinates in orbital plane
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
    const xOrbital = r * Math.cos(theta);
    const yOrbital = 0;
    const zOrbital = r * Math.sin(theta);
    
    // Apply orbital orientation transformations (same as in position calculation)
    const x1 = xOrbital * Math.cos(wRad) - zOrbital * Math.sin(wRad);
    const z1 = xOrbital * Math.sin(wRad) + zOrbital * Math.cos(wRad);
    
    const x2 = x1;
    const y2 = yOrbital * Math.cos(incRad) - z1 * Math.sin(incRad);
    const z2 = yOrbital * Math.sin(incRad) + z1 * Math.cos(incRad);
    
    const x3 = x2 * Math.cos(omegaRad) - z2 * Math.sin(omegaRad);
    const y3 = y2;
    const z3 = x2 * Math.sin(omegaRad) + z2 * Math.cos(omegaRad);
    
    points.push(new THREE.Vector3(x3, y3, z3));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.3,
    linewidth: 1
  });
  
  const orbitLine = new THREE.Line(geometry, material);
  orbitLine.frustumCulled = false;
  orbitLine.userData = { isNEOOrbit: true };
  scene.add(orbitLine);
}

// --- Add NEOs to Scene ---
function addNEOsToScene() {
  neos.forEach(neo => {
    drawNEO(neo, neo.name, neo.radius);
  });
}

// --- SINGLE CORRECTED Animate function ---
function animate() {
  const delta = clock.getDelta();

  globe.rotateY(delta * 0.5);

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

  // Update NEOs with proper orbital mechanics
  neoMeshes.forEach(neoMesh => {
    updateNEOPosition(neoMesh, delta);
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
      label.lookAt(camera.position);
      
      const distance = camera.position.distanceTo(planet.position);
      const scale = Math.max(10, distance * 0.005);
      label.scale.setScalar(scale);
    }
  });

  // Update NEO labels
  neoLabels.forEach(label => {
    if (label.userData.neo) {
      const neo = label.userData.neo;
      const neoRadius = neo.geometry.parameters.radius;
      
      label.position.copy(neo.position);
      label.position.y += neoRadius * 8; // Larger offset for NEOs
      label.lookAt(camera.position);
      
      const distance = camera.position.distanceTo(neo.position);
      const scale = Math.max(8, distance * 0.004);
      label.scale.setScalar(scale);
    }
  });

  // Update city labels
  globe.children.forEach(child => {
    if (child.isSprite) {
      child.lookAt(camera.position);
      const distance = camera.position.distanceTo(child.position);
      const scale = Math.max(5, distance * 0.003);
      child.scale.setScalar(scale);
    }
  });

  renderer.render(scene, camera);
}

// --- Initialize everything ---
addNEOsToScene(); // Add NEOs to the scene
loadCities(); // Load cities

// Start the animation
renderer.setAnimationLoop(animate);

// --- Handle window resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});