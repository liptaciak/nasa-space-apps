import * as THREE from "three/webgpu";
import { normalWorldGeometry, texture, vec3, vec4, normalize, positionWorld, cameraPosition, color, uniform, mix } from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { makeTextSprite } from "./drawingUtils";

// --- Constants ---
const AU = 149597870.7; // km
const scaleFactor = 0.00005;
const planetScale = 50;
const sunRadius = 300;

// --- Orbit Colors ---
const ORBIT_COLOR = 0xffffff;
const NEO_ORBIT_COLOR = 0xff4444;
const MOON_ORBIT_COLOR = 0x8888ff;

// --- Label Scaling Constants ---
const LABEL_SCALE_FACTOR = 0.0001;
const MIN_LABEL_SCALE = 0.3;
const MAX_LABEL_SCALE = 2.0;

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
const nightTexture = textureLoader.load("assets/textures/earth_night.webp");
nightTexture.colorSpace = THREE.SRGBColorSpace;
const bgTexture = textureLoader.load("assets/textures/milky_way.webp");
bgTexture.colorSpace = THREE.SRGBColorSpace;
scene.background = bgTexture;

// --- Sun ---
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(sunRadius, 64, 64),
  new THREE.MeshBasicMaterial({ map: sunTexture })
);
scene.add(sunMesh);

// --- Lighting (Like your example) ---
const sunLight = new THREE.DirectionalLight("#ffffff", 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// --- Moons Data ---
const moonsData = {
  Earth: [
    { name: "Moon", radius: 0.27, distance: 8, color: 0x888888, orbitSpeed: 0.1 }
  ],
  Mars: [
    { name: "Phobos", radius: 0.15, distance: 6, color: 0xaaaaaa, orbitSpeed: 0.2 },
    { name: "Deimos", radius: 0.12, distance: 8, color: 0x999999, orbitSpeed: 0.15 }
  ],
  Jupiter: [
    { name: "Io", radius: 0.4, distance: 15, color: 0xffaa66, orbitSpeed: 0.3 },
    { name: "Europa", radius: 0.35, distance: 20, color: 0xffffff, orbitSpeed: 0.25 },
    { name: "Ganymede", radius: 0.5, distance: 25, color: 0xcccccc, orbitSpeed: 0.2 }
  ],
  Saturn: [
    { name: "Mimas", radius: 0.2, distance: 15, color: 0xdddddd, orbitSpeed: 0.4 },
    { name: "Enceladus", radius: 0.22, distance: 18, color: 0xeeeeee, orbitSpeed: 0.35 },
    { name: "Titan", radius: 0.6, distance: 22, color: 0xffcc99, orbitSpeed: 0.15 }
  ],
  Uranus: [
    { name: "Miranda", radius: 0.15, distance: 12, color: 0xccccff, orbitSpeed: 0.5 },
    { name: "Ariel", radius: 0.2, distance: 15, color: 0xaaaaff, orbitSpeed: 0.4 },
    { name: "Umbriel", radius: 0.18, distance: 18, color: 0x9999ff, orbitSpeed: 0.35 }
  ],
  Neptune: [
    { name: "Triton", radius: 0.4, distance: 15, color: 0x66aaff, orbitSpeed: 0.2 },
    { name: "Nereid", radius: 0.12, distance: 25, color: 0x88bbff, orbitSpeed: 0.1 },
    { name: "Proteus", radius: 0.16, distance: 20, color: 0x77aaff, orbitSpeed: 0.3 }
  ]
};

const moonMeshes = [];
const moonLabels = [];
const moonOrbits = [];

// --- Earth with TSL Shader (Like your example) ---
const earthRadius = planetScale;
const globe = new THREE.Group();
globe.name = "earth";

// TSL Shader Material for Earth (like your example)
const atmosphereDayColor = uniform(color("#4db2ff"));
const atmosphereTwilightColor = uniform(color("#000000"));

const viewDirection = positionWorld.sub(cameraPosition).normalize();
const fresnel = viewDirection.dot(normalWorldGeometry).abs().oneMinus().toVar();

const lightDir = normalize(vec3(0,0,0).sub(positionWorld));
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

// Create Earth mesh with TSL shader
const earth = new THREE.Mesh(
  new THREE.SphereGeometry(earthRadius, 64, 64),
  globeMaterial
);
globe.add(earth);

// Atmosphere (like your example)
const atmosphereMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, transparent: true });
let alpha = fresnel.remap(0.73, 1, 1, 0).pow(3);
const lightFactor = sunOrientation.smoothstep(-0.5, 1).clamp(0,1);
const litColor = atmosphereDayColor;
const darkColor = color("#001020");
const finalColor = mix(darkColor, litColor, lightFactor);
alpha = alpha.mul(mix(0.3, 1.0, lightFactor));
atmosphereMaterial.outputNode = vec4(finalColor, alpha);

