import * as THREE from 'three';
import {
  MAX_CELLS,
  GATE_X,
  MERGE_X,
  TUNNEL_START_X,
  TUNNEL_LENGTH,
  TUNNEL_END_X,
  QC_X,
  REWORK_LANE_Z,
  OZONE_X0,
  OZONE_SLOTS,
  EXIT_X,
  cellPosition,
  ozoneBayPosition
} from './simulation.js';

export const STAGE_INFO = [
  {
    name: 'Entry AI gate',
    description: '3-second scan reads body profile and opens the queue into a free cell.',
    specs: [
      { label: 'Scan time', value: '3 s', tag: 'src' },
      { label: 'Images per scan', value: '300+', tag: 'src' },
      { label: 'Defect detection', value: '96% vs 24% manual', tag: 'src' }
    ]
  },
  {
    name: 'Interior cells (x15)',
    description: 'Two-row yard of robot cells. Each cell runs a real 6-minute interior clean.',
    specs: [
      { label: 'Arms per cell', value: '2 x UR10e', tag: 'der' },
      { label: 'Arm reach', value: '1,300 mm', tag: 'src' },
      { label: 'Cell cycle time', value: '360 s', tag: 'src' }
    ]
  },
  {
    name: 'Merge queue',
    description: 'Cars finished with cells wait here for the next 24-second tunnel slot.',
    specs: [
      { label: 'Correlator deck', value: '0.91 x 3.66 m', tag: 'src' },
      { label: 'Release interval', value: 'set by takt', tag: 'der' }
    ]
  },
  {
    name: 'Continuous tunnel',
    description: 'Foam, wraps, mitter, rinse, coating and air-dry at a fixed 24s-takt belt speed.',
    specs: [
      { label: 'Cross-section', value: '4.88 x 3.66 m', tag: 'src' },
      { label: 'Cars inside', value: '7', tag: 'der' },
      { label: 'Applied water', value: '369 L/min', tag: 'src' }
    ]
  },
  {
    name: 'Exit QC + rework',
    description: 'Ten-camera ring checks the shell. About 1 in 8 loops back for another pass.',
    specs: [
      { label: 'Camera pods', value: '10', tag: 'src' },
      { label: 'Reject rate', value: '12.5%', tag: 'asm' },
      { label: 'Rework dwell', value: '30 s', tag: 'asm' }
    ]
  },
  {
    name: 'Ozone bay (off-line)',
    description: 'Odour cars park here after their cell. It never blocks the tunnel takt.',
    specs: [
      { label: 'Treatment dwell', value: '30-120 min', tag: 'src' },
      { label: 'Bay slots', value: '6', tag: 'der' },
      { label: 'Bay throughput', value: '~4 cars/hr', tag: 'der' }
    ]
  }
];

const steelMaterial = new THREE.MeshStandardMaterial({ color: 0x39434f, roughness: 0.55, metalness: 0.5 });
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x1c2126, roughness: 0.6, metalness: 0.3 });
const laneMaterial = new THREE.MeshStandardMaterial({ color: 0x2f2013, roughness: 0.85 });
const reworkLaneMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2a17, roughness: 0.85 });
const brushMaterial = new THREE.MeshStandardMaterial({ color: 0x2e5b66, roughness: 0.85 });
const curtainMaterial = new THREE.MeshStandardMaterial({
  color: 0x2a3138,
  roughness: 0.7,
  transparent: true,
  opacity: 0.85,
  side: THREE.DoubleSide
});
const cameraBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x20242a, roughness: 0.4, metalness: 0.6 });
const armMaterial = new THREE.MeshStandardMaterial({ color: 0x415a78, roughness: 0.4, metalness: 0.55 });
const cellBedMaterial = new THREE.MeshStandardMaterial({ color: 0x232a33, roughness: 0.75 });
const tankMaterial = new THREE.MeshStandardMaterial({ color: 0x33566b, roughness: 0.4, metalness: 0.5 });
const scanPlaneMaterial = new THREE.MeshBasicMaterial({
  color: 0x47d6e0,
  transparent: true,
  opacity: 0.3,
  side: THREE.DoubleSide
});
const foamParticleMaterial = new THREE.PointsMaterial({ color: 0xf3f6f5, size: 0.09, transparent: true, opacity: 0.85 });
const rinseParticleMaterial = new THREE.PointsMaterial({ color: 0x8fe4ec, size: 0.06, transparent: true, opacity: 0.75 });
const coatParticleMaterial = new THREE.PointsMaterial({ color: 0xbfeff2, size: 0.05, transparent: true, opacity: 0.6 });

