import { showScreen, getIconSvg } from './ui.js';

export function loadMainMenuScreen(container) {
  container.innerHTML = `
    <div class="main-menu">
      <img
        src="https://europebetweeneastandwest.wordpress.com/wp-content/uploads/2017/11/a-target-rich-environment-konigsberg-along-the-pregel-river.jpg"
        alt="Königsberg şehrinin Pregel nehri ve köprülerini gösteren tarihi bir çizim."
      />
      <h1>Königsberg Köprüleri Oyunu</h1>

      <div class="info-box">
        <h2>${getIconSvg('Info')} Oyun Hakkında</h2>
        <p>
          <strong>Amaç:</strong> Haritadaki tüm köprülerden sadece bir kez geçerek, başladığınız kara parçasından farklı bir yerde bitirmeden (veya bazı yorumlarda başladığınız yere dönmeden) bir yol çizmektir. Euler'in ünlü matematik problemine dayanan bu oyunda mantığınızı test edin!
        </p>
        <p>
          <strong>Nasıl Oynanır:</strong> Fareyi (veya parmağınızı) kullanarak kara parçaları üzerinde bir yol çizin. Köprüleri kullanarak diğer kara parçalarına geçin. Her köprüyü yalnızca bir kez kullanabilirsiniz. Suya girmeden ve köprüleri tekrar etmeden tüm köprüleri içeren bir yol çizmeyi hedefleyin.
        </p>
      </div>

      <button id="play-button" aria-label="Oyunu başlat">
        ${getIconSvg('Play')} Oyna
      </button>
    </div>
  `;

  // Add event listener
  const playButton = container.querySelector('#play-button');
  if (playButton) {
    playButton.addEventListener('click', () => {
      showScreen('level-select');
    });
  } else {
    console.error("Play button not found in main menu");
  }
}
