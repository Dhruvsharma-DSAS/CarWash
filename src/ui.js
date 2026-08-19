import {
  computeMetrics,
  setTaktSeconds,
  setActiveCellCount,
  setSpeedMultiplier,
  toggleRunning,
  MAX_CELLS
} from './simulation.js';
import { STAGE_INFO } from './stations.js';
import { startTourAtBeat, exitTour, goToNextBeat, goToPreviousBeat, goToBeatIndex, getCurrentCaption } from './tour.js';

const STAGE_TO_BEAT_INDEX = [1, 2, 3, 4, 5, 6];
const BEAT_TO_STAGE_INDEX = [-1, 0, 1, 2, 3, 4, 5, -1];

let stageRowElements = [];
let taktSegmentElements = [];
let lawSegmentElements = [];
let lastRequiredCells = -1;
let tourDotElements = [];
let metricValueElements = {};
let lastTouringStageIndex = -2;

function buildStageRows(tourState, camera, controls) {
  const container = document.getElementById('station-stack');
  container.innerHTML = '';
  stageRowElements = [];

  const hint = document.createElement('p');
  hint.className = 'station-stack-hint';
  hint.textContent = 'Click any stage to fly the tour camera there.';
  container.appendChild(hint);

  let index = 0;
  for (const info of STAGE_INFO) {
    const row = document.createElement('div');
    row.className = 'station-row';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', 'Fly the tour to ' + info.name);

    const header = document.createElement('div');
    header.className = 'station-row-header';

    const numberLabel = document.createElement('span');
    numberLabel.className = 'station-number mono-value';
    numberLabel.textContent = 'S' + (index + 1);

    const nameLabel = document.createElement('span');
    nameLabel.className = 'station-name';
    nameLabel.textContent = info.name;

    header.appendChild(numberLabel);
    header.appendChild(nameLabel);

    const description = document.createElement('p');
    description.className = 'station-description';
    description.textContent = info.description;

    const specsRow = document.createElement('div');
    specsRow.className = 'station-specs';
    for (const spec of info.specs) {
      const chip = document.createElement('span');
      chip.className = 'station-spec-chip';
      chip.textContent = spec.label + ' ' + spec.value;
      const tagEl = document.createElement('span');
      tagEl.className = 'provenance-tag tag-' + spec.tag;
      tagEl.textContent = spec.tag.toUpperCase();
      chip.appendChild(tagEl);
      specsRow.appendChild(chip);
    }

    const liveLine = document.createElement('p');
    liveLine.className = 'station-live-line mono-value';

    const progressTrack = document.createElement('div');
    progressTrack.className = 'station-progress-track';
    const progressFill = document.createElement('div');
    progressFill.className = 'station-progress-fill';
    progressTrack.appendChild(progressFill);

    row.appendChild(header);
    row.appendChild(description);
    row.appendChild(specsRow);
    row.appendChild(liveLine);
    row.appendChild(progressTrack);
    container.appendChild(row);

    const beatIndex = STAGE_TO_BEAT_INDEX[index];
    const flyToThisStage = () => {
      startTourAtBeat(tourState, camera, controls, beatIndex);
      document.getElementById('tour-panel').hidden = false;
      document.getElementById('tour-start-button').hidden = true;
    };
    row.addEventListener('click', flyToThisStage);
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        flyToThisStage();
      }
    });

    stageRowElements.push({ row, liveLine, progressFill });
    index += 1;
  }
}

function buildMetricsGrid() {
  const grid = document.getElementById('metrics-grid');
  grid.innerHTML = '';
  metricValueElements = {};

  const rows = [
    { key: 'taktSeconds', label: 'Takt time' },
    { key: 'requiredCells', label: 'Cells needed' },
    { key: 'activeCellCount', label: 'Cells active' },
    { key: 'measuredThroughputPerHour', label: 'Throughput' },
    { key: 'completedCount', label: 'Cars completed' },
    { key: 'rejectedCount', label: 'Reworked' }
  ];

  for (const rowDef of rows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'metric-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'metric-label';
    labelEl.textContent = rowDef.label;

    const valueEl = document.createElement('span');
    valueEl.className = 'metric-value mono-value';

    rowEl.appendChild(labelEl);
    rowEl.appendChild(valueEl);
    grid.appendChild(rowEl);
    metricValueElements[rowDef.key] = valueEl;
  }
}

function buildTaktBar() {
  const bar = document.getElementById('takt-bar');
  bar.innerHTML = '';
  taktSegmentElements = [];

  for (let i = 0; i < 24; i += 1) {
    const segment = document.createElement('div');
    segment.className = 'takt-segment';
    bar.appendChild(segment);
    taktSegmentElements.push(segment);
  }
}

