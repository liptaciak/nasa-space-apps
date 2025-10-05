import * as THREE from "three/webgpu";
import { normalWorldGeometry, texture, vec3, vec4, normalize, positionWorld, cameraPosition, color, uniform, mix } from "three/tsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

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

const closeAsteroidDetailsBtn = document.getElementById("closeAsteroidDetails");
closeAsteroidDetailsBtn.addEventListener("click", () => {
  const asteroidDetails = document.getElementById("asteroidDetails");
  if (asteroidDetails) {
    asteroidDetails.classList.add("hidden");
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


const mapBtn = document.getElementById('mapButton');
const mapModal = document.getElementById('mapModal');
const closeMapModal = document.getElementById('closeMapModal');
let osmMap; // Global to avoid re-init

mapBtn.addEventListener('click', () => {
  mapModal.classList.remove('hidden');
  mapModal.classList.add('flex');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        if (!osmMap) {
          osmMap = L.map('mapContainer', {
            center: [0, 0],
            zoom: 3,
            attributionControl: true
          });
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(osmMap);
          const impactSite = [0, 0]; // Placeholder; could be dynamic lat/lon
          L.marker(impactSite).addTo(osmMap)
            .bindPopup('Simulated Impact Site')
            .openPopup();
          L.circle(impactSite, {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.3,
            radius: 90000  // Crater (~90 km)
          }).addTo(osmMap).bindPopup('Crater Radius (~90 km)');
          L.circle(impactSite, {
            color: 'orange',
            fillColor: '#ff9900',
            fillOpacity: 0.2,
            radius: 220000  // Fireball (~220 km)
          }).addTo(osmMap).bindPopup('Fireball Radius (~220 km)');
          L.circle(impactSite, {
            color: 'brown',
            fillColor: '#8b4513',
            fillOpacity: 0.1,
            radius: 4400000  // Ejecta (~4400 km)
          }).addTo(osmMap).bindPopup('Ejecta Radius (~4400 km)');
          L.circle(impactSite, {
            color: 'blue',
            fillColor: '#0000ff',
            fillOpacity: 0.1,
            radius: 5000000  // Tsunami (~5000 km, approximate affected zone)
          }).addTo(osmMap).bindPopup('Tsunami Affected Radius (~5000 km)');
          setTimeout(() => {
            if (osmMap) osmMap.invalidateSize();
          }, 100);
        } else {
          osmMap.invalidateSize();
        }
      } catch (error) {
        console.error('Leaflet init error:', error);
      }
    });
  });

  // Optional: Dynamically update stats based on current asteroid data
  // For now, stats are static in HTML; could fetch/populate here if API-integrated
  updateMapStats(); // Define this function if making dynamic
});

function updateMapStats() {
  // Example dynamic update (placeholder - integrate with asteroid data)
  const statsEl = document.getElementById('mapStats');
  // Could update innerHTML or specific elements based on current NEO
  // e.g., statsEl.querySelector('li:nth-child(1)').textContent = `Countries: ${dynamicData.countries}`;
}

closeMapModal.addEventListener('click', () => {
    mapModal.classList.add('hidden');
    mapModal.classList.remove('flex');
});

mapModal.addEventListener('click', (e) => {
    if (e.target === mapModal) {
        mapModal.classList.add('hidden');
        mapModal.classList.remove('flex');
    }
});

const essentialStatsBtn = document.getElementById("essentialStats");
const orbitalStatsBtn = document.getElementById("orbitalStats");
const impactEffectsBtn = document.getElementById("impactEffects");

const essentialStatsDot = document.getElementById("essentialStatsDot");
const orbitalStatsDot = document.getElementById("orbitalStatsDot");
const impactEffectsDot = document.getElementById("impactEffectsDot");

const essentialStatsDetails = document.getElementById("essentialStatsDetails");
const orbitalStatsDetails = document.getElementById("orbitalStatsDetails");
const impactEffectsDetails = document.getElementById("impactEffectsDetails");

let currentStatsTab = 0;

// --- SEARCH MODAL FUNCTIONALITY ---
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
let allNeos = [];

// Load NEOs for searching (reuse same data as approaches)
fetch('./assets/asteroids.json')
  .then(response => response.json())
  .then(data => {
    allNeos = data;
    renderSearchResults(''); // show all by default
  });

