/**
 * Drops System Module
 * Handles coins and equipment roll calculations for defeated enemies, bosses, and chests.
 */

function rollMobDrop(floor, x, y, playerClass, killedEnemiesCount) {
  let drops = [];
  
  // 1. Coins/Gold drop (50% probability)
  // NO todos los mobs deben soltar monedas.
  if (Math.random() < 0.50) {
    // ESCALADO: máximo inicial = 5 monedas
    // cada bloque de pisos (5 pisos) aumenta el máximo en 1:
    // pisos 1-5: hasta 5 monedas
    // pisos 6-10: 5 + 1 = 6 monedas
    // pisos 11-15: 5 + 2 = 7 monedas
    let maxCoins = 5 + Math.floor((floor - 1) / 5);
    let coinsAmount = Math.floor(Math.random() * maxCoins) + 1;
    drops.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      radius: 5,
      type: "coin",
      color: "#f1c40f",
      name: "Moneda de Oro (+" + coinsAmount + ")",
      value: coinsAmount,
    });
  }

  // 2. Weapon drops based on precise rates (Epic and Legendary removed from common mobs)
  let rand = Math.random();
  if (rand < 0.005) { // 0.5% for Very Rare (Poco Común)
    let item = generateClassWeapon("very_rare", floor, playerClass);
    drops.push(createWeaponDropObj(item, x, y));
  } else if (rand < 0.005 + 0.01) { // 1% for Rare
    let item = generateClassWeapon("rare", floor, playerClass);
    drops.push(createWeaponDropObj(item, x, y));
  } else if (rand < 0.005 + 0.01 + 0.05) { // 5% for Normal (Common)
    let item = generateClassWeapon("common", floor, playerClass);
    drops.push(createWeaponDropObj(item, x, y));
  }

  // 3. Other item drops (armor, accessories, potions) using existing 20% check
  if (Math.random() < 0.20) {
    let rarity = rollRarity(false);
    let randPool = Math.random();
    let typeSelected;
    
    // We roll for armor, accessories, or potions here (excluding weapons, which are handled above)
    if (randPool < 0.35) typeSelected = "armor";
    else if (randPool < 0.60) typeSelected = "ring";
    else if (randPool < 0.85) typeSelected = "pendant";
    else typeSelected = "potion";

    if (typeSelected === "armor") {
      let item = generateRandomEquipment(floor, rarity);
      drops.push({
        x: x,
        y: y,
        radius: 9,
        type: item.type,
        slot: item.slot,
        color: item.color,
        name: item.name,
        rarity: item.rarity,
        bonus: item.bonus,
        icon: item.icon,
        desc: item.desc,
        stats: item.stats
      });
    } else if (typeSelected === "ring") {
      let item = generateRandomAccessory("ring", floor, rarity);
      drops.push({
        x: x,
        y: y,
        radius: 8,
        type: item.type,
        slot: item.slot,
        color: item.color,
        name: item.name,
        rarity: item.rarity,
        icon: item.icon,
        desc: item.desc,
        stats: item.stats
      });
    } else if (typeSelected === "pendant") {
      let item = generateRandomAccessory("pendant", floor, rarity);
      drops.push({
        x: x,
        y: y,
        radius: 8,
        type: item.type,
        slot: item.slot,
        color: item.color,
        name: item.name,
        rarity: item.rarity,
        icon: item.icon,
        desc: item.desc,
        stats: item.stats
      });
    } else if (typeSelected === "potion") {
      let healAmount = 15 + (floor - 1) * 2;
      let manaAmount = 15 + (floor - 1) * 2;
      if (Math.random() < 0.5) {
        drops.push({
          x: x,
          y: y,
          radius: 6,
          type: "red_potion",
          color: "#e74c3c",
          name: "Poción Roja +" + floor,
          healAmount: healAmount,
          icon: "🔴",
          desc: "Restaura " + healAmount + " HP"
        });
      } else {
        drops.push({
          x: x,
          y: y,
          radius: 6,
          type: "blue_potion",
          color: "#3498db",
          name: "Poción Azul +" + floor,
          manaAmount: manaAmount,
          icon: "🔵",
          desc: "Restaura " + manaAmount + " Mana"
        });
      }
    }
  }

  // 4. Crafting material drop check (every 5 kills, with 0.15% probability)
  if (typeof killedEnemiesCount !== "undefined" && killedEnemiesCount > 0 && killedEnemiesCount % 5 === 0) {
    if (Math.random() < 0.0015) {
      let mats = ["Molibdeno", "Níquel", "Hematita", "Carbón"];
      if (floor >= 6 && floor <= 20) {
        mats.push("Carbono");
      }
      
      let chosenMatName = mats[Math.floor(Math.random() * mats.length)];
      let matDetails = {
        "Molibdeno": { icon: "⚙️", color: "#7f8c8d", type: "material_molibdeno" },
        "Níquel": { icon: "🔗", color: "#bdc3c7", type: "material_niquel" },
        "Hematita": { icon: "🪨", color: "#c0392b", type: "material_hematita" },
        "Carbón": { icon: "🌑", color: "#2c3e50", type: "material_carbon" },
        "Carbono": { icon: "💎", color: "#3498db", type: "material_carbono" }
      };
      
      let details = matDetails[chosenMatName];
      drops.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        radius: 8,
        type: details.type,
        color: details.color,
        name: chosenMatName,
        icon: details.icon,
        desc: "Material de crafting para forja y mejoras."
      });
    }
  }

  return drops;
}