function buildLittlesLawDiagram(requiredCells) {
  const container = document.getElementById('dwell-blocks');
  container.innerHTML = '';
  lawSegmentElements = [];

  for (let i = 0; i < requiredCells; i += 1) {
    const segment = document.createElement('div');
    segment.className = 'law-segment';
    container.appendChild(segment);
    lawSegmentElements.push(segment);
  }
  lastRequiredCells = requiredCells;
}

function buildProvenancePanel() {
  const container = document.getElementById('provenance-rows');
  container.innerHTML = '';

  const rows = [
    { label: 'Swift length', value: '3.86 m', tag: 'src' },
    { label: 'Cell time', value: '360 s', tag: 'src' },
    { label: 'Cells needed', value: '360s ÷ takt', tag: 'der' },
    { label: 'Tunnel length', value: '40 m', tag: 'src' },
    { label: 'Belt speed', value: '5.5m ÷ takt', tag: 'der' },
    { label: 'Applied water', value: '148 L/car', tag: 'src' },
    { label: 'Fresh make-up', value: '30 L/car', tag: 'der' },
    { label: 'Reclaim rate', value: '80%', tag: 'asm' },
    { label: 'Reject rate', value: '12.5%', tag: 'asm' }
  ];

  for (const rowDef of rows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'provenance-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'provenance-label';
    labelEl.textContent = rowDef.label;

    const valueEl = document.createElement('span');
    valueEl.className = 'provenance-value mono-value';
    valueEl.textContent = rowDef.value;

    const tagEl = document.createElement('span');
    tagEl.className = 'provenance-tag tag-' + rowDef.tag;
    tagEl.textContent = rowDef.tag.toUpperCase();

    rowEl.appendChild(labelEl);
    rowEl.appendChild(valueEl);
    rowEl.appendChild(tagEl);
    container.appendChild(rowEl);
  }
}

function updateSpeedButtonStates(activeSpeed) {
  const speedButtons = document.querySelectorAll('.speed-button');
  for (const button of speedButtons) {
    if (Number(button.dataset.speed) === activeSpeed) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  }
}

function updateRunPauseButton(running) {
  const button = document.getElementById('run-pause-button');
  if (running) {
    button.textContent = 'Pause';
  } else {
    button.textContent = 'Run';
  }
}

function wireControls(state) {
  const taktSlider = document.getElementById('takt-slider');
  const taktSliderValue = document.getElementById('takt-slider-value');
  taktSliderValue.textContent = state.taktSeconds + ' s';

  taktSlider.addEventListener('input', () => {
    const value = Number(taktSlider.value);
    setTaktSeconds(state, value);
    taktSliderValue.textContent = value + ' s';
  });

  const cellsSlider = document.getElementById('cells-slider');
  const cellsSliderValue = document.getElementById('cells-slider-value');
  cellsSlider.max = String(MAX_CELLS);
  cellsSlider.value = String(state.activeCellCount);
  cellsSliderValue.textContent = String(state.activeCellCount);

  cellsSlider.addEventListener('input', () => {
    const value = Number(cellsSlider.value);
    setActiveCellCount(state, value);
    cellsSliderValue.textContent = String(value);
  });

  const speedButtons = document.querySelectorAll('.speed-button');
  for (const button of speedButtons) {
    button.addEventListener('click', () => {
      const speed = Number(button.dataset.speed);
      setSpeedMultiplier(state, speed);
      updateSpeedButtonStates(speed);
    });
  }
  updateSpeedButtonStates(state.speedMultiplier);

  const runPauseButton = document.getElementById('run-pause-button');
  runPauseButton.addEventListener('click', () => {
    toggleRunning(state);
    updateRunPauseButton(state.running);
  });
  updateRunPauseButton(state.running);
}

function wireTour(tourState, camera, controls) {
  const startButton = document.getElementById('tour-start-button');
  const exitButton = document.getElementById('tour-exit-button');
  const prevButton = document.getElementById('tour-prev-button');
  const nextButton = document.getElementById('tour-next-button');
  const tourPanel = document.getElementById('tour-panel');
  const dotsContainer = document.getElementById('tour-dots');

  dotsContainer.innerHTML = '';
  tourDotElements = [];

  for (let beatIndex = 0; beatIndex < tourState.beats.length; beatIndex += 1) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'tour-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', 'Jump to tour beat ' + (beatIndex + 1));
    const capturedIndex = beatIndex;
    dot.addEventListener('click', () => {
      goToBeatIndex(tourState, camera, controls, capturedIndex);
    });
    dotsContainer.appendChild(dot);
    tourDotElements.push(dot);
  }

  startButton.addEventListener('click', () => {
    startTourAtBeat(tourState, camera, controls, 0);
    tourPanel.hidden = false;
    startButton.hidden = true;
  });

  exitButton.addEventListener('click', () => {
    exitTour(tourState, camera, controls);
    tourPanel.hidden = true;
    startButton.hidden = false;
  });

  prevButton.addEventListener('click', () => {
    goToPreviousBeat(tourState, camera, controls);
  });

  nextButton.addEventListener('click', () => {
    goToNextBeat(tourState, camera, controls);
  });

  document.addEventListener('keydown', (event) => {
    if (!tourState.active) {
      return;
    }
    if (event.key === 'ArrowRight') {
      goToNextBeat(tourState, camera, controls);
    } else if (event.key === 'ArrowLeft') {
      goToPreviousBeat(tourState, camera, controls);
    }
  });
}