function renderSearchResults(query) {
  if (!searchResults) return;
  searchResults.innerHTML = '';
  const filtered = allNeos.filter(neo =>
    neo.name && neo.name.toLowerCase().includes(query.toLowerCase())
  );
  if (filtered.length === 0) {
    searchResults.innerHTML = '<span class="text-gray-500">No results found.</span>';
    return;
  }
  filtered.forEach(neo => {
    if (!neo.approach_date) return; // skip if no approachDate
    const approachDate = new Date(neo.approach_date); // already ms
    const formattedDate = approachDate.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: '2-digit'
    });
    const div = document.createElement('div');
    div.className = 'flex justify-between items-center group hover:cursor-pointer';

    div.onclick = () => {
      const asteroidDetails = document.getElementById('asteroidDetails');
      if (asteroidDetails) {
        asteroidDetails.classList.remove('hidden');

        searchModal.classList.add("hidden");
        searchModal.classList.remove("flex");
      }
    };

    div.innerHTML = `
      <p class="font-mono text-gray-300 group-hover:text-white">${neo.name}</p>
      <span class="text-sm text-gray-500">Approach Date: ${formattedDate}</span>
    `;
    searchResults.appendChild(div);
  });
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    renderSearchResults(e.target.value);
  });
}

// Load NEOs and populate approaches list
fetch('./assets/asteroids.json')
  .then(response => response.json())
  .then(data => {
    const approachesList = document.getElementById('approachesList');
    if (!approachesList) return;

    approachesList.innerHTML = '';
    // Sort by approach_date (epoch, ascending)
    data.sort((a, b) => (a.approach_date || 0) - (b.approach_date || 0));
    data.forEach(neo => {
      if (!neo.approach_date) return; // skip if no approachDate
      const approachDate = new Date(neo.approach_date); // already ms
      const formattedDate = approachDate.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: '2-digit'
      });
      const div = document.createElement('div');
      div.className = 'flex justify-between items-center group hover:cursor-pointer';

      div.onclick = () => {
        const asteroidDetails = document.getElementById('asteroidDetails');
        if (asteroidDetails) {
          asteroidDetails.classList.remove('hidden');

          approachesModal.classList.add("hidden");
          approachesModal.classList.remove("flex");
        }
      };

      div.innerHTML = `
        <p class="font-mono text-gray-300 group-hover:text-white">${neo.name}</p>
        <span class="text-sm text-gray-500">Approach Date: ${formattedDate}</span>
      `;
      approachesList.appendChild(div);
    });
  })
  .catch(err => {
    const approachesList = document.getElementById('approachesList');
    if (approachesList) {
      approachesList.innerHTML = '<span class="text-red-400">Failed to load NEO data.</span>';
    }
  });

