import * as THREE from 'three';
import { easeInOutCubic, GATE_X, MERGE_X, QC_X, OZONE_X0, cellPosition, ozoneBayPosition } from './simulation.js';

const FLIGHT_SECONDS = 4;
const HOLD_SECONDS = 6;

function computeBeats() {
  const midCell = cellPosition(4);
  const tunnelMidX = 20;

  return [
    {
      position: new THREE.Vector3(-8, 58, 105),
      lookAt: new THREE.Vector3(-8, 3, 0),
      caption: 'The hub: an entry gate, fifteen interior cells, a merge queue and a continuous tunnel.'
    },
    {
      position: new THREE.Vector3(GATE_X + 5, 2.3, 4.6),
      lookAt: new THREE.Vector3(GATE_X, 1.1, 0.4),
      caption: 'A 3-second scan reads the body, then routes the car into whichever cell is free.'
    },
    {
      position: new THREE.Vector3(midCell.x + 1.5, 1.2, midCell.z - 3.2),
      lookAt: new THREE.Vector3(midCell.x, 1.5, midCell.z),
      caption: 'Each cell runs a real 6-minute interior clean. That is the unsolved half, not a rounding error.'
    },
    {
      position: new THREE.Vector3(MERGE_X + 4, 2.0, 6.5),
      lookAt: new THREE.Vector3(MERGE_X - 3, 1.0, 0),
      caption: 'Cells needed equals cell time divided by takt: 360 seconds over 24 is 15. That is the whole idea.'
    },
    {
      position: new THREE.Vector3(tunnelMidX, 2.6, 7),
      lookAt: new THREE.Vector3(tunnelMidX, 1.0, 0),
      caption: 'Exterior speed is already solved: tunnels like this already run 150 to 180 cars an hour.'
    },
    {
      position: new THREE.Vector3(QC_X + 7, 1.7, 1),
      lookAt: new THREE.Vector3(QC_X, 1.4, 0),
      caption: 'A ten-camera ring runs QC. About one car in eight loops back for rework, by hand, on purpose.'
    },
    {
      position: new THREE.Vector3(OZONE_X0 + 2, 3.4, ozoneBayPosition(0).z - 6),
      lookAt: new THREE.Vector3(OZONE_X0 + 2, 1.0, ozoneBayPosition(0).z),
      caption: 'Odour cars sit off-line here for up to two hours. Six bays, and the main takt never waits on them.'
    },
    {
      position: new THREE.Vector3(0, 50, 100),
      lookAt: new THREE.Vector3(0, 3, 0),
      caption: 'Drag cells below fifteen on the panel and watch the hub fall behind its own 24-second promise.'
    }
  ];
}

export function createTourState(reducedMotion) {
  return {
    active: false,
    currentBeatIndex: 0,
    phase: 'idle',
    phaseElapsed: 0,
    autoAdvance: true,
    flightCurve: null,
    fromLookAt: new THREE.Vector3(),
    toLookAt: new THREE.Vector3(),
    reducedMotion: reducedMotion,
    beats: computeBeats()
  };
}

function flyToBeat(tourState, camera, controls, beatIndex) {
  const clampedIndex = Math.max(0, Math.min(beatIndex, tourState.beats.length - 1));
  tourState.currentBeatIndex = clampedIndex;
  const targetBeat = tourState.beats[clampedIndex];

  if (tourState.reducedMotion) {
    camera.position.copy(targetBeat.position);
    controls.target.copy(targetBeat.lookAt);
    camera.lookAt(targetBeat.lookAt);
    tourState.phase = 'holding';
    tourState.phaseElapsed = 0;
    return;
  }

  const startPosition = camera.position.clone();
  const startLookAt = controls.target.clone();
  const midpoint = startPosition.clone().lerp(targetBeat.position, 0.5);
  const horizontalDistance = Math.hypot(
    targetBeat.position.x - startPosition.x,
    targetBeat.position.z - startPosition.z
  );
  midpoint.y += Math.max(4, horizontalDistance * 0.2);

  tourState.flightCurve = new THREE.CatmullRomCurve3([startPosition, midpoint, targetBeat.position]);
  tourState.fromLookAt.copy(startLookAt);
  tourState.toLookAt.copy(targetBeat.lookAt);
  tourState.phase = 'flying';
  tourState.phaseElapsed = 0;
}

export function startTourAtBeat(tourState, camera, controls, beatIndex) {
  tourState.active = true;
  controls.enabled = false;
  controls.autoRotate = false;
  flyToBeat(tourState, camera, controls, beatIndex);
}

export function startTour(tourState, camera, controls) {
  startTourAtBeat(tourState, camera, controls, 0);
}

export function exitTour(tourState, camera, controls) {
  tourState.active = false;
  tourState.phase = 'idle';
  controls.enabled = true;
  controls.update();
}

export function goToNextBeat(tourState, camera, controls) {
  if (tourState.currentBeatIndex >= tourState.beats.length - 1) {
    return;
  }
  flyToBeat(tourState, camera, controls, tourState.currentBeatIndex + 1);
}

export function goToPreviousBeat(tourState, camera, controls) {
  if (tourState.currentBeatIndex <= 0) {
    return;
  }
  flyToBeat(tourState, camera, controls, tourState.currentBeatIndex - 1);
}

export function goToBeatIndex(tourState, camera, controls, beatIndex) {
  flyToBeat(tourState, camera, controls, beatIndex);
}

export function updateTour(tourState, camera, controls, dt) {
  if (!tourState.active) {
    return;
  }

  if (tourState.phase === 'flying') {
    tourState.phaseElapsed += dt;
    const rawProgress = Math.min(tourState.phaseElapsed / FLIGHT_SECONDS, 1);
    const easedProgress = easeInOutCubic(rawProgress);
    const point = tourState.flightCurve.getPoint(easedProgress);
    camera.position.copy(point);
    const lookAtPoint = tourState.fromLookAt.clone().lerp(tourState.toLookAt, easedProgress);
    controls.target.copy(lookAtPoint);
    camera.lookAt(lookAtPoint);

    if (rawProgress >= 1) {
      tourState.phase = 'holding';
      tourState.phaseElapsed = 0;
    }
  } else if (tourState.phase === 'holding') {
    tourState.phaseElapsed += dt;
    const isLastBeat = tourState.currentBeatIndex >= tourState.beats.length - 1;
    if (tourState.autoAdvance && tourState.phaseElapsed >= HOLD_SECONDS && !isLastBeat) {
      goToNextBeat(tourState, camera, controls);
    }
  }
}

export function getCurrentCaption(tourState) {
  return tourState.beats[tourState.currentBeatIndex].caption;
}
