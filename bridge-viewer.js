import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRoadScene } from './road-scene.js';

// Maqueta conceptual: cuatro luces de 60 m y calzada libre entre las patas.
const spec = {
  halfLength: 120,
  deckY: 14,
  deckWidth: 14.8,
  roadWidth: 8.4,
  towerTop: 42,
  cableZ: 6.65,
  supports: [-120, -60, 0, 60, 120],
  towers: [-60, 0, 60]
};

const host = document.getElementById('bridge3d');
const status = document.getElementById('bridge-status');
const scene = new THREE.Scene();
export const bridge = new THREE.Group();
bridge.name = 'Puente atirantado de cuatro tramos';
scene.add(bridge);

export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setClearColor(0x090c0f, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label', 'Modelo 3D de un puente atirantado de cuatro tramos. Arrastra para girar; usa la rueda para acercar.');
renderer.domElement.setAttribute('role', 'img');
renderer.domElement.tabIndex = 0;
host.appendChild(renderer.domElement);

// Un entorno de estudio ilumina los metales sin pintar de celeste el concreto.
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room, 0.04);
scene.environment = environment.texture;
room.dispose();
pmrem.dispose();

scene.add(new THREE.HemisphereLight(0xdce9f1, 0x444b4e, 1.7));
const sunlight = new THREE.DirectionalLight(0xffefd8, 3.2);
sunlight.position.set(-65, 115, 65);
sunlight.target.position.set(0, 12, 0);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
Object.assign(sunlight.shadow.camera, {
  left: -155, right: 155, top: 90, bottom: -90, near: 1, far: 320
});
sunlight.shadow.bias = -0.00015;
sunlight.shadow.normalBias = 0.08;
scene.add(sunlight, sunlight.target);
const fillLight = new THREE.DirectionalLight(0xb9d7e9, 1.15);
fillLight.position.set(55, 35, -80);
scene.add(fillLight);

// Texturas pequeñas y locales: grano del concreto, asfalto y normales del río.
function grainTexture(seed, base, variation) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(128, 128);
  for (let i = 0; i < image.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = base + ((seed / 4294967296) - 0.5) * variation;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function waterNormals() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(128, 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4;
      image.data[i] = 128 + 19 * Math.sin(2 * Math.PI * (x + 2 * y) / 32);
      image.data[i + 1] = 128 + 12 * Math.cos(2 * Math.PI * (2 * x - y) / 32);
      image.data[i + 2] = 250;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 4);
  return texture;
}

const concrete = new THREE.MeshStandardMaterial({
  color: 0xb5b4aa, map: grainTexture(47, 212, 25), roughness: 0.88, metalness: 0
});
const steel = new THREE.MeshStandardMaterial({ color: 0x576b74, roughness: 0.42, metalness: 0.68 });
const galvanized = new THREE.MeshStandardMaterial({ color: 0xbfc9cc, roughness: 0.32, metalness: 0.78 });
const cableMaterial = new THREE.MeshStandardMaterial({ color: 0xd8ddda, roughness: 0.4, metalness: 0.58 });
const asphalt = new THREE.MeshStandardMaterial({
  color: 0x373c40, map: grainTexture(92, 175, 60), roughness: 0.98, metalness: 0
});
const whitePaint = new THREE.MeshStandardMaterial({ color: 0xe8e4d6, roughness: 0.85 });
const yellowPaint = new THREE.MeshStandardMaterial({ color: 0xe4ba59, roughness: 0.8 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x1c2224, roughness: 0.93 });
const bankMaterial = new THREE.MeshStandardMaterial({
  color: 0x5d665e, map: grainTexture(28, 190, 48), roughness: 1
});

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 10);
const up = new THREE.Vector3(0, 1, 0);

function box(name, size, position, material, parent = bridge) {
  const mesh = new THREE.Mesh(boxGeometry, material);
  mesh.name = name;
  mesh.scale.set(...size);
  mesh.position.set(...position);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function bar(name, start, end, radius, material, parent = bridge) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(cylinderGeometry, material);
  mesh.name = name;
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.scale.set(radius, direction.length(), radius);
  mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  parent.add(mesh);
  return mesh;
}