function updateStatsTab() {
  if (currentStatsTab === 0) {
    essentialStatsBtn.classList.remove("text-gray-300");
    essentialStatsBtn.classList.add("text-white", "underline", "underline-offset-6");

    essentialStatsDot.classList.remove("bg-gray-400", "size-2");
    essentialStatsDot.classList.add("bg-white", "size-3");

    orbitalStatsBtn.classList.remove("text-white", "underline", "underline-offset-6");
    impactEffectsBtn.classList.remove("text-white", "underline", "underline-offset-6");

    orbitalStatsBtn.classList.add("text-gray-300");
    impactEffectsBtn.classList.add("text-gray-300");

    orbitalStatsDot.classList.remove("bg-white", "size-3");
    orbitalStatsDot.classList.add("bg-gray-400", "size-2");

    impactEffectsDot.classList.remove("bg-white", "size-3");
    impactEffectsDot.classList.add("bg-gray-400", "size-2");

    essentialStatsDetails.classList.remove("hidden");
    orbitalStatsDetails.classList.add("hidden");
    impactEffectsDetails.classList.add("hidden");
  } else if (currentStatsTab === 1) {
    orbitalStatsBtn.classList.remove("text-gray-300");
    orbitalStatsBtn.classList.add("text-white", "underline", "underline-offset-6");

    orbitalStatsDot.classList.remove("bg-gray-400", "size-2");
    orbitalStatsDot.classList.add("bg-white", "size-3");

    essentialStatsBtn.classList.remove("text-white", "underline", "underline-offset-6");
    impactEffectsBtn.classList.remove("text-white", "underline", "underline-offset-6");

    essentialStatsBtn.classList.add("text-gray-300");
    impactEffectsBtn.classList.add("text-gray-300");

    essentialStatsDot.classList.remove("bg-white", "size-3");
    essentialStatsDot.classList.add("bg-gray-400", "size-2");

    impactEffectsDot.classList.remove("bg-white", "size-3");
    impactEffectsDot.classList.add("bg-gray-400", "size-2");

    essentialStatsDetails.classList.add("hidden");
    orbitalStatsDetails.classList.remove("hidden");
    impactEffectsDetails.classList.add("hidden");
  } else if (currentStatsTab === 2) {
    impactEffectsBtn.classList.remove("text-gray-300");
    impactEffectsBtn.classList.add("text-white", "underline", "underline-offset-6");

    impactEffectsDot.classList.remove("bg-gray-400", "size-2");
    impactEffectsDot.classList.add("bg-white", "size-3");

    essentialStatsBtn.classList.remove("text-white", "underline", "underline-offset-6");
    orbitalStatsBtn.classList.remove("text-white", "underline", "underline-offset-6");

    essentialStatsBtn.classList.add("text-gray-300");
    orbitalStatsBtn.classList.add("text-gray-300");

    essentialStatsDot.classList.remove("bg-white", "size-3");
    essentialStatsDot.classList.add("bg-gray-400", "size-2");

    orbitalStatsDot.classList.remove("bg-white", "size-3");
    orbitalStatsDot.classList.add("bg-gray-400", "size-2");

    essentialStatsDetails.classList.add("hidden");
    orbitalStatsDetails.classList.add("hidden");
    impactEffectsDetails.classList.remove("hidden");
  }
}

essentialStatsBtn.addEventListener("click", () => {
  currentStatsTab = 0;
  updateStatsTab();
});

orbitalStatsBtn.addEventListener("click", () => {
  currentStatsTab = 1;
  updateStatsTab();
});

impactEffectsBtn.addEventListener("click", () => {
  currentStatsTab = 2;
  updateStatsTab();
});

const previousTabBtn = document.getElementById("previousTab");
const nextTabBtn = document.getElementById("nextTab");

previousTabBtn.addEventListener("click", () => {
  currentStatsTab = (currentStatsTab - 1 + 3) % 3;
  updateStatsTab();
});

nextTabBtn.addEventListener("click", () => {
  currentStatsTab = (currentStatsTab + 1) % 3;
  updateStatsTab();
});

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

// Load other planet textures
const mercuryTexture = textureLoader.load("assets/textures/mercury.jpg");
const venusTexture = textureLoader.load("assets/textures/venus.jpg");
const marsTexture = textureLoader.load("assets/textures/mars.jpg");
const jupiterTexture = textureLoader.load("assets/textures/jupiter.jpg");
const saturnTexture = textureLoader.load("assets/textures/saturn.jpg");
const saturnRingTexture = textureLoader.load("assets/textures/saturn_ring.png");
const uranusTexture = textureLoader.load("assets/textures/uranus.jpg");
const neptuneTexture = textureLoader.load("assets/textures/neptune.jpg");
const moonTexture = textureLoader.load("assets/textures/moon.jpg");

// --- Sun ---
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(sunRadius, 64, 64),
  new THREE.MeshBasicMaterial({
    map: sunTexture,
    toneMapped: false
  })
);
scene.add(sunMesh);

// --- Enhanced Lighting System ---
const sunLight = new THREE.DirectionalLight("#ffffff", 3);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Ambient light to ensure all objects are visible
const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
scene.add(ambientLight);

// Point light at sun position for additional illumination
const pointLight = new THREE.PointLight(0xffffff, 1, 100000);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Hemisphere light for natural outdoor lighting
const hemisphereLight = new THREE.HemisphereLight(0x4444ff, 0x202020, 0.3);
scene.add(hemisphereLight);

// --- Realistic Orbital Periods (in Earth years) ---
const orbitalPeriods = {
  Mercury: 0.24,
  Venus: 0.62,
  Earth: 1.00,
  Mars: 1.88,
  Jupiter: 11.86,
  Saturn: 29.46,
  Uranus: 84.01,
  Neptune: 164.8
};