const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(earthRadius, 64, 64),
  atmosphereMaterial
);
atmosphere.scale.setScalar(1.06);
globe.add(atmosphere);

scene.add(globe);

// --- Camera & Controls ---
camera.position.set(0, 200, 500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = false;
controls.minDistance = 50;
controls.maxDistance = 100000;
controls.target.copy(globe.position);

// --- Planets ---
const planets = [
  { name: "Mercury", radiusAU: 0.387, inclination: 7, color: 0x888888, size: 0.38, hasMoons: false },
  { name: "Venus", radiusAU: 0.723, inclination: 3.39, color: 0xe6b856, size: 0.95, hasMoons: false },
  { name: "Earth", radiusAU: 1.0, inclination: 0, color: 0x2233ff, size: 1.0, hasMoons: true },
  { name: "Mars", radiusAU: 1.524, inclination: 1.85, color: 0xff6633, size: 0.53, hasMoons: true },
  { name: "Jupiter", radiusAU: 5.203, inclination: 1.3, color: 0xffaa66, size: 11.2, hasMoons: true },
  { name: "Saturn", radiusAU: 9.537, inclination: 2.49, color: 0xffdd99, size: 9.45, hasMoons: true },
  { name: "Uranus", radiusAU: 19.191, inclination: 0.77, color: 0x99ddff, size: 4.01, hasMoons: true },
  { name: "Neptune", radiusAU: 30.07, inclination: 1.77, color: 0x3366ff, size: 3.88, hasMoons: true }
];

const planetMeshes = [];
const planetLabels = [];

// --- Text Sprite Function ---
function createFixedTextSprite(text, parameters = {}) {
  const fontsize = parameters.fontsize || 24;
  const fillStyle = parameters.fillStyle || "#ffffff";
  const backgroundColor = parameters.backgroundColor || "rgba(0,0,0,0.8)";
  const padding = parameters.padding || 8;
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const resolutionScale = 2;
  
  context.font = `Bold ${fontsize * resolutionScale}px Arial`;
  const metrics = context.measureText(text);
  const textWidth = metrics.width;
  
  canvas.width = (textWidth + padding * 2 * resolutionScale);
  canvas.height = (fontsize * resolutionScale + padding * 2 * resolutionScale);
  
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  context.font = `Bold ${fontsize * resolutionScale}px Arial`;
  context.fillStyle = fillStyle;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  const material = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true
  });
  
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width / (40 * resolutionScale), canvas.height / (40 * resolutionScale), 1);
  sprite.userData.originalScale = sprite.scale.clone();
  
  return sprite;
}

// --- Create Moon Orbit ---
function createMoonOrbit(planetMesh, moonDistance) {
  const segments = 64;
  const points = [];
  
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = moonDistance * Math.cos(theta);
    const z = moonDistance * Math.sin(theta);
    points.push(new THREE.Vector3(x, 0, z));
  }
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ 
    color: MOON_ORBIT_COLOR, 
    transparent: true, 
    opacity: 0.3,
    linewidth: 1
  });
  
  const orbitLine = new THREE.Line(geometry, material);
  orbitLine.userData = { planet: planetMesh };
  orbitLine.frustumCulled = false;
  scene.add(orbitLine);
  moonOrbits.push(orbitLine);
  
  return orbitLine;
}

