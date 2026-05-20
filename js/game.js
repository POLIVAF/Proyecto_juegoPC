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
let isChangingLevel = false;
let isTransitioning = false;
let currentSaveSlot = 1; // Internal save slot

// Game Objects
let dungeon;
let player;
let enemies = [];
let projectiles = []; // Legacy global projectiles list to avoid reference errors
let enemyProjectiles = []; // Projectiles fired by 'shooter' enemies
let droppedItems = []; // Items on the ground
let camera = { x: 0, y: 0, width: 0, height: 0 };
let floor = 1;

// Resize canvas
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  camera.width = canvas.width;
  camera.height = canvas.height;
  ctx.imageSmoothingEnabled = false; // Pixel art style
}
window.addEventListener("resize", resize);
resize();

// Input
window.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (e.key === 'Escape') {
    const inventoryModal = document.getElementById("inventory-modal");
    if (inventoryModal) {
      inventoryModal.classList.add("hidden");
    }
  }
  
  if (e.key.toLowerCase() === 'q') {
    const inventoryModal = document.getElementById("inventory-modal");
    if (inventoryModal) {
      if (inventoryModal.classList.contains("hidden")) {
        inventoryModal.classList.remove("hidden");
        updateInventoryUI(); // Refresh items on open
      } else {
        inventoryModal.classList.add("hidden");
      }
    }
  }
});
window.addEventListener("keyup", (e) => (keys[e.key] = false));
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
    mouse.clicked = true;
  }
});

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
    startGame(name, charClass, gender, 1, [], null, true);
  });
}

// Continue Game Handler
if (continueBtn) {
  continueBtn.addEventListener("click", () => {
    const saved = localStorage.getItem(`isekaiSave_1`);
    if (saved) {
      const data = JSON.parse(saved);
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

  // Reset base stats based on character class
  if (player.charClass === "warrior") {
    player.maxHp = 150;
    player.maxMana = 50;
    player.baseDamage = 25;
    player.speed = 3;
  } else {
    // Mage
    player.maxHp = 80;
    player.maxMana = 150;
    player.baseDamage = 15;
    player.speed = 4;
  }

  player.hp = player.maxHp;
  player.mana = player.maxMana;
  player.damage = player.baseDamage;
  player.armor = 0;
  player.weaponLevel = 1;

  // Clear inventory, equipment, projectiles and timers
  player.inventory = [];
  player.equipment = [];
  player.projectiles = [];
  player.immunityTimer = 0;
  player.poisonTimer = 0;
  player.stunTimer = 0;
  player.furyAuraTimer = 0;
  player.hitEnemies = [];
}

// Restart Game Handler
const restartBtn = document.getElementById("restart-btn");
if (restartBtn) {
  restartBtn.addEventListener("click", () => {
    // Calculate dynamic checkpoint floor: automatic blocks of 5 floors
    let checkpointFloor = Math.floor((floor - 1) / 5) * 5 + 1;
    floor = checkpointFloor;

    // Reset player powers and upgrades to level 1 baseline before loading
    resetPlayerOnDeath(player);

    enemies = [];
    projectiles = [];
    enemyProjectiles = [];
    droppedItems = [];

    // Load the checkpoint floor
    initLevel(player.name, player.charClass, player.gender, false);

    // Save the reset stats and checkpoint floor
    saveGame();

    if (gameOverScreen) {
      gameOverScreen.classList.add("hidden");
    }
    if (gameUi) gameUi.classList.remove("hidden");
    if (canvas) canvas.classList.remove("hidden");

    gameState = "PLAYING";
    updateMobileControlsVisibility();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
    
    updateInventoryUI();
    updatePowerBarUI();
    console.log(`¡El héroe ha reaparecido en el Checkpoint (Piso ${floor})!`);
  });
}

function startGame(name, charClass, gender, startFloor, powers, hp, newPlayer) {
  if (mainMenu) mainMenu.classList.add("hidden");
  if (gameUi) gameUi.classList.remove("hidden");
  if (canvas) canvas.classList.remove("hidden");

  floor = startFloor;
  
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
      
      player.inventory = sd.inventory || [];
      player.equipment = sd.equipment || [];
      
      if (sd.stats) {
        player.damage = sd.stats.damage || player.damage;
        player.armor = sd.stats.armor || player.armor;
      }
    }

    updatePowerBarUI();
    updateInventoryUI();
  } else if (player) {
    player.inventory = [];
    player.equipment = [];
    updateInventoryUI();
  }

  gameState = "PLAYING";
  updateMobileControlsVisibility();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
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
    inventory: [...player.inventory],
    equipment: [...player.equipment],
    floor: floor,
    powers: [...player.powers],
    stats: {
      damage: player.damage,
      armor: player.armor
    }
  };

  localStorage.setItem(`isekaiSave_${currentSaveSlot}`, JSON.stringify(data));
  console.log("Juego guardado en el slot " + currentSaveSlot);
}

