const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
window.touchJoystick = {
  active: false,
  identifier: null,
  dx: 0,
  dy: 0
};
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const uiContainer = document.getElementById("ui-container");
const mainMenu = document.getElementById("main-menu");
const gameUi = document.getElementById("game-ui");
const gameOverScreen = document.getElementById("game-over");
const characterForm = document.getElementById("character-form");
const continueBtn = document.getElementById("continue-btn");
const startBtn = document.getElementById("start-btn");

const rewardScreen = document.getElementById("reward-screen");
const rewardOptions = document.getElementById("reward-options");

// HUD Elements
const hudHp = document.getElementById("hud-hp");
const hudMana = document.getElementById("hud-mana");
const hudName = document.getElementById("hud-name");
const hudClass = document.getElementById("hud-class");

// Game State
let gameState = "MENU"; // MENU, PLAYING, GAMEOVER, REWARD
let lastTime = 0;
let keys = {};
let mouse = { x: 0, y: 0, clicked: false };
window.touchAttackHeld = false;
let isChangingLevel = false;
let isTransitioning = false;
let currentSaveSlot = 1; // Internal save slot
let isLoopRunning = false;

// Game Objects
let dungeon;
let player;
let merchantNPC = null;
let currentInteractable = null;
let merchantKeyObtained = false;
let hasMerchantKey = false;
let enemies = [];
let projectiles = []; // Legacy global projectiles list to avoid reference errors
let enemyProjectiles = []; // Projectiles fired by 'shooter' enemies
let droppedItems = []; // Items on the ground
let camera = { x: 0, y: 0, width: 0, height: 0 };
let floor = 1;
let maxFloor = 1;
let killedEnemiesCount = 0;
let floatingTexts = [];
let safeRoomNPCs = [];
let activeDialogNPC = null;
let activeDialogTimer = 0;

function addFloatingText(text, x, y, color = "#f1c40f") {
  floatingTexts.push({
    text: text,
    x: x,
    y: y,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -1.2,
    alpha: 1.2,
    color: color
  });
}

function getRoomAt(x, y) {
  if (!dungeon || !dungeon.rooms) return null;
  let tx = Math.floor(x / dungeon.tileSize);
  let ty = Math.floor(y / dungeon.tileSize);
  for (let room of dungeon.rooms) {
    if (tx >= room.x && tx < room.x + room.w &&
        ty >= room.y && ty < room.y + room.h) {
      return room;
    }
  }
  return null;
}

function playCoinSound() {
  try {
    initAudioCtx();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    let now = audioCtx.currentTime;
    let osc = audioCtx.createOscillator();
    let gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6
    
    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {
    console.warn("Audio Context error:", e);
  }
}

// Web Audio API Synthesis for Custom Sounds
let audioCtx = null;
function initAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playKeyChime() {
  try {
    initAudioCtx();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    let now = audioCtx.currentTime;
    let osc1 = audioCtx.createOscillator();
    let osc2 = audioCtx.createOscillator();
    let gainNode = audioCtx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.1); // A5
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.25); // E6
    
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.4);
    
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);
  } catch (e) {
    console.warn("Audio Context error:", e);
  }
}

function playDoorOpenSound() {
  try {
    initAudioCtx();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    let now = audioCtx.currentTime;
    let osc = audioCtx.createOscillator();
    let gainNode = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now); // A3
    osc.frequency.linearRampToValueAtTime(440, now + 0.15); // A4
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.5); // A2
    
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {
    console.warn("Audio Context error:", e);
  }
}

function playLevelUpSound() {
  try {
    initAudioCtx();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    let now = audioCtx.currentTime;
    // Ascending C Major arpeggio notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
    let notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      let osc = audioCtx.createOscillator();
      let gainNode = audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gainNode.gain.setValueAtTime(0.12, now + idx * 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  } catch (e) {
    console.warn("Audio Context error:", e);
  }
}

// Item generation functions generateClassWeapon, generateRandomEquipment, and generateRandomAccessory are now imported from js/loot.js

// Tooltip Helpers
function showTooltip(item, event) {
  const tooltip = document.getElementById("item-tooltip");
  if (!tooltip || !item) return;

  const nameEl = tooltip.querySelector(".tooltip-name");
  const rarityEl = tooltip.querySelector(".tooltip-rarity");
  const statsEl = tooltip.querySelector(".tooltip-stats");

  nameEl.innerHTML = item.name || "Objeto Desconocido";
  nameEl.style.color = item.color || "#fff";

  let rarityKey = item.rarity || "common";
  if (!item.rarity) {
    if (item.color === "#f1c40f") rarityKey = "legendary";
    else if (item.color === "#9b59b6") rarityKey = "very_rare";
    else if (item.color === "#3498db") rarityKey = "rare";
  }

  let rarityLabels = {
    common: "Común",
    rare: "Raro",
    very_rare: "Muy Raro",
    epic: "Épico",
    legendary: "Legendario"
  };
  rarityEl.innerText = rarityLabels[rarityKey] || "Común";
  rarityEl.className = "tooltip-rarity rarity-" + rarityKey;

  statsEl.innerHTML = "";

  if (item.stats) {
    if (item.stats.fuerza) statsEl.innerHTML += `<div>+${item.stats.fuerza}% fuerza</div>`;
    if (item.stats.defensa) statsEl.innerHTML += `<div>+${item.stats.defensa} defensa</div>`;
    if (item.stats.daño) statsEl.innerHTML += `<div>+${item.stats.daño}% daño</div>`;
    if (item.stats.cooldown) statsEl.innerHTML += `<div>+${item.stats.cooldown}% velocidad ataque</div>`;
    if (item.stats.mana) statsEl.innerHTML += `<div>+${item.stats.mana} mana</div>`;
    if (item.stats.vida) statsEl.innerHTML += `<div>+${item.stats.vida} vida</div>`;
    if (item.stats.velocidad) statsEl.innerHTML += `<div>+${item.stats.velocidad}% velocidad de movimiento</div>`;
  } else if (item.bonus !== undefined && item.bonus !== 0) {
    statsEl.innerHTML += `<div>+${Math.round(item.bonus * 100)}% daño</div>`;
  }

  if (item.quantity !== undefined) {
    statsEl.innerHTML += `<div style="color: #f1c40f; font-weight: bold; margin-bottom: 5px;">Cantidad: ${item.quantity}</div>`;
  }

  if (item.desc) {
    let descDiv = document.createElement("div");
    descDiv.className = "tooltip-desc";
    descDiv.innerHTML = item.desc;
    statsEl.appendChild(descDiv);
  }

  tooltip.classList.remove("hidden");
  positionTooltip(event);
}

function positionTooltip(event) {
  const tooltip = document.getElementById("item-tooltip");
  if (!tooltip) return;

  let clientX = event.clientX;
  let clientY = event.clientY;
  if (event.touches && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if (event.changedTouches && event.changedTouches.length > 0) {
    clientX = event.changedTouches[0].clientX;
    clientY = event.changedTouches[0].clientY;
  }

  let x = clientX + 15;
  let y = clientY + 15;

  if (x + tooltip.offsetWidth > window.innerWidth) {
    x = clientX - tooltip.offsetWidth - 15;
  }
  if (y + tooltip.offsetHeight > window.innerHeight) {
    y = clientY - tooltip.offsetHeight - 15;
  }

  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
}

function hideTooltip() {
  const tooltip = document.getElementById("item-tooltip");
  if (tooltip) {
    tooltip.classList.add("hidden");
  }
}

// Drag & Drop Handlers
function handleDragStart(e, sourceType, sourceValue) {
  let dragData = {
    sourceType: sourceType,
    sourceValue: sourceValue
  };
  e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  e.dataTransfer.effectAllowed = "move";
  e.target.style.opacity = "0.5";
}

function handleDragEnd(e) {
  e.target.style.opacity = "";
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function isSlotCompatible(item, slot) {
  if (!item || !slot) return false;
  
  let itemSlot = item.slot;
  if (!itemSlot) {
    if (item.type === "weapon" || item.type === "rare_weapon" || item.type === "super_rare_weapon" || item.type === "STAFF_BLUE" || item.type === "GREATSWORD_FROST") {
      itemSlot = "weapon";
    } else if (item.type.startsWith("eq_")) {
      itemSlot = item.type.replace("eq_", "");
    }
  }
  
  if (slot === "ring" || slot === "ring2") {
    return itemSlot === "ring";
  }
  if (slot === "pendant" || slot === "pendant2") {
    return itemSlot === "pendant";
  }
  
  if (slot === "weapon" && itemSlot === "weapon") {
    let isMageWeapon = (item.classRestriction === "mage") ||
                       (item.type === "STAFF_BLUE") ||
                       (item.icon === "🔮") ||
                       (item.name && (item.name.includes("Bastón") || item.name.includes("Cetro") || item.name.includes("Báculo")));

    let isWarriorWeapon = (item.classRestriction === "warrior") ||
                         (item.type === "GREATSWORD_FROST") ||
                         (item.icon === "⚔️") ||
                         (item.name && (item.name.includes("Espada") || item.name.includes("Mandoble") || item.name.includes("Filo") || item.name.includes("Arma")));

    if (isMageWeapon && player.charClass !== "mage") return false;
    if (isWarriorWeapon && player.charClass !== "warrior") return false;
    
    return true;
  }
  
  return itemSlot === slot;
}

function handleDrop(e, targetType, targetValue) {
  e.preventDefault();
  hideTooltip();
  
  try {
    let rawData = e.dataTransfer.getData("text/plain");
    if (!rawData) return;
    
    let dragData = JSON.parse(rawData);
    let srcType = dragData.sourceType;
    let srcVal = dragData.sourceValue;
    
    if (srcType === targetType && srcVal === targetValue) {
      return;
    }
    
    if (targetType === "drop_zone") {
      if (srcType === "backpack") {
        let itemIndex = parseInt(srcVal);
        let item = player.inventory[itemIndex];
        if (!item) return;
        player.inventory.splice(itemIndex, 1);
        spawnDroppedItem(item);
        addFloatingText("Soltado: " + item.name, player.x, player.y - 20, item.color || "#fff");
        updateInventoryUI();
        saveGame();
      } else if (srcType === "equipped") {
        let slot = srcVal;
        let item = player.equipment[slot];
        if (!item) return;
        player.equipment[slot] = null;
        spawnDroppedItem(item);
        player.damage = player.getDamage();
        addFloatingText("Soltado: " + item.name, player.x, player.y - 20, item.color || "#fff");
        updateInventoryUI();
        saveGame();
      }
      return;
    }
    
    if (srcType === "backpack" && targetType === "equipped") {
      let itemIndex = parseInt(srcVal);
      let targetSlot = targetValue;
      
      let item = player.inventory[itemIndex];
      if (!item) return;
      
      if (!isSlotCompatible(item, targetSlot)) {
        console.log("Objeto incompatible con esta ranura.");
        addFloatingText("¡Incompatible!", player.x, player.y - 20, "#e74c3c");
        return;
      }
      
      let oldItem = player.equipment[targetSlot];
      player.equipment[targetSlot] = item;
      if (oldItem) {
        player.inventory[itemIndex] = oldItem;
      } else {
        player.inventory.splice(itemIndex, 1);
      }
      
      player.damage = player.getDamage();
      addFloatingText("Equipado: " + item.name, player.x, player.y - 20, "#2ecc71");
      updateInventoryUI();
      saveGame();
    }
    else if (srcType === "equipped" && targetType === "backpack") {
      let srcSlot = srcVal;
      let targetIndex = parseInt(targetValue);
      
      let eqItem = player.equipment[srcSlot];
      if (!eqItem) return;
      
      let backpackItem = player.inventory[targetIndex];
      
      if (backpackItem) {
        if (isSlotCompatible(backpackItem, srcSlot)) {
          player.equipment[srcSlot] = backpackItem;
          player.inventory[targetIndex] = eqItem;
          player.damage = player.getDamage();
          addFloatingText("Intercambiado", player.x, player.y - 20, "#bdc3c7");
          updateInventoryUI();
          saveGame();
        } else {
          console.log("Incompatible.");
          addFloatingText("¡Incompatible!", player.x, player.y - 20, "#e74c3c");
        }
      } else {
        if (player.inventory.length >= 15) {
          addFloatingText("¡Mochila llena!", player.x, player.y - 20, "#e74c3c");
          return;
        }
        player.equipment[srcSlot] = null;
        player.inventory.push(eqItem);
        player.damage = player.getDamage();
        addFloatingText("Desequipado: " + eqItem.name, player.x, player.y - 20, "#bdc3c7");
        updateInventoryUI();
        saveGame();
      }
    }
    else if (srcType === "backpack" && targetType === "backpack") {
      let fromIndex = parseInt(srcVal);
      let toIndex = parseInt(targetValue);
      
      if (fromIndex < player.inventory.length && toIndex <= player.inventory.length) {
        let temp = player.inventory[fromIndex];
        if (toIndex < player.inventory.length) {
          player.inventory[fromIndex] = player.inventory[toIndex];
          player.inventory[toIndex] = temp;
        } else {
          player.inventory.splice(fromIndex, 1);
          player.inventory.push(temp);
        }
        updateInventoryUI();
        saveGame();
      }
    }
  } catch (err) {
    console.error("Error in drop handler:", err);
  }
}

let isPortrait = false;

function updateScreenState() {
  const isPlaying = gameState === "PLAYING";
  if (isPlaying) {
    document.body.classList.remove("menu-active");
    document.documentElement.classList.remove("menu-active");
    const uiContainer = document.getElementById("ui-container");
    if (uiContainer) uiContainer.classList.remove("menu-active");
  } else {
    document.body.classList.add("menu-active");
    document.documentElement.classList.add("menu-active");
    const uiContainer = document.getElementById("ui-container");
    if (uiContainer) uiContainer.classList.add("menu-active");
  }
}

function setGameState(state) {
  gameState = state;
  if (state !== "PLAYING") {
    closeInventory();
  }
  updateScreenState();
  checkOrientation();
}

function checkOrientation() {
  const warning = document.getElementById("orientation-warning");
  if (!warning) return false;

  if (gameState !== "PLAYING") {
    isPortrait = false;
    warning.classList.add("hidden");
    return false; // not blocked
  }

  isPortrait = window.innerHeight > window.innerWidth;
  if (isPortrait) {
    warning.classList.remove("hidden");
    return true; // is blocked
  } else {
    warning.classList.add("hidden");
    return false; // not blocked
  }
}

// Resize canvas
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  camera.width = canvas.width;
  camera.height = canvas.height;
  ctx.imageSmoothingEnabled = false; // Pixel art style
  checkOrientation();
}
window.addEventListener("resize", resize);
resize();

// Input
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (typeof e.key === "string") {
    keys[e.key.toLowerCase()] = true;
  }
  if (e.code) {
    keys[e.code] = true;
  }

  if (e.key === 'Escape') {
    closeInventory();
  }
  
  if (e.key.toLowerCase() === 'q') {
    const inventoryModal = document.getElementById("inventory-modal");
    if (inventoryModal) {
      if (inventoryModal.classList.contains("hidden")) {
        inventoryModal.classList.remove("hidden");
        updateInventoryUI(); // Refresh items on open
      } else {
        closeInventory();
      }
    }
  }

  if (e.key.toLowerCase() === 'e') {
    handleInteraction();
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
  if (typeof e.key === "string") {
    keys[e.key.toLowerCase()] = false;
  }
  if (e.code) {
    keys[e.code] = false;
  }
});
window.addEventListener("blur", () => {
  keys = {};
});
if (canvas) {
  canvas.addEventListener("click", () => {
    canvas.focus();
  });
  canvas.addEventListener("touchstart", () => {
    canvas.focus();
  }, { passive: true });
}
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener("mousedown", (e) => {
  const invModal = document.getElementById("inventory-modal");
  const isInvOpen = invModal && !invModal.classList.contains("hidden");

  // RIGHT CLICK (USE ITEM)
  if (e.button === 2 && isInvOpen) {
    e.preventDefault();
    
    const slot = e.target.closest(".inv-slot");
    if (slot && slot.dataset.index !== undefined) {
      const index = parseInt(slot.dataset.index);
      if (player && index < player.inventory.length) {
        console.log("Usando objeto en slot: " + index);
        useItem(index);
      }
    }
  }

  // LEFT CLICK (ATTACK)
  if (e.button === 0 && gameState === "PLAYING") {
    if (isInvOpen && e.target.closest(".inventory-content")) {
      return; 
    }
    
    // Check if we clicked on an NPC first
    let hit = checkNPCClick(e.clientX, e.clientY);
    if (hit) {
      mouse.clicked = false;
      return;
    }
    
    mouse.clicked = true;
  }
});

window.addEventListener("touchstart", (e) => {
  if (gameState === "PLAYING" && e.touches && e.touches.length > 0) {
    const invModal = document.getElementById("inventory-modal");
    const isInvOpen = invModal && !invModal.classList.contains("hidden");
    if (isInvOpen && e.target.closest(".inventory-content")) {
      return; 
    }
    let touch = e.touches[0];
    let hit = checkNPCClick(touch.clientX, touch.clientY);
    if (hit) {
      // Prevent other actions if we hit an NPC
      e.preventDefault();
    }
  }
}, { passive: false });

// Block context menu
window.addEventListener("contextmenu", (e) => e.preventDefault());

// Start Game Handler
if (characterForm) {
  characterForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const nameInput = document.getElementById("char-name");
    const name = nameInput ? nameInput.value.trim() : "Héroe";
    
    const classSelected = document.querySelector('input[name="char-class"]:checked');
    const charClass = classSelected ? classSelected.value : "warrior";
    
    const genderSelected = document.querySelector('input[name="char-gender"]:checked');
    const gender = genderSelected ? genderSelected.value : "male";

    console.log("Iniciando aventura...");
    currentSaveSlot = 1;
    
    // Entrar en modo pantalla completa
    enterFullscreen();
    
    startGame(name, charClass, gender, 1, [], null, true);
  });
}