function instanceBoxes(name, pieces, material) {
  const mesh = new THREE.InstancedMesh(boxGeometry, material, pieces.length);
  mesh.name = name;
  const transform = new THREE.Object3D();
  pieces.forEach((piece, index) => {
    transform.position.set(...piece.position);
    transform.scale.set(...piece.size);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  });
  mesh.castShadow = mesh.receiveShadow = true;
  bridge.add(mesh);
  return mesh;
}

function taperedLeg(x, z) {
  const bottom = -0.4, top = spec.towerTop;
  const vertices = [
    -1.3, bottom, -1.05, 1.3, bottom, -1.05,
    1.3, bottom, 1.05, -1.3, bottom, 1.05,
    -0.8, top, -0.65, 0.8, top, -0.65,
    0.8, top, 0.65, -0.8, top, 0.65
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex([
    0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
    4, 7, 6, 4, 6, 5, 0, 1, 2, 0, 2, 3
  ]);
  // Caras planas: las aristas del concreto no se suavizan como plástico.
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  flat.computeVertexNormals();
  const uv = [];
  const pos = flat.getAttribute('position');
  for (let i = 0; i < pos.count; i++) uv.push((pos.getX(i) + pos.getZ(i)) / 4, pos.getY(i) / 8);
  flat.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const leg = new THREE.Mesh(flat, concrete);
  leg.name = 'Pata lateral del pilono';
  leg.position.set(x, 0, z);
  leg.castShadow = leg.receiveShadow = true;
  bridge.add(leg);
}

// Tablero con losa, vigas longitudinales y diafragmas bajo la plataforma.
box('Losa del tablero', [240, 0.7, spec.deckWidth], [0, spec.deckY - 0.35, 0], concrete);
for (const z of [-5.1, 5.1]) {
  box('Viga longitudinal metálica', [239.6, 1.65, 0.7], [0, 12.45, z], steel);
  box('Ala inferior de la viga', [239.6, 0.15, 1.15], [0, 11.6, z], steel);
}
const diaphragms = [];
for (let x = -117; x < 120; x += 6) {
  diaphragms.push({ size: [0.22, 1.1, 10.3], position: [x, 12.65, 0] });
}
instanceBoxes('Diafragmas transversales', diaphragms, steel);
box('Calzada de dos carriles', [240, 0.09, spec.roadWidth], [0, 14.045, 0], asphalt);

// Señalización horizontal, veredas laterales y juntas de dilatación.
for (const z of [-0.09, 0.09]) {
  box('Doble línea amarilla', [238, 0.012, 0.065], [0, 14.097, z], yellowPaint);
}
for (const side of [-1, 1]) {
  box('Línea de borde', [238, 0.012, 0.1], [0, 14.097, side * 3.95], whitePaint);
  box('Vereda peatonal', [240, 0.18, 1.05], [0, 14.09, side * 5.5], concrete);
}
const joints = spec.supports.map(x => ({ size: [0.12, 0.025, spec.roadWidth], position: [x, 14.102, 0] }));
instanceBoxes('Juntas de dilatación', joints, rubber);

// Barreras Jersey con sección real y piezas separadas por juntas.
const jerseyShape = new THREE.Shape();
jerseyShape.moveTo(-0.32, 0);
[[0.32, 0], [0.32, 0.23], [0.16, 0.65], [0.14, 0.92], [-0.14, 0.92], [-0.16, 0.65], [-0.32, 0.23]].forEach(p => jerseyShape.lineTo(...p));
jerseyShape.closePath();
const barrierGeometry = new THREE.ExtrudeGeometry(jerseyShape, { depth: 5.96, steps: 1, bevelEnabled: false });
barrierGeometry.translate(0, 0, -2.98);
barrierGeometry.rotateY(Math.PI / 2);
const barriers = new THREE.InstancedMesh(barrierGeometry, concrete, 80);
barriers.name = 'Barreras de protección Jersey';
const placement = new THREE.Object3D();
for (let i = 0; i < 80; i++) {
  placement.position.set(-117 + (i % 40) * 6, spec.deckY, i < 40 ? -4.65 : 4.65);
  placement.updateMatrix();
  barriers.setMatrixAt(i, placement.matrix);
}
barriers.castShadow = barriers.receiveShadow = true;
bridge.add(barriers);

const railingPosts = [];
for (const side of [-1, 1]) {
  for (let x = -119; x <= 119; x += 4) {
    railingPosts.push({ size: [0.09, 1.15, 0.09], position: [x, 14.66, side * 7.18] });
  }
  for (const y of [14.65, 15.2]) {
    bar('Pasamanos exterior', new THREE.Vector3(-120, y, side * 7.18), new THREE.Vector3(120, y, side * 7.18), 0.055, galvanized);
  }
}
instanceBoxes('Postes de baranda exterior', railingPosts, galvanized);

// Tres pórticos: seis patas FUERA de la calzada, prolongadas hasta sus zapatas.
spec.towers.forEach(x => {
  for (const z of [-spec.cableZ, spec.cableZ]) {
    taperedLeg(x, z);
    box('Pedestal del pilono', [3.2, 2, 2.7], [x, 0.35, z], concrete);
    box('Zapata del pilono', [6, 1.7, 5], [x, -1.4, z], concrete);
    // Apoyos elastoméricos y cabezales que reciben el tablero.
    box('Ménsula de apoyo', [3.5, 1.2, 3.7], [x, 10.8, Math.sign(z) * 5.9], concrete);
    box('Aparato de apoyo', [1.3, 0.24, 1.25], [x, 11.52, Math.sign(z) * 5.1], rubber);
  }
  box('Travesaño superior del pórtico', [2, 1.5, 14.6], [x, 37.8, 0], concrete);
});

// Tirantes semi-abiertos: no atraviesan el carril ni cruzan el campo vecino.
// Los tramos de borde se anclan hasta el estribo; los interiores hasta media luz.
spec.towers.forEach((x, towerIndex) => {
  for (const side of [-1, 1]) {
    const outer = (towerIndex === 0 && side === -1) || (towerIndex === 2 && side === 1);
    const reach = outer ? 56 : 28;
    for (const z of [-spec.cableZ, spec.cableZ]) {
      for (let k = 1; k <= 8; k++) {
        const start = new THREE.Vector3(x + side * 0.84, 29.2 + k * 1.38, z);
        const end = new THREE.Vector3(x + side * reach * k / 8, 14.48, z);
        bar('Tirante de acero', start, end, 0.105, cableMaterial);
        const direction = new THREE.Vector3().subVectors(start, end).normalize();
        bar('Vaina de anclaje inferior', end, end.clone().addScaledVector(direction, 1.5), 0.22, steel);
        box('Placa de anclaje', [0.68, 0.15, 0.6], [end.x, 14.32, z], galvanized);
      }
    }
  }
});

// Estribos, muros de retorno y accesos cortos en ambos extremos.
for (const sign of [-1, 1]) {
  const x = sign * 120;
  box('Estribo extremo', [3, 10.8, 15.8], [x, 5.55, 0], concrete);
  box('Zapata del estribo', [6, 1.5, 18], [x, -0.6, 0], concrete);
  box('Cabezal del estribo', [3.5, 1.1, 15.8], [x, 10.8, 0], concrete);
  for (const z of [-5.1, 5.1]) {
    box('Apoyo del estribo', [1.3, 0.25, 1.3], [x, 11.5, z], rubber);
  }
  box('Losa de aproximación', [8, 0.65, spec.deckWidth], [sign * 125.5, 13.65, 0], concrete);
  box('Asfalto de acceso', [8, 0.09, spec.roadWidth], [sign * 125.5, 14.045, 0], asphalt);
  for (const side of [-1, 1]) {
    box('Muro de retorno', [7, 4.5, 0.65], [sign * 123.8, 10.9, side * 7.5], concrete);
  }
}

// Agua con normales suaves; orillas pequeñas como base de una maqueta.
const normalMap = waterNormals();
const waterMaterial = new THREE.MeshStandardMaterial({
  color: 0x183d48, metalness: 0.32, roughness: 0.3,
  normalMap, normalScale: new THREE.Vector2(0.22, 0.22)
});
const water = new THREE.Mesh(new THREE.PlaneGeometry(256, 44), waterMaterial);
water.name = 'Superficie del río';
water.rotation.x = -Math.PI / 2;
water.position.y = -1.05;
water.receiveShadow = true;
bridge.add(water);
for (const sign of [-1, 1]) {
  box('Orilla del río', [12, 0.8, 44], [sign * 128, -0.85, 0], bankMaterial);
}

// Los dos modelos comparten luces, cámara y contexto WebGL.
export const roadScene = createRoadScene({
  concrete, steel, galvanized, asphalt, whitePaint, yellowPaint, waterMaterial, grainTexture
});
export const road = roadScene.group;
scene.add(road);
const models = {
  bridge: {
    group: bridge,
    homeDirection: new THREE.Vector3(0.75, 0.48, 1).normalize(),
    title: 'Puente atirantado · 4 tramos',
    description: 'Modelo conceptual 3D'
  },
  road: roadScene
};
Object.values(models).forEach(model => { model.bounds = new THREE.Box3().setFromObject(model.group); });
export let activeModel = 'road';
bridge.visible = false;
const bounds = models.road.bounds.clone();
const center = bounds.getCenter(new THREE.Vector3());
export const camera = new THREE.OrthographicCamera(-150, 150, 100, -100, 0.1, 1200);
let homeDirection = roadScene.homeDirection;
const distance = 400;
camera.position.copy(center).addScaledVector(homeDirection, distance);
camera.lookAt(center);
export const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(center);
controls.enablePan = false;
controls.enableDamping = false;
controls.minZoom = 0.7;
controls.maxZoom = 3;
controls.minPolarAngle = 0.001;
controls.maxPolarAngle = Math.PI - 0.001;
controls.autoRotateSpeed = 0.55;
// Con un solo dedo se desplaza la página; con dos se controla el modelo.
controls.touches.ONE = null;
controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
renderer.domElement.style.touchAction = 'pan-y';

let width = 1, height = 1;
const corners = [];
function updateCorners() {
  corners.length = 0;
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z));
    }
  }
}
updateCorners();
const projected = new THREE.Vector3();