// --- Calculate realistic orbital speed ---
function calculateOrbitalSpeed(planetName, radiusAU) {
  // Get actual orbital period from data
  const orbitalPeriodYears = orbitalPeriods[planetName];

  // Convert to angular speed (radians per second)
  const orbitalPeriodSeconds = orbitalPeriodYears * 365.25 * 24 * 60 * 60;
  const angularSpeed = (2 * Math.PI) / orbitalPeriodSeconds;

  // Scale for animation - make orbits visible in reasonable time
  const animationScale = 5000;

  return angularSpeed * animationScale;
}

// --- Moons Data ---
const moonsData = {
  Earth: [
    { name: "Moon", radius: 0.27, distance: 25, color: 0x888888, orbitSpeed: 0.5, texture: moonTexture }
  ],
  Mars: [
    { name: "Phobos", radius: 0.15, distance: 12, color: 0xaaaaaa, orbitSpeed: 1.0 },
    { name: "Deimos", radius: 0.12, distance: 18, color: 0x999999, orbitSpeed: 0.8 }
  ],
  Jupiter: [
    { name: "Io", radius: 0.4, distance: 25, color: 0xffaa66, orbitSpeed: 0.7 },
    { name: "Europa", radius: 0.35, distance: 35, color: 0xffffff, orbitSpeed: 0.6 },
    { name: "Ganymede", radius: 0.5, distance: 45, color: 0xcccccc, orbitSpeed: 0.5 }
  ],
  Saturn: [
    { name: "Mimas", radius: 0.15, distance: 20, color: 0xdddddd, orbitSpeed: 0.9 },
    { name: "Enceladus", radius: 0.18, distance: 28, color: 0xeeeeee, orbitSpeed: 0.8 },
    { name: "Titan", radius: 0.6, distance: 40, color: 0xffcc99, orbitSpeed: 0.4 }
  ],
  Uranus: [
    { name: "Miranda", radius: 0.12, distance: 18, color: 0xccccff, orbitSpeed: 1.1 },
    { name: "Ariel", radius: 0.2, distance: 25, color: 0xaaaaff, orbitSpeed: 0.9 }
  ],
  Neptune: [
    { name: "Triton", radius: 0.4, distance: 25, color: 0x66aaff, orbitSpeed: 0.5 },
    { name: "Nereid", radius: 0.12, distance: 45, color: 0x88bbff, orbitSpeed: 0.3 }
  ]
};

const moonMeshes = [];
const moonLabels = [];
const moonOrbits = [];

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
    opacity: 0.6,
    linewidth: 1
  });

  const orbitLine = new THREE.Line(geometry, material);
  orbitLine.userData = { planet: planetMesh };
  orbitLine.frustumCulled = false;

  // Add orbit to the planet so it moves with the planet
  planetMesh.add(orbitLine);
  moonOrbits.push(orbitLine);

  return orbitLine;
}

// --- Create Moon Function ---
function createMoon(planetMesh, moonData, moonIndex) {
  const planetRadius = planetMesh.geometry.parameters.radius;
  const moonRadius = planetRadius * moonData.radius;
  const moonDistance = planetRadius * moonData.distance;

  // Create moon mesh
  const moonMaterial = new THREE.MeshStandardMaterial({
    map: moonData.texture || null,
    color: moonData.texture ? 0xffffff : moonData.color,
    roughness: 0.8,
    metalness: 0.2
  });

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(moonRadius, 16, 16),
    moonMaterial
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
    angle: angle
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
    label.position.y += moonRadius * 3;
    planetMesh.add(label);
    moonLabels.push(label);
  }

  console.log(`Added moon: ${moonData.name} to ${planetMesh.userData.name}`);
}

// --- Earth with TSL Shader ---
const earthRadius = planetScale;
const globe = new THREE.Group();
globe.name = "earth";

// TSL Shader Material for Earth
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
earth.name = "earth_mesh";
globe.add(earth);

// Atmosphere
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
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 50;
controls.maxDistance = 100000;
controls.target.copy(globe.position);