const bedGeometry = new THREE.BoxGeometry(1, 0.14, 1);
const columnGeometry = new THREE.BoxGeometry(0.4, 4.4, 0.4);
const beamGeometry = new THREE.BoxGeometry(0.5, 0.4, 1);
const laneStripeGeometry = new THREE.BoxGeometry(1, 0.03, 0.14);
const nozzleGeometry = new THREE.CylinderGeometry(0.05, 0.07, 0.22, 10);
const wrapBrushGeometry = new THREE.CylinderGeometry(0.32, 0.32, 2.7, 14);
const topBrushGeometry = new THREE.CylinderGeometry(0.32, 0.32, 2.0, 14);
const curtainStripGeometry = new THREE.PlaneGeometry(0.14, 1.6);
const cameraBoxGeometry = new THREE.BoxGeometry(0.18, 0.18, 0.28);
const ringGeometry = new THREE.TorusGeometry(2.6, 0.09, 10, 32);
const airKnifeGeometry = new THREE.BoxGeometry(0.14, 0.14, 2.4);
const beaconGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.4, 12);
const beaconPostGeometry = new THREE.BoxGeometry(0.12, 3.2, 0.12);
const cellPadGeometry = new THREE.BoxGeometry(5.6, 0.1, 4.0);
const cellPostGeometry = new THREE.BoxGeometry(0.24, 3.0, 0.24);
const cellBeamGeometry = new THREE.BoxGeometry(0.3, 0.3, 3.6);
const armBaseGeometry = new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12);
const armUpperGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.6, 10);
const armForeGeometry = new THREE.CylinderGeometry(0.045, 0.045, 0.55, 10);
const armHeadGeometry = new THREE.BoxGeometry(0.32, 0.16, 0.24);
const armIntakeGeometry = new THREE.BoxGeometry(0.34, 0.05, 0.26);
const lampGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
const ozonePadGeometry = new THREE.BoxGeometry(4.6, 0.05, 2.4);
const ozonePostGeometry = new THREE.BoxGeometry(0.1, 1.6, 0.1);
const ozoneLampGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.18, 10);
const reworkPadGeometry = new THREE.BoxGeometry(5.5, 0.06, 3.0);
const tankGeometry = new THREE.CylinderGeometry(1.1, 1.1, 2.8, 18);
const pitGeometry = new THREE.BoxGeometry(1.5, 1.0, 1.5);
const skidGeometry = new THREE.BoxGeometry(2.2, 1.3, 1.4);
const pipeGeometry = new THREE.CylinderGeometry(0.09, 0.09, 1, 8);

function laneStripe(group, x, length, z) {
  const stripe = new THREE.Mesh(laneStripeGeometry, laneMaterial);
  stripe.scale.set(length, 1, 1);
  stripe.position.set(x, 0.06, z);
  group.add(stripe);
}

function bed(group, x, length, width, z, material) {
  const mesh = new THREE.Mesh(bedGeometry, material || cellBedMaterial);
  mesh.scale.set(length, 1, width);
  mesh.position.set(x, 0.07, z);
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function portal(group, x, halfWidth, height, tint) {
  for (const z of [-halfWidth, halfWidth]) {
    const column = new THREE.Mesh(columnGeometry, steelMaterial);
    column.scale.y = height / 4.4;
    column.position.set(x, height / 2, z);
    column.castShadow = true;
    group.add(column);
  }
  const beamMesh = new THREE.Mesh(beamGeometry, steelMaterial);
  beamMesh.scale.z = halfWidth * 2 + 0.5;
  beamMesh.position.set(x, height, 0);
  group.add(beamMesh);

  const stripMaterial = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.5 });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, halfWidth * 2 - 0.2), stripMaterial);
  strip.position.set(x, height - 0.28, 0);
  group.add(strip);
}

function createParticleSystem(count, material, spawnCenter, spawnRadius, fallHeight) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    resetParticleAt(positions, i, spawnCenter, spawnRadius, fallHeight);
    positions[i * 3 + 1] = Math.random() * fallHeight;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, material);
  points.visible = false;
  return { points, positions, count, spawnCenter, spawnRadius, fallHeight };
}