function fitProjection() {
  camera.updateMatrixWorld();
  const projectedBounds = new THREE.Box2();
  for (const corner of corners) {
    projected.copy(corner).applyMatrix4(camera.matrixWorldInverse);
    projectedBounds.expandByPoint(new THREE.Vector2(projected.x, projected.y));
  }
  const aspect = width / height;
  // Margen superior para el rótulo y el cubo, sin cortar cimentaciones.
  const halfHeight = Math.max(projectedBounds.max.y, -projectedBounds.min.y,
    projectedBounds.max.x / aspect, -projectedBounds.min.x / aspect) * 1.23;
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
}

new ResizeObserver(() => {
  width = Math.max(host.clientWidth, 1);
  height = Math.max(host.clientHeight, 1);
  renderer.setSize(width, height);
  fitProjection();
}).observe(host);

const rotationButton = document.getElementById('bridge-rotate');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let rotating = !reducedMotion.matches;
let interacting = false;
let animation = null;
let visible = true;

function showRotationState() {
  rotationButton.setAttribute('aria-pressed', String(rotating));
  rotationButton.title = rotating ? 'Pausar giro' : 'Activar giro';
  rotationButton.setAttribute('aria-label', rotationButton.title);
  rotationButton.querySelector('path').setAttribute('d', rotating ? 'M8 5v14M16 5v14' : 'm8 5 11 7-11 7Z');
}
showRotationState();
rotationButton.addEventListener('click', () => {
  rotating = !rotating;
  showRotationState();
});
controls.addEventListener('start', () => {
  interacting = true;
  animation = null;
  rotating = false;
  showRotationState();
});
controls.addEventListener('end', () => { interacting = false; });

