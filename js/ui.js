import { levels } from './levels.js';
import { loadGameScreen } from './game.js';
import { loadLevelSelectScreen } from './levelSelect.js';
import { loadMainMenuScreen } from './mainMenu.js';

const appContainer = document.getElementById('app-container');

export function clearAppContainer() {
  if (appContainer) {
    appContainer.innerHTML = '';
  } else {
    console.error("App container not found!");
  }
}

export function showScreen(screenType, options = {}) {
  clearAppContainer();
  if (!appContainer) return;

  switch (screenType) {
    case 'menu':
      loadMainMenuScreen(appContainer);
      break;
    case 'level-select':
      loadLevelSelectScreen(appContainer);
      break;
    case 'game':
      if (options.levelIndex !== undefined) {
        loadGameScreen(appContainer, options.levelIndex);
      } else {
        console.error("Level index not provided for game screen");
        showScreen('menu'); // Fallback to menu
      }
      break;
    default:
      console.error(`Unknown screen type: ${screenType}`);
      loadMainMenuScreen(appContainer); // Fallback to menu
  }
}

// --- Message Handling ---
let messageTimeoutId = null;

export function showMessage(text, type = 'warning', duration = 2000) {
    const messageArea = document.getElementById('message-area');
    const messageElement = document.getElementById('message-content');
    const iconElement = document.getElementById('message-icon');

    if (!messageArea || !messageElement || !iconElement) {
        console.warn("Message area elements not found in the current screen.");
        // Attempt to create a temporary message if area doesn't exist (optional)
        if (appContainer) {
            const tempMessage = document.createElement('div');
            tempMessage.textContent = text;
            tempMessage.style.position = 'fixed';
            tempMessage.style.bottom = '20px';
            tempMessage.style.left = '50%';
            tempMessage.style.transform = 'translateX(-50%)';
            tempMessage.style.padding = '10px 20px';
            tempMessage.style.borderRadius = '5px';
            tempMessage.style.backgroundColor = type === 'success' ? 'lightgreen' : 'lightcoral';
            tempMessage.style.color = 'black';
            tempMessage.style.zIndex = '1000';
            appContainer.appendChild(tempMessage);
            setTimeout(() => tempMessage.remove(), duration);
        }
        return;
    }

    // Clear any existing timeout
    if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
        messageTimeoutId = null;
    }

    messageElement.textContent = text;
    messageArea.classList.remove('success', 'warning'); // Remove previous types
    messageArea.classList.add(type); // Add current type
    iconElement.innerHTML = getIconSvg(type === 'success' ? 'Check' : 'AlertTriangle'); // Update icon

    messageArea.classList.add('visible');

    // Set timeout to hide the message
    if (duration > 0) {
        messageTimeoutId = setTimeout(() => {
            hideMessage();
        }, duration);
    }
}

export function hideMessage() {
    const messageArea = document.getElementById('message-area');
    if (messageArea) {
        messageArea.classList.remove('visible');
        // Optionally clear text after fade out
        // setTimeout(() => {
        //     const messageElement = document.getElementById('message-content');
        //     if(messageElement) messageElement.textContent = '';
        // }, 300); // Match transition duration
    }
    if (messageTimeoutId) {
        clearTimeout(messageTimeoutId);
        messageTimeoutId = null;
    }
}

// --- Icon Helper ---
// Basic SVG strings for icons (replace with actual SVG content or library calls)
// Using simple placeholders for now. Consider using lucide-static if installed.
export function getIconSvg(iconName) {
    // In a real app, you'd fetch these from lucide-static or have them defined
    switch (iconName) {
        case 'Play': return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        case 'Info': return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        case 'ArrowLeft': return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`;
        case 'RotateCcw': return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"></path><path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path></svg>`;
        case 'AlertTriangle': return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        case 'Check': return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        default: return ''; // Return empty string for unknown icons
    }
}