function resetParticleAt(positions, index, spawnCenter, spawnRadius, fallHeight) {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * spawnRadius;
  positions[index * 3] = spawnCenter.x + Math.cos(angle) * radius;
  positions[index * 3 + 1] = fallHeight + Math.random() * 0.3;
  positions[index * 3 + 2] = spawnCenter.z + Math.sin(angle) * radius;
}

function updateFallingParticles(particleSystem, dt, active) {
  particleSystem.points.visible = active;
  if (!active || dt === 0) {
    return;
  }
  const positions = particleSystem.positions;
  for (let i = 0; i < particleSystem.count; i += 1) {
    positions[i * 3 + 1] -= dt * 2.4;
    if (positions[i * 3 + 1] < 0.1) {
      resetParticleAt(positions, i, particleSystem.spawnCenter, particleSystem.spawnRadius, particleSystem.fallHeight);
    }
  }
  particleSystem.points.geometry.attributes.position.needsUpdate = true;
}

function createEntryGate(scene) {
  const group = new THREE.Group();
  portal(group, GATE_X, 2.6, 4.6, 0x47d6e0);
  bed(group, GATE_X - 12, 28, 3.6, 0, cellBedMaterial);
  laneStripe(group, GATE_X - 12, 28, -1.8);
  laneStripe(group, GATE_X - 12, 28, 1.8);

  const scanPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.4), scanPlaneMaterial);
  scanPlane.rotation.y = Math.PI / 2;
  scanPlane.position.set(GATE_X, 2.2, 0);
  group.add(scanPlane);

  const cameraLenses = [];
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 9) * Math.PI;
    const camera = new THREE.Mesh(cameraBoxGeometry, cameraBodyMaterial);
    camera.position.set(GATE_X, 0.6 + Math.sin(angle) * 3.6, Math.cos(angle) * 2.3);
    group.add(camera);
    cameraLenses.push(camera);
  }

  scene.add(group);
  return { group, refs: { scanPlane, cameraLenses } };
}

function createCellRig(scene, cellIndex) {
  const position = cellPosition(cellIndex);
  const group = new THREE.Group();
  group.position.set(position.x, 0, position.z);

  const pad = new THREE.Mesh(cellPadGeometry, cellBedMaterial);
  pad.position.y = 0.05;
  pad.receiveShadow = true;
  group.add(pad);

  for (const dz of [-1.7, 1.7]) {
    const post = new THREE.Mesh(cellPostGeometry, steelMaterial);
    post.position.set(0, 1.5, dz);
    group.add(post);
  }
  const beamMesh = new THREE.Mesh(cellBeamGeometry, steelMaterial);
  beamMesh.position.y = 3.0;
  group.add(beamMesh);

  const arms = [];
  for (const side of [-1, 1]) {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.9, 2.8, side * 0.6);

    const base = new THREE.Mesh(armBaseGeometry, steelMaterial);
    armGroup.add(base);

    const upper = new THREE.Mesh(armUpperGeometry, armMaterial);
    upper.position.y = -0.35;
    armGroup.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.65;
    const fore = new THREE.Mesh(armForeGeometry, armMaterial);
    fore.position.y = -0.27;
    elbow.add(fore);

    const head = new THREE.Mesh(armHeadGeometry, darkMaterial);
    head.position.y = -0.55;
    elbow.add(head);

    const intake = new THREE.Mesh(armIntakeGeometry, new THREE.MeshBasicMaterial({ color: 0x47d6e0, transparent: true, opacity: 0.5 }));
    intake.position.y = -0.65;
    elbow.add(intake);

    armGroup.add(elbow);
    armGroup.userData = { elbow, side };
    group.add(armGroup);
    arms.push(armGroup);
  }

  const lamp = new THREE.Mesh(lampGeometry, new THREE.MeshBasicMaterial({ color: 0x47d6e0, transparent: true, opacity: 0.15 }));
  lamp.position.y = 3.35;
  group.add(lamp);

  scene.add(group);
  return { group, arms, lamp };
}

function createMergeQueueLane(scene) {
  const group = new THREE.Group();
  bed(group, MERGE_X - 12, 24, 3.6, 0, cellBedMaterial);
  laneStripe(group, MERGE_X - 12, 24, -1.8);
  laneStripe(group, MERGE_X - 12, 24, 1.8);
  portal(group, MERGE_X, 2.0, 3.2, 0xffb23f);
  scene.add(group);
  return { group };
}