// El cubo usa la MISMA orientación de cámara, no una rotación independiente.
const cube = document.getElementById('cube');
const cubeMatrix = new THREE.Matrix4();
const inverseRotation = new THREE.Quaternion();
const viewDirections = {
  front: new THREE.Vector3(0, 0, 1), back: new THREE.Vector3(0, 0, -1),
  left: new THREE.Vector3(-1, 0, 0), right: new THREE.Vector3(1, 0, 0),
  top: new THREE.Vector3(0.001, 1, 0.001).normalize(),
  bottom: new THREE.Vector3(0.001, -1, 0.001).normalize()
};

function selectView(direction) {
  rotating = false;
  showRotationState();
  const start = camera.position.clone().sub(controls.target).normalize();
  animation = {
    start,
    rotation: new THREE.Quaternion().setFromUnitVectors(start, direction),
    time: 0
  };
  camera.zoom = 1;
}
host.querySelectorAll('[data-face]').forEach(button => {
  button.addEventListener('click', () => selectView(viewDirections[button.dataset.face]));
});
document.getElementById('bridge-home').addEventListener('click', () => selectView(homeDirection));

export function setModel(name) {
  const model = models[name];
  if (!model) return;
  activeModel = name;
  animation = null;
  Object.entries(models).forEach(([key, value]) => { value.group.visible = key === name; });
  bounds.copy(model.bounds);
  bounds.getCenter(center);
  homeDirection = model.homeDirection;
  controls.target.copy(center);
  camera.zoom = 1;
  camera.position.copy(center).addScaledVector(homeDirection, distance);
  camera.lookAt(center);
  controls.update();
  updateCorners();
  fitProjection();
  document.getElementById('model-title').textContent = model.title;
  document.getElementById('model-description').textContent = model.description;
  host.querySelectorAll('[data-model-choice]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.modelChoice === name));
  });
  renderer.domElement.setAttribute('aria-label', `${model.title}. Arrastra para girar; usa la rueda para acercar.`);
  host.dataset.model = name;
  // Encuadre de sombras suficiente para todo el relieve y las dos estructuras.
  sunlight.target.position.copy(center);
  sunlight.position.copy(center).add(new THREE.Vector3(-95, 190, 110));
  Object.assign(sunlight.shadow.camera, {
    left: -205, right: 205, top: 175, bottom: -175, near: 1, far: 550
  });
  sunlight.shadow.camera.updateProjectionMatrix();
}
host.querySelectorAll('[data-model-choice]').forEach(button => {
  button.addEventListener('click', () => setModel(button.dataset.modelChoice));
});
const expandButton = document.getElementById('bridge-expand');
if (!host.requestFullscreen) {
  expandButton.hidden = true;
} else {
  expandButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement === host) await document.exitFullscreen();
      else await host.requestFullscreen();
    } catch (error) {
      console.info('Pantalla completa no disponible:', error.message);
    }
  });
  document.addEventListener('fullscreenchange', () => {
    expandButton.title = document.fullscreenElement === host ? 'Reducir visor' : 'Ampliar visor';
    expandButton.setAttribute('aria-label', expandButton.title);
  });
}
setModel('road');