export function setupUI(context) {
  buildStageRows(context.tourState, context.camera, context.controls);
  buildMetricsGrid();
  buildTaktBar();
  buildProvenancePanel();
  wireControls(context.state);
  wireTour(context.tourState, context.camera, context.controls);
}

function updateMetricsGrid(metrics) {
  metricValueElements.taktSeconds.textContent = metrics.taktSeconds.toFixed(0) + ' s';
  metricValueElements.requiredCells.textContent = String(metrics.requiredCells);
  metricValueElements.activeCellCount.textContent = String(metrics.activeCellCount);
  if (metrics.starved) {
    metricValueElements.activeCellCount.classList.add('metric-bad');
  } else {
    metricValueElements.activeCellCount.classList.remove('metric-bad');
  }
  metricValueElements.measuredThroughputPerHour.textContent = metrics.measuredThroughputPerHour.toFixed(0) + ' cars/hr';
  metricValueElements.completedCount.textContent = String(metrics.completedCount);
  metricValueElements.rejectedCount.textContent = String(metrics.rejectedCount);

  const hubLine = document.getElementById('hub-line');
  hubLine.textContent =
    'At the ' + metrics.taktSeconds.toFixed(0) + 's target takt, an 80-car hub clears in ' +
    metrics.hubMinutes.toFixed(0) + ' minutes. Fresh water so far: ' +
    Math.round(metrics.freshWaterLitres).toLocaleString() + ' L. Ozone-treated: ' + metrics.ozoneTreatedCount + '.';

  const verdict = document.getElementById('verdict-banner');
  if (metrics.starved) {
    verdict.className = 'verdict-banner starved';
    verdict.textContent =
      metrics.activeCellCount + ' cells release a car every ' + metrics.releaseIntervalSeconds.toFixed(1) +
      's. That is slower than the ' + metrics.taktSeconds.toFixed(0) +
      's tunnel takt, so the merge queue is starving the tunnel. Missed slots so far: ' + metrics.missedSlotCount + '.';
  } else {
    verdict.className = 'verdict-banner';
    verdict.textContent =
      metrics.activeCellCount + ' cells release a car every ' + metrics.releaseIntervalSeconds.toFixed(1) +
      's, inside the ' + metrics.taktSeconds.toFixed(0) + 's takt. The tunnel runs at ' +
      metrics.beltSpeed.toFixed(3) + ' m/s and stays fed.';
  }
}

function updateTaktBar(metrics) {
  const litCount = Math.floor(metrics.tunnelSlotFraction * 24);

  let index = 0;
  for (const segment of taktSegmentElements) {
    if (index < litCount) {
      segment.classList.add('lit');
    } else {
      segment.classList.remove('lit');
    }
    index += 1;
  }

  const timeLabel = document.getElementById('takt-bar-time');
  let gapText = 'no output yet';
  if (metrics.lastOutputGap !== null) {
    gapText = 'last output gap ' + metrics.lastOutputGap.toFixed(1) + ' s';
  } else if (metrics.completedCount > 0) {
    gapText = 'first output logged';
  }
  timeLabel.textContent = gapText;
}

function updateLittlesLawDiagram(metrics) {
  if (metrics.requiredCells !== lastRequiredCells) {
    buildLittlesLawDiagram(metrics.requiredCells);
  }

  let index = 0;
  for (const segment of lawSegmentElements) {
    segment.classList.remove('lit', 'missing');
    if (index < metrics.activeCellCount) {
      segment.classList.add('lit');
    } else {
      segment.classList.add('missing');
    }
    index += 1;
  }
}