// Continue Game Handler
if (continueBtn) {
  continueBtn.addEventListener("click", () => {
    const saved = localStorage.getItem(`isekaiSave_1`);
    if (saved) {
      const data = JSON.parse(saved);
      
      // Entrar en modo pantalla completa
      enterFullscreen();
      
      startGame(data.name, data.charClass, data.gender, data.floor || 1, data.powers || [], data.hp, false);
    }
  });
}

function resetPlayerOnDeath(player) {
  if (!player) return;

  // Reset all powers to level 1
  if (player.powers) {
    player.powers.forEach((p) => {
      p.level = 1;
    });
  }

  // Reset RPG Progression
  player.level = 1;
  player.exp = 0;
  player.nextLevelExp = 300;
  killedEnemiesCount = 0;

  // Reset base stats based on character class data registry
  const classData = Player.CLASSES[player.charClass] || Player.CLASSES.warrior;
  player.baseMaxHp = classData.baseMaxHp;
  player.maxHp = classData.baseMaxHp;
  player.baseMaxMana = classData.baseMaxMana;
  player.maxMana = classData.baseMaxMana;
  player.baseDamage = classData.baseDamage;
  player.baseSpeed = classData.speed;
  player.speed = classData.speed;

  player.hp = player.maxHp;
  player.mana = player.maxMana;
  player.damage = player.baseDamage;
  player.armor = 0;
  player.weaponLevel = 1;

  // Clear inventory, equipment, projectiles and timers
  player.inventory = [];
  player.materials = {};
  const starterWep = classData.starterWeapon || {
    type: 'weapon',
    name: 'Arma Básica',
    color: '#bdc3c7',
    bonus: 0,
    desc: 'Arma inicial sin modificadores.'
  };
  player.equipment = {
    head: null,
    chest: null,
    legs: null,
    gloves: null,
    ring: null,
    ring2: null,
    pendant: null,
    pendant2: null,
    weapon: JSON.parse(JSON.stringify(starterWep))
  };
  player.projectiles = [];
  player.immunityTimer = 0;
  player.poisonTimer = 0;
  player.stunTimer = 0;
  player.stunImmunityTimer = 0;
  player.furyAuraTimer = 0;
  player.hitEnemies = [];
  player.damage = player.getDamage();
}

// Restart Game Handler
const restartBtn = document.getElementById("restart-btn");
if (restartBtn) {
  restartBtn.addEventListener("click", () => {
    // Entrar en modo pantalla completa
    enterFullscreen();

    // EXP Penalty: Pisos 1-5 pierden 50, 6-10 pierden 100, etc.
    let loss = 50 * Math.ceil(floor / 5);
    player.exp = Math.max(0, player.exp - loss);

    // Reset player HP, Mana, and combat/lockout states
    player.hp = player.maxHp;
    player.mana = player.maxMana;
    player.lastHp = player.hp;
    player.combatTimer = 0;
    player.lastDamageTimer = 0;
    player.stillTimer = 0;

    enemies = [];
    projectiles = [];
    enemyProjectiles = [];
    droppedItems = [];

    // Load the current floor
    initLevel(player.name, player.charClass, player.gender, false);

    // Save game state
    saveGame();

    if (gameOverScreen) {
      gameOverScreen.classList.add("hidden");
    }
    if (gameUi) gameUi.classList.remove("hidden");
    if (canvas) {
      canvas.classList.remove("hidden");
      document.activeElement.blur();
      canvas.focus();
    }

    setGameState("PLAYING");
    updateMobileControlsVisibility();
    startGameLoop();
    
    updateInventoryUI();
    updatePowerBarUI();
    console.log(`¡El héroe ha reencarnado en el Piso ${floor}! EXP perdida: ${loss}`);
  });
}

function startGame(name, charClass, gender, startFloor, powers, hp, newPlayer) {
  if (mainMenu) mainMenu.classList.add("hidden");
  if (gameUi) gameUi.classList.remove("hidden");
  if (canvas) {
    canvas.classList.remove("hidden");
    document.activeElement.blur();
    canvas.focus();
  }

  floor = startFloor;
  
  if (!newPlayer) {
    let savedDataStr = localStorage.getItem(`isekaiSave_${currentSaveSlot}`);
    if (savedDataStr) {
      let sd = JSON.parse(savedDataStr);
      maxFloor = sd.maxFloor || sd.floor || 1;
      killedEnemiesCount = sd.killedEnemiesCount || 0;
    } else {
      maxFloor = startFloor || 1;
      killedEnemiesCount = 0;
    }
  } else {
    maxFloor = 1;
    killedEnemiesCount = 0;
  }
  
  initLevel(name, charClass, gender, newPlayer);

  if (!newPlayer && player) {
    player.powers = powers || [];
    if (player.powers.length > 0) player.activePowerIndex = 0;
    
    let savedDataStr = localStorage.getItem(`isekaiSave_${currentSaveSlot}`);
    if (savedDataStr) {
      let sd = JSON.parse(savedDataStr);
      
      player.hp = hp !== null && hp !== undefined ? hp : (sd.hp || player.maxHp);
      player.maxHp = sd.maxHp || player.maxHp;
      player.mana = sd.mana || player.maxMana;
      player.maxMana = sd.maxMana || player.maxMana;
      player.coins = sd.coins || 0;
      
      player.inventory = sd.inventory || [];
      player.materials = sd.materials || {};
      if (sd.equipment) {
        if (Array.isArray(sd.equipment)) {
          player.equipment = {
            head: null,
            chest: null,
            legs: null,
            gloves: null,
            ring: null,
            ring2: null,
            pendant: null,
            pendant2: null,
            weapon: sd.equipment[0] || null
          };
        } else {
          player.equipment = sd.equipment;
          if (player.equipment.ring2 === undefined) player.equipment.ring2 = null;
          if (player.equipment.pendant2 === undefined) player.equipment.pendant2 = null;
        }
      } else {
        player.equipment = {
          head: null,
          chest: null,
          legs: null,
          gloves: null,
          ring: null,
          ring2: null,
          pendant: null,
          pendant2: null,
          weapon: null
        };
      }
      player.reserveHearts = sd.reserveHearts || [];
      
      if (sd.stats) {
        const classData = Player.CLASSES[sd.charClass] || Player.CLASSES.warrior;
        player.baseDamage = sd.stats.baseDamage !== undefined ? sd.stats.baseDamage : classData.baseDamage;
        player.damage = sd.stats.damage || player.damage;
        player.armor = sd.stats.armor || player.armor;
      }

      // Load RPG Experience & Stats
      player.level = sd.level || 1;
      player.exp = sd.exp || 0;
      player.nextLevelExp = sd.nextLevelExp || 300;
      const classData = Player.CLASSES[player.charClass] || Player.CLASSES.warrior;
      player.baseMaxHp = sd.baseMaxHp || classData.baseMaxHp;
      player.baseMaxMana = sd.baseMaxMana || classData.baseMaxMana;
      player.recalculateStats();
    }

    updatePowerBarUI();
    updateInventoryUI();
  } else if (player) {
    const classData = Player.CLASSES[player.charClass] || Player.CLASSES.warrior;
    player.inventory = [];
    player.materials = {};
    const starterWep = classData.starterWeapon || {
      type: 'weapon',
      name: 'Arma Básica',
      color: '#bdc3c7',
      bonus: 0,
      desc: 'Arma inicial sin modificadores.'
    };
    player.equipment = {
      head: null,
      chest: null,
      legs: null,
      gloves: null,
      ring: null,
      ring2: null,
      pendant: null,
      pendant2: null,
      weapon: JSON.parse(JSON.stringify(starterWep))
    };
    player.reserveHearts = [];
    player.coins = 0;
    player.damage = player.getDamage();
    updateInventoryUI();
  }

  setGameState("PLAYING");
  updateMobileControlsVisibility();
  startGameLoop();
}

function saveGame() {
  if (!player) return;
  const data = {
    name: player.name,
    charClass: player.charClass,
    gender: player.gender,
    maxHp: player.maxHp,
    hp: player.hp,
    maxMana: player.maxMana,
    mana: player.mana,
    coins: player.coins || 0,
    inventory: [...player.inventory],
    materials: player.materials ? JSON.parse(JSON.stringify(player.materials)) : {},
    equipment: player.equipment ? JSON.parse(JSON.stringify(player.equipment)) : {},
    reserveHearts: [...player.reserveHearts],
    floor: floor,
    maxFloor: maxFloor,
    killedEnemiesCount: killedEnemiesCount,
    powers: [...player.powers],
    level: player.level || 1,
    exp: player.exp || 0,
    nextLevelExp: player.nextLevelExp || 300,
    baseMaxHp: player.baseMaxHp || (Player.CLASSES[player.charClass]?.baseMaxHp || 150),
    baseMaxMana: player.baseMaxMana || (Player.CLASSES[player.charClass]?.baseMaxMana || 50),
    stats: {
      damage: player.damage,
      armor: player.armor,
      baseDamage: player.baseDamage
    }
  };

  localStorage.setItem(`isekaiSave_${currentSaveSlot}`, JSON.stringify(data));
  console.log("Juego guardado en el slot " + currentSaveSlot);
}

