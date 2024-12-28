function handlePopupKeyPress(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      if (document.getElementById('level-complete-modal').style.display === 'block') {
        hideLevelPopups();
        nextLevel();
      } else if (document.getElementById('level-failed-modal').style.display === 'block' || document.getElementById('game-over-modal').style.display === 'block') {
        hideLevelPopups();
        retryLevel();
      }
    }
  }
  const canvas = document.getElementById('maze');
  const ctx = canvas.getContext('2d');
  const cellSize = 40;
  const gridSize = 10;
  const movesDisplay = document.getElementById('moves');
  const levelDisplay = document.getElementById('level');
  const maxMovesDisplay = document.getElementById('max-moves');
  const weaponsDisplay = document.getElementById('weapons');
  const messageDisplay = document.getElementById('message');
  const scoreDisplay = document.getElementById('score');
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  let playerPos = {
    x: 0,
    y: 0
  };
  let moves = 0;
  let maxMoves;
  let level = 1;
  let weapons = 2;
  let score = 0;
  let maze = [];
  let enemies = [];
  let weaponItems = [];
  let treats = [];
  let chompSound = new Audio('Chomp.wav');
  class WeaponItem {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.collected = false;
    }
  }
  class Enemy {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.direction = Math.floor(Math.random() * 4);
      this.alive = true;
      this.intelligence = settings.difficulty === 'easy' ? 0.2 : 
                         settings.difficulty === 'normal' ? 0.5 : 
                         0.8;
      this.hp = settings.difficulty === 'easy' ? 1 :
                settings.difficulty === 'normal' ? 2 :
                3;
      this.initialX = x;
      this.initialY = y;
      this.moveCount = 0;
      this.maxMoves = 3 + Math.floor(Math.random()); 
    }
  
    move() {
      if (!this.alive) return;
  
      const playerDistance = Math.sqrt(
        Math.pow(playerPos.x - this.x, 2) + 
        Math.pow(playerPos.y - this.y, 2)
      );
  
      if (playerDistance <= 3) {
        if (Math.random() < this.intelligence) {
          const dx = playerPos.x - this.x;
          const dy = playerPos.y - this.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? 1 : 3; 
          } else {
            this.direction = dy > 0 ? 2 : 0; 
          }
        }
      } else {
        if (this.moveCount < this.maxMoves) {
          const distanceFromStart = Math.sqrt(
            Math.pow(this.x - this.initialX, 2) + 
            Math.pow(this.y - this.initialY, 2)
          );
  
          if (distanceFromStart > 2) {
            const dx = this.initialX - this.x;
            const dy = this.initialY - this.y;
            if (Math.abs(dx) > Math.abs(dy)) {
              this.direction = dx > 0 ? 1 : 3;
            } else {
              this.direction = dy > 0 ? 2 : 0;
            }
          } else {
            if (Math.random() < 0.3) {
              this.direction = Math.floor(Math.random() * 4);
            }
          }
          this.moveCount++;
        } else {
          if (Math.random() < 0.1) {
            this.moveCount = 0;
          }
          return;
        }
      }
  
      const directions = [
        { dx: 0, dy: -1, wall: 'top' },
        { dx: 1, dy: 0, wall: 'right' },
        { dx: 0, dy: 1, wall: 'bottom' },
        { dx: -1, dy: 0, wall: 'left' }
      ];
  
      const dir = directions[this.direction];
      const currentCell = maze[this.x][this.y];
      const newX = this.x + dir.dx;
      const newY = this.y + dir.dy;
  
      if (newX >= 0 && newX < gridSize && 
          newY >= 0 && newY < gridSize && 
          !currentCell.walls[dir.wall]) {
        this.x = newX;
        this.y = newY;
      } else {
        this.direction = Math.floor(Math.random() * 4);
      }
    }
  }
  class Treat {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.eaten = false;
    }
  }
  let settings = {
    soundEnabled: true,
    difficulty: 'normal'
  };
  const settingsButton = document.getElementById('settings-button');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettings = document.getElementById('close-settings');
  const soundToggle = document.getElementById('sound-toggle');
  const difficultySelect = document.getElementById('difficulty');
  const returnMenuButton = document.getElementById('return-menu');
  const menuScreen = document.getElementById('menu-screen');
  const startButton = document.getElementById('start-button');
  const gameContainer = document.getElementById('game-container');
  const helpButton = document.getElementById('help-button');
  const helpModal = document.getElementById('help-modal');
  const closeHelp = document.getElementById('close-help');
  let currentMazeConfig = null;
  let currentEnemiesConfig = [];
  let currentWeaponsConfig = [];
  let currentTreatsConfig = [];
  const imagesToPreload = ['assets/weapon.png', 'assets/star.png'];
  const preloadedImages = {};
  function preloadImages() {
    imagesToPreload.forEach(imagePath => {
      const img = new Image();
      img.src = imagePath;
      preloadedImages[imagePath] = img;
    });
  }
  function generateMaze() {
    for (let i = 0; i < gridSize; i++) {
      maze[i] = [];
      for (let j = 0; j < gridSize; j++) {
        maze[i][j] = {
          visited: false,
          walls: {
            top: true,
            right: true,
            bottom: true,
            left: true
          }
        };
      }
    }
    function carve(x, y) {
      maze[x][y].visited = true;
      const directions = shuffle([{
        dx: 0,
        dy: -1,
        wall: 'top',
        opposite: 'bottom'
      }, {
        dx: 1,
        dy: 0,
        wall: 'right',
        opposite: 'left'
      }, {
        dx: 0,
        dy: 1,
        wall: 'bottom',
        opposite: 'top'
      }, {
        dx: -1,
        dy: 0,
        wall: 'left',
        opposite: 'right'
      }]);
      for (const dir of directions) {
        const newX = x + dir.dx;
        const newY = y + dir.dy;
        if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize && !maze[newX][newY].visited) {
          maze[x][y].walls[dir.wall] = false;
          maze[newX][newY].walls[dir.opposite] = false;
          carve(newX, newY);
        }
      }
    }
    carve(0, 0);
    currentMazeConfig = JSON.parse(JSON.stringify(maze));
  }
  function generateEnemies() {
    if (currentEnemiesConfig.length === 0) {
      enemies = [];
      let numEnemies;
      switch (settings.difficulty) {
        case 'easy':
          numEnemies = Math.min(Math.floor(level / 2), 4);
          break;
        case 'normal':
          numEnemies = Math.min(Math.floor(level * 0.7), 6);
          break;
        case 'hard':
          numEnemies = Math.min(Math.floor(level * 0.8), 8);
          break;
      }
      for (let i = 0; i < numEnemies; i++) {
        let x, y;
        do {
          x = Math.floor(Math.random() * gridSize);
          y = Math.floor(Math.random() * gridSize);
        } while (x === 0 && y === 0 || x === gridSize - 1 && y === gridSize - 1 || enemies.some(e => e.x === x && e.y === y));
        enemies.push(new Enemy(x, y));
      }
      currentEnemiesConfig = enemies.map(enemy => ({
        x: enemy.x,
        y: enemy.y,
        direction: enemy.direction,
        intelligence: enemy.intelligence,
        hp: enemy.hp,
        initialX: enemy.initialX,
        initialY: enemy.initialY
      }));
    } else {
      enemies = currentEnemiesConfig.map(config => {
        const enemy = new Enemy(config.x, config.y);
        enemy.direction = config.direction;
        enemy.intelligence = config.intelligence;
        enemy.hp = config.hp;
        enemy.initialX = config.initialX;
        enemy.initialY = config.initialY;
        return enemy;
      });
    }
  }
  function generateWeapons() {
    if (currentWeaponsConfig.length === 0) {
      weaponItems = [];
      const numWeapons = Math.min(level, 5);
      for (let i = 0; i < numWeapons; i++) {
        let x, y;
        do {
          x = Math.floor(Math.random() * gridSize);
          y = Math.floor(Math.random() * gridSize);
        } while (x === 0 && y === 0 || x === gridSize - 1 && y === gridSize - 1 || enemies.some(e => e.x === x && e.y === y) || weaponItems.some(w => w.x === x && w.y === y));
        weaponItems.push(new WeaponItem(x, y));
      }
      currentWeaponsConfig = weaponItems.map(weapon => ({
        x: weapon.x,
        y: weapon.y
      }));
    } else {
      weaponItems = currentWeaponsConfig.map(config => new WeaponItem(config.x, config.y));
    }
  }
  function generateTreats() {
    if (currentTreatsConfig.length === 0) {
      treats = [];
      const numTreats = Math.min(level, 3);
      for (let i = 0; i < numTreats; i++) {
        let x, y;
        do {
          x = Math.floor(Math.random() * gridSize);
          y = Math.floor(Math.random() * gridSize);
        } while (x === 0 && y === 0 || x === gridSize - 1 && y === gridSize - 1 || enemies.some(e => e.x === x && e.y === y) || weaponItems.some(w => w.x === x && w.y === y) || treats.some(h => h.x === x && h.y === y));
        treats.push(new Treat(x, y));
      }
      currentTreatsConfig = treats.map(treat => ({
        x: treat.x,
        y: treat.y
      }));
    } else {
      treats = currentTreatsConfig.map(config => new Treat(config.x, config.y));
    }
  }
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  function drawMaze() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const cell = maze[x][y];
        const px = x * cellSize;
        const py = y * cellSize;
        ctx.beginPath();
        if (cell.walls.top) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + cellSize, py);
        }
        if (cell.walls.right) {
          ctx.moveTo(px + cellSize, py);
          ctx.lineTo(px + cellSize, py + cellSize);
        }
        if (cell.walls.bottom) {
          ctx.moveTo(px, py + cellSize);
          ctx.lineTo(px + cellSize, py + cellSize);
        }
        if (cell.walls.left) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cellSize);
        }
        ctx.stroke();
      }
    }
    ctx.fillStyle = '#ffff00';
    weaponItems.forEach(weapon => {
      if (!weapon.collected) {
        ctx.drawImage(preloadedImages['assets/weapon.png'], weapon.x * cellSize + cellSize / 4, weapon.y * cellSize + cellSize / 4, cellSize / 2, cellSize / 2);
      }
    });
    treats.forEach(treat => {
      if (!treat.eaten) {
        ctx.drawImage(preloadedImages['assets/star.png'], treat.x * cellSize + cellSize / 4, treat.y * cellSize + cellSize / 4, cellSize / 2, cellSize / 2);
      }
    });
    ctx.fillStyle = '#8A2BE2';
    ctx.beginPath();
    ctx.arc(playerPos.x * cellSize + cellSize / 2, playerPos.y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();
    enemies.forEach(enemy => {
      if (enemy.alive) {
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(enemy.x * cellSize + cellSize / 2, enemy.y * cellSize + cellSize / 2, cellSize / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc((gridSize - 1) * cellSize + cellSize / 2, (gridSize - 1) * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();
  }
  function checkCollision() {
    return enemies.some(enemy => enemy.alive && enemy.x === playerPos.x && enemy.y === playerPos.y);
  }
  function collectWeapons() {
    weaponItems.forEach(weapon => {
      if (!weapon.collected && weapon.x === playerPos.x && weapon.y === playerPos.y) {
        weapon.collected = true;
        weapons++;
        weaponsDisplay.textContent = weapons;
        messageDisplay.textContent = 'Weapon collected!';
        setTimeout(() => messageDisplay.textContent = '', 1000);
      }
    });
  }
  function moveEnemies() {
    enemies.forEach(enemy => enemy.move());
    if (checkCollision()) {
      document.removeEventListener('keydown', handleKeyPress);
      showGameOverPopup();
    }
  }
  function playMoveSound() {
    if (!settings.soundEnabled) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  }
  function calculateMaxMoves() {
    const minMoves = getMinimumPathLength();
    let buffer;
    switch (settings.difficulty) {
      case 'easy':
        buffer = minMoves * 1.8;
        break;
      case 'normal':
        buffer = minMoves * 1.4;
        break;
      case 'hard':
        buffer = minMoves * 1.2;
        break;
    }
    const levelBonus = Math.floor(level * 1.5);
    maxMoves = Math.floor(minMoves + buffer + levelBonus);
    maxMovesDisplay.textContent = maxMoves;
  }
  function movePlayer(dx, dy) {
    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;
    if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
      const currentCell = maze[playerPos.x][playerPos.y];
      let moved = false;
      if (dx === 1 && !currentCell.walls.right) {
        playerPos.x = newX;
        moves++;
        moved = true;
      } else if (dx === -1 && !currentCell.walls.left) {
        playerPos.x = newX;
        moves++;
        moved = true;
      } else if (dy === 1 && !currentCell.walls.bottom) {
        playerPos.y = newY;
        moves++;
        moved = true;
      } else if (dy === -1 && !currentCell.walls.top) {
        playerPos.y = newY;
        moves++;
        moved = true;
      }
      if (moved) {
        playMoveSound();
        checkTreats();
        if (moves >= maxMoves) {
          document.removeEventListener('keydown', handleKeyPress);
          showLevelFailedPopup();
          saveGameState();
          return;
        }
      }
    }
    movesDisplay.textContent = moves;
    collectWeapons();
    moveEnemies();
    drawMaze();
    if (checkCollision()) {
      document.removeEventListener('keydown', handleKeyPress);
      showGameOverPopup();
    } else if (playerPos.x === gridSize - 1 && playerPos.y === gridSize - 1) {
      level++;
      document.removeEventListener('keydown', handleKeyPress);
      showLevelCompletePopup();
    }
    saveGameState();
  }
  function handleKeyPress(e) {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    if (e.key === 'k' || e.key === 'K') {
      let prevWeapons = weapons;
      if (weapons > 0) {
        let enemyKilled = false;
        enemies.forEach(enemy => {
          if (enemy.alive && Math.abs(enemy.x - playerPos.x) <= 2 && Math.abs(enemy.y - playerPos.y) <= 2) {
            enemy.hp--;
            weapons--;
            weaponsDisplay.textContent = weapons;
            if (enemy.hp <= 0) {
              enemy.alive = false;
              enemyKilled = true;
              messageDisplay.textContent = 'Enemy eliminated!';
            } else {
              messageDisplay.textContent = `Enemy hit! ${enemy.hp} HP remaining`;
            }
            setTimeout(() => messageDisplay.textContent = '', 1000);
            drawMaze();
          }
        });
        if (!enemyKilled && weapons < prevWeapons) {
          messageDisplay.textContent = 'Enemy hit!';
          setTimeout(() => messageDisplay.textContent = '', 1000);
        }
      } else {
        messageDisplay.textContent = 'No weapons available!';
        setTimeout(() => messageDisplay.textContent = '', 1000);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowUp':
        movePlayer(0, -1);
        break;
      case 'ArrowDown':
        movePlayer(0, 1);
        break;
      case 'ArrowLeft':
        movePlayer(-1, 0);
        break;
      case 'ArrowRight':
        movePlayer(1, 0);
        break;
    }
  }
  function nextLevel() {
    hideLevelPopups();
    currentMazeConfig = null;
    currentEnemiesConfig = [];
    currentWeaponsConfig = [];
    currentTreatsConfig = [];
    playerPos = {
      x: 0,
      y: 0
    };
    moves = 0;
    levelDisplay.textContent = level;
    messageDisplay.textContent = '';
    generateMaze();
    generateEnemies();
    generateWeapons();
    generateTreats();
    calculateMaxMoves();
    drawMaze();
    saveGameState();
    document.removeEventListener('keydown', nextLevel);
    document.addEventListener('keydown', handleKeyPress);
  }
  function restart() {
    playerPos = {
      x: 0,
      y: 0
    };
    moves = 0;
    level = 1;
    weapons = 2;
    score = 0;
    enemies = [];
    weaponItems = [];
    treats = [];
    movesDisplay.textContent = '0';
    levelDisplay.textContent = '1';
    weaponsDisplay.textContent = weapons;
    scoreDisplay.textContent = score;
    messageDisplay.textContent = '';
    generateMaze();
    generateWeapons();
    generateTreats();
    calculateMaxMoves();
    drawMaze();
    saveGameState();
    document.removeEventListener('keydown', restart);
    document.addEventListener('keydown', handleKeyPress);
  }
  function retryLevel() {
    hideLevelPopups();
    playerPos = {
      x: 0,
      y: 0
    };
    moves = 0;
    weapons = 2;
    movesDisplay.textContent = '0';
    messageDisplay.textContent = '';
    maze = JSON.parse(JSON.stringify(currentMazeConfig));
    generateEnemies();
    generateWeapons();
    generateTreats();
    calculateMaxMoves();
    drawMaze();
    saveGameState();
    document.removeEventListener('keydown', retryLevel);
    document.addEventListener('keydown', handleKeyPress);
  }
  function checkTreats() {
    treats.forEach(treat => {
      if (!treat.eaten && treat.x === playerPos.x && treat.y === playerPos.y) {
        treat.eaten = true;
        if (settings.soundEnabled) {
          chompSound.currentTime = 0;
          chompSound.play();
        }
        score++;
        scoreDisplay.textContent = score;
        messageDisplay.textContent = 'Yum! +1 Score!';
        setTimeout(() => messageDisplay.textContent = '', 1000);
      }
    });
  }
  function getMinimumPathLength() {
    const visited = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
    const queue = [{
      x: 0,
      y: 0,
      dist: 0
    }];
    visited[0][0] = true;
    while (queue.length > 0) {
      const current = queue.shift();
      if (current.x === gridSize - 1 && current.y === gridSize - 1) {
        return current.dist;
      }
      const directions = [{
        dx: 0,
        dy: -1,
        wall: 'top'
      }, {
        dx: 1,
        dy: 0,
        wall: 'right'
      }, {
        dx: 0,
        dy: 1,
        wall: 'bottom'
      }, {
        dx: -1,
        dy: 0,
        wall: 'left'
      }];
      for (const dir of directions) {
        const newX = current.x + dir.dx;
        const newY = current.y + dir.dy;
        if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize && !visited[newX][newY] && !maze[current.x][current.y].walls[dir.wall]) {
          visited[newX][newY] = true;
          queue.push({
            x: newX,
            y: newY,
            dist: current.dist + 1
          });
        }
      }
    }
    return gridSize * 2;
  }
  function showLevelCompletePopup() {
    const modal = document.getElementById('level-complete-modal');
    document.getElementById('popup-score').textContent = score;
    modal.style.display = 'block';
    document.addEventListener('keydown', handlePopupKeyPress);
  }
  function showLevelFailedPopup() {
    const modal = document.getElementById('level-failed-modal');
    modal.style.display = 'block';
    document.addEventListener('keydown', handlePopupKeyPress);
  }
  function showGameOverPopup() {
    const modal = document.getElementById('game-over-modal');
    modal.style.display = 'block';
    document.addEventListener('keydown', handlePopupKeyPress);
    score = 0;
    weapons = 0;
    scoreDisplay.textContent = score;
    weaponsDisplay.textContent = weapons;
    saveGameState();
  }
  function hideLevelPopups() {
    document.getElementById('level-complete-modal').style.display = 'none';
    document.getElementById('level-failed-modal').style.display = 'none';
    document.getElementById('game-over-modal').style.display = 'none';
    document.removeEventListener('keydown', handlePopupKeyPress);
  }
  function saveGameState() {
    const gameState = {
      level,
      score,
      weapons,
      settings,
      currentMazeConfig,
      currentEnemiesConfig,
      currentWeaponsConfig,
      currentTreatsConfig,
      playerPos,
      moves,
      maxMoves
    };
    localStorage.setItem('mazeGameState', JSON.stringify(gameState));
  }
  function loadGameState() {
    const savedState = localStorage.getItem('mazeGameState');
    if (savedState) {
      const gameState = JSON.parse(savedState);
      level = gameState.level;
      score = gameState.score;
      weapons = gameState.weapons;
      settings = gameState.settings;
      currentMazeConfig = gameState.currentMazeConfig;
      currentEnemiesConfig = gameState.currentEnemiesConfig;
      currentWeaponsConfig = gameState.currentWeaponsConfig;
      currentTreatsConfig = gameState.currentTreatsConfig;
      playerPos = gameState.playerPos;
      moves = gameState.moves;
      maxMoves = gameState.maxMoves;
      levelDisplay.textContent = level;
      scoreDisplay.textContent = score;
      weaponsDisplay.textContent = weapons;
      movesDisplay.textContent = moves;
      maxMovesDisplay.textContent = maxMoves;
      soundToggle.checked = settings.soundEnabled;
      difficultySelect.value = settings.difficulty;
      return true;
    }
    return false;
  }
  startButton.addEventListener('click', () => {
    preloadImages();
    menuScreen.style.display = 'none';
    gameContainer.style.display = 'block';
    helpButton.style.display = 'block';
    returnMenuButton.style.display = 'block';
    const hasLoadedState = loadGameState();
    if (!hasLoadedState) {
      generateMaze();
      generateEnemies();
      generateWeapons();
      generateTreats();
      calculateMaxMoves();
    } else {
      maze = JSON.parse(JSON.stringify(currentMazeConfig));
      generateEnemies();
      generateWeapons();
      generateTreats();
    }
    drawMaze();
    document.addEventListener('keydown', handleKeyPress);
  });
  helpButton.addEventListener('click', () => {
    helpModal.style.display = 'block';
  });
  closeHelp.addEventListener('click', () => {
    helpModal.style.display = 'none';
  });
  settingsButton.addEventListener('click', () => {
    settingsModal.style.display = 'block';
  });
  closeSettings.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });
  soundToggle.addEventListener('change', e => {
    settings.soundEnabled = e.target.checked;
    saveGameState();
  });
  difficultySelect.addEventListener('change', e => {
    settings.difficulty = e.target.value;
    saveGameState();
  });
  returnMenuButton.addEventListener('click', () => {
    playerPos = {
      x: 0,
      y: 0
    };
    moves = 0;
    level = 1;
    weapons = 2;
    score = 0;
    enemies = [];
    weaponItems = [];
    treats = [];
    movesDisplay.textContent = '0';
    levelDisplay.textContent = '1';
    weaponsDisplay.textContent = weapons;
    scoreDisplay.textContent = score;
    messageDisplay.textContent = '';
    gameContainer.style.display = 'none';
    helpButton.style.display = 'none';
    returnMenuButton.style.display = 'none';
    menuScreen.style.display = 'flex';
    localStorage.removeItem('mazeGameState');
    document.removeEventListener('keydown', handleKeyPress);
    document.removeEventListener('keydown', restart);
    document.removeEventListener('keydown', nextLevel);
    hideLevelPopups();
  });
  document.getElementById('next-level-button').addEventListener('click', () => {
    hideLevelPopups();
    nextLevel();
  });
  document.getElementById('retry-level-button').addEventListener('click', () => {
    hideLevelPopups();
    retryLevel();
  });
  document.getElementById('retry-after-death-button').addEventListener('click', () => {
    hideLevelPopups();
    retryLevel();
  });