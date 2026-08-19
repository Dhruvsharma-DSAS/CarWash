import * as THREE from 'three';

export const CAR_LENGTH = 3.84;
export const CAR_WIDTH = 1.72;
export const WHEEL_RADIUS = 0.305;
export const WHEEL_WIDTH = 0.22;

const FRONT_AXLE_X = 1.22;
const REAR_AXLE_X = -1.22;
const MAX_DOOR_OPEN_ANGLE = 0.95;

const CAR_PALETTE = [
  { name: 'white', hex: 0xf1efe8, weight: 4 },
  { name: 'silver', hex: 0xc7cbd0, weight: 4 },
  { name: 'grey', hex: 0x83878c, weight: 2 },
  { name: 'beige', hex: 0xd6c6a2, weight: 1 },
  { name: 'darkBlue', hex: 0x1f3a5c, weight: 1 },
  { name: 'maroon', hex: 0x5a1f27, weight: 1 }
];

const DIRTY_TINT = new THREE.Color(0x4a4438);

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function pickRandomCarColor() {
  let totalWeight = 0;
  for (const entry of CAR_PALETTE) {
    totalWeight += entry.weight;
  }
  let roll = Math.random() * totalWeight;
  for (const entry of CAR_PALETTE) {
    if (roll < entry.weight) {
      return entry;
    }
    roll -= entry.weight;
  }
  return CAR_PALETTE[0];
}

function createRoundedRectShape(width, height, cornerRadius) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + cornerRadius, -halfHeight);
  shape.lineTo(halfWidth - cornerRadius, -halfHeight);
  shape.absarc(halfWidth - cornerRadius, -halfHeight + cornerRadius, cornerRadius, -Math.PI / 2, 0, false);
  shape.lineTo(halfWidth, halfHeight - cornerRadius);
  shape.absarc(halfWidth - cornerRadius, halfHeight - cornerRadius, cornerRadius, 0, Math.PI / 2, false);
  shape.lineTo(-halfWidth + cornerRadius, halfHeight);
  shape.absarc(-halfWidth + cornerRadius, halfHeight - cornerRadius, cornerRadius, Math.PI / 2, Math.PI, false);
  shape.lineTo(-halfWidth, -halfHeight + cornerRadius);
  shape.absarc(-halfWidth + cornerRadius, -halfHeight + cornerRadius, cornerRadius, Math.PI, Math.PI * 1.5, false);
  return shape;
}

function createWheelArchHole(axleX) {
  const archCenterY = 0.36;
  const archRadius = 0.54;
  const arch = new THREE.Path();
  arch.moveTo(axleX + archRadius, archCenterY);
  arch.absarc(axleX, archCenterY, archRadius, 0, Math.PI, false);
  arch.lineTo(axleX + archRadius, archCenterY);
  return arch;
}

function createBodyShape() {
  const shape = new THREE.Shape();
  shape.moveTo(-1.92, 0.32);
  shape.lineTo(1.92, 0.34);
  shape.bezierCurveTo(1.94, 0.55, 1.93, 0.8, 1.66, 0.92);
  shape.bezierCurveTo(1.3, 1.05, 0.85, 1.0, 0.55, 1.06);
  shape.bezierCurveTo(0.42, 1.3, 0.3, 1.5, 0.18, 1.55);
  shape.lineTo(-0.95, 1.55);
  shape.bezierCurveTo(-1.25, 1.52, -1.4, 1.35, -1.45, 1.12);
  shape.bezierCurveTo(-1.55, 0.95, -1.68, 0.88, -1.75, 0.78);
  shape.bezierCurveTo(-1.85, 0.72, -1.92, 0.68, -1.92, 0.6);
  shape.lineTo(-1.92, 0.32);

  shape.holes.push(createWheelArchHole(FRONT_AXLE_X));
  shape.holes.push(createWheelArchHole(REAR_AXLE_X));
  return shape;
}

function createBodyGeometry() {
  const geometry = new THREE.ExtrudeGeometry(createBodyShape(), {
    depth: CAR_WIDTH,
    bevelEnabled: true,
    bevelThickness: 0.026,
    bevelSize: 0.026,
    bevelSegments: 2,
    curveSegments: 10
  });
  geometry.translate(0, 0, -CAR_WIDTH / 2);
  return geometry;
}

function createGlassGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.5, 1.04);
  shape.bezierCurveTo(0.4, 1.3, 0.26, 1.5, 0.16, 1.54);
  shape.lineTo(-0.92, 1.54);
  shape.bezierCurveTo(-1.18, 1.5, -1.3, 1.32, -1.34, 1.1);
  shape.lineTo(0.5, 1.04);

  const glassWidth = CAR_WIDTH - 0.02;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: glassWidth,
    bevelEnabled: false,
    curveSegments: 10
  });
  geometry.translate(0, 0, -glassWidth / 2);
  return geometry;
}