function findSafeEnemySpawnPosition(room, dungeon, player, enemyType) {
  let tileSize = dungeon.tileSize;
  let minDistance = 3 * tileSize; // 120 pixels
  let maxAttempts = 100;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let currentMinDist = minDistance;
    if (attempt > 50) {
      currentMinDist = 2 * tileSize; // 80 pixels
    }
    
    let ex = room.x * tileSize + 20 + Math.random() * (room.w * tileSize - 40);
    let ey = room.y * tileSize + 20 + Math.random() * (room.h * tileSize - 40);
    
    // Check distance to player
    let dx = ex - player.x;
    let dy = ey - player.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < currentMinDist) {
      continue;
    }
    
    // Check wall collision
    if (dungeon.isWallRect(ex, ey, 30, 30)) {
      continue;
    }
    
    // Ensure escape route (free adjacent tiles)
    let freeNeighbors = 0;
    let checkOffsets = [
      {x: -tileSize, y: 0},
      {x: tileSize, y: 0},
      {x: 0, y: -tileSize},
      {x: 0, y: tileSize}
    ];
    for (let offset of checkOffsets) {
      if (!dungeon.isWallRect(ex + offset.x, ey + offset.y, 20, 20)) {
        freeNeighbors++;
      }
    }
    
    if (freeNeighbors < 2) {
      continue;
    }
    
    return { x: ex, y: ey };
  }
  
  // Fallback
  let ex = room.x * tileSize + (room.w * tileSize) / 2;
  let ey = room.y * tileSize + (room.h * tileSize) / 2;
  return { x: ex, y: ey };
}

function initLevel(name, charClass, gender, newPlayer) {
  dungeon = new Dungeon(50, 50);
  dungeon.floor = floor;
  
  merchantKeyObtained = false;
  hasMerchantKey = false;

  let isSafeRoomFloor = typeof floor === 'string' && floor.endsWith('.1');
  let isBossFloor = !isSafeRoomFloor && (floor % 5 === 0);

  if (isSafeRoomFloor) {
    dungeon.generateSafeRoom();
  } else if (isBossFloor) {
    dungeon.generateBossRoom();
  } else {
    dungeon.generate();
  }

  let startRoom = dungeon.rooms[0];
  let startX, startY;

  if (isSafeRoomFloor) {
    // Spawn player centered, slightly up from bottom stairs
    startX = dungeon.enterX * dungeon.tileSize + dungeon.tileSize / 2;
    startY = dungeon.enterY * dungeon.tileSize - dungeon.tileSize / 2;
  } else if (isBossFloor) {
    // In boss rooms, spawn player offset by 1 tile above the enter door
    startX = dungeon.enterX * dungeon.tileSize + dungeon.tileSize / 2;
    startY = (dungeon.enterY - 1) * dungeon.tileSize + dungeon.tileSize / 2;
  } else {
    // In normal rooms, spawn player offset by 1 tile from the enter door
    startX = dungeon.enterX * dungeon.tileSize + dungeon.tileSize / 2;
    startY = dungeon.enterY * dungeon.tileSize + dungeon.tileSize / 2;

    if (startRoom.w > 2) {
      startX += dungeon.tileSize;
    } else if (startRoom.h > 2) {
      startY += dungeon.tileSize;
    }
  }

  if (newPlayer || !player) {
    player = new Player(startX, startY, name, charClass, gender);
  } else {
    player.x = startX;
    player.y = startY;
    player.projectiles = [];
    player.immunityTimer = 0;
    player.poisonTimer = 0;
    player.stunTimer = 0;
    player.stunImmunityTimer = 0;
    player.lastHp = player.hp;
    player.combatTimer = 0;
    player.lastDamageTimer = 0;
    player.stillTimer = 0;
  }

  if (hudName) hudName.innerText = player.name;
  if (hudClass) hudClass.innerText = player.charClass.toUpperCase();
  
  const avatarEl = document.getElementById("hud-avatar-icon");
  if (avatarEl) {
    const classData = Player.CLASSES[player.charClass] || Player.CLASSES.warrior;
    avatarEl.innerText = classData.avatar || "👤";
  }
  
  const floorHUD = document.getElementById("hud-floor");
  if (floorHUD) floorHUD.innerText = floor;

  const hudCoins = document.getElementById("hud-coins");
  if (hudCoins) hudCoins.innerText = player.coins || 0;

  enemies = [];
  projectiles = [];
  enemyProjectiles = [];
  droppedItems = [];
  keys = {};

  if (isSafeRoomFloor) {
    // 5. CARGA AUTOMÁTICA
    safeRoomNPCs = [];
    
    let merchant = {
      id: "merchant",
      name: "Comerciante",
      x: 860,
      y: 900,
      width: 48,
      height: 48,
      sprite: "🧙‍♂️",
      dialog: "¿Tienes objetos para vender o quieres comprar?",
      interactable: true,
      clickable: true,
      touchable: true,
      canMove: false,
      invulnerable: true,
      collision: false,
      type: "shop"
    };

    let blacksmith = {
      id: "blacksmith",
      name: "Herrero",
      x: 1020,
      y: 900,
      width: 48,
      height: 48,
      sprite: "⚒️",
      dialog: "¿Tienes materiales que pueda usar?",
      interactable: true,
      clickable: true,
      touchable: true,
      canMove: false,
      invulnerable: true,
      collision: false,
      type: "crafting"
    };

    let jeweler = {
      id: "jeweler",
      name: "Joyero",
      x: 1180,
      y: 900,
      width: 48,
      height: 48,
      sprite: "💎",
      dialog: "Aún espero mis herramientas...",
      interactable: true,
      clickable: true,
      touchable: true,
      canMove: false,
      invulnerable: true,
      collision: false,
      type: "jewel"
    };

    safeRoomNPCs.push(merchant, blacksmith, jeweler);
  } else {
    // 6. ELIMINACIÓN AUTOMÁTICA
    safeRoomNPCs = [];
    activeDialogNPC = null;
    activeDialogTimer = 0;
  }

  if (isBossFloor) {
    let bossRoom = dungeon.rooms[0];
    let bx = bossRoom.x * dungeon.tileSize + (bossRoom.w * dungeon.tileSize) / 2;
    let by = bossRoom.y * dungeon.tileSize + (bossRoom.h * dungeon.tileSize) / 2;
    
    if (floor === 10) {
      enemies.push(new Floor10Boss(bx, by, floor));
    } else if (floor === 15) {
      enemies.push(new BossFloor15(bx, by, floor));
    } else {
      enemies.push(new Boss(bx, by, floor));
    }
  } else if (!isSafeRoomFloor) {
    merchantNPC = null;
    for (let i = 1; i < dungeon.rooms.length; i++) {
      let room = dungeon.rooms[i];
      
      if (room.type === 'merchant') {
        continue;
      }

      if (room.type === 'special') {
        let cx = room.x * dungeon.tileSize + (room.w * dungeon.tileSize) / 2;
        let cy = room.y * dungeon.tileSize + (room.h * dungeon.tileSize) / 2;
        droppedItems.push({
          x: cx,
          y: cy,
          radius: 12,
          type: "gold_chest",
          color: "#f1c40f",
          name: "Cofre Dorado",
          opened: false
        });
      }

      let numEnemies;
      if (room.type === 'special') {
        // High density chest room challenge: 5 to 8 enemies + floor scaling
        numEnemies = 5 + Math.floor(Math.random() * 4) + Math.floor(floor / 5);
      } else {
        let maxRandomEnemies = 3 + Math.floor(floor / 10);
        numEnemies = Math.floor(Math.random() * Math.min(5, maxRandomEnemies)) + 1;
      }

      for (let j = 0; j < numEnemies; j++) {
        let eType = "normal";
        if (floor === 2) {
          eType = "poison";
        } else if (floor === 3) {
          eType = Math.random() < 0.5 ? "stun" : "shooter";
        } else if (floor >= 4) {
          let types = ["normal", "poison", "stun", "shooter"];
          eType = types[Math.floor(Math.random() * types.length)];
        }

        let spawnPos = findSafeEnemySpawnPosition(room, dungeon, player, eType);
        enemies.push(new Enemy(spawnPos.x, spawnPos.y, floor, eType));
      }
    }
  }

  // Set up merchant NPC and chests if a merchant room exists
  dungeon.rooms.forEach(room => {
    if (room.type === 'merchant') {
      let mx = room.x * dungeon.tileSize + (room.w * dungeon.tileSize) / 2;
      let my = room.y * dungeon.tileSize + (room.h * dungeon.tileSize) / 2;
      merchantNPC = { x: mx, y: my, width: 24, height: 24 };

      // Spawn 2 golden chests in the corners
      let cx1 = (room.x + 1) * dungeon.tileSize + dungeon.tileSize / 2;
      let cy1 = (room.y + 1) * dungeon.tileSize + dungeon.tileSize / 2;
      let cx2 = (room.x + room.w - 2) * dungeon.tileSize + dungeon.tileSize / 2;
      let cy2 = (room.y + 1) * dungeon.tileSize + dungeon.tileSize / 2;
      
      let chest1Exists = droppedItems.some(item => item.x === cx1 && item.y === cy1 && item.type === "gold_chest");
      let chest2Exists = droppedItems.some(item => item.x === cx2 && item.y === cy2 && item.type === "gold_chest");
      
      if (!chest1Exists) {
        droppedItems.push({
          x: cx1,
          y: cy1,
          radius: 12,
          type: "gold_chest",
          color: "#f1c40f",
          name: "Cofre Dorado",
          opened: false
        });
      }
      
      if (!chest2Exists) {
        droppedItems.push({
          x: cx2,
          y: cy2,
          radius: 12,
          type: "gold_chest",
          color: "#f1c40f",
          name: "Cofre Dorado",
          opened: false
        });
      }
    }
  });
  if (dungeon) {
    dungeon.doorOpen = (floor < maxFloor || isSafeRoomFloor);
    if (floor < maxFloor) {
      dungeon.merchantDoorOpen = true;
    }
  }
}

