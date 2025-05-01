import { levels } from './levels.js';
import { showScreen, showMessage, hideMessage, getIconSvg } from './ui.js';
import { getSVGCoordinates, lineSegmentIntersectsRect, isPointOnDrawableArea, isOppositeSide } from './utils.js';
import { BRIDGE_INITIAL_COLOR_RGBA, BRIDGE_CROSSED_COLOR_RGBA, PATH_COLOR, PATH_WIDTH, MESSAGE_TIMEOUT, RESET_DELAY } from './config.js';
import { markLevelAsCompleted } from './storage.js'; // Import markLevelAsCompleted

let currentLevelIndex = -1;
let levelData = null;
let svgElement = null;
let pathElement = null;
let bridgesMap = new Map(); // Stores bridgeId -> SVGRectElement
let totalBridges = 0;

let isDrawing = false;
let pathPoints = [];
let crossedBridgeIds = new Set();
let isComplete = false;

// Interaction state refs
let currentlyInsideBridgeId = null;
let justCrossedBridgeId = null;
let bridgeEntryPoint = null;
let interactionStartPoint = null;

// DOM Element Refs
let resetButton = null;
let backButton = null;
let bridgeCounterElement = null;
let completionActionsElement = null;

// --- Initialization and Cleanup ---

function initializeLevel(container, levelIndex) {
  console.log(`Initializing level ${levelIndex}`);
  currentLevelIndex = levelIndex;
  levelData = levels[levelIndex];
  if (!levelData || !levelData.svgPath) { // Check for svgPath now
    console.error(`Level data or svgPath not found for index: ${levelIndex}`);
    showScreen('level-select');
    return;
  }

  // Create game screen structure
  container.innerHTML = `
    <div class="game-screen">
      <div class="game-header">
        <button id="game-back-button" class="back-button">${getIconSvg('ArrowLeft')} Seviye Seçimi</button>
        <h2 id="level-title">${levelData.name}</h2>
        <button id="game-reset-button" class="reset-button" disabled>${getIconSvg('RotateCcw')} Sıfırla</button>
      </div>
      <div class="svg-container">
        <svg id="game-svg" class="game-svg" preserveAspectRatio="xMidYMid meet"></svg>
      </div>
      <div class="game-info">
        <div id="message-area" class="message-area">
           <span id="message-icon" class="icon"></span>
           <span id="message-content"></span>
        </div>
        <div id="bridge-counter" class="bridge-counter">Geçilen Köprüler: 0 / 0</div>
        <div id="completion-actions" class="completion-actions hidden">
           <button id="completion-back-button">${getIconSvg('ArrowLeft')} Seviye Seçimine Dön</button>
           <!-- Add next level button later if needed -->
        </div>
      </div>
    </div>
  `;

  // Get references to important elements
  svgElement = container.querySelector('#game-svg');
  resetButton = container.querySelector('#game-reset-button');
  backButton = container.querySelector('#game-back-button');
  bridgeCounterElement = container.querySelector('#bridge-counter');
  completionActionsElement = container.querySelector('#completion-actions');
  const levelTitleElement = container.querySelector('#level-title');

  if (!svgElement || !resetButton || !backButton || !bridgeCounterElement || !completionActionsElement || !levelTitleElement) {
      console.error("One or more essential game screen elements not found!");
      showScreen('level-select');
      return;
  }

  // Load SVG content asynchronously
  loadSVGContentAsync(levelData.svgPath); // Pass the path

  // Add event listeners
  setupEventListeners();

  // Initial state reset
  resetGame();
}