function createTunnelHardware(scene) {
  const group = new THREE.Group();
  const refs = {};

  bed(group, (TUNNEL_START_X + TUNNEL_END_X) / 2, TUNNEL_LENGTH + 4, 5.4, 0, darkMaterial);
  laneStripe(group, (TUNNEL_START_X + TUNNEL_END_X) / 2, TUNNEL_LENGTH + 4, -2.9);
  laneStripe(group, (TUNNEL_START_X + TUNNEL_END_X) / 2, TUNNEL_LENGTH + 4, 2.9);

  const foamX = TUNNEL_START_X + 7;
  portal(group, foamX, 2.7, 3.6, 0x47d6e0);
  const nozzles = [];
  for (let i = 0; i < 9; i += 1) {
    const angle = Math.PI * (i / 8);
    const y = 1.5 + Math.sin(angle) * 1.7;
    const z = Math.cos(angle) * 1.15;
    const nozzle = new THREE.Mesh(nozzleGeometry, steelMaterial);
    nozzle.position.set(foamX, y, z);
    nozzle.rotation.x = Math.PI / 2;
    group.add(nozzle);
    nozzles.push(nozzle);
  }
  const foam = createParticleSystem(240, foamParticleMaterial, new THREE.Vector3(foamX, 0, 0), 1.3, 2.9);
  group.add(foam.points);
  refs.foam = foam;

  const wrapX = TUNNEL_START_X + 16;
  portal(group, wrapX, 2.7, 3.6, 0x47d6e0);
  const leftBrush = new THREE.Mesh(wrapBrushGeometry, brushMaterial);
  leftBrush.rotation.x = Math.PI / 2;
  leftBrush.position.set(wrapX, 1.45, 1.7);
  group.add(leftBrush);
  const rightBrush = new THREE.Mesh(wrapBrushGeometry, brushMaterial);
  rightBrush.rotation.x = Math.PI / 2;
  rightBrush.position.set(wrapX, 1.45, -1.7);
  group.add(rightBrush);
  const topBrush = new THREE.Mesh(topBrushGeometry, brushMaterial);
  topBrush.position.set(wrapX, 3.0, 0);
  group.add(topBrush);
  refs.wrapBrushes = [leftBrush, rightBrush];
  refs.topBrush = topBrush;

  const mitterX = TUNNEL_START_X + 22;
  const curtainGroup = new THREE.Group();
  curtainGroup.position.set(mitterX, 3.4, 0);
  const strips = [];
  for (let i = 0; i < 10; i += 1) {
    const strip = new THREE.Mesh(curtainStripGeometry, curtainMaterial);
    strip.position.set(0, -0.8, -3.15 + i * 0.7);
    curtainGroup.add(strip);
    strips.push(strip);
  }
  group.add(curtainGroup);
  refs.curtainStrips = strips;

  const rinseX = TUNNEL_START_X + 25;
  const rinseBar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 6.2), steelMaterial);
  rinseBar.position.set(rinseX, 3.2, 0);
  group.add(rinseBar);
  const rinse = createParticleSystem(200, rinseParticleMaterial, new THREE.Vector3(rinseX, 0, 0), 1.3, 3.1);
  group.add(rinse.points);
  refs.rinse = rinse;

  const coatX = TUNNEL_START_X + 30;
  portal(group, coatX, 2.5, 3.4, 0xbfeff2);
  const coat = createParticleSystem(120, coatParticleMaterial, new THREE.Vector3(coatX, 0, 0), 1.1, 2.6);
  group.add(coat.points);
  refs.coat = coat;

  const dryX = TUNNEL_START_X + 36;
  const airKnifeLeft = new THREE.Mesh(airKnifeGeometry, steelMaterial);
  airKnifeLeft.position.set(dryX - 1.2, 2.2, 0);
  group.add(airKnifeLeft);
  const airKnifeRight = new THREE.Mesh(airKnifeGeometry, steelMaterial);
  airKnifeRight.position.set(dryX + 1.2, 2.2, 0);
  group.add(airKnifeRight);
  const airStreamMaterial = new THREE.MeshBasicMaterial({ color: 0x47d6e0, transparent: true, opacity: 0.1 });
  const airStream = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 2.2), airStreamMaterial);
  airStream.rotation.y = Math.PI / 2;
  airStream.position.set(dryX, 1.2, 0);
  group.add(airStream);
  refs.airStreamMaterial = airStreamMaterial;

  scene.add(group);
  return { group, refs };
}