function update(deltaTime) {
  if (gameState !== "PLAYING") return;

  player.update(keys, mouse, camera, dungeon, deltaTime);

  // Reset mouse click after player processes it
  mouse.clicked = false;

  // Interaction scan
  currentInteractable = null;
  let nearestDist = 60; // Max interaction distance

  // Check exit door
  if (dungeon && dungeon.exitX !== undefined && dungeon.exitY !== undefined) {
    let exitPixelX = dungeon.exitX * dungeon.tileSize + dungeon.tileSize / 2;
    let exitPixelY = dungeon.exitY * dungeon.tileSize + dungeon.tileSize / 2;
    let dx = player.x - exitPixelX;
    let dy = player.y - exitPixelY;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      currentInteractable = { type: 'exit_door', x: exitPixelX, y: exitPixelY, dist: dist };
      nearestDist = dist;
    }
  }

  // Check enter door (to previous floor)
  if (floor > 1 && dungeon && dungeon.enterX !== undefined && dungeon.enterY !== undefined) {
    let enterPixelX = dungeon.enterX * dungeon.tileSize + dungeon.tileSize / 2;
    let enterPixelY = dungeon.enterY * dungeon.tileSize + dungeon.tileSize / 2;
    let dx = player.x - enterPixelX;
    let dy = player.y - enterPixelY;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      currentInteractable = { type: 'enter_door', x: enterPixelX, y: enterPixelY, dist: dist };
      nearestDist = dist;
    }
  }

  // Check merchant door
  if (dungeon && dungeon.merchantDoorX !== -1 && !dungeon.merchantDoorOpen) {
    let doorX = dungeon.merchantDoorX * dungeon.tileSize + dungeon.tileSize / 2;
    let doorY = dungeon.merchantDoorY * dungeon.tileSize + dungeon.tileSize / 2;
    let dx = player.x - doorX;
    let dy = player.y - doorY;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      currentInteractable = { type: 'door', x: doorX, y: doorY, dist: dist };
      nearestDist = dist;
    }
  }

  // Check merchant NPC
  if (merchantNPC) {
    let dx = player.x - merchantNPC.x;
    let dy = player.y - merchantNPC.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      currentInteractable = { type: 'merchant', x: merchantNPC.x, y: merchantNPC.y, dist: dist };
      nearestDist = dist;
    }
  }

  // Check safe room NPCs
  for (let npc of safeRoomNPCs) {
    if (!npc.interactable) continue;
    let dx = player.x - npc.x;
    let dy = player.y - npc.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      currentInteractable = { type: 'npc', npc: npc, x: npc.x, y: npc.y, dist: dist };
      nearestDist = dist;
    }
  }

  // Check golden chest
  for (let it of droppedItems) {
    if (it.type === "gold_chest" && !it.opened) {
      let dx = player.x - it.x;
      let dy = player.y - it.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        currentInteractable = { type: 'chest', x: it.x, y: it.y, target: it, dist: dist };
        nearestDist = dist;
      }
    }
  }

  // Show/Hide mobile interact button
  const btnInteract = document.getElementById("btn-interact");
  if (btnInteract) {
    if (currentInteractable) {
      btnInteract.classList.remove("hidden");
    } else {
      btnInteract.classList.add("hidden");
    }
  }

  // Camera follow player
  camera.x = player.x - camera.width / 2;
  camera.y = player.y - camera.height / 2;

  // Update enemies & check collisions
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    e.update(player, dungeon, deltaTime);

    // Player takes damage
    if (!e.isImmune) {
      let dx = player.x - e.x;
      let dy = player.y - e.y;
      let dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < player.width / 2 + e.width / 2) {
        if (e.attackCooldown === undefined) e.attackCooldown = 0;
        if (e.attackCooldown <= 0 && player.immunityTimer <= 0) {
          let finalDmg = Math.max(1, e.damage - player.getArmor());
          player.hp -= finalDmg;
          addFloatingText("-" + Math.round(finalDmg), player.x, player.y - 10, "#e74c3c");
          player.flashTimer = 10;

          // Apply Status
          if (e.type === "poison") {
            player.poisonTimer = 3 * 60; // 3 seconds
          } else if (e.type === "stun") {
            if ((player.stunImmunityTimer || 0) <= 0 && (player.stunTimer || 0) <= 0) {
              player.stunTimer = 90; // 1.5 seconds
            }
          }

          e.attackCooldown = 60; // 1 second cooldown between hits

          if (player.hp <= 0) gameOver();
        }
      }
    }

    // Warrior attack collision
    if (player.isAttacking && player.charClass === "warrior") {
      let attackX = player.x + player.facing.x * 20;
      let attackY = player.y + player.facing.y * 20;
      let ax = attackX - e.x;
      let ay = attackY - e.y;
      let aDist = Math.sqrt(ax * ax + ay * ay);
      let hitRadius = player.currentAttackPower === "earth" ? 25 : 15;
      if (aDist < hitRadius + e.width / 2 && !e.isImmune) {
        if (!player.hitEnemies) player.hitEnemies = [];
        if (!player.hitEnemies.includes(e)) {
          e.hp -= player.damage;
          if (e.applyStatus) e.applyStatus(player.currentAttackPower, player);
          player.hitEnemies.push(e);
        }
      }
    }

    // Mage projectile collision
    for (let j = player.projectiles.length - 1; j >= 0; j--) {
      let p = player.projectiles[j];
      let px = p.x - e.x;
      let py = p.y - e.y;
      let pDist = Math.sqrt(px * px + py * py);
      if (pDist < e.width / 2 + p.radius && !e.isImmune) {
        e.hp -= p.damage;
        if (e.applyStatus) e.applyStatus(p.power);

        if (p.power !== "earth") {
          player.projectiles.splice(j, 1); // remove projectile unless it's earth (piercing)
        }
      }
    }

    if (e.hp <= 0) {
      if (typeof e.getExpReward === 'function') {
        let expAmount = e.getExpReward(floor);
        player.gainExp(expAmount);
        let expColor = (e instanceof Boss || e.isElite) ? "#f1c40f" : "#2ecc71";
        addFloatingText("+" + expAmount + " EXP", e.x, e.y - 20, expColor);
      }

      // Drop logic
      let rolledDrops = [];
      if (e instanceof Boss) {
        rolledDrops = rollBossDrop(floor, e.x, e.y, player.charClass);
      } else {
        killedEnemiesCount++;
        rolledDrops = rollMobDrop(floor, e.x, e.y, player.charClass, killedEnemiesCount);
      }
      rolledDrops.forEach(drop => droppedItems.push(drop));
      enemies.splice(i, 1);
    }
  }

  // Resolve Enemy-Enemy and Enemy-Player collisions
  // 1. Enemies vs Enemies separation
  for (let idx1 = 0; idx1 < enemies.length; idx1++) {
    let e1 = enemies[idx1];
    for (let idx2 = idx1 + 1; idx2 < enemies.length; idx2++) {
      let e2 = enemies[idx2];
      
      let dx = e2.x - e1.x;
      let dy = e2.y - e1.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      let minDist = (e1.width + e2.width) / 2;
      
      if (dist < minDist) {
        if (dist === 0) {
          dx = (Math.random() - 0.5) * 2;
          dy = (Math.random() - 0.5) * 2;
          dist = Math.sqrt(dx * dx + dy * dy) || 1;
        }
        
        let overlap = minDist - dist;
        let pushX = (dx / dist) * overlap * 0.5;
        let pushY = (dy / dist) * overlap * 0.5;
        
        let nextE2X = e2.x + pushX;
        let nextE2Y = e2.y + pushY;
        if (dungeon && !dungeon.isWallRect(nextE2X, e2.y, e2.width, e2.height)) {
          e2.x = nextE2X;
        }
        if (dungeon && !dungeon.isWallRect(e2.x, nextE2Y, e2.width, e2.height)) {
          e2.y = nextE2Y;
        }
        
        let nextE1X = e1.x - pushX;
        let nextE1Y = e1.y - pushY;
        if (dungeon && !dungeon.isWallRect(nextE1X, e1.y, e1.width, e1.height)) {
          e1.x = nextE1X;
        }
        if (dungeon && !dungeon.isWallRect(e1.x, nextE1Y, e1.width, e1.height)) {
          e1.y = nextE1Y;
        }
      }
    }
  }

  // 2. Enemies vs Player separation
  for (let e of enemies) {
    let dx = e.x - player.x;
    let dy = e.y - player.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    let minDist = (player.width + e.width) / 2;
    
    if (dist < minDist) {
      if (dist === 0) {
        dx = (Math.random() - 0.5) * 2;
        dy = (Math.random() - 0.5) * 2;
        dist = Math.sqrt(dx * dx + dy * dy) || 1;
      }
      
      let overlap = minDist - dist;
      let pushX = (dx / dist) * overlap;
      let pushY = (dy / dist) * overlap;
      
      let nextEX = e.x + pushX;
      let nextEY = e.y + pushY;
      if (dungeon && !dungeon.isWallRect(nextEX, e.y, e.width, e.height)) {
        e.x = nextEX;
      }
      if (dungeon && !dungeon.isWallRect(e.x, nextEY, e.width, e.height)) {
        e.y = nextEY;
      }
      
      let pushPlayerX = -(dx / dist) * overlap * 0.2;
      let pushPlayerY = -(dy / dist) * overlap * 0.2;
      let nextPlayerX = player.x + pushPlayerX;
      let nextPlayerY = player.y + pushPlayerY;
      if (dungeon && !dungeon.isWallRect(nextPlayerX, player.y, player.width, player.height)) {
        player.x = nextPlayerX;
      }
      if (dungeon && !dungeon.isWallRect(player.x, nextPlayerY, player.width, player.height)) {
        player.y = nextPlayerY;
      }
    }
  }

  // Update Enemy Projectiles
  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    let ep = enemyProjectiles[i];
    ep.x += ep.vx;
    ep.y += ep.vy;
    ep.life--;

    let dx = player.x - ep.x;
    let dy = player.y - ep.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < player.width / 2 + ep.radius && player.immunityTimer <= 0) {
      let finalDmg = Math.max(1, ep.damage - player.getArmor());
      player.hp -= finalDmg;
      addFloatingText("-" + Math.round(finalDmg), player.x, player.y - 10, "#e74c3c");
      player.flashTimer = 10;
      enemyProjectiles.splice(i, 1);
      if (player.hp <= 0) gameOver();
    } else if (ep.life <= 0 || dungeon.isWall(ep.x, ep.y)) {
      enemyProjectiles.splice(i, 1);
    }
  }

  // Update Items on Ground
  for (let i = droppedItems.length - 1; i >= 0; i--) {
    let it = droppedItems[i];
    if (it.pickupDelay > 0) {
      it.pickupDelay--;
      continue;
    }
    let dx = player.x - it.x;
    let dy = player.y - it.y;
    if (Math.sqrt(dx * dx + dy * dy) < player.width / 2 + it.radius) {
      if (it.type === "gold_chest") {
        continue;
      }
      if (it.type === "coin") {
        player.coins = (player.coins || 0) + it.value;
        addFloatingText("+" + it.value + " 🪙", it.x, it.y, "#f1c40f");
        playCoinSound();
        droppedItems.splice(i, 1);
        const hudCoins = document.getElementById("hud-coins");
        if (hudCoins) hudCoins.innerText = player.coins;
        console.log("Monedas de oro obtenidas: " + it.value + ". Total: " + player.coins);
      } else {
        if (it.type && it.type.startsWith("material_")) {
          player.materials = player.materials || {};
          player.materials[it.type] = (player.materials[it.type] || 0) + 1;
          addFloatingText(it.name + " +1 📦", it.x, it.y, it.color || "#fff");
          droppedItems.splice(i, 1);
          updateInventoryUI();
          saveGame();
        } else {
          // Pick up item if backpack is not full
          if (player.inventory.length < 15) {
            player.inventory.push({
              type: it.type,
              name: it.name,
              rarity: it.rarity,
              color: it.color,
              bonus: it.bonus,
              hpBonus: it.hpBonus,
              healAmount: it.healAmount,
              manaAmount: it.manaAmount,
              slot: it.slot,
              classRestriction: it.classRestriction,
              icon: it.icon,
              desc: it.desc,
              stats: it.stats
            });
            addFloatingText(it.name, it.x, it.y, it.color || "#fff");
            droppedItems.splice(i, 1);
            updateInventoryUI();
          }
        }
      }
    }
  }

  // Update HUD
  if (hudHp) hudHp.innerText = `${Math.ceil(player.hp)}/${player.maxHp}`;
  if (hudMana) hudMana.innerText = `${Math.ceil(player.mana)}/${player.maxMana}`;

  const hudHpFill = document.getElementById("hud-hp-fill");
  if (hudHpFill && player.maxHp > 0) {
    let hpPct = (player.hp / player.maxHp) * 100;
    hudHpFill.style.width = `${Math.min(100, Math.max(0, hpPct))}%`;
  }
  const hudManaFill = document.getElementById("hud-mana-fill");
  if (hudManaFill && player.maxMana > 0) {
    let manaPct = (player.mana / player.maxMana) * 100;
    hudManaFill.style.width = `${Math.min(100, Math.max(0, manaPct))}%`;
  }
  
  // Update Experience HUD
  const hudLevel = document.getElementById("hud-level");
  const expValues = document.getElementById("exp-values");
  const expBarFill = document.getElementById("exp-bar-fill");
  if (hudLevel) hudLevel.innerText = player.level || 1;
  if (expValues) expValues.innerText = `${Math.round(player.exp || 0)} / ${player.nextLevelExp || 300} EXP`;
  if (expBarFill) {
    let pct = ((player.exp || 0) / (player.nextLevelExp || 300)) * 100;
    expBarFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  }

  const combatStatus = document.getElementById("hud-combat-status");
  if (combatStatus) {
    if (player.combatTimer > 0) {
      combatStatus.innerText = "⚔️ EN COMBATE";
      combatStatus.className = "combat-status-in";
    } else {
      combatStatus.innerText = "🛡️ LIBRE";
      combatStatus.className = "combat-status-out";
    }
  }

  updatePowerBarUI();

  // Level progression via door
  if (enemies.length === 0 || floor < maxFloor) {
    if (dungeon) dungeon.doorOpen = true; // Open the door

    // Award Merchant Key when all enemies are defeated on merchant floors
    if (dungeon && dungeon.merchantDoorX !== -1 && !merchantKeyObtained && enemies.length === 0) {
      merchantKeyObtained = true;
      hasMerchantKey = true;
      addFloatingText("¡Has obtenido una llave!", player.x, player.y - 35, "#f1c40f");
      playKeyChime();
    }
  }

  // Update floating texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    let ft = floatingTexts[i];
    ft.x += ft.vx;
    ft.y += ft.vy;
    ft.alpha -= deltaTime / 1000;
    if (ft.alpha <= 0) {
      floatingTexts.splice(i, 1);
    }
  }

  // Update safe room NPCs dialogs and timers
  updateSafeRoomNPCs(deltaTime);
}