async function loadSVGContentAsync(svgPath) {
  if (!svgElement || !svgPath) {
    console.error("loadSVGContentAsync: svgElement or svgPath is missing.");
    showMessage("Harita yolu bulunamadı.", "error", 0);
    return;
  }
  console.log(`loadSVGContentAsync: Loading SVG from path: ${svgPath}`);

  // Clear previous content
  while (svgElement.firstChild) {
    svgElement.removeChild(svgElement.firstChild);
  }
  // Reset bridge count before loading
  totalBridges = 0;
  updateBridgeCounter();

  try {
    const response = await fetch(svgPath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${svgPath}`);
    }
    const svgString = await response.text();
    console.log(`loadSVGContentAsync: Successfully fetched SVG content from ${svgPath}. Length: ${svgString.length}`);

    if (!svgString) {
        console.error("loadSVGContentAsync: Fetched SVG content string is empty.");
        showMessage("Harita dosyası boş veya okunamadı.", "error", 0);
        return;
    }

    // --- Trim potential whitespace ---
    let processedSvgString = svgString.trim();
    console.log("loadSVGContentAsync: Trimmed SVG string (first 100 chars):", processedSvgString.substring(0, 100));

    // --- Remove CDATA wrapper if present ---
    const cdataStart = '<![CDATA[';
    const cdataEnd = ']]>';
    if (processedSvgString.startsWith(cdataStart) && processedSvgString.endsWith(cdataEnd)) {
        console.log("loadSVGContentAsync: Detected CDATA wrapper. Removing it.");
        processedSvgString = processedSvgString.substring(cdataStart.length, processedSvgString.length - cdataEnd.length).trim(); // Trim again after removing CDATA
        console.log("loadSVGContentAsync: SVG string after removing CDATA (first 100 chars):", processedSvgString.substring(0, 100));
    } else {
        console.log("loadSVGContentAsync: No CDATA wrapper detected.");
    }

    // --- Use DOMParser for robust SVG parsing ---
    const parser = new DOMParser();
    // Use the potentially modified processedSvgString
    const parsedDocument = parser.parseFromString(processedSvgString, 'image/svg+xml');
    console.log("loadSVGContentAsync: SVG string parsed using DOMParser.");

    // Check for parser errors
    const parserError = parsedDocument.querySelector('parsererror');
    if (parserError) {
        console.error("loadSVGContentAsync: DOMParser encountered an error.", parserError.textContent);
        // Log the beginning of the string that caused the error
        console.error("loadSVGContentAsync: Beginning of string that failed parsing:", processedSvgString.substring(0, 200));
        throw new Error(`SVG parsing error: ${parserError.textContent}`);
    }

    const svgSourceRoot = parsedDocument.documentElement; // Get the root element (<svg>)

    if (svgSourceRoot && svgSourceRoot.nodeName.toLowerCase() === 'svg') {
      console.log("loadSVGContentAsync: Found <svg> root element in parsed document.");

      // Copy viewBox, width, height
      const viewBox = svgSourceRoot.getAttribute('viewBox');
      console.log(`loadSVGContentAsync: Source viewBox attribute = "${viewBox}"`);
      if (viewBox && /^[0-9.\s-]+$/.test(viewBox.trim())) {
        svgElement.setAttribute('viewBox', viewBox.trim());
        console.log(`loadSVGContentAsync: Set viewBox to "${viewBox.trim()}"`);
      } else {
        console.warn(`loadSVGContentAsync: SVG source viewBox is missing or invalid ("${viewBox}"). Attempting fallback.`);
        const widthAttr = svgSourceRoot.getAttribute('width');
        const heightAttr = svgSourceRoot.getAttribute('height');
        const width = widthAttr ? parseInt(widthAttr, 10) : null;
        const height = heightAttr ? parseInt(heightAttr, 10) : null;
        if (width && height && !isNaN(width) && !isNaN(height)) {
          const fallbackViewBox = `0 0 ${width} ${height}`;
          svgElement.setAttribute('viewBox', fallbackViewBox);
          console.log(`loadSVGContentAsync: Fallback viewBox set to "${fallbackViewBox}" using parsed width/height.`);
        } else {
          console.error(`loadSVGContentAsync: Could not determine valid width/height for fallback viewBox. widthAttr="${widthAttr}", heightAttr="${heightAttr}"`);
          showMessage("Harita boyutları okunamadı.", "error", 0);
        }
      }

      const sourceWidthAttr = svgSourceRoot.getAttribute('width');
      const sourceHeightAttr = svgSourceRoot.getAttribute('height');
      const sourceWidth = sourceWidthAttr ? parseInt(sourceWidthAttr, 10) : null;
      const sourceHeight = sourceHeightAttr ? parseInt(sourceHeightAttr, 10) : null;
      if (sourceWidth && !isNaN(sourceWidth)) {
          svgElement.setAttribute('width', sourceWidth);
          console.log(`loadSVGContentAsync: Set width to "${sourceWidth}" (parsed from "${sourceWidthAttr}")`);
      } else {
          console.log(`loadSVGContentAsync: Source SVG has no valid width attribute ("${sourceWidthAttr}").`);
          svgElement.removeAttribute('width');
      }
      if (sourceHeight && !isNaN(sourceHeight)) {
          svgElement.setAttribute('height', sourceHeight);
           console.log(`loadSVGContentAsync: Set height to "${sourceHeight}" (parsed from "${sourceHeightAttr}")`);
      } else {
           console.log(`loadSVGContentAsync: Source SVG has no valid height attribute ("${sourceHeightAttr}").`);
           svgElement.removeAttribute('height');
      }

      // Append child nodes
      console.log(`loadSVGContentAsync: Appending ${svgSourceRoot.childNodes.length} child nodes...`);
      let appendedNodeCount = 0;
      Array.from(svgSourceRoot.childNodes).forEach(node => {
        const importedNode = document.importNode(node, true);
        if (importedNode.nodeType === Node.ELEMENT_NODE) {
          try {
            svgElement.appendChild(importedNode);
            appendedNodeCount++;
          } catch (appendError) {
             console.error(`loadSVGContentAsync: Error appending node: ${node.nodeName}`, appendError);
          }
        }
      });
      console.log(`loadSVGContentAsync: Appended ${appendedNodeCount} element nodes.`);

      // --- Deferred Bridge Initialization ---
      setTimeout(() => {
          console.log("loadSVGContentAsync: Deferred bridge initialization starting...");
          bridgesMap.clear();
          const bridgeElements = svgElement.querySelectorAll('rect[id^="bridge-"]');
          console.log(`loadSVGContentAsync: Found ${bridgeElements.length} potential bridge elements (deferred).`);
          bridgeElements.forEach(bridge => {
              bridgesMap.set(bridge.id, bridge);
              bridge.style.fill = BRIDGE_INITIAL_COLOR_RGBA;
              bridge.classList.remove('crossed');
              bridge.setAttribute('pointer-events', 'all');
              console.log(`loadSVGContentAsync: Initialized bridge: ${bridge.id}`);
          });
          totalBridges = bridgesMap.size;
          console.log(`loadSVGContentAsync: Initialized ${totalBridges} bridges (deferred).`);
          updateBridgeCounter();
      }, 0);

      // Create the polyline for the path
      pathElement = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      pathElement.setAttribute("class", "drawn-path");
      pathElement.setAttribute("points", "");
      svgElement.appendChild(pathElement);
      console.log("loadSVGContentAsync: Added polyline for drawing path.");

    } else {
      console.error("loadSVGContentAsync: Parsed document root is not <svg>.", svgSourceRoot);
      showMessage("Harita dosyası geçersiz veya SVG formatında değil.", "error", 0);
    }
  } catch (error) {
      console.error("loadSVGContentAsync: Critical error during SVG fetching or processing.", error);
      showMessage(`Harita yüklenemedi: ${error.message}`, "error", 0);
  }
}


function setupEventListeners() {
    if (!svgElement || !resetButton || !backButton) return;

    // --- Drawing Listeners (Mouse & Touch) ---
    let drawingStarted = false;

    const onInteractionStart = (event) => {
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        drawingStarted = handleInteractionStart(clientX, clientY);
        if (drawingStarted && event.cancelable) {
            event.preventDefault();
        }
    };

    const onInteractionMove = (event) => {
        if (!isDrawing) return;
        if (event.cancelable) {
            event.preventDefault();
        }
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;
        handleInteractionMove(clientX, clientY);
    };

    const onInteractionEnd = (event) => {
        if (drawingStarted) {
            handleInteractionEnd();
            drawingStarted = false;
        }
    };

    // Mouse Events
    svgElement.addEventListener('mousedown', onInteractionStart);
    window.addEventListener('mousemove', onInteractionMove);
    window.addEventListener('mouseup', onInteractionEnd);

    // Touch Events
    svgElement.addEventListener('touchstart', onInteractionStart, { passive: false });
    svgElement.addEventListener('touchmove', onInteractionMove, { passive: false });
    svgElement.addEventListener('touchend', onInteractionEnd);
    svgElement.addEventListener('touchcancel', onInteractionEnd);

    // --- Button Listeners ---
    resetButton.addEventListener('click', resetGame);
    backButton.addEventListener('click', () => showScreen('level-select'));

    const completionBackButton = document.getElementById('completion-back-button');
     if (completionBackButton) {
         completionBackButton.addEventListener('click', () => showScreen('level-select'));
     }

    // Cleanup function
    return () => {
        svgElement.removeEventListener('mousedown', onInteractionStart);
        window.removeEventListener('mousemove', onInteractionMove);
        window.removeEventListener('mouseup', onInteractionEnd);
        svgElement.removeEventListener('touchstart', onInteractionStart);
        svgElement.removeEventListener('touchmove', onInteractionMove);
        svgElement.removeEventListener('touchend', onInteractionEnd);
        svgElement.removeEventListener('touchcancel', onInteractionEnd);
    };
}

// --- Game State & Logic ---

function resetGame() {
  isDrawing = false;
  isComplete = false;
  pathPoints = [];
  crossedBridgeIds.clear();
  currentlyInsideBridgeId = null;
  justCrossedBridgeId = null;
  bridgeEntryPoint = null;
  interactionStartPoint = null;

  // Visual Resets
  resetBridgeVisuals();
  updatePath(); // Clear visual path
  updateBridgeCounter(); // Update with potentially new totalBridges
  hideMessage();
  if (resetButton) resetButton.disabled = true;
  if (svgElement) svgElement.classList.remove('drawing');
  if (completionActionsElement) completionActionsElement.classList.add('hidden');
}

function resetBridgeVisuals() {
  bridgesMap.forEach(bridge => {
    bridge.style.fill = BRIDGE_INITIAL_COLOR_RGBA;
    bridge.classList.remove('crossed');
  });
}

function updateBridgeVisual(bridgeId, crossed) {
  const bridge = bridgesMap.get(bridgeId);
  if (bridge) {
    bridge.style.fill = crossed ? BRIDGE_CROSSED_COLOR_RGBA : BRIDGE_INITIAL_COLOR_RGBA;
    if (crossed) {
      bridge.classList.add('crossed');
    } else {
      bridge.classList.remove('crossed');
    }
  }
}

function updatePath() {
  if (pathElement) {
    const pathDataString = pathPoints.map(p => `${p.x},${p.y}`).join(' ');
    pathElement.setAttribute('points', pathDataString);
  }
}

function updateBridgeCounter() {
  if (bridgeCounterElement) {
    bridgeCounterElement.textContent = `Geçilen Köprüler: ${crossedBridgeIds.size} / ${totalBridges}`;
  }
}


// --- Interaction Handlers ---

function handleInteractionStart(clientX, clientY) {
  if (isComplete || !svgElement) return false;

  // Wait until bridges are loaded before allowing drawing
  if (totalBridges === 0 && bridgesMap.size === 0) {
      const bridgeElements = svgElement.querySelectorAll('rect[id^="bridge-"]');
      if (bridgeElements.length === 0) {
          showMessage('Harita henüz tam yüklenmedi, lütfen bekleyin.', 'info', MESSAGE_TIMEOUT);
          return false;
      } else {
          console.warn("handleInteractionStart: Bridges found in DOM but not in map. Re-initializing.");
          bridgesMap.clear();
          bridgeElements.forEach(bridge => {
              bridgesMap.set(bridge.id, bridge);
              bridge.style.fill = BRIDGE_INITIAL_COLOR_RGBA;
              bridge.classList.remove('crossed');
              bridge.setAttribute('pointer-events', 'all');
          });
          totalBridges = bridgesMap.size;
          updateBridgeCounter();
          if (totalBridges === 0) {
             showMessage('Köprüler yüklenemedi. Harita hatası olabilir.', 'error', 0);
             return false;
          }
      }
  }


  if (!isPointOnDrawableArea(clientX, clientY, svgElement)) {
    showMessage('Sadece kara alanlarından veya köprülerden başlayabilirsiniz.', 'warning', MESSAGE_TIMEOUT);
    return false;
  }

  const coords = getSVGCoordinates(svgElement, { clientX, clientY });
  if (!coords) return false;

  isComplete = false;
  crossedBridgeIds.clear();
  resetBridgeVisuals();
  hideMessage();
  if (completionActionsElement) completionActionsElement.classList.add('hidden');

  isDrawing = true;
  pathPoints = [coords];
  interactionStartPoint = coords;
  updatePath();
  if (svgElement) svgElement.classList.add('drawing');
  if (resetButton) resetButton.disabled = false;

  currentlyInsideBridgeId = null;
  justCrossedBridgeId = null;
  bridgeEntryPoint = null;

  return true;
}

function handleInteractionMove(clientX, clientY) {
  if (!isDrawing || isComplete || !svgElement) return;

  const currentCoords = getSVGCoordinates(svgElement, { clientX, clientY });
  if (!currentCoords) return;

  const lastPoint = pathPoints[pathPoints.length - 1];
  if (!lastPoint) return;

  const dx = currentCoords.x - lastPoint.x;
  const dy = currentCoords.y - lastPoint.y;
  if (dx * dx + dy * dy < 9) { // Threshold to avoid too many points close together
    return;
  }

  const isOnDrawable = isPointOnDrawableArea(clientX, clientY, svgElement);

  // --- START: WATER COLLISION FIX ---
  if (!isOnDrawable) { // Moved into water or outside SVG bounds
    // Check if we were inside a bridge when hitting water
    if (currentlyInsideBridgeId) {
      const exitedBridgeId = currentlyInsideBridgeId;
      // Check if crossed from the entry point to the current point (opposite side)
      if (bridgeEntryPoint && isOppositeSide(bridgeEntryPoint, currentCoords, bridgesMap.get(exitedBridgeId))) {
        if (!crossedBridgeIds.has(exitedBridgeId)) {
          crossedBridgeIds.add(exitedBridgeId);
          updateBridgeVisual(exitedBridgeId, true);
          updateBridgeCounter();
        }
        // No need to set justCrossedBridgeId here as the move is invalid
      }
    }

    // Immediately stop drawing and reset
    showMessage('Sudan veya harita dışından geçemezsiniz! Çizim sıfırlanıyor.', 'warning', MESSAGE_TIMEOUT);
    isDrawing = false; // Stop processing further moves
    if (svgElement) svgElement.classList.remove('drawing');
    setTimeout(resetGame, RESET_DELAY); // Schedule reset
    return; // Prevent adding the point or further checks in this move event
  }
  // --- END: WATER COLLISION FIX ---


  // --- If execution reaches here, we are on a drawable area (land or bridge) ---

  let intersectingBridgeId = null;
  for (const [bridgeId, bridgeRect] of bridgesMap.entries()) {
      if (lineSegmentIntersectsRect(lastPoint, currentCoords, bridgeRect)) {
          intersectingBridgeId = bridgeId;
          break;
      }
  }

  // Add the current point *only if* it's drawable
  pathPoints.push(currentCoords);
  updatePath();

  // --- Bridge Crossing Logic (largely unchanged, but follows water check) ---
  if (intersectingBridgeId) { // Currently moving over a bridge
    const bridgeId = intersectingBridgeId;
    if (crossedBridgeIds.has(bridgeId)) { // Trying to cross an already crossed bridge
      if (bridgeId !== justCrossedBridgeId) {
        showMessage('Aynı köprüden iki defa geçemezsiniz! Çizim sıfırlanıyor.', 'warning', MESSAGE_TIMEOUT);
        isDrawing = false;
        if (svgElement) svgElement.classList.remove('drawing');
        setTimeout(resetGame, RESET_DELAY);
        return;
      } else {
        justCrossedBridgeId = null;
        if (currentlyInsideBridgeId !== bridgeId) {
           currentlyInsideBridgeId = bridgeId;
           bridgeEntryPoint = currentCoords;
        }
      }
    } else { // Entering a new, uncrossed bridge
      if (currentlyInsideBridgeId !== bridgeId) {
        if (currentlyInsideBridgeId && currentlyInsideBridgeId !== bridgeId) {
          const exitedBridgeId = currentlyInsideBridgeId;
          if (bridgeEntryPoint && isOppositeSide(bridgeEntryPoint, currentCoords, bridgesMap.get(exitedBridgeId))) {
            if (!crossedBridgeIds.has(exitedBridgeId)) {
              crossedBridgeIds.add(exitedBridgeId);
              updateBridgeVisual(exitedBridgeId, true);
              updateBridgeCounter();
            }
            justCrossedBridgeId = exitedBridgeId;
          }
        } else {
           if (justCrossedBridgeId && justCrossedBridgeId !== bridgeId) {
               justCrossedBridgeId = null;
           }
        }
        currentlyInsideBridgeId = bridgeId;
        bridgeEntryPoint = currentCoords;
      }
       if (justCrossedBridgeId === bridgeId) {
           justCrossedBridgeId = null;
       }
    }
  } else { // Currently moving over land (not a bridge)
    if (currentlyInsideBridgeId) { // Just exited a bridge onto land
      const exitedBridgeId = currentlyInsideBridgeId;
      if (bridgeEntryPoint && isOppositeSide(bridgeEntryPoint, currentCoords, bridgesMap.get(exitedBridgeId))) {
        if (!crossedBridgeIds.has(exitedBridgeId)) {
          crossedBridgeIds.add(exitedBridgeId);
          updateBridgeVisual(exitedBridgeId, true);
          updateBridgeCounter();
        }
        justCrossedBridgeId = exitedBridgeId;
      }
      currentlyInsideBridgeId = null;
      bridgeEntryPoint = null;
    } else if (justCrossedBridgeId) {
      justCrossedBridgeId = null;
    }
  }
}


function handleInteractionEnd() {
  if (!isDrawing || isComplete) return; // Check isDrawing flag here

  isDrawing = false; // Set isDrawing false *before* potential early exit
  if (svgElement) svgElement.classList.remove('drawing');

  // Check if the drawing ended inside a bridge and count it if crossed
  // This needs to happen even if the path is short, but only if a bridge was entered
  if (currentlyInsideBridgeId) {
    const lastBridgeId = currentlyInsideBridgeId;
    const lastPoint = pathPoints[pathPoints.length - 1];

    // Ensure bridgeEntryPoint and lastPoint exist before checking opposite side
    if (lastPoint && bridgeEntryPoint && bridgesMap.has(lastBridgeId) && isOppositeSide(bridgeEntryPoint, lastPoint, bridgesMap.get(lastBridgeId))) {
      if (!crossedBridgeIds.has(lastBridgeId)) {
        crossedBridgeIds.add(lastBridgeId);
        updateBridgeVisual(lastBridgeId, true);
        updateBridgeCounter();
      }
    }
  }

  // Reset interaction state variables regardless of completion
  currentlyInsideBridgeId = null;
  justCrossedBridgeId = null;
  bridgeEntryPoint = null;

  // Check for level completion
  if (totalBridges > 0 && crossedBridgeIds.size === totalBridges) {
    isComplete = true;
    showMessage('Tebrikler! Bu bölümü başarıyla tamamladınız!', 'success', 0);
    markLevelAsCompleted(currentLevelIndex); // Mark level as completed
    if (resetButton) resetButton.disabled = true;
    if (completionActionsElement) completionActionsElement.classList.remove('hidden');
  } else if (pathPoints.length > 1) { // Path was drawn but not complete/correct
    // Don't show message if reset was already triggered by water/double-cross
    // Check if a reset is already scheduled (difficult without tracking timeout IDs)
    // Instead, rely on the fact that resetGame clears the path. If pathPoints is empty, reset happened.
    // A simple check: if pathPoints still has data, *then* show the "try again" message.
     if (pathPoints.length > 0) { // Check if resetGame hasn't already cleared the path
        showMessage('Tüm köprülerden geçmediniz veya geçersiz bir yol çizdiniz. Tekrar deneyin.', 'warning', MESSAGE_TIMEOUT);
        // Reset the path after a delay if not complete
        setTimeout(() => {
          // Check isComplete again, and also pathPoints length
          if (!isComplete && pathPoints.length > 0) {
            pathPoints = [];
            updatePath();
            resetBridgeVisuals();
            crossedBridgeIds.clear();
            updateBridgeCounter();
            hideMessage();
            if (resetButton) resetButton.disabled = true;
          }
        }, RESET_DELAY);
     }
  } else { // Interaction ended without drawing a significant path (e.g., just a click)
     // Ensure path is cleared if it wasn't already by water collision etc.
     if (pathPoints.length > 0) {
        pathPoints = [];
        updatePath();
     }
     if (resetButton) resetButton.disabled = true; // Disable reset if nothing significant was drawn or if reset already happened
  }
  interactionStartPoint = null; // Reset start point
}


// --- Public Function ---
export function loadGameScreen(container, levelIndex) {
  initializeLevel(container, levelIndex);
}