// --- Create Moon Function ---
function createMoon(planetMesh, moonData, moonIndex) {
  const planetRadius = planetMesh.geometry.parameters.radius;
  const moonRadius = planetRadius * moonData.radius;
  const moonDistance = planetRadius * moonData.distance;
  
  // Create moon mesh
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(moonRadius, 12, 12),
    new THREE.MeshStandardMaterial({ 
      color: moonData.color,
      roughness: 0.8,
      metalness: 0.2
    })
  );
  
  // Position moon relative to planet
  const angle = (moonIndex / (moonsData[planetMesh.userData.name]?.length || 1)) * Math.PI * 2;
  moon.position.set(
    moonDistance * Math.cos(angle),
    0,
    moonDistance * Math.sin(angle)
  );
  
  moon.userData = {
    name: moonData.name,
    planet: planetMesh,
    distance: moonDistance,
    orbitSpeed: moonData.orbitSpeed,
    angle: angle,
    localPosition: moon.position.clone() // Store local position
  };
  
  // Add moon to planet (so it moves with the planet)
  planetMesh.add(moon);
  moonMeshes.push(moon);
  
  // Create moon orbit
  createMoonOrbit(planetMesh, moonDistance);
  
  // Create moon label
  const label = createFixedTextSprite(moonData.name, {
    fontsize: 10,
    fillStyle: "#cccccc",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 3
  });
  
  if (label) {
    label.userData.moon = moon;
    label.position.copy(moon.position);
    label.position.y += moonRadius * 4;
    planetMesh.add(label); // Add label to planet so it moves with the planet
    moonLabels.push(label);
  }
  
  console.log(`Added moon: ${moonData.name} to ${planetMesh.userData.name}`);
}

