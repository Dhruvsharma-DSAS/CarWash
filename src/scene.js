import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  camera.position.set(-8, 46, 88);
  return camera;
}

export function createControls(camera, domElement) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 6;
  controls.maxDistance = 180;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.target.set(-8, 1.6, 0);
  controls.update();
  return controls;
}

export function createSceneWithLights() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14181d);
  scene.fog = new THREE.Fog(0x14181d, 80, 260);

  const hemisphereLight = new THREE.HemisphereLight(0x8fa3ad, 0x14181d, 0.55);
  scene.add(hemisphereLight);

  const sunLight = new THREE.DirectionalLight(0xfff2dc, 1.6);
  sunLight.position.set(40, 55, 30);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 200;
  sunLight.shadow.camera.left = -90;
  sunLight.shadow.camera.right = 90;
  sunLight.shadow.camera.top = 60;
  sunLight.shadow.camera.bottom = -60;
  sunLight.shadow.bias = -0.0015;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0x47d6e0, 0.3);
  fillLight.position.set(-40, 20, -30);
  scene.add(fillLight);

  const floorGeometry = new THREE.PlaneGeometry(240, 100);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b2127,
    roughness: 0.85,
    metalness: 0.05
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(-10, -0.16, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  return scene;
}

export function createEnvironmentMap(renderer, scene) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const environmentTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environmentTexture;
  pmremGenerator.dispose();
  return environmentTexture;
}

export function handleResize(camera, renderer) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