function createDoorGeometry() {
  const geometry = new THREE.ExtrudeGeometry(createRoundedRectShape(0.95, 0.62, 0.08), {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
    curveSegments: 8
  });
  return geometry;
}

function createPanelGeometry(planLengthX, planWidthZ, cornerRadius) {
  const geometry = new THREE.ExtrudeGeometry(createRoundedRectShape(planLengthX, planWidthZ, cornerRadius), {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 8
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function createBumperGeometry() {
  const geometry = new THREE.ExtrudeGeometry(createRoundedRectShape(CAR_WIDTH - 0.1, 0.46, 0.09), {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
    curveSegments: 8
  });
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

function createWheelGeometries() {
  const tyreGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 16);
  tyreGeometry.rotateX(Math.PI / 2);

  const alloyGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS * 0.6, WHEEL_RADIUS * 0.6, WHEEL_WIDTH + 0.03, 14);
  alloyGeometry.rotateX(Math.PI / 2);

  return { tyreGeometry, alloyGeometry };
}

export function createCarGeometryKit() {
  const wheelGeometries = createWheelGeometries();

  return {
    bodyGeometry: createBodyGeometry(),
    glassGeometry: createGlassGeometry(),
    doorGeometry: createDoorGeometry(),
    bonnetGeometry: createPanelGeometry(1.3, 1.55, 0.18),
    tailgateGeometry: createPanelGeometry(0.55, 1.35, 0.14),
    bumperGeometry: createBumperGeometry(),
    mirrorGeometry: new THREE.BoxGeometry(0.16, 0.1, 0.24),
    headlightGeometry: new THREE.BoxGeometry(0.1, 0.22, 0.5),
    taillightGeometry: new THREE.BoxGeometry(0.1, 0.24, 0.42),
    matGeometry: new THREE.PlaneGeometry(1.55, 0.55),
    tyreGeometry: wheelGeometries.tyreGeometry,
    alloyGeometry: wheelGeometries.alloyGeometry,

    tyreMaterial: new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.95, metalness: 0.0 }),
    alloyMaterial: new THREE.MeshStandardMaterial({ color: 0xb9bdc2, roughness: 0.35, metalness: 0.85 }),
    glassMaterial: new THREE.MeshPhysicalMaterial({
      color: 0x0c1116,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 0.6,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide
    }),
    headlightMaterial: new THREE.MeshPhysicalMaterial({ color: 0xf5f7fa, roughness: 0.1, clearcoat: 0.6 }),
    taillightMaterial: new THREE.MeshPhysicalMaterial({ color: 0xb3372f, roughness: 0.15, clearcoat: 0.5 }),
    matMaterial: new THREE.MeshStandardMaterial({ color: 0x1d2226, roughness: 0.9 })
  };
}

function createDoorPivot(kit, paintMaterial, hingeX, side) {
  const pivot = new THREE.Group();
  let sideZ = CAR_WIDTH / 2 - 0.03;
  let openSign = 1;
  if (side === 'right') {
    sideZ = -sideZ;
    openSign = -1;
  }
  pivot.position.set(hingeX, 0, sideZ);

  const doorMesh = new THREE.Mesh(kit.doorGeometry, paintMaterial);
  doorMesh.position.set(-0.475, 0.75, 0);
  doorMesh.castShadow = true;
  pivot.add(doorMesh);

  return { pivot, openSign };
}

function createWheelGroup(kit, axleX, side) {
  const group = new THREE.Group();
  let sideZ = CAR_WIDTH / 2 - 0.09;
  if (side === 'right') {
    sideZ = -sideZ;
  }
  group.position.set(axleX, WHEEL_RADIUS, sideZ);

  const tyreMesh = new THREE.Mesh(kit.tyreGeometry, kit.tyreMaterial);
  tyreMesh.castShadow = true;
  group.add(tyreMesh);

  const alloyMesh = new THREE.Mesh(kit.alloyGeometry, kit.alloyMaterial);
  group.add(alloyMesh);

  return group;
}