function draw() {
  // Clear screen
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (gameState !== "PLAYING") return;

  ctx.save();

  dungeon.draw(ctx, camera);

  for (let e of enemies) {
    e.draw(ctx, camera);
  }

  for (let ep of enemyProjectiles) {
    ctx.fillStyle = ep.color;
    ctx.beginPath();
    ctx.arc(ep.x - camera.x, ep.y - camera.y, ep.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw items on ground
  for (let it of droppedItems) {
    ctx.fillStyle = it.color;
    ctx.beginPath();
    if (it.type === "gold_chest") {
      let rx = it.x - camera.x;
      let ry = it.y - camera.y;
      ctx.fillStyle = "#d35400"; // Wood brown
      ctx.fillRect(rx - 12, ry - 10, 24, 20);
      ctx.fillStyle = "#f1c40f"; // Gold details
      ctx.fillRect(rx - 12, ry - 10, 24, 4); // lid top
      ctx.fillRect(rx - 2, ry - 2, 4, 6);   // lock
      ctx.strokeStyle = "#7f8c8d";
      ctx.lineWidth = 1;
      ctx.strokeRect(rx - 12, ry - 10, 24, 20);
    } else {
      let isEquip = it.slot ||
                   (it.type === "weapon" || it.type === "rare_weapon" || it.type === "super_rare_weapon" || it.type === "STAFF_BLUE" || it.type === "GREATSWORD_FROST" || it.type.startsWith("eq_"));
      
      if (isEquip) {
        let rx = it.x - camera.x;
        let ry = it.y - camera.y;
        ctx.fillStyle = it.color || "#95a5a6";
        ctx.fillRect(rx - it.radius, ry - it.radius, it.radius * 2, it.radius * 2);
        
        ctx.strokeStyle = (it.type === "super_rare_weapon" || (it.name && it.name.includes("Legendario"))) ? "#f1c40f" : 
                          (it.type === "rare_weapon" || (it.name && it.name.includes("Raro"))) ? "#9b59b6" : "#fff";
        ctx.lineWidth = 2;
        ctx.strokeRect(rx - it.radius, ry - it.radius, it.radius * 2, it.radius * 2);
        ctx.lineWidth = 1;
        
        // Draw icon centered if available
        if (it.icon) {
          ctx.fillStyle = "#fff";
          ctx.font = `${Math.floor(it.radius * 1.3)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(it.icon, rx, ry);
        }
      } else {
        let rx = it.x - camera.x;
        let ry = it.y - camera.y;
        ctx.arc(rx, ry, it.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.stroke();

        if (it.icon) {
          ctx.fillStyle = "#fff";
          ctx.font = `${Math.floor(it.radius * 1.3)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(it.icon, rx, ry);
        }
      }
    }
  }

  // Draw Merchant NPC
  if (merchantNPC) {
    let mx = merchantNPC.x - camera.x;
    let my = merchantNPC.y - camera.y;
    ctx.fillStyle = "#8e44ad";
    ctx.fillRect(mx - merchantNPC.width / 2, my - merchantNPC.height / 2, merchantNPC.width, merchantNPC.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧙‍♂️', mx, my);

    // Draw wood counter table in front of merchant
    ctx.fillStyle = "#8b5a2b"; // wood brown
    ctx.fillRect(mx - 24, my + 14, 48, 12);
    ctx.strokeStyle = "#5c3d1d";
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - 24, my + 14, 48, 12);

    // Draw small green and red potion bottle blocks on counter
    ctx.fillStyle = "#e74c3c"; // red potion
    ctx.fillRect(mx - 15, my + 8, 4, 6);
    ctx.fillStyle = "#2ecc71"; // green potion
    ctx.fillRect(mx - 8, my + 8, 4, 6);
    ctx.fillStyle = "#3498db"; // blue potion
    ctx.fillRect(mx + 6, my + 8, 4, 6);
    // Draw caps/corks
    ctx.fillStyle = "#d35400";
    ctx.fillRect(mx - 14, my + 6, 2, 2);
    ctx.fillRect(mx - 7, my + 6, 2, 2);
    ctx.fillRect(mx + 7, my + 6, 2, 2);
  }

  // Draw safe room NPCs
  drawSafeRoomNPCs(ctx, camera);

  player.draw(ctx, camera);

  // Draw Interaction Prompt above player's head
  if (currentInteractable && player) {
    let px = player.x - camera.x;
    let py = player.y - camera.y - player.height - 10;
    
    let text = "Presiona E para interactuar";
    let borderColor = '#f1c40f';
    let textColor = '#fff';
    
    if (currentInteractable.type === 'door') {
      text = hasMerchantKey ? "Presiona E para abrir con Llave" : "Puerta Cerrada (Derrota enemigos)";
    } else if (currentInteractable.type === 'merchant') {
      text = "Presiona E para hablar";
    } else if (currentInteractable.type === 'npc') {
      text = "Presiona E para hablar";
    } else if (currentInteractable.type === 'chest') {
      let isLocked = false;
      let room = getRoomAt(currentInteractable.x, currentInteractable.y);
      if (room && room.type === 'special') {
        let hasEnemies = enemies.some(enemy => {
          let rx1 = room.x * dungeon.tileSize;
          let rx2 = (room.x + room.w) * dungeon.tileSize;
          let ry1 = room.y * dungeon.tileSize;
          let ry2 = (room.y + room.h) * dungeon.tileSize;
          return enemy.x >= rx1 && enemy.x < rx2 && enemy.y >= ry1 && enemy.y < ry2;
        });
        if (hasEnemies) isLocked = true;
      }
      if (isLocked) {
        text = "Cofre Bloqueado (Derrota enemigos en la sala)";
        borderColor = '#e74c3c';
        textColor = '#ff6b6b';
      } else {
        text = "Presiona E para abrir Cofre Dorado";
      }
    } else if (currentInteractable.type === 'exit_door') {
      text = dungeon.doorOpen ? `Presiona E para subir al piso ${floor + 1}` : "Puerta Cerrada (Derrota enemigos)";
    } else if (currentInteractable.type === 'enter_door') {
      text = `Presiona E para bajar al piso ${floor - 1}`;
    }
    
    ctx.font = '11px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let textWidth = ctx.measureText(text).width;
    let paddingX = 8;
    let paddingY = 4;
    let boxW = textWidth + paddingX * 2;
    let boxH = 18;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.fillRect(px - boxW / 2, py - boxH / 2, boxW, boxH);
    ctx.strokeRect(px - boxW / 2, py - boxH / 2, boxW, boxH);
    
    ctx.fillStyle = textColor;
    ctx.fillText(text, px, py);
  }

  // Draw floating texts
  ctx.save();
  ctx.font = "bold 14px 'Courier New', Courier, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let ft of floatingTexts) {
    ctx.fillStyle = ft.color || "#f1c40f";
    ctx.globalAlpha = Math.max(0, Math.min(1, ft.alpha));
    ctx.fillText(ft.text, ft.x - camera.x, ft.y - camera.y);
  }
  ctx.restore();

  // If in safe room, draw warm ambient lighting overlay
  let isSafeRoomFloor = typeof floor === 'string' && floor.endsWith('.1');
  if (isSafeRoomFloor && player) {
    ctx.save();
    let px = player.x - camera.x;
    let py = player.y - camera.y;
    let glowGrad = ctx.createRadialGradient(
      px, py, 50,
      px, py, Math.max(canvas.width, canvas.height)
    );
    glowGrad.addColorStop(0, 'rgba(255, 200, 100, 0.06)'); // warm center
    glowGrad.addColorStop(0.5, 'rgba(230, 120, 40, 0.08)'); // warmer mid
    glowGrad.addColorStop(1, 'rgba(100, 30, 10, 0.15)'); // dark warm vignette edges
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // Draw Boss HUD if a boss is active
  for (let e of enemies) {
    if (e instanceof Boss && typeof e.drawHUD === 'function') {
      e.drawHUD(ctx);
      break;
    }
  }

  ctx.restore();
}

function gameLoop(timestamp) {
  if (isPortrait) {
    // Landscape warning active, pause gameplay updates and draw calls
    lastTime = timestamp;
    requestAnimationFrame(gameLoop);
    return;
  }

  let deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  update(deltaTime);
  draw();

  if (gameState === "PLAYING") {
    requestAnimationFrame(gameLoop);
  } else {
    isLoopRunning = false;
  }
}

function startGameLoop() {
  if (!isLoopRunning) {
    isLoopRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }
}

function gameOver() {
  if (player && player.reserveHearts && player.reserveHearts.length > 0) {
    player.reserveHearts.pop();
    player.hp = 100;
    player.immunityTimer = 120; // 2 seconds of immunity
    console.log("¡Resucitaste usando un Corazón de Reserva! Corazones restantes: " + player.reserveHearts.length);
    return;
  }
  setGameState("GAMEOVER");
  updateMobileControlsVisibility();
  if (gameUi) gameUi.classList.add("hidden");
  if (canvas) canvas.classList.add("hidden");
  if (gameOverScreen) {
    gameOverScreen.classList.remove("hidden");
    const btn = document.getElementById("restart-btn");
    if (btn) {
      btn.innerText = `Reencarnar (Piso ${floor})`;
    }
  }
}

// Inventory Logic
const backpackBtn = document.getElementById("backpack-btn");
if (backpackBtn) {
  backpackBtn.addEventListener("click", () => {
    const modal = document.getElementById("inventory-modal");
    if (modal) {
      modal.classList.remove("hidden");
      
      const tabObjects = document.getElementById("inv-tab-objects");
      const tabMaterials = document.getElementById("inv-tab-materials");
      const backpackTab = document.getElementById("inventory-backpack-tab");
      const materialsTab = document.getElementById("inventory-materials-tab");
      if (tabObjects && tabMaterials && backpackTab && materialsTab) {
        tabObjects.classList.add("active");
        tabObjects.style.background = "#8e44ad";
        tabObjects.style.color = "white";
        
        tabMaterials.classList.remove("active");
        tabMaterials.style.background = "rgba(255, 255, 255, 0.08)";
        tabMaterials.style.color = "#ccc";
        
        backpackTab.classList.remove("hidden");
        materialsTab.classList.add("hidden");
      }
      
      updateInventoryUI();
    }
  });
}

function closeInventory() {
  const modal = document.getElementById("inventory-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
  hideTooltip();
  
  // Clear inventory slots and remove DOM listeners/references to avoid memory leaks
  const bpGrid = document.getElementById("backpack-grid");
  if (bpGrid) {
    bpGrid.innerHTML = "";
  }

  const mGrid = document.getElementById("materials-grid");
  if (mGrid) {
    mGrid.innerHTML = "";
  }
  
  const eqSlots = ["head", "chest", "legs", "gloves", "ring", "ring2", "pendant", "pendant2", "weapon"];
  eqSlots.forEach((slot) => {
    const el = document.getElementById("eq-" + slot);
    if (el) {
      el.onmouseenter = null;
      el.onmousemove = null;
      el.onmouseleave = null;
      el.ontouchstart = null;
      el.ontouchend = null;
      el.ontouchcancel = null;
      el.draggable = false;
      el.ondragstart = null;
      el.ondragend = null;
    }
  });

  if (canvas) canvas.focus();
}

const closeInventoryBtn = document.getElementById("close-inventory");
if (closeInventoryBtn) {
  closeInventoryBtn.addEventListener("click", () => {
    closeInventory();
  });
}

function updateInventoryUI() {
  if (!player) return;

  const bpGrid = document.getElementById("backpack-grid");
  if (bpGrid) {
    bpGrid.innerHTML = "";

    // 15 slots for the backpack
    for (let i = 0; i < 15; i++) {
      let slot = document.createElement("div");
      slot.className = "inv-slot";
      slot.dataset.index = i;

      // Drag and drop target events for all slots (filled or empty)
      slot.ondragover = handleDragOver;
      slot.ondrop = (e) => handleDrop(e, "backpack", i);

      if (i < player.inventory.length) {
        let item = player.inventory[i];
        slot.style.backgroundColor = item.color;
        
        let icon = item.icon;
        if (!icon) {
          if (item.type === "red_potion") icon = "🔴";
          else if (item.type === "blue_potion") icon = "🔵";
          else if (item.type === "weapon") icon = "⚔️";
          else if (item.type === "rare_weapon") icon = "🔮";
          else if (item.type === "super_rare_weapon") icon = "👑";
          else if (item.type === "heart" || item.type === "reserve_heart") icon = "💖";
          else if (item.type === "upgrade_scroll") icon = "📜";
          else if (item.type === "armor_scroll") icon = "🛡️";
          else icon = "📦";
        }
        slot.innerHTML = icon;

        // Custom Tooltips mouse/touch events
        slot.onmouseenter = (e) => showTooltip(item, e);
        slot.onmousemove = positionTooltip;
        slot.onmouseleave = hideTooltip;
        slot.ontouchstart = (e) => { showTooltip(item, e); };
        slot.ontouchend = hideTooltip;
        slot.ontouchcancel = hideTooltip;

        // Drag and drop source events
        slot.draggable = true;
        slot.ondragstart = (e) => handleDragStart(e, "backpack", i);
        slot.ondragend = handleDragEnd;

        slot.onclick = (e) => {
          if (e && e.shiftKey) {
            dropItem(i);
          } else {
            useItem(i);
          }
        };
      } else {
        slot.draggable = false;
        slot.ondragstart = null;
        slot.ondragend = null;
        slot.onmouseenter = null;
        slot.onmousemove = null;
        slot.onmouseleave = null;
        slot.ontouchstart = null;
        slot.ontouchend = null;
        slot.ontouchcancel = null;
        slot.onclick = null;
      }
      bpGrid.appendChild(slot);
    }
  }

  // Update structured equipment slots
  const eqSlots = ["head", "chest", "legs", "gloves", "ring", "ring2", "pendant", "pendant2", "weapon"];
  eqSlots.forEach((slot) => {
    const el = document.getElementById("eq-" + slot);
    if (el) {
      el.removeAttribute("title"); // prevent default browser tooltip
      el.ondragover = handleDragOver;
      el.ondrop = (e) => handleDrop(e, "equipped", slot);

      const eqItem = player.equipment[slot];
      if (eqItem) {
        el.style.backgroundColor = eqItem.color || "#34495e";
        el.style.borderColor = eqItem.color || "#7f8c8d";
        
        let icon = eqItem.icon;
        if (!icon) {
          if (eqItem.type === "red_potion") icon = "🔴";
          else if (eqItem.type === "blue_potion") icon = "🔵";
          else if (eqItem.type === "weapon" || eqItem.type === "greatsword" || eqItem.type === "GREATSWORD_FROST") icon = "⚔️";
          else if (eqItem.type === "rare_weapon" || eqItem.type === "STAFF_BLUE") icon = "🔮";
          else if (eqItem.type === "super_rare_weapon") icon = "👑";
          else if (eqItem.type === "heart" || eqItem.type === "reserve_heart") icon = "💖";
          else icon = "🛡️";
        }
        el.innerHTML = icon;

        let rarityKey = eqItem.rarity || "common";
        if (!eqItem.rarity) {
          if (eqItem.color === "#f1c40f") rarityKey = "legendary";
          else if (eqItem.color === "#e67e22") rarityKey = "epic";
          else if (eqItem.color === "#9b59b6") rarityKey = "very_rare";
          else if (eqItem.color === "#3498db") rarityKey = "rare";
        }
        el.className = `inv-slot eq-slot equipped rarity-${rarityKey}` + (slot === "weapon" ? " weapon-slot" : "");

        // Custom Tooltips mouse/touch events
        el.onmouseenter = (e) => showTooltip(eqItem, e);
        el.onmousemove = positionTooltip;
        el.onmouseleave = hideTooltip;
        el.ontouchstart = (e) => { showTooltip(eqItem, e); };
        el.ontouchend = hideTooltip;
        el.ontouchcancel = hideTooltip;

        // Drag and drop source events
        el.draggable = true;
        el.ondragstart = (e) => handleDragStart(e, "equipped", slot);
        el.ondragend = handleDragEnd;
      } else {
        el.style.backgroundColor = "";
        el.style.borderColor = "";
        
        let defaultEmoji = "";
        switch (slot) {
          case "head": defaultEmoji = "🪖"; break;
          case "chest": defaultEmoji = "👕"; break;
          case "legs": defaultEmoji = "👖"; break;
          case "gloves": defaultEmoji = "🧤"; break;
          case "ring": defaultEmoji = "💍"; break;
          case "ring2": defaultEmoji = "💍"; break;
          case "pendant": defaultEmoji = "📿"; break;
          case "pendant2": defaultEmoji = "📿"; break;
          case "weapon": defaultEmoji = player.charClass === "warrior" ? "⚔️" : "🔮"; break;
        }
        el.innerHTML = defaultEmoji;
        el.className = "inv-slot eq-slot" + (slot === "weapon" ? " weapon-slot" : "");

        el.draggable = false;
        el.ondragstart = null;
        el.ondragend = null;
        el.onmouseenter = null;
        el.onmousemove = null;
        el.onmouseleave = null;
        el.ontouchstart = null;
        el.ontouchend = null;
        el.ontouchcancel = null;
      }
    }
  });

  // Bind drop zone event listeners
  const dropZone = document.getElementById("inv-drop-zone");
  if (dropZone) {
    dropZone.ondragover = (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    };
    dropZone.ondragleave = () => {
      dropZone.classList.remove("dragover");
    };
    dropZone.ondrop = (e) => {
      dropZone.classList.remove("dragover");
      handleDrop(e, "drop_zone", null);
    };
  }

  updateMaterialsUI();
}

function updateMaterialsUI() {
  if (!player) return;

  const mGrid = document.getElementById("materials-grid");
  if (!mGrid) return;
  mGrid.innerHTML = "";

  const materialTypes = [
    { type: "material_molibdeno", name: "Molibdeno", icon: "⚙️", color: "#7f8c8d", desc: "Material de crafting para forja y mejoras.", rarity: "common" },
    { type: "material_niquel", name: "Níquel", icon: "🔗", color: "#bdc3c7", desc: "Material de crafting para forja y mejoras.", rarity: "common" },
    { type: "material_hematita", name: "Hematita", icon: "🪨", color: "#c0392b", desc: "Material de crafting para forja y mejoras.", rarity: "common" },
    { type: "material_carbon", name: "Carbón", icon: "🌑", color: "#2c3e50", desc: "Material de crafting para forja y mejoras.", rarity: "common" },
    { type: "material_carbono", name: "Carbono", icon: "💎", color: "#3498db", desc: "Material de crafting para forja y mejoras.", rarity: "rare" }
  ];

  player.materials = player.materials || {};

  materialTypes.forEach((mat) => {
    let qty = player.materials[mat.type] || 0;
    
    let slot = document.createElement("div");
    slot.className = "inv-slot";
    slot.style.backgroundColor = mat.color;
    
    slot.innerHTML = mat.icon;

    if (qty > 0) {
      slot.style.opacity = "1";
      let badge = document.createElement("span");
      badge.className = "item-count";
      badge.innerText = "x" + qty;
      slot.appendChild(badge);
    } else {
      slot.style.opacity = "0.35";
      let badge = document.createElement("span");
      badge.className = "item-count";
      badge.style.background = "#7f8c8d";
      badge.innerText = "x0";
      slot.appendChild(badge);
    }

    let matItem = {
      type: mat.type,
      name: mat.name,
      icon: mat.icon,
      color: mat.color,
      desc: mat.desc,
      quantity: qty,
      rarity: mat.rarity
    };

    slot.onmouseenter = (e) => showTooltip(matItem, e);
    slot.onmousemove = positionTooltip;
    slot.onmouseleave = hideTooltip;
    slot.ontouchstart = (e) => { showTooltip(matItem, e); };
    slot.ontouchend = hideTooltip;
    slot.ontouchcancel = hideTooltip;

    slot.draggable = false;
    
    mGrid.appendChild(slot);
  });
}

function setupInventoryTabs() {
  const tabObjects = document.getElementById("inv-tab-objects");
  const tabMaterials = document.getElementById("inv-tab-materials");
  const backpackTab = document.getElementById("inventory-backpack-tab");
  const materialsTab = document.getElementById("inventory-materials-tab");

  if (tabObjects && tabMaterials && backpackTab && materialsTab) {
    tabObjects.onclick = () => {
      tabObjects.classList.add("active");
      tabObjects.style.background = "#8e44ad";
      tabObjects.style.color = "white";
      
      tabMaterials.classList.remove("active");
      tabMaterials.style.background = "rgba(255, 255, 255, 0.08)";
      tabMaterials.style.color = "#ccc";
      
      backpackTab.classList.remove("hidden");
      materialsTab.classList.add("hidden");
      updateInventoryUI();
    };

    tabMaterials.onclick = () => {
      tabMaterials.classList.add("active");
      tabMaterials.style.background = "#8e44ad";
      tabMaterials.style.color = "white";
      
      tabObjects.classList.remove("active");
      tabObjects.style.background = "rgba(255, 255, 255, 0.08)";
      tabObjects.style.color = "#ccc";
      
      backpackTab.classList.add("hidden");
      materialsTab.classList.remove("hidden");
      updateMaterialsUI();
    };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupInventoryTabs();
});
setupInventoryTabs();

function useItem(index) {
  if (!player || index >= player.inventory.length) return;

  let item = player.inventory[index];
  let canUse = true;

  // Determine if it is equippable and find its slot
  let slot = item.slot;
  if (!slot) {
    if (item.type === "weapon" || item.type === "rare_weapon" || item.type === "super_rare_weapon" || item.type === "STAFF_BLUE" || item.type === "GREATSWORD_FROST") {
      slot = "weapon";
    } else if (item.type.startsWith("eq_")) {
      slot = item.type.replace("eq_", "");
    }
  }

  if (slot) {
    // Check class weapon compatibility
    if (slot === "weapon") {
      let isMageWeapon = (item.classRestriction === "mage") ||
                         (item.type === "STAFF_BLUE") ||
                         (item.icon === "🔮") ||
                         (item.name && (item.name.includes("Bastón") || item.name.includes("Cetro") || item.name.includes("Báculo")));

      let isWarriorWeapon = (item.classRestriction === "warrior") ||
                           (item.type === "GREATSWORD_FROST") ||
                           (item.icon === "⚔️") ||
                           (item.name && (item.name.includes("Espada") || item.name.includes("Mandoble") || item.name.includes("Filo") || item.name.includes("Arma")));

      if (isMageWeapon && player.charClass !== "mage") {
        console.log("¡Los Guerreros no pueden usar bastones mágicos!");
        addFloatingText("¡Solo para Mago!", player.x, player.y - 20, "#e74c3c");
        return;
      }
      if (isWarriorWeapon && player.charClass !== "warrior") {
        console.log("¡Solo los Guerreros pueden usar espadas!");
        addFloatingText("¡Solo para Guerrero!", player.x, player.y - 20, "#e74c3c");
        return;
      }
    }

    // Equipment swapping logic
    let targetSlot = slot;
    if (slot === "ring") {
      if (!player.equipment.ring) {
        targetSlot = "ring";
      } else if (!player.equipment.ring2) {
        targetSlot = "ring2";
      } else {
        targetSlot = "ring";
      }
    } else if (slot === "pendant") {
      if (!player.equipment.pendant) {
        targetSlot = "pendant";
      } else if (!player.equipment.pendant2) {
        targetSlot = "pendant2";
      } else {
        targetSlot = "pendant";
      }
    }

    let oldItem = player.equipment[targetSlot];
    player.equipment[targetSlot] = item;
    
    if (oldItem) {
      player.inventory[index] = oldItem;
      console.log("Equipaste: " + item.name + ". " + oldItem.name + " regresó a la mochila.");
    } else {
      player.inventory.splice(index, 1);
      console.log("Equipaste: " + item.name);
    }
    
    player.damage = player.getDamage();
    addFloatingText("Equipado: " + item.name, player.x, player.y - 20, "#2ecc71");
    updateInventoryUI();
    saveGame();
    return;
  }

  switch (item.type) {
    case "material_molibdeno":
    case "material_niquel":
    case "material_hematita":
    case "material_carbon":
    case "material_carbono":
      addFloatingText("Material de Crafting", player.x, player.y - 20, "#95a5a6");
      console.log("Los materiales no se consumen directamente.");
      canUse = false;
      break;

    case "red_potion":
      let heal = item.healAmount || 15;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      addFloatingText("+" + heal + " ❤️", player.x, player.y - 20, "#e74c3c");
      console.log("Vida restaurada +" + heal);
      break;

    case "blue_potion":
      let mana = item.manaAmount || 15;
      player.mana = Math.min(player.maxMana, player.mana + mana);
      addFloatingText("+" + mana + " 🔵", player.x, player.y - 20, "#3498db");
      console.log("Maná restaurado +" + mana);
      break;

    case "heart":
    case "heart_plus": 
      let hpBonus = item.hpBonus || 10;
      player.maxHp += hpBonus;
      player.hp += hpBonus;
      addFloatingText("Max HP +" + hpBonus + " 💖", player.x, player.y - 20, "#ff69b4");
      console.log("Vida máxima aumentada +" + hpBonus + "!");
      break;

    case "armor_scroll": 
      player.armor = (player.armor || 0) + (item.armorBonus || 1);
      addFloatingText("Defensa +1 🛡️", player.x, player.y - 20, "#95a5a6");
      console.log("Armadura mejorada. Defensa actual: " + player.armor);
      break;

    case "upgrade_scroll": 
      player.baseDamage += 2;
      player.damage = player.getDamage();
      if (player.weaponLevel !== undefined) player.weaponLevel++;
      addFloatingText("Daño +2 ⚔️", player.x, player.y - 20, "#f39c12");
      console.log("¡Arma afilada! Daño base aumentado.");
      break;

    case "reserve_heart":
      if (player.reserveHearts.length < player.maxReserveSlots) {
        player.reserveHearts.push(100);
        addFloatingText("+1 Corazón Reserva 💖", player.x, player.y - 20, "#e74c3c");
        console.log("Corazón de reserva añadido. Total: " + player.reserveHearts.length);
      } else {
        console.log("Espacios de reserva llenos.");
        canUse = false;
      }
      break;

    default:
      console.log("Este objeto no tiene un uso definido.");
      canUse = false;
      break;
  }

  if (canUse) {
    player.inventory.splice(index, 1);
    updateInventoryUI(); 
    saveGame();
  }
}

function unequipItem(slot) {
  if (!player) return;
  
  let item = player.equipment[slot];
  if (!item) return; // slot is already empty
  
  if (player.inventory.length >= 15) {
    console.log("Mochila llena. No puedes desequipar.");
    addFloatingText("¡Mochila llena!", player.x, player.y - 20, "#e74c3c");
    return;
  }
  
  player.equipment[slot] = null;
  player.inventory.push(item);
  
  player.damage = player.getDamage();
  addFloatingText("Desequipado: " + item.name, player.x, player.y - 20, "#bdc3c7");
  updateInventoryUI();
  saveGame();
}
window.unequipItem = unequipItem;

function spawnDroppedItem(item) {
  if (!player) return;
  let offsetDist = 15;
  let angle = Math.random() * Math.PI * 2;
  let itX = player.x + Math.cos(angle) * offsetDist;
  let itY = player.y + Math.sin(angle) * offsetDist;

  let radius = 9;
  if (item.type === "coin") {
    radius = 5;
  } else if (item.slot === "weapon" || item.type === "weapon" || item.type === "rare_weapon" || item.type === "super_rare_weapon" || item.type === "STAFF_BLUE" || item.type === "GREATSWORD_FROST") {
    radius = item.rarity === "legendary" ? 11 : 10;
  } else if (item.slot === "ring" || item.slot === "pendant" || item.type.startsWith("eq_ring") || item.type.startsWith("eq_pendant")) {
    radius = 8;
  } else if (item.type && item.type.includes("potion")) {
    radius = 6;
  }

  let dropped = {
    x: itX,
    y: itY,
    pickupDelay: 60,
    radius: radius,
    type: item.type,
    slot: item.slot,
    classRestriction: item.classRestriction,
    color: item.color || "#fff",
    name: item.name,
    rarity: item.rarity,
    bonus: item.bonus,
    icon: item.icon,
    desc: item.desc,
    stats: item.stats,
    healAmount: item.healAmount,
    manaAmount: item.manaAmount,
    hpBonus: item.hpBonus,
    armorBonus: item.armorBonus,
    value: item.value
  };

  droppedItems.push(dropped);
}

function dropItem(index) {
  if (!player || index < 0 || index >= player.inventory.length) return;
  let item = player.inventory[index];
  
  player.inventory.splice(index, 1);
  spawnDroppedItem(item);
  
  addFloatingText("Soltado: " + item.name, player.x, player.y - 20, item.color || "#fff");
  updateInventoryUI();
  saveGame();
}
window.dropItem = dropItem;

function updatePowerBarUI() {
  let hudPowerBar = document.getElementById("power-bar");
  if (!hudPowerBar) return;
  hudPowerBar.innerHTML = "";

  for (let i = 0; i < 3; i++) {
    let slot = document.createElement("div");
    slot.className = "power-slot" + (i === player.activePowerIndex ? " active" : "");

    let power = player.powers[i];
    if (power) {
      slot.style.backgroundColor = power.color;

      // Inject icon (emoji)
      let pIcon = getPowerIcon(power);
      if (pIcon) {
        let iconSpan = document.createElement("span");
        iconSpan.className = "power-icon";
        iconSpan.innerText = pIcon;
        slot.appendChild(iconSpan);
      }

      if (power.level > 1) {
        let lvLabel = document.createElement("span");
        lvLabel.className = "power-level";
        lvLabel.innerText = "L" + power.level;
        slot.appendChild(lvLabel);
      }
    }

    let numIndicator = document.createElement("span");
    numIndicator.className = "slot-key";
    numIndicator.innerText = i + 1;
    slot.appendChild(numIndicator);

    hudPowerBar.appendChild(slot);

    // Dynamic styling for mobile buttons
    const mobileBtn = document.getElementById(`btn-p${i+1}`);
    if (mobileBtn) {
      if (player && i < player.powers.length) {
        let p = player.powers[i];
        mobileBtn.style.backgroundColor = p.color;
        let pIcon = getPowerIcon(p);
        mobileBtn.innerText = pIcon || p.name[0]; // Display icon or first letter
        mobileBtn.style.opacity = "1";
        mobileBtn.style.pointerEvents = "auto";
        if (i === player.activePowerIndex) {
          mobileBtn.style.border = "3px solid #f1c40f";
          mobileBtn.style.transform = "scale(1.15)";
        } else {
          mobileBtn.style.border = "2px solid #fff";
          mobileBtn.style.transform = "scale(1)";
        }
      } else {
        mobileBtn.style.opacity = "0.3";
        mobileBtn.style.pointerEvents = "none";
        mobileBtn.innerText = "-";
        mobileBtn.style.border = "2px solid #555";
        mobileBtn.style.transform = "scale(1)";
      }
    }
  }
}

const availableMagePowers = [
  { id: "fire", name: "Fuego", desc: "Mucho daño.", color: "#e74c3c", icon: "🔥" },
  { id: "water", name: "Agua", desc: "Ataque muy rápido.", color: "#3498db", icon: "💧" },
  { id: "earth", name: "Tierra", desc: "Área grande.", color: "#d35400", icon: "🪨" },
  { id: "wind", name: "Viento", desc: "Aura de Inmunidad.", color: "#2ecc71", icon: "🌪️" },
];

const availableWarriorPowers = [
  { id: "double_strike", name: "Doble ataque", desc: "Realiza un doble ataque.", color: "#f39c12", icon: "⚔️" },
  { id: "charge", name: "Embestida", desc: "Te lanzas y aturdes 1.5s.", color: "#3498db", icon: "👊" },
  { id: "knockback", name: "Empujar", desc: "Empuja enemigos haciendo daño.", color: "#27ae60", icon: "🟤" },
  { id: "fury", name: "Furia", desc: "Aumenta daño en 2% permanentemente.", color: "#c0392b", icon: "🩸" }
];

function getPowerIcon(power) {
  if (!power) return "";
  if (power.icon) return power.icon;
  const allPowers = [...availableMagePowers, ...availableWarriorPowers];
  const found = allPowers.find((p) => p.id === power.id || p.name === power.name);
  if (found && found.icon) {
    power.icon = found.icon; // self-healing/migration
    return power.icon;
  }
  return "";
}

let selectedPowerToReplace = null;

function showRewardScreen() {
  setGameState("REWARD");
  updateMobileControlsVisibility();
  rewardScreen.classList.remove("hidden");
  rewardOptions.innerHTML = "";

  const rewardDesc = document.getElementById("reward-desc");
  if (rewardDesc) {
    rewardDesc.innerText = player && player.charClass === "warrior" 
      ? "Elige una nueva habilidad de combate:" 
      : "Elige un nuevo poder elemental:";
  }

  let choices = player && player.charClass === "warrior" ? [...availableWarriorPowers] : [...availableMagePowers];

  choices.forEach((power) => {
    let card = document.createElement("div");
    card.className = "reward-card";
    let pIcon = getPowerIcon(power);
    let displayTitle = pIcon ? `${pIcon} ${power.name}` : power.name;
    card.innerHTML = `
      <h3 style="color:${power.color}">${displayTitle}</h3>
      <p>${power.desc}</p>
    `;
    card.onclick = () => selectPower(power);
    rewardOptions.appendChild(card);
  });
  document.getElementById("slot-selection").classList.add("hidden");
}

function selectPower(power) {
  let existingPowerIndex = player.powers.findIndex((p) => p.id === power.id);
  if (existingPowerIndex !== -1) {
    player.powers[existingPowerIndex].level = (player.powers[existingPowerIndex].level || 1) + 1;
    finishReward();
  } else if (player.powers.length < 3) {
    power.level = 1;
    player.powers.push({...power});
    player.activePowerIndex = player.powers.length - 1;
    finishReward();
  } else {
    const slotSelection = document.getElementById("slot-selection");
    if (slotSelection) {
      const pText = slotSelection.querySelector("p");
      if (pText) {
        pText.innerText = player && player.charClass === "warrior" 
          ? "Tu barra está llena. Elige qué habilidad quieres reemplazar:" 
          : "Tu barra está llena. Elige qué poder quieres reemplazar:";
      }
      slotSelection.classList.remove("hidden");
    }
    selectedPowerToReplace = power;
  }
}

function replacePower(slotIndex) {
  if (selectedPowerToReplace) {
    let newPower = {...selectedPowerToReplace, level: 1};
    player.powers[slotIndex] = newPower;
    player.activePowerIndex = slotIndex;
    document.getElementById("slot-selection").classList.add("hidden");
    selectedPowerToReplace = null;
    finishReward();
  }
}

function finishReward() {
  if (gameState === "PLAYING") return;
  rewardScreen.classList.add("hidden");
  const rewardDesc = document.getElementById("reward-desc");
  if (rewardDesc) {
    rewardDesc.innerText = player && player.charClass === "warrior" 
      ? "Elige una nueva habilidad de combate:" 
      : "Elige un nuevo poder elemental:";
  }
  
  if (floor % 5 === 0) {
    floor = floor + ".1";
  } else {
    floor++;
  }
  
  let parsedMaxFloor = typeof maxFloor === 'string' ? parseFloat(maxFloor) : maxFloor;
  let parsedFloor = typeof floor === 'string' ? parseFloat(floor) : floor;
  maxFloor = Math.max(parsedMaxFloor, parsedFloor);

  initLevel(player.name, player.charClass, player.gender, false);
  saveGame();
  setGameState("PLAYING");
  updateMobileControlsVisibility();
  startGameLoop();
}

// Initial Saved Game Check
const saved = localStorage.getItem(`isekaiSave_1`);
if (saved && continueBtn) {
  continueBtn.classList.remove("hidden");
} else if (continueBtn) {
  continueBtn.classList.add("hidden");
}

// Mobile controls activation and setup
function updateMobileControlsVisibility() {
  const mobileControls = document.getElementById("mobile-controls");
  if (!mobileControls) return;
  if (gameState === "PLAYING") {
    mobileControls.classList.remove("hidden");
  } else {
    mobileControls.classList.add("hidden");
  }
}

// Set up virtual controls
const joystickZone = document.getElementById("joystick-zone");
const joystickBase = document.getElementById("joystick-base");
const joystickKnob = document.getElementById("joystick-knob");

if (joystickZone && joystickBase && joystickKnob) {
  joystickZone.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (window.touchJoystick.active) return;

    const t = e.changedTouches[0];
    window.touchJoystick.active = true;
    window.touchJoystick.identifier = t.identifier;

    // Get Fixed Base Center
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let offsetX = t.clientX - centerX;
    let offsetY = t.clientY - centerY;

    const maxRadius = rect.width / 2 || 50;
    const dist = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

    if (dist > maxRadius) {
      offsetX = (offsetX / dist) * maxRadius;
      offsetY = (offsetY / dist) * maxRadius;
    }

    joystickKnob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
    window.touchJoystick.dx = offsetX / maxRadius;
    window.touchJoystick.dy = offsetY / maxRadius;
  });

  window.addEventListener("touchmove", (e) => {
    if (!window.touchJoystick.active) return;

    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      if (t.identifier === window.touchJoystick.identifier) {
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let offsetX = t.clientX - centerX;
        let offsetY = t.clientY - centerY;

        const maxRadius = rect.width / 2 || 50;
        const dist = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

        if (dist > maxRadius) {
          offsetX = (offsetX / dist) * maxRadius;
          offsetY = (offsetY / dist) * maxRadius;
        }

        joystickKnob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
        window.touchJoystick.dx = offsetX / maxRadius;
        window.touchJoystick.dy = offsetY / maxRadius;
        break;
      }
    }
  });

  const endJoystick = (e) => {
    if (!window.touchJoystick.active) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === window.touchJoystick.identifier) {
        window.touchJoystick.active = false;
        window.touchJoystick.identifier = null;
        window.touchJoystick.dx = 0;
        window.touchJoystick.dy = 0;

        joystickKnob.style.transform = "translate(-50%, -50%)";
        break;
      }
    }
  };

  window.addEventListener("touchend", endJoystick);
  window.addEventListener("touchcancel", endJoystick);
}

