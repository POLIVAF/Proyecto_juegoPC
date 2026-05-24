function generateClassWeapon(rarity, floor, charClass) {
  let baseBonus = 0.10 + (floor - 1) * 0.02;
  let multiplier = 1.0;
  let color = "#bdc3c7";
  let type = "weapon";
  let name = "";
  let icon = charClass === "warrior" ? "⚔️" : "🔮";

  if (rarity === "rare") {
    multiplier = 1.3;
    color = "#3498db";
    type = "rare_weapon";
  } else if (rarity === "very_rare") {
    multiplier = 1.7;
    color = "#9b59b6";
    type = "very_rare_weapon";
  } else if (rarity === "epic") {
    multiplier = 2.1;
    color = "#e67e22";
    type = "epic_weapon";
  } else if (rarity === "legendary") {
    multiplier = 2.7;
    color = "#f1c40f";
    type = "super_rare_weapon";
  }

  let finalBonus = baseBonus * multiplier;

  // Immersive names
  if (charClass === "warrior") {
    let prefixes = {
      common: "Espada Corta",
      rare: "Mandoble del Héroe",
      very_rare: "Filo Siniestro",
      epic: "Mandoble de Obsidiana",
      legendary: "Filo Celestial"
    };
    name = `${prefixes[rarity]} +${floor}`;
  } else {
    let prefixes = {
      common: "Cetro de Aprendiz",
      rare: "Bastón Místico",
      very_rare: "Bastón del Ocaso",
      epic: "Cetro Arcano",
      legendary: "Báculo del Caos"
    };
    name = `${prefixes[rarity]} +${floor}`;
  }

  let stats = generateProceduralStats("weapon", rarity, floor);
  let bonusDesc = `+${Math.round(finalBonus * 100)}% Daño.`;
  let statsDesc = getStatsDesc(stats);
  let desc = bonusDesc + (statsDesc ? "<br>" + statsDesc : "") + ` Solo para ${charClass === 'warrior' ? 'Guerrero' : 'Mago'}.`;

  return {
    type: type,
    slot: "weapon",
    classRestriction: charClass,
    name: name,
    rarity: rarity,
    color: color,
    bonus: finalBonus,
    stats: stats,
    icon: icon,
    desc: desc
  };
}

function generateRandomEquipment(floor, forcedRarity = null) {
  let slots = ["head", "chest", "legs", "gloves", "ring", "pendant"];
  let slot = slots[Math.floor(Math.random() * slots.length)];

  if (slot === "ring" || slot === "pendant") {
    return generateRandomAccessory(slot, floor, forcedRarity);
  }

  let rarity = forcedRarity || rollRarity(false);
  let color = getRarityColor(rarity);

  let prefix = "";
  let icon = "";
  switch (slot) {
    case "head":
      icon = "🪖";
      prefix = "Yelmo";
      break;
    case "chest":
      icon = "👕";
      prefix = "Peto";
      break;
    case "legs":
      icon = "👖";
      prefix = "Grebas";
      break;
    case "gloves":
      icon = "🧤";
      prefix = "Guantes";
      break;
  }

  let rarityLabel = getRarityLabel(rarity);
  let name = `${prefix} ${rarityLabel} +${floor}`;

  let baseBonusVal = 0.02 + floor * 0.005;
  let multiplier = 1.0;
  if (rarity === "rare") multiplier = 1.3;
  else if (rarity === "very_rare") multiplier = 1.7;
  else if (rarity === "epic") multiplier = 2.1;
  else if (rarity === "legendary") multiplier = 2.7;

  let finalBonus = baseBonusVal * multiplier;
  let stats = generateProceduralStats(slot, rarity, floor);
  let bonusDesc = `+${Math.round(finalBonus * 100)}% Daño.`;
  let statsDesc = getStatsDesc(stats);
  let desc = bonusDesc + (statsDesc ? "<br>" + statsDesc : "");

  return {
    type: `eq_${slot}`,
    slot: slot,
    name: name,
    rarity: rarity,
    color: color,
    bonus: finalBonus,
    stats: stats,
    icon: icon,
    desc: desc
  };
}

function generateRandomAccessory(slot, floor, forcedRarity = null) {
  let rarity = forcedRarity || rollRarity(false);
  let color = getRarityColor(rarity);

  let suffixes = ["de Furia", "de Acero", "Celestial", "Místico", "de las Sombras", "de la Luz", "Sagrado", "Rúnico", "del Titán", "de Vitalidad", "de Fuego", "de Escarcha", "del Fénix", "del Dragón"];
  let suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  let noun = slot === "ring" ? "Anillo" : "Colgante";
  let name = `${noun} ${suffix}`;

  let stats = generateProceduralStats(slot, rarity, floor);
  let desc = getStatsDesc(stats);

  return {
    type: `eq_${slot}`,
    slot: slot,
    rarity: rarity,
    name: name,
    color: color,
    icon: slot === "ring" ? "💍" : "📿",
    stats: stats,
    desc: desc
  };
}