export function createCar(kit, colorEntry) {
  const group = new THREE.Group();

  const paintMaterial = new THREE.MeshPhysicalMaterial({
    color: colorEntry.hex,
    roughness: 0.28,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05
  });
  paintMaterial.userData.cleanColor = new THREE.Color(colorEntry.hex);

  const bodyMesh = new THREE.Mesh(kit.bodyGeometry, paintMaterial);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  const glassMesh = new THREE.Mesh(kit.glassGeometry, kit.glassMaterial);
  group.add(glassMesh);

  const bonnetMesh = new THREE.Mesh(kit.bonnetGeometry, paintMaterial);
  bonnetMesh.position.set(1.2, 0.97, 0);
  bonnetMesh.rotation.z = -0.1;
  bonnetMesh.castShadow = true;
  group.add(bonnetMesh);

  const tailgateMesh = new THREE.Mesh(kit.tailgateGeometry, paintMaterial);
  tailgateMesh.position.set(-1.68, 0.96, 0);
  tailgateMesh.rotation.z = 0.14;
  tailgateMesh.castShadow = true;
  group.add(tailgateMesh);

  const frontBumperMesh = new THREE.Mesh(kit.bumperGeometry, paintMaterial);
  frontBumperMesh.position.set(1.9, 0.5, 0);
  group.add(frontBumperMesh);

  const rearBumperMesh = new THREE.Mesh(kit.bumperGeometry, paintMaterial);
  rearBumperMesh.position.set(-1.9, 0.46, 0);
  group.add(rearBumperMesh);

  const mirrorLeft = new THREE.Mesh(kit.mirrorGeometry, paintMaterial);
  mirrorLeft.position.set(0.5, 1.06, CAR_WIDTH / 2 + 0.05);
  group.add(mirrorLeft);

  const mirrorRight = new THREE.Mesh(kit.mirrorGeometry, paintMaterial);
  mirrorRight.position.set(0.5, 1.06, -(CAR_WIDTH / 2 + 0.05));
  group.add(mirrorRight);

  const headlightLeft = new THREE.Mesh(kit.headlightGeometry, kit.headlightMaterial);
  headlightLeft.position.set(1.93, 0.72, 0.55);
  group.add(headlightLeft);

  const headlightRight = new THREE.Mesh(kit.headlightGeometry, kit.headlightMaterial);
  headlightRight.position.set(1.93, 0.72, -0.55);
  group.add(headlightRight);

  const taillightLeft = new THREE.Mesh(kit.taillightGeometry, kit.taillightMaterial);
  taillightLeft.position.set(-1.93, 0.72, 0.5);
  group.add(taillightLeft);

  const taillightRight = new THREE.Mesh(kit.taillightGeometry, kit.taillightMaterial);
  taillightRight.position.set(-1.93, 0.72, -0.5);
  group.add(taillightRight);

  const frontLeftDoor = createDoorPivot(kit, paintMaterial, 0.55, 'left');
  const rearLeftDoor = createDoorPivot(kit, paintMaterial, -0.35, 'left');
  const frontRightDoor = createDoorPivot(kit, paintMaterial, 0.55, 'right');
  const rearRightDoor = createDoorPivot(kit, paintMaterial, -0.35, 'right');
  group.add(frontLeftDoor.pivot, rearLeftDoor.pivot, frontRightDoor.pivot, rearRightDoor.pivot);

  const matLeft = new THREE.Mesh(kit.matGeometry, kit.matMaterial);
  matLeft.rotation.x = -Math.PI / 2;
  matLeft.position.set(-0.35, 0.345, 0.42);
  group.add(matLeft);

  const matRight = new THREE.Mesh(kit.matGeometry, kit.matMaterial);
  matRight.rotation.x = -Math.PI / 2;
  matRight.position.set(-0.35, 0.345, -0.42);
  group.add(matRight);

  const frontLeftWheel = createWheelGroup(kit, FRONT_AXLE_X, 'left');
  const frontRightWheel = createWheelGroup(kit, FRONT_AXLE_X, 'right');
  const rearLeftWheel = createWheelGroup(kit, REAR_AXLE_X, 'left');
  const rearRightWheel = createWheelGroup(kit, REAR_AXLE_X, 'right');
  group.add(frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel);

  return {
    group: group,
    paintMaterial: paintMaterial,
    colorName: colorEntry.name,
    doorPivots: [frontLeftDoor, rearLeftDoor, frontRightDoor, rearRightDoor],
    wheelGroups: [frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel],
    floorMats: [matLeft, matRight]
  };
}

export function setCarDirtAmount(carRefs, dirtAmount) {
  const material = carRefs.paintMaterial;
  const cleanColor = material.userData.cleanColor;
  material.color.copy(cleanColor).lerp(DIRTY_TINT, dirtAmount);
  material.roughness = lerp(0.28, 0.7, dirtAmount);
  material.clearcoat = lerp(1.0, 0.12, dirtAmount);
  material.clearcoatRoughness = lerp(0.05, 0.45, dirtAmount);
}

export function setDoorsOpenAmount(carRefs, openAmount) {
  for (const door of carRefs.doorPivots) {
    door.pivot.rotation.y = openAmount * MAX_DOOR_OPEN_ANGLE * door.openSign;
  }
}

export function setFloorMatsVisible(carRefs, visible) {
  for (const mat of carRefs.floorMats) {
    mat.visible = visible;
  }
}

export function spinWheelsForDistance(carRefs, distanceMoved) {
  const deltaAngle = distanceMoved / WHEEL_RADIUS;
  for (const wheelGroup of carRefs.wheelGroups) {
    wheelGroup.rotation.z -= deltaAngle;
  }
}

export function disposeCar(carRefs) {
  carRefs.paintMaterial.dispose();
}