// Attack Button
const btnAttack = document.getElementById("btn-attack");
if (btnAttack) {
  btnAttack.addEventListener("touchstart", (e) => {
    e.preventDefault();
    mouse.clicked = true;
    mouse.isVirtualButton = true;
    window.touchAttackHeld = true;
    btnAttack.classList.add("pressed");
  });
  btnAttack.addEventListener("touchend", (e) => {
    e.preventDefault();
    window.touchAttackHeld = false;
    btnAttack.classList.remove("pressed");
  });
  btnAttack.addEventListener("touchcancel", (e) => {
    e.preventDefault();
    window.touchAttackHeld = false;
    btnAttack.classList.remove("pressed");
  });
}

// Power Select Buttons
const powersMap = {
  'btn-p1': '1',
  'btn-p2': '2',
  'btn-p3': '3'
};
for (let id in powersMap) {
  const btn = document.getElementById(id);
  const key = powersMap[id];
  if (btn) {
    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      keys[key] = true;
      btn.classList.add("pressed");
    });
    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      keys[key] = false;
      btn.classList.remove("pressed");
    });
    btn.addEventListener("touchcancel", (e) => {
      e.preventDefault();
      keys[key] = false;
      btn.classList.remove("pressed");
    });
  }
}

// ==========================================================================
// INTERACTION & SHOP SYSTEM IMPLEMENTATION
// ==========================================================================

