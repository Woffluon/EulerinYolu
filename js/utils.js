/**
 * Gets SVG coordinates from a mouse or touch event relative to the SVG element.
 * @param {SVGSVGElement} svg - The SVG element.
 * @param {MouseEvent|TouchEvent} event - The mouse or touch event.
 * @returns {{x: number, y: number}|null} The coordinates or null if failed.
 */
export function getSVGCoordinates(svg, event) {
  if (!svg) return null;

  const pt = svg.createSVGPoint();
  let clientX;
  let clientY;

  if (event.touches && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if (event.changedTouches && event.changedTouches.length > 0) {
    // Handle touchend/touchcancel
    clientX = event.changedTouches[0].clientX;
    clientY = event.changedTouches[0].clientY;
  } else if (event.clientX !== undefined && event.clientY !== undefined) {
    clientX = event.clientX;
    clientY = event.clientY;
  } else {
    return null; // No valid coordinates found
  }


  pt.x = clientX;
  pt.y = clientY;

  try {
    const ctm = svg.getScreenCTM();
    if (!ctm) {
      console.error("SVG getScreenCTM is null.");
      return null;
    }
    const svgPoint = pt.matrixTransform(ctm.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  } catch (error) {
    console.error("Error transforming screen coordinates to SVG coordinates:", error);
    return null;
  }
}

/**
 * Checks if a line segment intersects with a rectangle's bounding box.
 * Uses a simplified Liang-Barsky algorithm approach.
 * @param {{x: number, y: number}} p1 - Start point of the line segment.
 * @param {{x: number, y: number}} p2 - End point of the line segment.
 * @param {SVGRectElement} rect - The rectangle element.
 * @returns {boolean} True if the line segment intersects the rectangle.
 */
export function lineSegmentIntersectsRect(p1, p2, rect) {
  try {
    const rectBBox = rect.getBBox();
    const rectMinX = rectBBox.x;
    const rectMinY = rectBBox.y;
    const rectMaxX = rectBBox.x + rectBBox.width;
    const rectMaxY = rectBBox.y + rectBBox.height;

    // Basic bounding box overlap check for early exit
    const lineMinX = Math.min(p1.x, p2.x);
    const lineMaxX = Math.max(p1.x, p2.x);
    const lineMinY = Math.min(p1.y, p2.y);
    const lineMaxY = Math.max(p1.y, p2.y);

    if (lineMaxX < rectMinX || lineMinX > rectMaxX || lineMaxY < rectMinY || lineMinY > rectMaxY) {
      return false;
    }

    // Simplified Liang-Barsky algorithm
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    let t0 = 0.0;
    let t1 = 1.0;
    const p = [-dx, dx, -dy, dy];
    const q = [p1.x - rectMinX, rectMaxX - p1.x, p1.y - rectMinY, rectMaxY - p1.y];

    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) { // Line parallel to edge
        if (q[i] < 0) return false; // Parallel and outside
      } else {
        const r = q[i] / p[i];
        if (p[i] < 0) { // Line proceeds outside to inside
          if (r > t1) return false;
          if (r > t0) t0 = r;
        } else { // Line proceeds inside to outside (p[i] > 0)
          if (r < t0) return false;
          if (r < t1) t1 = r;
        }
      }
    }
    // If t0 < t1, the line segment intersects the clipping window (rectangle)
    return t0 < t1;
  } catch (error) {
    // Error likely if getBBox fails (e.g., element not rendered)
    console.error("Error checking line-rectangle intersection:", error, rect);
    return false;
  }
}

/**
 * Checks if a point (from client coordinates) is over a drawable area (land or bridge) within the SVG.
 * Uses elementFromPoint and traverses up to find data-terrain attributes.
 * @param {number} clientX - Client X coordinate.
 * @param {number} clientY - Client Y coordinate.
 * @param {SVGSVGElement} svgElement - The SVG element.
 * @returns {boolean} True if the point is on a drawable area.
 */
export function isPointOnDrawableArea(clientX, clientY, svgElement) {
  if (!svgElement) return false;

  // Temporarily disable pointer events on the drawn path itself to avoid self-detection
  const drawnPath = svgElement.querySelector('.drawn-path');
  let originalPointerEvents = null;
  if (drawnPath) {
    originalPointerEvents = drawnPath.style.pointerEvents;
    drawnPath.style.pointerEvents = 'none';
  }

  const element = document.elementFromPoint(clientX, clientY);

  // Restore pointer events
  if (drawnPath && originalPointerEvents !== null) {
    drawnPath.style.pointerEvents = originalPointerEvents;
  }

  if (!element || !svgElement.contains(element)) {
    return false; // Clicked outside SVG bounds
  }

  // Traverse up from the hit element to find a relevant terrain or bridge element
  let currentElement = element;
  while (currentElement && currentElement !== svgElement) {
    const terrain = currentElement.getAttribute('data-terrain');
    if (terrain === 'land') {
      return true; // Found land
    }
    if (terrain === 'water') {
      return false; // Found water explicitly
    }
    // Check if it's a bridge (Rect with specific ID format)
    if (currentElement.tagName.toLowerCase() === 'rect' && currentElement.id.startsWith('bridge-')) {
      return true; // Found a bridge
    }
    currentElement = currentElement.parentElement;
  }

  // If traversal reaches SVG root without finding land or bridge, assume not drawable
  return false;
}

/**
 * Checks if the exit point from a bridge is on the opposite side relative to the entry point.
 * @param {{x: number, y: number}} entryPoint - The point where the path entered the bridge.
 * @param {{x: number, y: number}} exitPoint - The point where the path exited the bridge.
 * @param {SVGRectElement} bridge - The bridge rectangle element.
 * @returns {boolean} True if the exit is on the opposite side.
 */
export function isOppositeSide(entryPoint, exitPoint, bridge) {
  if (!bridge || !entryPoint || !exitPoint) return false;

  try {
    const bridgeBBox = bridge.getBBox();
    const bridgeCenterX = bridgeBBox.x + bridgeBBox.width / 2;
    const bridgeCenterY = bridgeBBox.y + bridgeBBox.height / 2;

    // Calculate angles relative to the bridge center
    const entryAngle = Math.atan2(entryPoint.y - bridgeCenterY, entryPoint.x - bridgeCenterX);
    const exitAngle = Math.atan2(exitPoint.y - bridgeCenterY, exitPoint.x - bridgeCenterX);

    // Calculate the absolute difference in angles
    let angleDifference = Math.abs(exitAngle - entryAngle);
    // Normalize the difference to be within [0, PI]
    if (angleDifference > Math.PI) {
      angleDifference = 2 * Math.PI - angleDifference;
    }

    // Opposite side means the angle difference is roughly PI (e.g., > 90 degrees)
    // Allow some tolerance
    return angleDifference > Math.PI / 2; // Greater than 90 degrees
  } catch (error) {
    console.error("Error calculating opposite side:", error);
    return false;
  }
}

/** Debounce function */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/** Throttle function */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