function createQCGate(scene) {
  const group = new THREE.Group();
  bed(group, (QC_X + EXIT_X) / 2, EXIT_X - QC_X + 8, 3.6, 0, cellBedMaterial);

  const ring = new THREE.Mesh(ringGeometry, steelMaterial);
  ring.rotation.y = Math.PI / 2;
  ring.position.set(QC_X, 2.6, 0);
  group.add(ring);

  const cameraLenses = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    const camera = new THREE.Mesh(cameraBoxGeometry, cameraBodyMaterial);
    camera.position.set(QC_X, 2.6 + Math.cos(angle) * 2.5, Math.sin(angle) * 2.5);
    group.add(camera);
    cameraLenses.push(camera);
  }

  const beaconPost = new THREE.Mesh(beaconPostGeometry, darkMaterial);
  beaconPost.position.set(QC_X + 3, 1.6, 4.2);
  group.add(beaconPost);
  const beaconMaterial = new THREE.MeshStandardMaterial({ color: 0xffb23f, emissive: 0xffb23f, emissiveIntensity: 0.15 });
  const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
  beacon.position.set(QC_X + 3, 3.35, 4.2);
  group.add(beacon);

  scene.add(group);
  return { group, refs: { cameraLenses, beaconMaterial } };
}

function createReworkLane(scene) {
  const group = new THREE.Group();
  bed(group, (MERGE_X + QC_X) / 2 + 6, QC_X - MERGE_X + 12, 3.2, REWORK_LANE_Z, reworkLaneMaterial);
  laneStripe(group, (MERGE_X + QC_X) / 2 + 6, QC_X - MERGE_X + 12, REWORK_LANE_Z - 1.5);
  const holdingPad = new THREE.Mesh(reworkPadGeometry, cellBedMaterial);
  holdingPad.position.set(40, 0.04, REWORK_LANE_Z);
  group.add(holdingPad);
  portal(group, 40, 1.9, 2.6, 0xffb23f);
  scene.add(group);
  return { group };
}

function createOzoneBay(scene) {
  const group = new THREE.Group();
  const bayLights = [];

  for (let index = 0; index < OZONE_SLOTS; index += 1) {
    const position = ozoneBayPosition(index);
    const pad = new THREE.Mesh(ozonePadGeometry, cellBedMaterial);
    pad.position.set(position.x, 0.03, position.z);
    group.add(pad);

    const post = new THREE.Mesh(ozonePostGeometry, darkMaterial);
    post.position.set(position.x - 2.0, 0.8, position.z);
    group.add(post);

    const lampMaterial = new THREE.MeshBasicMaterial({ color: 0x47d6e0, transparent: true, opacity: 0.15 });
    const lamp = new THREE.Mesh(ozoneLampGeometry, lampMaterial);
    lamp.position.set(position.x - 2.0, 1.65, position.z);
    group.add(lamp);
    bayLights.push(lampMaterial);
  }

  scene.add(group);
  return { group, refs: { bayLights } };
}

function createWaterPlant(scene) {
  const group = new THREE.Group();
  const plantZ = -22;

  const tank = new THREE.Mesh(tankGeometry, tankMaterial);
  tank.position.set(OZONE_X0 - 4, 1.5, plantZ);
  group.add(tank);

  for (let i = 0; i < 3; i += 1) {
    const pit = new THREE.Mesh(pitGeometry, steelMaterial);
    pit.position.set(OZONE_X0 - 4 + i * 2.0, 0.5, plantZ + 3.2);
    group.add(pit);
  }

  const skid = new THREE.Mesh(skidGeometry, steelMaterial);
  skid.position.set(OZONE_X0 + 2, 0.7, plantZ);
  group.add(skid);

  const pipe = new THREE.Mesh(pipeGeometry, steelMaterial);
  pipe.scale.y = 10;
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(OZONE_X0 - 1, 2.1, plantZ + 1.5);
  group.add(pipe);

  scene.add(group);
  return { group };
}

