import { levels } from './levels.js';
import { showScreen, getIconSvg } from './ui.js';
import { getCompletedLevels } from './storage.js';

export function loadLevelSelectScreen(container) {
  const completedLevelsSet = getCompletedLevels(); // Load completed levels

  let levelCardsHtml = '';
  levels.forEach((level, index) => {
    const isCompleted = completedLevelsSet.has(index);
    // Level is locked if it's not the first level (index > 0) AND the previous level (index - 1) is NOT completed
    const isLocked = index > 0 && !completedLevelsSet.has(index - 1);
    const cardClass = isCompleted ? 'completed' : (isLocked ? 'locked' : 'available');
    const buttonDisabled = isLocked ? 'disabled' : '';
    const ariaLabel = `${level.name} ${isCompleted ? '(Tamamlandı)' : (isLocked ? '(Kilitli)' : '(Oynamak için tıkla)')}`;

    levelCardsHtml += `
      <button class="level-card ${cardClass}" data-level-index="${index}" ${buttonDisabled} aria-label="${ariaLabel}">
        <span class="level-number">${index + 1}</span>
        <span class="level-name">${level.name}</span>
        ${isCompleted ? `<span class="checkmark">${getIconSvg('Check')}</span>` : ''}
        ${isLocked ? `<span class="lock-icon">${getIconSvg('Lock')}</span>` : ''}
      </button>
    `;
  });

  container.innerHTML = `
    <div class="level-select">
      <h1>Seviye Seçimi</h1>
      <div class="level-grid">
        ${levelCardsHtml}
      </div>
      <button id="back-to-menu-button" class="back-button">
        ${getIconSvg('ArrowLeft')} Ana Menü
      </button>
    </div>
  `;

  // Add event listeners
  const levelGrid = container.querySelector('.level-grid');
  if (levelGrid) {
    levelGrid.addEventListener('click', (event) => {
      const card = event.target.closest('.level-card');
      if (card && !card.disabled) { // Check if the card is not disabled (i.e., not locked)
        const levelIndex = parseInt(card.getAttribute('data-level-index'), 10);
        if (!isNaN(levelIndex)) {
          showScreen('game', { levelIndex });
        }
      } else if (card && card.disabled) {
          // Optional: Provide feedback for clicking a locked level
          console.log(`Level ${parseInt(card.getAttribute('data-level-index'), 10) + 1} is locked.`);
          // You could add a UI message here if desired
      }
    });
  } else {
    console.error("Level grid not found");
  }

  const backButton = container.querySelector('#back-to-menu-button');
  if (backButton) {
    backButton.addEventListener('click', () => {
      showScreen('menu');
    });
  } else {
    console.error("Back button not found in level select");
  }
}
