import {
  createCar,
  pickRandomCarColor,
  setCarDirtAmount,
  setDoorsOpenAmount,
  setFloorMatsVisible,
  spinWheelsForDistance,
  disposeCar
} from './car.js';

export const MAX_CELLS = 15;
export const CELL_COLUMNS = 8;
export const CELL_COLUMN_PITCH = 6.5;
export const CELL_X0 = -50;
export const CELL_ROW_Z = [-8, 8];

export const GATE_X = -58;
const GATE_QUEUE_STEP = 5;

export const MERGE_X = -4;
const MERGE_QUEUE_STEP = 5;

export const TUNNEL_START_X = 0;
export const TUNNEL_LENGTH = 40;
export const TUNNEL_END_X = TUNNEL_START_X + TUNNEL_LENGTH;

export const QC_X = 46;

export const REWORK_LANE_Z = 13;
const REWORK_BAY_X = 40;

export const OZONE_X0 = 50;
export const OZONE_COLUMN_PITCH = 5.5;
export const OZONE_ROW_Z = [-11, -17];
export const OZONE_COLUMNS = 3;
export const OZONE_SLOTS = 6;

export const EXIT_X = 60;

const DRIVE_SPEED = 6;
const CAR_PITCH = 5.5;

const CELL_TIME_SECONDS = 360;
const SCAN_SECONDS = 3;
const QC_SECONDS = 3;
const LEAVE_CELL_SECONDS = 2;
const REWORK_DWELL_SECONDS = 30;
const OZONE_DWELL_SECONDS = 90;
const REJECT_RATE = 0.125;
const OZONE_RATE = 1 / 6;
const FRESH_WATER_LITRES_PER_CAR = 30;
export const HUB_CAR_COUNT = 80;

const WASH_ZONE_START_X = 14;
const WASH_ZONE_END_X = 26;

const THROUGHPUT_WINDOW_SECONDS = 300;