function initLevel(name, charClass, gender, newPlayer) {
  dungeon = new Dungeon(50, 50);

  let isBossFloor = floor % 5 === 0;
  if (isBossFloor) {
    dungeon.generateBossRoom();
  } else {
    dungeon.generate();
  }

  let startRoom = dungeon.rooms[0];
  let startX = startRoom.x * dungeon.tileSize + dungeon.tileSize / 2;
  let startY = startRoom.y * dungeon.tileSize + dungeon.tileSize / 2;

  if (newPlayer || !player) {
    player = new Player(startX, startY, name, charClass, gender);
  } else {
    player.x = startX;
    player.y = startY;
    player.projectiles = [];
    player.immunityTimer = 0;
    player.poisonTimer = 0;
    player.stunTimer = 0;
  }

  if (hudName) hudName.innerText = player.name;
  if (hudClass) hudClass.innerText = player.charClass.toUpperCase();
  
  const floorHUD = document.getElementById("hud-floor");
  if (floorHUD) floorHUD.innerText = floor;

  enemies = [];
  enemyProjectiles = [];
  droppedItems = [];

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
  } else {
    for (let i = 1; i < dungeon.rooms.length; i++) {
      let room = dungeon.rooms[i];
      let numEnemies = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < numEnemies; j++) {
        let ex = room.x * dungeon.tileSize + 20 + Math.random() * (room.w * dungeon.tileSize - 40);
        let ey = room.y * dungeon.tileSize + 20 + Math.random() * (room.h * dungeon.tileSize - 40);

        let eType = "normal";
        if (floor === 2) {
          eType = "poison";
        } else if (floor === 3) {
          eType = Math.random() < 0.5 ? "stun" : "shooter";
        } else if (floor >= 4) {
          let types = ["normal", "poison", "stun", "shooter"];
          eType = types[Math.floor(Math.random() * types.length)];
        }

        enemies.push(new Enemy(ex, ey, floor, eType));
      }
    }
  }
}

function update(deltaTime) {
  if (gameState !== "PLAYING") return;

  player.update(keys, mouse, camera, dungeon, deltaTime);

  // Reset mouse click after player processes it
  mouse.clicked = false;

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
        // Check if enemy can hit
        if (!(e instanceof Boss) && e.attackCooldown <= 0 && player.immunityTimer <= 0) {
          player.hp -= e.damage;

          // Apply Status
          if (e.type === "poison") {
            player.poisonTimer = 3 * 60; // 3 seconds
          } else if (e.type === "stun") {
            player.stunTimer = 1 * 60; // 1 second
          }

          e.attackCooldown = 60; // 1 second cooldown between hits

          if (player.hp <= 0) gameOver();
        } else if (e instanceof Boss && player.immunityTimer <= 0) {
          player.hp -= e.damage * (deltaTime / 1000);
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
      // Drop logic
      if (e instanceof Boss) {
        if (e instanceof BossFloor15 || floor === 15) {
          droppedItems.push({
            x: e.x,
            y: e.y,
            radius: 12,
            type: "STAFF_BLUE",
            color: "#3498db",
            name: "Bastón de Mago Azul",
            bonus: 0.05,
          });
        }

        if (player.charClass === "mage") {
          droppedItems.push({
            x: e.x,
            y: e.y,
            radius: 10,
            type: "heart",
            color: "#ff69b4",
            name: "Corazón",
          });
        } else {
          droppedItems.push({
            x: e.x,
            y: e.y,
            radius: 10,
            type: "weapon",
            color: "#bdc3c7",
            name: "Arma",
          });
        }
      } else if (Math.random() < 0.15) {
        // 15% chance to drop a potion
        if (Math.random() < 0.5) {
          droppedItems.push({
            x: e.x,
            y: e.y,
            radius: 6,
            type: "red_potion",
            color: "#e74c3c",
            name: "Poción Roja",
          });
        } else {
          droppedItems.push({
            x: e.x,
            y: e.y,
            radius: 6,
            type: "blue_potion",
            color: "#3498db",
            name: "Poción Azul",
          });
        }
      }
      enemies.splice(i, 1);
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
      player.hp -= ep.damage;
      enemyProjectiles.splice(i, 1);
      if (player.hp <= 0) gameOver();
    } else if (ep.life <= 0 || dungeon.isWall(ep.x, ep.y)) {
      enemyProjectiles.splice(i, 1);
    }
  }

  // Update Items on Ground
  for (let i = droppedItems.length - 1; i >= 0; i--) {
    let it = droppedItems[i];
    let dx = player.x - it.x;
    let dy = player.y - it.y;
    if (Math.sqrt(dx * dx + dy * dy) < player.width / 2 + it.radius) {
      // Pick up item if backpack is not full
      if (player.inventory.length < 15) {
        player.inventory.push({
          type: it.type,
          name: it.name,
          color: it.color,
        });
        droppedItems.splice(i, 1);
        updateInventoryUI();
      }
    }
  }

  // Update HUD
  if (hudHp) hudHp.innerText = `${Math.ceil(player.hp)}/${player.maxHp}`;
  if (hudMana) hudMana.innerText = `${Math.ceil(player.mana)}/${player.maxMana}`;
  updatePowerBarUI();

  // Level progression via door
  if (enemies.length === 0) {
    dungeon.doorOpen = true; // Open the door

    // Check collision with the door
    let doorPixelX = dungeon.exitX * dungeon.tileSize + dungeon.tileSize / 2;
    let doorPixelY = dungeon.exitY * dungeon.tileSize + dungeon.tileSize / 2;

    let dx = player.x - doorPixelX;
    let dy = player.y - doorPixelY;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < player.width / 2 + dungeon.tileSize / 2) {
      saveGame();
      showRewardScreen();
    }
  }
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
    if (it.type === "weapon") {
      ctx.fillRect(
        it.x - camera.x - it.radius,
        it.y - camera.y - it.radius,
        it.radius * 2,
        it.radius * 2
      );
    } else {
      ctx.arc(it.x - camera.x, it.y - camera.y, it.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  }

  player.draw(ctx, camera);

  ctx.restore();
}