function createWeaponDropObj(item, x, y) {
  return {
    x: x,
    y: y,
    radius: item.rarity === "legendary" ? 11 : 10,
    type: item.type,
    slot: item.slot,
    classRestriction: item.classRestriction,
    color: item.color,
    name: item.name,
    rarity: item.rarity,
    bonus: item.bonus,
    icon: item.icon,
    desc: item.desc,
    stats: item.stats
  };
}

function rollBossDrop(floor, x, y, playerClass) {
  let drops = [];

  // 1. Coins/Gold drop (100% probability)
  // Cantidad considerablemente mayor: 20 + floor * 5 monedas.
  let coinsAmount = 20 + floor * 5;
  drops.push({
    x: x,
    y: y,
    radius: 8,
    type: "coin",
    color: "#f1c40f",
    name: "Bolsa de Oro (+" + coinsAmount + ")",
    value: coinsAmount,
  });

  // 2. Special floor 15 Unique Boss weapons (100% probability)
  if (floor === 15) {
    let specialBonus = 0.05 + Math.max(0, (floor - 15) * 0.01);
    if (playerClass === "mage") {
      drops.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        radius: 12,
        type: "STAFF_BLUE",
        slot: "weapon",
        classRestriction: "mage",
        color: "#3498db",
        name: "Bastón de Mago Azul",
        bonus: specialBonus,
        icon: "🔮",
        desc: "Bastón especial para Mago."
      });
    } else {
      drops.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        radius: 12,
        type: "GREATSWORD_FROST",
        slot: "weapon",
        classRestriction: "warrior",
        color: "#3498db",
        name: "Mandoble de Escarcha",
        bonus: specialBonus,
        icon: "⚔️",
        desc: "Espada grande especial para Guerrero."
      });
    }
  }

  // 3. Boss Equipment/Weapon roll (15% probability)
  if (Math.random() < 0.15) {
    let randRarity = Math.random();
    let rarity = "epic";
    if (randRarity < 0.05) {
      rarity = "mythic";
    } else if (randRarity < 0.25) {
      rarity = "legendary";
    }
    
    let pLevel = (player && player.level) ? player.level : floor;
    let ox = x + (Math.random() - 0.5) * 30;
    let oy = y + (Math.random() - 0.5) * 30;

    if (floor === 10 || floor === 15) {
      // JEFE PISO 10 y JEFE PISO 15: joyería o ropa épica/legendaria/mítica (Solo 1 pieza, balanceada al nivel del jugador)
      let isJewelry = Math.random() < 0.50;
      if (isJewelry) {
        let slot = Math.random() < 0.50 ? "ring" : "pendant";
        let item = generateRandomAccessory(slot, pLevel, rarity);
        drops.push({
          x: ox,
          y: oy,
          radius: rarity === "mythic" ? 10 : 8,
          type: item.type,
          slot: item.slot,
          color: item.color,
          name: item.name,
          rarity: item.rarity,
          icon: item.icon,
          desc: item.desc,
          stats: item.stats
        });
      } else {
        // Clothing (armor)
        let slots = ["head", "chest", "legs", "gloves"];
        let slot = slots[Math.floor(Math.random() * slots.length)];
        let item = generateRandomEquipment(pLevel, rarity, slot);
        drops.push({
          x: ox,
          y: oy,
          radius: rarity === "mythic" ? 11 : 9,
          type: item.type,
          slot: item.slot,
          color: item.color,
          name: item.name,
          rarity: item.rarity,
          bonus: item.bonus,
          icon: item.icon,
          desc: item.desc,
          stats: item.stats
        });
      }
    } else {
      // Jefes normales (pisos como el 5): Solo armas épicas/legendarias/míticas adaptadas al nivel del jugador
      let item = generateClassWeapon(rarity, pLevel, playerClass);
      drops.push({
        x: ox,
        y: oy,
        radius: rarity === "mythic" ? 12 : (rarity === "legendary" ? 11 : 10),
        type: item.type,
        slot: item.slot,
        classRestriction: item.classRestriction,
        color: item.color,
        name: item.name,
        rarity: item.rarity,
        bonus: item.bonus,
        icon: item.icon,
        desc: item.desc,
        stats: item.stats
      });
    }
  }

  return drops;
}