export function createHub(scene) {
  const gate = createEntryGate(scene);
  const merge = createMergeQueueLane(scene);
  const tunnel = createTunnelHardware(scene);
  const qc = createQCGate(scene);
  const rework = createReworkLane(scene);
  const ozone = createOzoneBay(scene);
  createWaterPlant(scene);

  const cellRigs = [];
  for (let index = 0; index < MAX_CELLS; index += 1) {
    cellRigs.push(createCellRig(scene, index));
  }

  return { gate, merge, tunnel, qc, rework, ozone, cellRigs };
}

export function updateEntryGate(gateRefs, dt, elapsedTime, gateBusy) {
  if (gateBusy) {
    gateRefs.scanPlane.material.opacity = 0.4;
  } else {
    gateRefs.scanPlane.material.opacity = 0.12;
  }
  let index = 0;
  for (const camera of gateRefs.cameraLenses) {
    let opacity = 0.15;
    if (gateBusy && ((elapsedTime * 6 + index) % 8) < 4) {
      opacity = 0.9;
    }
    camera.material.opacity = opacity;
    index += 1;
  }
}

export function updateCellRig(rig, dt, elapsedTime, animState) {
  if (animState.occupied) {
    rig.lamp.material.opacity = 0.85;
    let armIndex = 0;
    for (const armGroup of rig.arms) {
      const side = armGroup.userData.side;
      armGroup.rotation.z = Math.sin(elapsedTime * 1.4 + armIndex + side) * 0.42;
      armGroup.rotation.y = Math.sin(elapsedTime * 0.9 + armIndex) * 0.3;
      armGroup.userData.elbow.rotation.z = Math.sin(elapsedTime * 2.1 + armIndex) * 0.55;
      armIndex += 1;
    }
  } else {
    rig.lamp.material.opacity = 0.12;
    for (const armGroup of rig.arms) {
      armGroup.rotation.z = 0;
      armGroup.rotation.y = 0;
      armGroup.userData.elbow.rotation.z = 0;
    }
  }
}

export function updateOzoneBay(ozoneRefs, bayAnimStates) {
  let index = 0;
  for (const lampMaterial of ozoneRefs.bayLights) {
    if (bayAnimStates[index].occupied) {
      lampMaterial.opacity = 0.8;
    } else {
      lampMaterial.opacity = 0.15;
    }
    index += 1;
  }
}

export function updateTunnelHardware(refs, dt, elapsedTime, hasCarsInTunnel, reducedMotion) {
  updateFallingParticles(refs.foam, dt, hasCarsInTunnel && !reducedMotion);
  updateFallingParticles(refs.rinse, dt, hasCarsInTunnel && !reducedMotion);
  updateFallingParticles(refs.coat, dt, hasCarsInTunnel && !reducedMotion);

  if (dt > 0 && hasCarsInTunnel) {
    const spinSpeed = dt * 8;
    refs.wrapBrushes[0].rotation.y += spinSpeed;
    refs.wrapBrushes[1].rotation.y -= spinSpeed;
    refs.topBrush.rotation.z += spinSpeed;
  }

  let stripIndex = 0;
  for (const strip of refs.curtainStrips) {
    let sway = 0;
    if (hasCarsInTunnel) {
      sway = 1;
    }
    strip.rotation.z = Math.sin(elapsedTime * 2.2 + stripIndex * 0.5) * 0.18 * sway;
    stripIndex += 1;
  }

  if (hasCarsInTunnel) {
    refs.airStreamMaterial.opacity = 0.12 + Math.abs(Math.sin(elapsedTime * 10)) * 0.3;
  } else {
    refs.airStreamMaterial.opacity = 0.05;
  }
}

export function updateQCGate(qcRefs, elapsedTime, qcBusy, beaconFlashSeconds) {
  const activeIndex = Math.floor(elapsedTime * 6) % qcRefs.cameraLenses.length;
  let index = 0;
  for (const camera of qcRefs.cameraLenses) {
    if (qcBusy && index === activeIndex) {
      camera.scale.setScalar(1.3);
    } else {
      camera.scale.setScalar(1);
    }
    index += 1;
  }

  if (beaconFlashSeconds > 0) {
    const blinkOn = Math.floor(elapsedTime * 4) % 2 === 0;
    if (blinkOn) {
      qcRefs.beaconMaterial.emissiveIntensity = 1.6;
    } else {
      qcRefs.beaconMaterial.emissiveIntensity = 0.15;
    }
  } else {
    qcRefs.beaconMaterial.emissiveIntensity = 0.15;
  }
}