function handleInteraction() {
  if (!player || !currentInteractable) return;

  if (currentInteractable.type === 'door') {
    if (hasMerchantKey) {
      dungeon.merchantDoorOpen = true;
      hasMerchantKey = false;
      addFloatingText("¡Puerta Abierta!", currentInteractable.x, currentInteractable.y - 20, "#2ecc71");
      playDoorOpenSound();
      console.log("¡Puerta del comerciante abierta con la llave!");
    } else {
      addFloatingText("¡Necesitas la Llave del Piso!", currentInteractable.x, currentInteractable.y - 20, "#e74c3c");
      console.log("¡Necesitas la Llave del Piso!");
    }
  } else if (currentInteractable.type === 'merchant') {
    openShopModal();
  } else if (currentInteractable.type === 'npc') {
    interactWithNPC(currentInteractable.npc);
  } else if (currentInteractable.type === 'chest') {
    let chest = currentInteractable.target;
    let room = getRoomAt(chest.x, chest.y);
    let isLocked = false;
    if (room && room.type === 'special') {
      let hasEnemies = enemies.some(enemy => {
        let rx1 = room.x * dungeon.tileSize;
        let rx2 = (room.x + room.w) * dungeon.tileSize;
        let ry1 = room.y * dungeon.tileSize;
        let ry2 = (room.y + room.h) * dungeon.tileSize;
        return enemy.x >= rx1 && enemy.x < rx2 && enemy.y >= ry1 && enemy.y < ry2;
      });
      if (hasEnemies) isLocked = true;
    }
    if (isLocked) {
      addFloatingText("¡Derrota a los guardianes primero!", chest.x, chest.y - 20, "#e74c3c");
      console.log("¡Cofre bloqueado por enemigos!");
    } else {
      openGoldChest(chest);
    }
  } else if (currentInteractable.type === 'exit_door') {
    if (dungeon && dungeon.doorOpen) {
      advanceFloor();
    } else {
      addFloatingText("¡Derrota a todos los enemigos primero!", player.x, player.y - 20, "#e74c3c");
    }
  } else if (currentInteractable.type === 'enter_door') {
    let canGoDown = false;
    if (typeof floor === 'string' && floor.endsWith('.1')) {
      canGoDown = true;
    } else if (floor > 1) {
      canGoDown = true;
    }
    
    if (canGoDown) {
      if (typeof floor === 'string' && floor.endsWith('.1')) {
        floor = Math.floor(parseFloat(floor));
      } else {
        let prevFloor = floor - 1;
        if (prevFloor % 5 === 0 && prevFloor > 0) {
          floor = prevFloor + ".1";
        } else {
          floor = prevFloor;
        }
      }
      initLevel(player.name, player.charClass, player.gender, false);
      saveGame();
      console.log(`¡Retrocediendo al Piso ${floor}!`);
      addFloatingText(`Piso ${floor}`, player.x, player.y - 20, "#9b59b6");
    }
  }
}

function advanceFloor() {
  let nextFloor;
  if (typeof floor === 'string' && floor.endsWith('.1')) {
    nextFloor = Math.floor(parseFloat(floor)) + 1;
  } else {
    nextFloor = floor + 1;
  }

  let parsedMaxFloor = typeof maxFloor === 'string' ? parseFloat(maxFloor) : maxFloor;
  let parsedNextFloor = typeof nextFloor === 'string' ? parseFloat(nextFloor) : nextFloor;

  if (parsedNextFloor <= parsedMaxFloor) {
    floor = nextFloor;
    initLevel(player.name, player.charClass, player.gender, false);
    saveGame();
    addFloatingText(`Piso ${floor}`, player.x, player.y - 20, "#2ecc71");
    console.log(`¡Avanzando al Piso ${floor} (Bypass de Recompensa)!`);
  } else {
    // If we completed a boss floor (multiple of 5), show reward screen
    if (floor % 5 === 0) {
      saveGame();
      showRewardScreen();
    } else {
      floor = nextFloor;
      maxFloor = Math.max(parsedMaxFloor, parsedNextFloor);
      initLevel(player.name, player.charClass, player.gender, false);
      saveGame();
      addFloatingText(`Piso ${floor}`, player.x, player.y - 20, "#2ecc71");
      console.log(`¡Avanzando al Piso ${floor}!`);
    }
  }
}

function openGoldChest(chest) {
  if (chest.opened) return;
  chest.opened = true;
  
  let chestDrops = rollChestDrop(floor, chest.x, chest.y, player.charClass);
  chestDrops.forEach(drop => droppedItems.push(drop));

  // Remove the chest from dropped items list
  let idx = droppedItems.indexOf(chest);
  if (idx !== -1) {
    droppedItems.splice(idx, 1);
  }
}