export function easeInOutCubic(t) {
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  const overshoot = -2 * t + 2;
  return 1 - (overshoot * overshoot * overshoot) / 2;
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function cellPosition(cellIndex) {
  const column = cellIndex % CELL_COLUMNS;
  const row = Math.floor(cellIndex / CELL_COLUMNS);
  return { x: CELL_X0 + column * CELL_COLUMN_PITCH, z: CELL_ROW_Z[row] };
}

export function ozoneBayPosition(bayIndex) {
  const column = bayIndex % OZONE_COLUMNS;
  const row = Math.floor(bayIndex / OZONE_COLUMNS);
  return { x: OZONE_X0 + column * OZONE_COLUMN_PITCH, z: OZONE_ROW_Z[row] };
}

function driveCarToward(carRefs, targetX, targetZ, maxDistance) {
  const currentX = carRefs.group.position.x;
  const currentZ = carRefs.group.position.z;
  const dx = targetX - currentX;
  const dz = targetZ - currentZ;
  const remaining = Math.hypot(dx, dz);

  if (remaining < 0.001) {
    return true;
  }
  if (remaining <= maxDistance) {
    carRefs.group.position.x = targetX;
    carRefs.group.position.z = targetZ;
    spinWheelsForDistance(carRefs, remaining);
    return true;
  }

  carRefs.group.rotation.y = Math.atan2(-dz, dx);
  carRefs.group.position.x = currentX + (dx / remaining) * maxDistance;
  carRefs.group.position.z = currentZ + (dz / remaining) * maxDistance;
  spinWheelsForDistance(carRefs, maxDistance);
  return false;
}

function findFreeCell(state) {
  for (let index = 0; index < state.activeCellCount; index += 1) {
    let taken = false;
    for (const car of state.cars) {
      if (car.cell === index) {
        taken = true;
        break;
      }
    }
    if (!taken) {
      return index;
    }
  }
  return -1;
}

function findFreeOzoneBay(state) {
  for (let index = 0; index < OZONE_SLOTS; index += 1) {
    let taken = false;
    for (const car of state.cars) {
      if (car.ozoneBay === index) {
        taken = true;
        break;
      }
    }
    if (!taken) {
      return index;
    }
  }
  return -1;
}

function computeDirtAmount(carState, tunnelX) {
  if (carState !== 'tunnel') {
    if (carState === 'toQC' || carState === 'inQC' || carState === 'toRework' || carState === 'reworking') {
      return 0;
    }
    if (carState === 'toOzone' || carState === 'inOzone' || carState === 'toExit') {
      return 0;
    }
    return 1;
  }
  if (tunnelX < WASH_ZONE_START_X) {
    return 1;
  }
  if (tunnelX > WASH_ZONE_END_X) {
    return 0;
  }
  const progress = (tunnelX - WASH_ZONE_START_X) / (WASH_ZONE_END_X - WASH_ZONE_START_X);
  return lerp(1, 0, progress);
}

function spawnCar(state, x, z, carState) {
  const refs = createCar(state.geometryKit, pickRandomCarColor());
  refs.group.position.set(x, 0, z);

  const car = {
    refs: refs,
    state: carState,
    cell: -1,
    ozoneBay: -1,
    needsOzone: Math.random() < OZONE_RATE,
    timer: 0,
    doorsOpenAmount: 0
  };

  setDoorsOpenAmount(refs, 0);
  setFloorMatsVisible(refs, true);
  setCarDirtAmount(refs, computeDirtAmount(carState, x));

  state.scene.add(refs.group);
  state.cars.push(car);
  return car;
}

function finishCar(state) {
  state.completedCount += 1;
  state.freshWaterLitres += FRESH_WATER_LITRES_PER_CAR;
  state.outputTimes.push(state.totalElapsedSeconds);
  while (state.outputTimes.length > 0 && state.totalElapsedSeconds - state.outputTimes[0] > THROUGHPUT_WINDOW_SECONDS) {
    state.outputTimes.shift();
  }
  if (state.lastOutputTime !== null) {
    state.lastOutputGap = state.totalElapsedSeconds - state.lastOutputTime;
  }
  state.lastOutputTime = state.totalElapsedSeconds;
}

function despawnCar(state, car) {
  state.scene.remove(car.refs.group);
  disposeCar(car.refs);
  const index = state.cars.indexOf(car);
  state.cars.splice(index, 1);
}

function stepCar(state, car, dt) {
  const refs = car.refs;

  if (car.state === 'toGate') {
    if (driveCarToward(refs, GATE_X, 0, DRIVE_SPEED * dt)) {
      if (state.gateBusy === null) {
        state.gateBusy = car;
        car.state = 'scanning';
        car.timer = SCAN_SECONDS;
      } else {
        car.state = 'gateQueue';
        state.gateQueue.push(car);
      }
    }
  } else if (car.state === 'gateQueue') {
    const queueIndex = state.gateQueue.indexOf(car);
    driveCarToward(refs, GATE_X - GATE_QUEUE_STEP * (queueIndex + 1), 0, DRIVE_SPEED * dt);
    if (queueIndex === 0 && state.gateBusy === null) {
      state.gateQueue.shift();
      state.gateBusy = car;
      car.state = 'scanning';
      car.timer = SCAN_SECONDS;
    }
  } else if (car.state === 'scanning') {
    car.timer -= dt;
    car.doorsOpenAmount = 1 - Math.max(car.timer, 0) / SCAN_SECONDS;
    if (car.timer <= 0) {
      const freeCellIndex = findFreeCell(state);
      if (freeCellIndex >= 0) {
        car.cell = freeCellIndex;
        state.gateBusy = null;
        car.state = 'toCellLane';
      }
    }
  } else if (car.state === 'toCellLane') {
    const target = cellPosition(car.cell);
    if (driveCarToward(refs, target.x, 0, DRIVE_SPEED * dt)) {
      car.state = 'toCellSlot';
    }
  } else if (car.state === 'toCellSlot') {
    const target = cellPosition(car.cell);
    if (driveCarToward(refs, target.x, target.z, DRIVE_SPEED * dt)) {
      car.state = 'inCell';
      car.timer = CELL_TIME_SECONDS;
    }
  } else if (car.state === 'inCell') {
    car.timer -= dt;
    if (car.timer <= 0) {
      car.state = 'leavingCell';
      car.timer = LEAVE_CELL_SECONDS;
    }
  } else if (car.state === 'leavingCell') {
    car.timer -= dt;
    car.doorsOpenAmount = Math.max(car.timer, 0) / LEAVE_CELL_SECONDS;
    if (car.timer <= 0) {
      car.cell = -1;
      car.state = 'toLaneFromCell';
    }
  } else if (car.state === 'toLaneFromCell') {
    if (driveCarToward(refs, refs.group.position.x, 0, DRIVE_SPEED * dt)) {
      car.state = 'toMerge';
    }
  } else if (car.state === 'toMerge') {
    if (driveCarToward(refs, MERGE_X, 0, DRIVE_SPEED * dt)) {
      car.state = 'mergeQueue';
      state.mergeQueue.push(car);
    }
  } else if (car.state === 'mergeQueue') {
    const queueIndex = state.mergeQueue.indexOf(car);
    driveCarToward(refs, MERGE_X - MERGE_QUEUE_STEP * queueIndex, 0, DRIVE_SPEED * dt);
  } else if (car.state === 'enteringTunnel') {
    if (driveCarToward(refs, TUNNEL_START_X, 0, DRIVE_SPEED * dt)) {
      car.state = 'tunnel';
    }
  } else if (car.state === 'tunnel') {
    const beltSpeed = CAR_PITCH / state.taktSeconds;
    const distance = beltSpeed * dt;
    refs.group.position.x += distance;
    refs.group.position.z = 0;
    refs.group.rotation.y = 0;
    spinWheelsForDistance(refs, distance);
    if (refs.group.position.x >= TUNNEL_END_X) {
      car.state = 'toQC';
    }
  } else if (car.state === 'toQC') {
    if (driveCarToward(refs, QC_X, 0, DRIVE_SPEED * dt) && state.qcBusy === null) {
      state.qcBusy = car;
      car.state = 'inQC';
      car.timer = QC_SECONDS;
    }
  } else if (car.state === 'inQC') {
    car.timer -= dt;
    if (car.timer <= 0) {
      state.qcBusy = null;
      const rejected = Math.random() < REJECT_RATE;
      if (rejected) {
        state.rejectedCount += 1;
        state.beaconFlashSeconds = 3;
        car.state = 'toRework';
      } else if (car.needsOzone) {
        const bay = findFreeOzoneBay(state);
        if (bay >= 0) {
          car.ozoneBay = bay;
          car.state = 'toOzone';
        } else {
          car.state = 'toExit';
        }
      } else {
        car.state = 'toExit';
      }
    }
  } else if (car.state === 'toRework') {
    if (driveCarToward(refs, REWORK_BAY_X, REWORK_LANE_Z, DRIVE_SPEED * dt)) {
      car.state = 'reworking';
      car.timer = REWORK_DWELL_SECONDS;
    }
  } else if (car.state === 'reworking') {
    car.timer -= dt;
    if (car.timer <= 0) {
      car.state = 'toMerge';
    }
  } else if (car.state === 'toOzone') {
    const target = ozoneBayPosition(car.ozoneBay);
    if (driveCarToward(refs, target.x, target.z, DRIVE_SPEED * dt)) {
      car.state = 'inOzone';
      car.timer = OZONE_DWELL_SECONDS;
    }
  } else if (car.state === 'inOzone') {
    car.timer -= dt;
    if (car.timer <= 0) {
      state.ozoneTreatedCount += 1;
      car.ozoneBay = -1;
      car.state = 'toExit';
    }
  } else if (car.state === 'toExit') {
    if (driveCarToward(refs, EXIT_X, 0, DRIVE_SPEED * dt)) {
      finishCar(state);
      despawnCar(state, car);
      return;
    }
  }

  setDoorsOpenAmount(refs, car.doorsOpenAmount);
  setFloorMatsVisible(refs, car.doorsOpenAmount < 0.5);
  setCarDirtAmount(refs, computeDirtAmount(car.state, refs.group.position.x));
}

function fillHubAtStartup(state) {
  for (let index = 0; index < state.activeCellCount; index += 1) {
    const position = cellPosition(index);
    const car = spawnCar(state, position.x, position.z, 'inCell');
    car.cell = index;
    car.timer = Math.random() * CELL_TIME_SECONDS;
    car.doorsOpenAmount = 1;
  }

  const carsInTunnel = Math.floor(TUNNEL_LENGTH / CAR_PITCH);
  for (let index = 0; index < carsInTunnel; index += 1) {
    const x = TUNNEL_START_X + 2 + index * CAR_PITCH;
    spawnCar(state, x, 0, 'tunnel');
  }

  spawnCar(state, GATE_X - 20, 0, 'toGate');
}

export function createSimulationState(scene, geometryKit) {
  const state = {
    taktSeconds: 24,
    activeCellCount: MAX_CELLS,
    speedMultiplier: 4,
    running: true,
    totalElapsedSeconds: 0,
    spawnTimer: 0,
    tunnelSlotTimer: 0,
    missedSlotCount: 0,
    completedCount: 0,
    rejectedCount: 0,
    ozoneTreatedCount: 0,
    freshWaterLitres: 0,
    outputTimes: [],
    lastOutputTime: null,
    lastOutputGap: null,
    beaconFlashSeconds: 0,
    gateBusy: null,
    gateQueue: [],
    mergeQueue: [],
    qcBusy: null,
    cars: [],
    scene: scene,
    geometryKit: geometryKit
  };
  fillHubAtStartup(state);
  return state;
}

export function setTaktSeconds(state, newTaktSeconds) {
  state.taktSeconds = newTaktSeconds;
}

export function setActiveCellCount(state, newCellCount) {
  state.activeCellCount = Math.max(1, Math.min(MAX_CELLS, newCellCount));
}

export function setSpeedMultiplier(state, multiplier) {
  state.speedMultiplier = multiplier;
}

export function toggleRunning(state) {
  state.running = !state.running;
}

export function getScaledDelta(state, rawDeltaSeconds) {
  if (!state.running) {
    return 0;
  }
  return rawDeltaSeconds * state.speedMultiplier;
}

export function advanceSimulation(state, rawDeltaSeconds) {
  const scaledDelta = getScaledDelta(state, rawDeltaSeconds);
  if (scaledDelta === 0) {
    return;
  }

  state.totalElapsedSeconds += scaledDelta;
  if (state.beaconFlashSeconds > 0) {
    state.beaconFlashSeconds = Math.max(0, state.beaconFlashSeconds - scaledDelta);
  }

  state.spawnTimer += scaledDelta;
  while (state.spawnTimer >= state.taktSeconds) {
    state.spawnTimer -= state.taktSeconds;
    spawnCar(state, GATE_X - 20, 0, 'toGate');
  }

  state.tunnelSlotTimer += scaledDelta;
  while (state.tunnelSlotTimer >= state.taktSeconds) {
    state.tunnelSlotTimer -= state.taktSeconds;
    if (state.mergeQueue.length > 0) {
      const car = state.mergeQueue.shift();
      car.state = 'enteringTunnel';
    } else {
      state.missedSlotCount += 1;
    }
  }

  const carsSnapshot = state.cars.slice();
  for (const car of carsSnapshot) {
    stepCar(state, car, scaledDelta);
  }
}

export function getCellAnimState(state, cellIndex) {
  for (const car of state.cars) {
    if (car.cell === cellIndex && car.state === 'inCell') {
      return { occupied: true, workProgress: 1 - car.timer / CELL_TIME_SECONDS };
    }
  }
  return { occupied: false, workProgress: 0 };
}

export function getOzoneBayAnimState(state, bayIndex) {
  for (const car of state.cars) {
    if (car.ozoneBay === bayIndex && car.state === 'inOzone') {
      return { occupied: true, workProgress: 1 - car.timer / OZONE_DWELL_SECONDS };
    }
  }
  return { occupied: false, workProgress: 0 };
}

export function computeMetrics(state) {
  const requiredCells = Math.ceil(CELL_TIME_SECONDS / state.taktSeconds);
  const starved = state.activeCellCount < requiredCells;
  const releaseIntervalSeconds = CELL_TIME_SECONDS / state.activeCellCount;
  const beltSpeed = CAR_PITCH / state.taktSeconds;

  let measuredThroughputPerHour = 0;
  if (state.outputTimes.length > 1) {
    const windowSeconds = state.totalElapsedSeconds - state.outputTimes[0];
    if (windowSeconds > 1) {
      measuredThroughputPerHour = ((state.outputTimes.length - 1) / windowSeconds) * 3600;
    }
  }

  let entryQueueLength = 0;
  let mergeQueueLength = state.mergeQueue.length;
  let tunnelCarCount = 0;
  let cellsOccupied = 0;
  for (const car of state.cars) {
    if (car.state === 'gateQueue') {
      entryQueueLength += 1;
    }
    if (car.state === 'tunnel' || car.state === 'enteringTunnel') {
      tunnelCarCount += 1;
    }
    if (car.state === 'inCell') {
      cellsOccupied += 1;
    }
  }

  const targetThroughputPerHour = 3600 / state.taktSeconds;
  const hubMinutes = (HUB_CAR_COUNT / targetThroughputPerHour) * 60;

  return {
    taktSeconds: state.taktSeconds,
    cellTimeSeconds: CELL_TIME_SECONDS,
    requiredCells: requiredCells,
    activeCellCount: state.activeCellCount,
    cellsOccupied: cellsOccupied,
    starved: starved,
    releaseIntervalSeconds: releaseIntervalSeconds,
    beltSpeed: beltSpeed,
    targetThroughputPerHour: targetThroughputPerHour,
    measuredThroughputPerHour: measuredThroughputPerHour,
    completedCount: state.completedCount,
    rejectedCount: state.rejectedCount,
    ozoneTreatedCount: state.ozoneTreatedCount,
    freshWaterLitres: state.freshWaterLitres,
    hubMinutes: hubMinutes,
    entryQueueLength: entryQueueLength,
    mergeQueueLength: mergeQueueLength,
    tunnelCarCount: tunnelCarCount,
    missedSlotCount: state.missedSlotCount,
    lastOutputGap: state.lastOutputGap,
    gateBusy: state.gateBusy !== null,
    qcBusy: state.qcBusy !== null,
    tunnelSlotFraction: state.tunnelSlotTimer / state.taktSeconds
  };
}