function gameLoop(timestamp) {
  let deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  update(deltaTime);
  draw();

  if (gameState === "PLAYING") {
    requestAnimationFrame(gameLoop);
  }
}

function gameOver() {
  gameState = "GAMEOVER";
  updateMobileControlsVisibility();
  if (gameUi) gameUi.classList.add("hidden");
  if (canvas) canvas.classList.add("hidden");
  if (gameOverScreen) {
    gameOverScreen.classList.remove("hidden");
    const checkpointFloor = Math.floor((floor - 1) / 5) * 5 + 1;
    const btn = document.getElementById("restart-btn");
    if (btn) {
      btn.innerText = `Reencarnar en Checkpoint (Piso ${checkpointFloor})`;
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
      updateInventoryUI();
    }
  });
}

const closeInventoryBtn = document.getElementById("close-inventory");
if (closeInventoryBtn) {
  closeInventoryBtn.addEventListener("click", () => {
    const modal = document.getElementById("inventory-modal");
    if (modal) {
      modal.classList.add("hidden");
    }
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

      if (i < player.inventory.length) {
        let item = player.inventory[i];
        slot.style.backgroundColor = item.color;
        slot.title = item.name + " (Clic/Tap para usar)";
        
        if (item.type === "red_potion") slot.innerHTML = "🔴";
        else if (item.type === "blue_potion") slot.innerHTML = "🔵";
        else if (item.type === "weapon") slot.innerHTML = "⚔️";
        else slot.innerHTML = "📦";

        slot.onclick = () => {
          useItem(i);
        };
      }
      bpGrid.appendChild(slot);
    }
  }

  const eqGrid = document.getElementById("equipment-grid");
  if (eqGrid) {
    eqGrid.innerHTML = "";
    for (let i = 0; i < 4; i++) {
      let slot = document.createElement("div");
      slot.className = "inv-slot";
      if (i < player.equipment.length) {
        slot.style.backgroundColor = player.equipment[i].color;
        slot.innerHTML = "⚔️";
      }
      eqGrid.appendChild(slot);
    }
  }
}