// --- Load Cities ---
async function loadCities() {
  try {
    const res = await fetch("assets/cities.json");
    const cityData = await res.json();

    cityData.forEach((city) => {
      const lat = city.latitude_deg;
      const lon = city.longitude_deg;

      const pos = latLongToVector3(lat, lon, earthRadius * 1.01);

      const dotGeom = new THREE.SphereGeometry(earthRadius * 0.01, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      const dot = new THREE.Mesh(dotGeom, dotMat);
      dot.position.copy(pos);
      globe.add(dot);

      const label = createFixedTextSprite(city.city, {
        fontsize: 120,
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

// --- Latitude/Longitude to Vector3 function ---
function latLongToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
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
    new THREE.MeshStandardMaterial({ 
      color: p.color,
      roughness: 0.8,
      metalness: 0.2
    })
  );

  const orbitalRadius = p.radiusAU * AU * scaleFactor;
  const angle = Math.random() * Math.PI * 2;
  const incRad = THREE.MathUtils.degToRad(p.inclination);

  mesh.userData = {
    name: p.name,
    orbitalRadius: orbitalRadius,
    orbitSpeed: 0.005 + Math.random() * 0.01,
    angle: angle,
    inclination: incRad,
    hasMoons: p.hasMoons
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

  // Create moons for this planet if it has them
  if (p.hasMoons && moonsData[p.name]) {
    moonsData[p.name].forEach((moon, index) => {
      createMoon(mesh, moon, index);
    });
  }

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

// Add Earth label
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

// Create moons for Earth
if (moonsData.Earth) {
  moonsData.Earth.forEach((moon, index) => {
    createMoon(earth, moon, index);
  });
}

// --- NEOs ---
const neos = [
  {
    name: "Apophis", semiMajorAxis: 0.922, eccentricity: 0.191, inclination: 3.3,
    longitudeOfAscendingNode: 204.4, argumentOfPeriapsis: 126.4, meanAnomaly: 180,
    radius: 0.2, color: 0xff4444
  }
];

const neoMeshes = [];
const neoLabels = [];

// --- Draw NEO Function ---
function drawNEO(neoData, name, radius) {
  const { semiMajorAxis, eccentricity, inclination, longitudeOfAscendingNode, argumentOfPeriapsis, meanAnomaly, color } = neoData;

  const incRad = THREE.MathUtils.degToRad(inclination);
  const omegaRad = THREE.MathUtils.degToRad(longitudeOfAscendingNode);
  const wRad = THREE.MathUtils.degToRad(argumentOfPeriapsis);
  const M0Rad = THREE.MathUtils.degToRad(meanAnomaly);

  const a = semiMajorAxis * AU * scaleFactor;
  const orbitalPeriod = Math.sqrt(Math.pow(semiMajorAxis, 3));
  const meanMotion = (2 * Math.PI) / (orbitalPeriod * 365.25);

  const neoRadius = planetScale * radius;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(neoRadius, 16, 16),
    new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.9 })
  );

  mesh.userData = { name, semiMajorAxis: a, eccentricity, inclination: incRad, longitudeOfAscendingNode: omegaRad,
    argumentOfPeriapsis: wRad, meanAnomaly: M0Rad, meanMotion, trueAnomaly: 0, orbitalPeriod };

  updateNEOPosition(mesh, 0);
  scene.add(mesh);
  neoMeshes.push(mesh);

  const label = createFixedTextSprite(name, { fontsize: 12, fillStyle: "#ff8888", padding: 4 });
  if (label) {
    label.userData.neo = mesh;
    label.position.copy(mesh.position);
    label.position.y += neoRadius * 5;
    scene.add(label);
    neoLabels.push(label);
  }

  drawNEOOrbit(neoData, NEO_ORBIT_COLOR);
}

// --- Update NEO Position ---
function updateNEOPosition(neoMesh, deltaTime) {
  const data = neoMesh.userData;
  data.meanAnomaly += data.meanMotion * deltaTime * 100;
  data.meanAnomaly %= (2 * Math.PI);
  
  let E = data.meanAnomaly;
  for (let i = 0; i < 10; i++) {
    E = E - (E - data.eccentricity * Math.sin(E) - data.meanAnomaly) / (1 - data.eccentricity * Math.cos(E));
  }
  
  const trueAnomaly = 2 * Math.atan2(Math.sqrt(1 + data.eccentricity) * Math.sin(E / 2), Math.sqrt(1 - data.eccentricity) * Math.cos(E / 2));
  const r = data.semiMajorAxis * (1 - data.eccentricity * Math.cos(E));
  const xOrbital = r * Math.cos(trueAnomaly);
  const zOrbital = r * Math.sin(trueAnomaly);
  
  const x1 = xOrbital * Math.cos(data.argumentOfPeriapsis) - zOrbital * Math.sin(data.argumentOfPeriapsis);
  const z1 = xOrbital * Math.sin(data.argumentOfPeriapsis) + zOrbital * Math.cos(data.argumentOfPeriapsis);
  const x2 = x1;
  const y2 = -z1 * Math.sin(data.inclination);
  const z2 = z1 * Math.cos(data.inclination);
  const x3 = x2 * Math.cos(data.longitudeOfAscendingNode) - z2 * Math.sin(data.longitudeOfAscendingNode);
  const z3 = x2 * Math.sin(data.longitudeOfAscendingNode) + z2 * Math.cos(data.longitudeOfAscendingNode);
  
  neoMesh.position.set(x3, y2, z3);
  data.trueAnomaly = trueAnomaly;
}

// --- Draw NEO Orbit ---
function drawNEOOrbit(neoData, color = NEO_ORBIT_COLOR) {
  const { semiMajorAxis, eccentricity, inclination, longitudeOfAscendingNode, argumentOfPeriapsis } = neoData;
  const incRad = THREE.MathUtils.degToRad(inclination);
  const omegaRad = THREE.MathUtils.degToRad(longitudeOfAscendingNode);
  const wRad = THREE.MathUtils.degToRad(argumentOfPeriapsis);
  const a = semiMajorAxis * AU * scaleFactor;
  const e = eccentricity;
  
  const segments = 512;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
    const xOrbital = r * Math.cos(theta);
    const zOrbital = r * Math.sin(theta);
    
    const x1 = xOrbital * Math.cos(wRad) - zOrbital * Math.sin(wRad);
    const z1 = xOrbital * Math.sin(wRad) + zOrbital * Math.cos(wRad);
    const x2 = x1;
    const y2 = -z1 * Math.sin(incRad);
    const z2 = z1 * Math.cos(incRad);
    const x3 = x2 * Math.cos(omegaRad) - z2 * Math.sin(omegaRad);
    const z3 = x2 * Math.sin(omegaRad) + z2 * Math.cos(omegaRad);
    
    points.push(new THREE.Vector3(x3, y2, z3));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 });
  const orbitLine = new THREE.Line(geometry, material);
  orbitLine.frustumCulled = false;
  scene.add(orbitLine);
}

// --- Add NEOs to Scene ---
function addNEOsToScene() {
  neos.forEach(neo => drawNEO(neo, neo.name, neo.radius));
}

// --- Debug Axes ---
function addDebugAxes() {
  const axesHelper = new THREE.AxesHelper(10000);
  scene.add(axesHelper);
  const gridHelper = new THREE.GridHelper(50000, 100, 0x444444, 0x222222);
  scene.add(gridHelper);
  console.log("Debug axes enabled");
}

addDebugAxes();

// --- Animate function ---
function animate() {
  const delta = clock.getDelta();

  // Rotate Earth
  globe.rotateY(delta * 0.5);

  const previousEarthPosition = globe.position.clone();

  // Update planets
  planetMeshes.forEach(mesh => {
    const data = mesh.userData;
    data.angle += data.orbitSpeed * delta * 10;
    const orbitalRadius = data.orbitalRadius;
    const angle = data.angle;
    const incRad = data.inclination;

    const orbitalX = orbitalRadius * Math.cos(angle);
    const orbitalZ = orbitalRadius * Math.sin(angle);
    const x = orbitalX;
    const y = -orbitalZ * Math.sin(incRad);
    const z = orbitalZ * Math.cos(incRad);

    mesh.position.set(x, y, z);
  });

  // Update NEOs
  neoMeshes.forEach(neoMesh => updateNEOPosition(neoMesh, delta));

  // Update moons (they automatically move with their parent planets)
  moonMeshes.forEach(moon => {
    const data = moon.userData;
    data.angle += data.orbitSpeed * delta * 20;
    
    // Update moon's local position relative to its parent planet
    moon.position.set(
      data.distance * Math.cos(data.angle),
      0,
      data.distance * Math.sin(data.angle)
    );
  });

  // Update moon orbit positions
  moonOrbits.forEach(orbit => {
    const planet = orbit.userData?.planet;
    if (planet) {
      orbit.position.copy(planet.position);
    }
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

  // Update lighting to follow sun
  sunLight.position.copy(sunMesh.position);

  const earthMovement = new THREE.Vector3().subVectors(globe.position, previousEarthPosition);
  camera.position.add(earthMovement);
  controls.target.copy(globe.position);

  // Update all labels
  updateLabels(planetLabels, 3);
  updateLabels(moonLabels, 4);
  updateLabels(neoLabels, 5);

  // Update city labels
  globe.children.forEach(child => {
    if (child.isSprite) {
      child.lookAt(camera.position);
      const distance = camera.position.distanceTo(child.position);
      const scale = Math.min(MAX_LABEL_SCALE * 0.6, Math.max(MIN_LABEL_SCALE * 0.6, distance * LABEL_SCALE_FACTOR * 0.6));
      child.scale.copy(child.userData.originalScale).multiplyScalar(scale);
    }
  });

  renderer.render(scene, camera);
}

// Helper function to update labels
function updateLabels(labels, yOffsetMultiplier) {
  labels.forEach(label => {
    const target = label.userData.planet || label.userData.moon || label.userData.neo;
    if (target) {
      const radius = target.geometry?.parameters.radius || earthRadius;
      // Get world position for labels attached to planets
      const worldPosition = new THREE.Vector3();
      target.getWorldPosition(worldPosition);
      label.position.copy(worldPosition);
      label.position.y += radius * yOffsetMultiplier;
      label.lookAt(camera.position);
      
      const distance = camera.position.distanceTo(worldPosition);
      const scale = Math.min(MAX_LABEL_SCALE, Math.max(MIN_LABEL_SCALE, distance * LABEL_SCALE_FACTOR));
      label.scale.copy(label.userData.originalScale).multiplyScalar(scale);
    }
  });
}

// --- Initialize everything ---
addNEOsToScene();
loadCities();

// Start the animation
renderer.setAnimationLoop(animate);

// --- Handle window resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});