function updateStageRows(metrics) {
  const gateRow = stageRowElements[0];
  if (metrics.gateBusy) {
    gateRow.liveLine.textContent = 'scanning · queue ' + metrics.entryQueueLength;
  } else {
    gateRow.liveLine.textContent = 'idle · queue ' + metrics.entryQueueLength;
  }
  gateRow.progressFill.style.width = metrics.gateBusy ? '100%' : '0%';
  toggleRowLit(gateRow, metrics.gateBusy);

  const cellsRow = stageRowElements[1];
  cellsRow.liveLine.textContent = metrics.cellsOccupied + ' / ' + metrics.activeCellCount + ' busy';
  cellsRow.progressFill.style.width = (metrics.cellsOccupied / metrics.activeCellCount) * 100 + '%';
  toggleRowLit(cellsRow, metrics.cellsOccupied > 0);

  const mergeRow = stageRowElements[2];
  mergeRow.liveLine.textContent = metrics.mergeQueueLength + ' waiting';
  mergeRow.progressFill.style.width = Math.min(metrics.mergeQueueLength / 4, 1) * 100 + '%';
  toggleRowLit(mergeRow, metrics.mergeQueueLength > 0);
  if (metrics.starved) {
    mergeRow.row.classList.add('starved');
  } else {
    mergeRow.row.classList.remove('starved');
  }

  const tunnelRow = stageRowElements[3];
  tunnelRow.liveLine.textContent = metrics.tunnelCarCount + ' cars · ' + metrics.beltSpeed.toFixed(3) + ' m/s';
  tunnelRow.progressFill.style.width = Math.min(metrics.tunnelCarCount / 7, 1) * 100 + '%';
  toggleRowLit(tunnelRow, metrics.tunnelCarCount > 0);

  const qcRow = stageRowElements[4];
  if (metrics.qcBusy) {
    qcRow.liveLine.textContent = 'scanning · reworked ' + metrics.rejectedCount;
  } else {
    qcRow.liveLine.textContent = 'idle · reworked ' + metrics.rejectedCount;
  }
  qcRow.progressFill.style.width = metrics.qcBusy ? '100%' : '0%';
  toggleRowLit(qcRow, metrics.qcBusy);

  const ozoneRow = stageRowElements[5];
  ozoneRow.liveLine.textContent = metrics.ozoneTreatedCount + ' treated lifetime';
  ozoneRow.progressFill.style.width = '0%';
  toggleRowLit(ozoneRow, false);
}

function toggleRowLit(rowElements, lit) {
  if (lit) {
    rowElements.row.classList.add('lit');
  } else {
    rowElements.row.classList.remove('lit');
  }
}

function setTouringStage(stageIndex) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  for (const elements of stageRowElements) {
    if (index === stageIndex) {
      elements.row.classList.add('touring');
      if (reducedMotion) {
        elements.row.scrollIntoView({ block: 'nearest' });
      } else {
        elements.row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    } else {
      elements.row.classList.remove('touring');
    }
    index += 1;
  }

  const stageLabel = document.getElementById('tour-stage-label');
  const specsContainer = document.getElementById('tour-detail-specs');
  specsContainer.innerHTML = '';

  if (stageIndex >= 0) {
    const info = STAGE_INFO[stageIndex];
    stageLabel.textContent = 'Now touring: S' + (stageIndex + 1) + ' ' + info.name;
    for (const spec of info.specs) {
      const chip = document.createElement('span');
      chip.className = 'tour-spec-chip';
      chip.textContent = spec.label + ' ' + spec.value;
      const tagEl = document.createElement('span');
      tagEl.className = 'provenance-tag tag-' + spec.tag;
      tagEl.textContent = spec.tag.toUpperCase();
      chip.appendChild(tagEl);
      specsContainer.appendChild(chip);
    }
  } else {
    stageLabel.textContent = '';
  }

  lastTouringStageIndex = stageIndex;
}

function updateTourPanel(tourState) {
  if (!tourState.active) {
    if (lastTouringStageIndex !== -2) {
      setTouringStage(-2);
    }
    return;
  }

  const captionEl = document.getElementById('tour-caption-text');
  captionEl.textContent = getCurrentCaption(tourState);

  const stageIndex = BEAT_TO_STAGE_INDEX[tourState.currentBeatIndex];
  if (stageIndex !== lastTouringStageIndex) {
    setTouringStage(stageIndex);
  }

  let dotIndex = 0;
  for (const dot of tourDotElements) {
    if (dotIndex === tourState.currentBeatIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
    dotIndex += 1;
  }

  const prevButton = document.getElementById('tour-prev-button');
  const nextButton = document.getElementById('tour-next-button');
  prevButton.disabled = tourState.currentBeatIndex === 0;
  nextButton.disabled = tourState.currentBeatIndex === tourState.beats.length - 1;
}

export function updateUI(context) {
  const metrics = computeMetrics(context.state);
  updateMetricsGrid(metrics);
  updateTaktBar(metrics);
  updateLittlesLawDiagram(metrics);
  updateStageRows(metrics);
  updateTourPanel(context.tourState);
}