// Shop Modal Functions
function openShopModal() {
  const modal = document.getElementById("shop-modal");
  if (modal) {
    modal.classList.remove("hidden");
    updateShopUI();
  }
}

function closeShopModal() {
  const modal = document.getElementById("shop-modal");
  if (modal) {
    modal.classList.add("hidden");
    if (canvas) canvas.focus();
  }
}

// Shop items and item sell value functions are now imported from js/economy.js

function updateShopUI() {
  if (!player) return;
  
  const coinsText = document.getElementById("shop-player-coins");
  if (coinsText) {
    coinsText.innerText = player.coins || 0;
  }
  
  const buyList = document.getElementById("shop-buy-list");
  if (buyList) {
    buyList.innerHTML = "";
    const items = getShopItems();
    
    items.forEach((item, index) => {
      let div = document.createElement("div");
      div.className = "shop-item";
      
      let rarityClass = "rarity-common";
      if (item.type === "rare_weapon") rarityClass = "rarity-rare";
      else if (item.type === "super_rare_weapon") rarityClass = "rarity-legendary";
      
      div.innerHTML = `
        <div class="shop-item-info">
          <div class="shop-item-icon">${item.icon}</div>
          <div class="shop-item-details">
            <span class="shop-item-name ${rarityClass}">${item.name}</span>
            <span class="shop-item-desc">${item.desc}</span>
          </div>
        </div>
        <div class="shop-item-action">
          <span class="shop-item-price">🪙 ${item.price}</span>
          <button type="button" class="shop-item-btn" onclick="buyShopItem(${index})">Comprar</button>
        </div>
      `;
      buyList.appendChild(div);
    });
  }
  
  const sellList = document.getElementById("shop-sell-list");
  if (sellList) {
    sellList.innerHTML = "";
    if (player.inventory.length === 0) {
      sellList.innerHTML = `<div style="text-align: center; color: #7f8c8d; margin-top: 20px;">Tu mochila está vacía.</div>`;
    } else {
      player.inventory.forEach((item, index) => {
        let div = document.createElement("div");
        div.className = "shop-item";
        
        let sellPrice = getItemSellValue(item);
        let iconStr = item.icon || "📦";
        if (!item.icon) {
          if (item.type === "red_potion") iconStr = "🔴";
          else if (item.type === "blue_potion") iconStr = "🔵";
          else if (item.type === "weapon") iconStr = "⚔️";
          else if (item.type === "rare_weapon") iconStr = "🔮";
          else if (item.type === "super_rare_weapon") iconStr = "👑";
          else if (item.type === "heart" || item.type === "reserve_heart") iconStr = "💖";
          else if (item.type === "upgrade_scroll") iconStr = "📜";
          else if (item.type === "armor_scroll") iconStr = "🛡️";
        }
        
        let rarityClass = "rarity-common";
        if (item.rarity) {
          rarityClass = "rarity-" + item.rarity;
        } else if (item.type === "rare_weapon") {
          rarityClass = "rarity-rare";
        } else if (item.type === "super_rare_weapon") {
          rarityClass = "rarity-legendary";
        }
        
        div.innerHTML = `
          <div class="shop-item-info">
            <div class="shop-item-icon">${iconStr}</div>
            <div class="shop-item-details">
              <span class="shop-item-name ${rarityClass}">${item.name}</span>
              <span class="shop-item-desc">${item.bonus ? '+' + Math.round(item.bonus*100) + '% dmg' : (item.desc || 'Objeto de aventura')}</span>
            </div>
          </div>
          <div class="shop-item-action">
            <span class="shop-item-price">🪙 ${sellPrice}</span>
            <button type="button" class="shop-item-btn" style="background: #c0392b;" onclick="sellShopItem(${index})">Vender</button>
          </div>
        `;
        sellList.appendChild(div);
      });
    }
  }
}

function buyShopItem(index) {
  if (!player) return;
  const items = getShopItems();
  const item = items[index];
  
  if (player.coins < item.price) {
    console.log("No tienes suficientes monedas.");
    return;
  }
  
  if (player.inventory.length >= 15) {
    console.log("Mochila llena. Vende o usa objetos primero.");
    return;
  }
  
  player.coins -= item.price;
  player.inventory.push({
    type: item.type,
    name: item.name,
    rarity: item.rarity,
    color: item.color,
    bonus: item.bonus,
    healAmount: item.healAmount,
    manaAmount: item.manaAmount,
    armorBonus: item.armorBonus,
    slot: item.slot,
    classRestriction: item.classRestriction,
    icon: item.icon,
    desc: item.desc,
    stats: item.stats
  });
  
  const hudCoins = document.getElementById("hud-coins");
  if (hudCoins) hudCoins.innerText = player.coins;
  
  console.log("Compraste: " + item.name);
  updateShopUI();
  updateInventoryUI();
}

function sellShopItem(index) {
  if (!player || index < 0 || index >= player.inventory.length) return;
  
  let item = player.inventory[index];
  let sellPrice = getItemSellValue(item);
  
  player.coins = (player.coins || 0) + sellPrice;
  player.inventory.splice(index, 1);
  
  const hudCoins = document.getElementById("hud-coins");
  if (hudCoins) hudCoins.innerText = player.coins;
  
  console.log("Vendiste: " + item.name + " por " + sellPrice + " monedas.");
  updateShopUI();
  updateInventoryUI();
}

// Bind functions to window object for inline HTML calls
window.buyShopItem = buyShopItem;
window.sellShopItem = sellShopItem;
window.handleInteraction = handleInteraction;

// Set up event listeners for shop modal and tabs
const closeShopBtn = document.getElementById("close-shop");
if (closeShopBtn) {
  closeShopBtn.addEventListener("click", closeShopModal);
}

const tabBuy = document.getElementById("tab-buy");
const tabSell = document.getElementById("tab-sell");
const buyPanel = document.getElementById("buy-panel");
const sellPanel = document.getElementById("sell-panel");

if (tabBuy && tabSell && buyPanel && sellPanel) {
  tabBuy.addEventListener("click", () => {
    tabBuy.classList.add("active");
    tabSell.classList.remove("active");
    buyPanel.classList.remove("hidden");
    sellPanel.classList.add("hidden");
    updateShopUI();
  });
  
  tabSell.addEventListener("click", () => {
    tabSell.classList.add("active");
    tabBuy.classList.remove("active");
    sellPanel.classList.remove("hidden");
    buyPanel.classList.add("hidden");
    updateShopUI();
  });
}

// Set up touch event for mobile interact button
const btnInteract = document.getElementById("btn-interact");
if (btnInteract) {
  btnInteract.addEventListener("touchstart", (e) => {
    e.preventDefault();
    btnInteract.classList.add("pressed");
    handleInteraction();
  });
  btnInteract.addEventListener("touchend", (e) => {
    e.preventDefault();
    btnInteract.classList.remove("pressed");
  });
  btnInteract.addEventListener("touchcancel", (e) => {
    e.preventDefault();
    btnInteract.classList.remove("pressed");
  });
  // Also add click event for hybrid/desktop touch emulation
  btnInteract.addEventListener("click", (e) => {
    e.preventDefault();
    handleInteraction();
  });
}

// Fullscreen mode helpers and orientation lock
function enterFullscreen() {
  const docEl = document.documentElement;
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
      
      // Attempt locking orientation to landscape for mobile
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch((err) => {
          console.log("Orientation lock not supported or failed:", err);
        });
      }
    }
  } catch (err) {
    console.warn("Could not enter fullscreen automatically:", err);
  }
}

function toggleFullscreen() {
  const docEl = document.documentElement;
  if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen();
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    } else if (docEl.mozRequestFullScreen) {
      docEl.mozRequestFullScreen();
    } else if (docEl.msRequestFullscreen) {
      docEl.msRequestFullscreen();
    }
    
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch((err) => {
        console.log("Orientation lock failed/not supported:", err);
      });
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

function onFullscreenChange() {
  const btn = document.getElementById("fullscreen-btn");
  if (!btn) return;
  const isFS = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
  if (isFS) {
    btn.innerHTML = "⛶ Salir Fullscreen";
    btn.classList.add("active");
  } else {
    btn.innerHTML = "⛶ Fullscreen";
    btn.classList.remove("active");
  }
}

// Bind orientation and fullscreen change events
document.addEventListener("fullscreenchange", onFullscreenChange);
document.addEventListener("webkitfullscreenchange", onFullscreenChange);
document.addEventListener("mozfullscreenchange", onFullscreenChange);
document.addEventListener("MSFullscreenChange", onFullscreenChange);

// Set up fullscreen button listener
const fullscreenBtn = document.getElementById("fullscreen-btn");
if (fullscreenBtn) {
  fullscreenBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleFullscreen();
  });
}

// Set up collapsible HUD listener
const hudToggleBtn = document.getElementById("hud-toggle-btn");
const hudEl = document.getElementById("hud");
const expHudEl = document.getElementById("exp-hud");
const charToggleBtn = document.getElementById("character-toggle-btn");

function toggleCharacterPanel() {
  if (!hudEl) return;
  hudEl.classList.toggle("collapsed");
  if (expHudEl) {
    expHudEl.classList.toggle("collapsed");
  }
  if (charToggleBtn) {
    if (hudEl.classList.contains("collapsed")) {
      charToggleBtn.classList.remove("active");
    } else {
      charToggleBtn.classList.add("active");
    }
  }
}

if (hudToggleBtn) {
  hudToggleBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleCharacterPanel();
  });
}

if (charToggleBtn) {
  charToggleBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleCharacterPanel();
    
    // Also blur button so spacebar doesn't trigger it again
    charToggleBtn.blur();
    if (canvas) canvas.focus();
  });
}

// Make sure global bindings are set up for inline event listeners
window.enterFullscreen = enterFullscreen;
window.toggleFullscreen = toggleFullscreen;

// Initialize state classes on startup
setGameState("MENU");

// ==========================================================================
// SAFE ROOM NPC HELPERS
// ==========================================================================

function updateSafeRoomNPCs(deltaTime) {
  if (activeDialogTimer > 0) {
    activeDialogTimer -= deltaTime;
    if (activeDialogTimer <= 0) {
      activeDialogNPC = null;
    }
  }
}

function drawSafeRoomNPCs(ctx, camera) {
  for (let npc of safeRoomNPCs) {
    let rx = npc.x - camera.x;
    let ry = npc.y - camera.y;
    
    // Draw NPC body/emoji
    ctx.save();
    ctx.fillStyle = "rgba(142, 68, 173, 0.4)"; // Translucent purple backing
    ctx.fillRect(rx - npc.width / 2, ry - npc.height / 2, npc.width, npc.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(npc.sprite, rx, ry);
    ctx.restore();
    
    // Draw NPC Name Label underneath
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.font = "bold 11px 'Courier New', Courier, monospace";
    let nameW = ctx.measureText(npc.name).width;
    ctx.fillRect(rx - nameW / 2 - 5, ry + npc.height / 2 + 2, nameW + 10, 16);
    ctx.strokeRect(rx - nameW / 2 - 5, ry + npc.height / 2 + 2, nameW + 10, 16);
    ctx.fillStyle = "#f1c40f"; // Gold text for names
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(npc.name, rx, ry + npc.height / 2 + 10);
    ctx.restore();
  }
  
  // Draw dialogue bubble if active
  if (activeDialogNPC) {
    let npc = activeDialogNPC;
    let rx = npc.x - camera.x;
    let ry = npc.y - camera.y - npc.height / 2 - 25; // Above NPC
    
    ctx.save();
    ctx.font = "12px 'Courier New', Courier, monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let textWidth = ctx.measureText(npc.dialog).width;
    let paddingX = 12;
    let paddingY = 6;
    let boxW = textWidth + paddingX * 2;
    let boxH = 26;
    
    // Speech bubble background
    ctx.fillStyle = 'rgba(20, 15, 25, 0.9)'; // Dark warm background
    ctx.strokeStyle = '#f1c40f'; // Golden border
    ctx.lineWidth = 1.5;
    ctx.fillRect(rx - boxW / 2, ry - boxH / 2, boxW, boxH);
    ctx.strokeRect(rx - boxW / 2, ry - boxH / 2, boxW, boxH);
    
    // Dialogue text
    ctx.fillStyle = '#fff';
    ctx.fillText(npc.dialog, rx, ry);
    
    // Draw small arrow pointing down from bubble
    ctx.fillStyle = 'rgba(20, 15, 25, 0.9)';
    ctx.beginPath();
    ctx.moveTo(rx - 6, ry + boxH / 2);
    ctx.lineTo(rx + 6, ry + boxH / 2);
    ctx.lineTo(rx, ry + boxH / 2 + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(rx - 6, ry + boxH / 2);
    ctx.lineTo(rx, ry + boxH / 2 + 6);
    ctx.lineTo(rx + 6, ry + boxH / 2);
    ctx.stroke();
    
    ctx.restore();
  }
}

function interactWithNPC(npc) {
  if (!npc) return;
  activeDialogNPC = npc;
  activeDialogTimer = 4000; // 4 seconds in milliseconds
  
  if (npc.id === "merchant") {
    openShopModal();
  }
}

function checkNPCClick(clientX, clientY) {
  if (gameState !== "PLAYING") return false;
  
  // Convert screen coordinates to world coordinates
  let clickX = clientX + camera.x;
  let clickY = clientY + camera.y;

  for (let npc of safeRoomNPCs) {
    if (!npc.interactable) continue;
    // Bounding box check
    if (clickX >= npc.x - npc.width / 2 && clickX <= npc.x + npc.width / 2 &&
        clickY >= npc.y - npc.height / 2 && clickY <= npc.y + npc.height / 2) {
      interactWithNPC(npc);
      return true;
    }
  }
  return false;
}