// Detener trabajo de GPU cuando el visor está fuera de pantalla.
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }).observe(host);
}

renderer.domElement.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  status.hidden = false;
  status.textContent = 'El visor se pausó. Recarga la página para volver a abrir el modelo.';
});

const identity = new THREE.Quaternion();
let previous = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  if (!visible || document.hidden) return;
  controls.autoRotate = rotating && !animation && !interacting;
  if (animation) {
    animation.time += dt;
    const t = Math.min(animation.time / 0.65, 1);
    const eased = t * t * (3 - 2 * t);
    const turn = identity.clone().slerp(animation.rotation, eased);
    camera.position.copy(animation.start).applyQuaternion(turn).multiplyScalar(distance).add(controls.target);
    if (t === 1) animation = null;
  }
  controls.update(dt);
  fitProjection();
  inverseRotation.copy(camera.quaternion).invert();
  cubeMatrix.makeRotationFromQuaternion(inverseRotation);
  // Conversión del eje Y (Three: arriba, CSS: abajo).
  const e = cubeMatrix.elements;
  for (const i of [1, 4, 6, 9]) e[i] *= -1;
  cube.style.transform = `matrix3d(${e.join(',')})`;
  normalMap.offset.x = (normalMap.offset.x + dt * 0.004) % 1;
  renderer.render(scene, camera);
  status.hidden = true;
  host.dataset.ready = 'true';
}
controls.update();
requestAnimationFrame(frame);