// --- Planets with Textures ---
const planets = [
  { name: "Mercury", radiusAU: 0.387, inclination: 7, color: 0x888888, size: 0.38, hasMoons: false, texture: mercuryTexture },
  { name: "Venus", radiusAU: 0.723, inclination: 3.39, color: 0xe6b856, size: 0.95, hasMoons: false, texture: venusTexture },
  { name: "Earth", radiusAU: 1.0, inclination: 0, color: 0x2233ff, size: 1.0, hasMoons: true, texture: dayTexture },
  { name: "Mars", radiusAU: 1.524, inclination: 1.85, color: 0xff6633, size: 0.53, hasMoons: true, texture: marsTexture },
  { name: "Jupiter", radiusAU: 5.203, inclination: 1.3, color: 0xffaa66, size: 11.2, hasMoons: true, texture: jupiterTexture },
  { name: "Saturn", radiusAU: 9.537, inclination: 2.49, color: 0xffdd99, size: 9.45, hasMoons: true, texture: saturnTexture, hasRings: true },
  { name: "Uranus", radiusAU: 19.191, inclination: 0.77, color: 0x99ddff, size: 4.01, hasMoons: true, texture: uranusTexture },
  { name: "Neptune", radiusAU: 30.07, inclination: 1.77, color: 0x3366ff, size: 3.88, hasMoons: true, texture: neptuneTexture }
];

const planetMeshes = [];
const planetLabels = [];

// --- Create Saturn's Rings ---
function createSaturnRings(planetMesh) {
  const innerRadius = planetMesh.geometry.parameters.radius * 1.5;
  const outerRadius = planetMesh.geometry.parameters.radius * 2.5;
  const thetaSegments = 64;

  const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, thetaSegments);
  const ringMaterial = new THREE.MeshBasicMaterial({
    map: saturnRingTexture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    alphaTest: 0.5
  });

  const rings = new THREE.Mesh(ringGeometry, ringMaterial);
  rings.rotation.x = Math.PI / 2;
  planetMesh.add(rings);

  return rings;
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
  const material = new THREE.MeshStandardMaterial({
    map: p.texture || null,
    color: p.texture ? 0xffffff : p.color,
    roughness: 0.8,
    metalness: 0.2
  });

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 32),
    material
  );

  const orbitalRadius = p.radiusAU * AU * scaleFactor;
  const angle = Math.random() * Math.PI * 2;
  const incRad = THREE.MathUtils.degToRad(p.inclination);

  // Calculate realistic orbital speed
  const realisticOrbitSpeed = calculateOrbitalSpeed(p.name, p.radiusAU);

  mesh.userData = {
    name: p.name,
    orbitalRadius: orbitalRadius,
    orbitSpeed: realisticOrbitSpeed,
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

  // Create Saturn's rings
  if (p.name === "Saturn" && p.hasRings) {
    createSaturnRings(mesh);
  }

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

// --- NEOs ---
async function load_neos(){
    const res = await fetch("assets/neos.json");
    const neoData = await res.json();
    return neoData;
}
const neos = await load_neos();

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

// --- Animate function ---
function animate() {
  const delta = clock.getDelta();

  // Rotate Earth
  globe.rotateY(delta * 0.5);

  const previousEarthPosition = globe.position.clone();

  // Update planets with realistic orbital speeds
  planetMeshes.forEach(mesh => {
    const data = mesh.userData;
    data.angle += data.orbitSpeed * delta; // Realistic speed

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

  // Update moons
  moonMeshes.forEach(moon => {
    const data = moon.userData;
    data.angle += data.orbitSpeed * delta;

    // Update moon's local position relative to its parent planet
    moon.position.set(
      data.distance * Math.cos(data.angle),
      0,
      data.distance * Math.sin(data.angle)
    );
  });

  // Update Earth position with realistic speed
  if (!globe.userData.angle) {
    globe.userData.angle = 0;
    globe.userData.orbitSpeed = calculateOrbitalSpeed("Earth", 1.0);
  }

  globe.userData.angle += globe.userData.orbitSpeed * delta;
  const earthOrbitalRadius = 1.0 * AU * scaleFactor;
  const earthX = earthOrbitalRadius * Math.cos(globe.userData.angle);
  const earthZ = earthOrbitalRadius * Math.sin(globe.userData.angle);
  globe.position.set(earthX, 0, earthZ);

  // Update lighting to follow sun
  sunLight.position.copy(sunMesh.position);
  pointLight.position.copy(sunMesh.position);

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