function rollChestDrop(floor, x, y, playerClass) {
  let drops = [];
  
  // Drop 5 to 10 coins, with scaled coin values on higher floors
  let numCoins = Math.floor(Math.random() * 6) + 5;
  for (let i = 0; i < numCoins; i++) {
    let ox = x + (Math.random() - 0.5) * 40;
    let oy = y + (Math.random() - 0.5) * 40;
    // Más oro en pisos altos
    let coinVal = Math.floor(Math.random() * (3 + Math.floor(floor / 2))) + 1 + (floor - 1) * 3;
    drops.push({
      x: ox,
      y: oy,
      radius: 5,
      type: "coin",
      color: "#f1c40f",
      name: "Moneda de Oro (+" + coinVal + ")",
      value: coinVal
    });
  }

  // Chance to drop an equipment/accessory item (50% base, scaling up to 80% on higher floors)
  let itemChance = Math.min(0.80, 0.50 + (floor - 1) * 0.02);
  if (Math.random() < itemChance) {
    let ox = x + (Math.random() - 0.5) * 30;
    let oy = y + (Math.random() - 0.5) * 30;
    
    // Rareza dependiente del piso, pero tope en Muy Raro (NO legendarios, NO épicos)
    // El peso de Muy Raro y Raro aumenta con el piso, mientras que Común disminuye
    let weightVeryRare = 5 + (floor - 1) * 2;
    let weightRare = 25 + (floor - 1) * 1.5;
    let weightCommon = Math.max(10, 70 - (floor - 1) * 3.5);
    
    let totalWeight = weightVeryRare + weightRare + weightCommon;
    let rand = Math.random() * totalWeight;
    let rarity = "common";
    if (rand < weightVeryRare) {
      rarity = "very_rare";
    } else if (rand < weightVeryRare + weightRare) {
      rarity = "rare";
    } else {
      rarity = "common";
    }

    let itemPool = ["weapon", "armor", "ring", "pendant"];
    let typeSelected = itemPool[Math.floor(Math.random() * itemPool.length)];

    if (typeSelected === "weapon") {
      let item = generateClassWeapon(rarity, floor, playerClass);
      drops.push({
        x: ox,
        y: oy,
        radius: 10,
        type: item.type,
        slot: item.slot,
        classRestriction: item.classRestriction,
        color: item.color,
        name: item.name,
        rarity: item.rarity,
        bonus: item.bonus,
        icon: item.icon,
        desc: item.desc,
        stats: item.stats
      });
    } else if (typeSelected === "armor") {
      let item = generateRandomEquipment(floor, rarity);
      drops.push({
        x: ox,
        y: oy,
        radius: 9,
        type: item.type,
        slot: item.slot,
        color: item.color,
        name: item.name,
        rarity: item.rarity,
        bonus: item.bonus,
        icon: item.icon,
        desc: item.desc,
        stats: item.stats
      });
    } else {
      let item = generateRandomAccessory(typeSelected, floor, rarity);
      drops.push({
        x: ox,
        y: oy,
        radius: 8,
        type: item.type,
        slot: item.slot,
        color: item.color,
        name: item.name,
        rarity: item.rarity,
        icon: item.icon,
        desc: item.desc,
        stats: item.stats
      });
    }
  }

  // 50% chance to drop a consumable (potion) in addition, scaling up to 80% on higher floors
  let consumableChance = Math.min(0.80, 0.50 + (floor - 1) * 0.02);
  if (Math.random() < consumableChance) {
    let ox = x + (Math.random() - 0.5) * 30;
    let oy = y + (Math.random() - 0.5) * 30;
    
    // Potions heal more on higher floors
    let healAmount = 15 + (floor - 1) * 2;
    let manaAmount = 15 + (floor - 1) * 2;
    if (Math.random() < 0.5) {
      drops.push({
        x: ox,
        y: oy,
        radius: 6,
        type: "red_potion",
        color: "#e74c3c",
        name: "Poción Roja +" + floor,
        healAmount: healAmount,
        icon: "🔴",
        desc: "Restaura " + healAmount + " HP"
      });
    } else {
      drops.push({
        x: ox,
        y: oy,
        radius: 6,
        type: "blue_potion",
        color: "#3498db",
        name: "Poción Azul +" + floor,
        manaAmount: manaAmount,
        icon: "🔵",
        desc: "Restaura " + manaAmount + " Mana"
      });
    }
  }

  return drops;
}