function useItem(index) {
  if (!player || index >= player.inventory.length) return;

  let item = player.inventory[index];
  let canUse = true; 

  switch (item.type) {
    case "red_potion":
      player.hp = Math.min(player.maxHp, player.hp + 15);
      console.log("Vida restaurada +15");
      break;

    case "blue_potion":
      player.mana = Math.min(player.maxMana, player.mana + 15);
      console.log("Maná restaurado +15");
      break;

    case "heart":
    case "heart_plus": 
      player.maxHp += 10;
      player.hp += 10;
      console.log("Vida máxima aumentada!");
      break;

    case "armor_scroll": 
      player.armor = (player.armor || 0) + (item.armorBonus || 1);
      console.log("Armadura mejorada. Defensa actual: " + player.armor);
      break;

    case "weapon":
    case "rare_weapon":
    case "super_rare_weapon":
    case "STAFF_BLUE":
      if (player.equipment.length < 4) {
        let bonus = item.bonus || 0.1;
        player.damage *= (1 + bonus);
        player.equipment.push(item);
        console.log("Equipaste: " + item.name);
      } else {
        console.log("Equipamiento lleno. No puedes llevar más armas.");
        canUse = false;
      }
      break;

    case "upgrade_scroll": 
      player.damage += 2;
      if (player.weaponLevel !== undefined) player.weaponLevel++;
      console.log("¡Arma afilada! Daño aumentado.");
      break;

    default:
      console.log("Este objeto no tiene un uso definido.");
      canUse = false;
      break;
  }

  if (canUse) {
    player.inventory.splice(index, 1);
    updateInventoryUI(); 
  }
}

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
      if (power.level > 1) {
        let lvLabel = document.createElement("span");
        lvLabel.style.position = "absolute";
        lvLabel.style.top = "-5px";
        lvLabel.style.right = "2px";
        lvLabel.style.color = "#fff";
        lvLabel.style.fontSize = "12px";
        lvLabel.style.fontWeight = "bold";
        lvLabel.style.textShadow = "1px 1px 0 #000";
        lvLabel.innerText = "L" + power.level;
        slot.appendChild(lvLabel);
      }
    }

    let numIndicator = document.createElement("span");
    numIndicator.className = "slot-number";
    numIndicator.innerText = i + 1;
    slot.appendChild(numIndicator);

    hudPowerBar.appendChild(slot);

    // Dynamic styling for mobile buttons
    const mobileBtn = document.getElementById(`btn-p${i+1}`);
    if (mobileBtn) {
      if (player && i < player.powers.length) {
        let p = player.powers[i];
        mobileBtn.style.backgroundColor = p.color;
        mobileBtn.innerText = p.name[0]; // First letter of the power name (e.g. D, E, E, F)
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
  { id: "fire", name: "Fuego", desc: "Mucho daño.", color: "#e74c3c" },
  { id: "water", name: "Agua", desc: "Ataque muy rápido.", color: "#3498db" },
  { id: "earth", name: "Tierra", desc: "Área grande.", color: "#d35400" },
  { id: "wind", name: "Viento", desc: "Aura de Inmunidad.", color: "#2ecc71" },
];

const availableWarriorPowers = [
  { id: "double_strike", name: "Doble Golpe", desc: "Realiza un doble ataque.", color: "#f39c12" },
  { id: "charge", name: "Embestida", desc: "Te lanzas y aturdes 1.5s.", color: "#3498db" },
  { id: "knockback", name: "Empujar", desc: "Empuja enemigos haciendo daño.", color: "#27ae60" },
  { id: "fury", name: "Furia", desc: "Aumenta daño en 2% permanentemente.", color: "#c0392b" }
];

let selectedPowerToReplace = null;

function showRewardScreen() {
  gameState = "REWARD";
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
    card.innerHTML = `
      <h3 style="color:${power.color}">${power.name}</h3>
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
  rewardScreen.classList.add("hidden");
  const rewardDesc = document.getElementById("reward-desc");
  if (rewardDesc) {
    rewardDesc.innerText = player && player.charClass === "warrior" 
      ? "Elige una nueva habilidad de combate:" 
      : "Elige un nuevo poder elemental:";
  }
  floor++;
  initLevel(player.name, player.charClass, player.gender, false);
  gameState = "PLAYING";
  updateMobileControlsVisibility();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// Initial Saved Game Check
const saved = localStorage.getItem(`isekaiSave_1`);
if (saved && continueBtn) {
  continueBtn.classList.remove("hidden");
} else if (continueBtn) {
  continueBtn.classList.add("hidden");
}

// Mobile controls activation and setup
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function updateMobileControlsVisibility() {
  const mobileControls = document.getElementById("mobile-controls");
  if (!mobileControls) return;
  if (isTouchDevice && gameState === "PLAYING") {
    mobileControls.classList.remove("hidden");
  } else {
    mobileControls.classList.add("hidden");
  }
}

// Set up virtual buttons
if (isTouchDevice) {
  const directions = {
    'btn-up': 'w',
    'btn-down': 's',
    'btn-left': 'a',
    'btn-right': 'd'
  };

  for (let id in directions) {
    const btn = document.getElementById(id);
    const key = directions[id];
    if (btn) {
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        keys[key] = true;
      });
      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        keys[key] = false;
      });
      btn.addEventListener("touchcancel", (e) => {
        e.preventDefault();
        keys[key] = false;
      });
    }
  }

  // Attack Button
  const btnAttack = document.getElementById("btn-attack");
  if (btnAttack) {
    btnAttack.addEventListener("touchstart", (e) => {
      e.preventDefault();
      mouse.clicked = true;
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
      });
      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        keys[key] = false;
      });
    }
  }
}