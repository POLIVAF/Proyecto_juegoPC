function generateProceduralStats(slot, rarity, floor) {
  let numStats = 1;
  if (rarity === "rare") numStats = 2;
  else if (rarity === "very_rare") numStats = 3;
  else if (rarity === "epic") numStats = 4;
  else if (rarity === "legendary") numStats = 5;
  else if (rarity === "mythic") numStats = 6;

  let stats = {};
  let pool = [];
  let isArmor = ["head", "chest", "legs", "gloves"].includes(slot);
  
  if (isArmor) {
    // Guarantees defense as the primary stat, then adds other stats
    stats["defensa"] = Math.floor(Math.random() * 3) + 1 + Math.floor(floor / 3);
    pool = ["vida", "fuerza", "mana", "cooldown", "velocidad"];
    numStats = Math.max(1, numStats - 1);
  } else if (slot === "weapon") {
    // Weapons have offensive stats
    pool = ["fuerza", "daño", "cooldown", "mana", "velocidad"];
  } else {
    // Accessories (rings, pendants) can roll anything
    pool = ["fuerza", "defensa", "daño", "cooldown", "mana", "vida", "velocidad"];
  }

  // Shuffle and select additional stats
  let shuffled = [...pool].sort(() => 0.5 - Math.random());
  let selected = shuffled.slice(0, numStats);

  selected.forEach(statName => {
    let value = 0;
    switch (statName) {
      case "fuerza":
        value = Math.floor(Math.random() * 3) + 1 + Math.floor(floor / 3);
        break;
      case "defensa":
        value = Math.floor(Math.random() * 3) + 1 + Math.floor(floor / 3);
        break;
      case "daño":
        value = (Math.floor(Math.random() * 5) + 3) + Math.floor(floor / 2);
        break;
      case "cooldown":
        value = (Math.floor(Math.random() * 4) + 2) + Math.floor(floor / 4);
        break;
      case "mana":
        value = (Math.floor(Math.random() * 11) + 10) + floor * 2;
        break;
      case "vida":
        value = (Math.floor(Math.random() * 16) + 15) + floor * 3;
        break;
      case "velocidad":
        value = (Math.floor(Math.random() * 5) + 3) + Math.floor(floor / 4);
        break;
    }
    stats[statName] = value;
  });

  return stats;
}

function getStatsDesc(stats) {
  if (!stats) return "";
  let descLines = [];
  if (stats.fuerza) descLines.push(`+${stats.fuerza}% fuerza`);
  if (stats.defensa) descLines.push(`+${stats.defensa} defensa`);
  if (stats.daño) descLines.push(`+${stats.daño}% daño`);
  if (stats.cooldown) descLines.push(`+${stats.cooldown}% velocidad ataque`);
  if (stats.mana) descLines.push(`+${stats.mana} mana`);
  if (stats.vida) descLines.push(`+${stats.vida} vida`);
  if (stats.velocidad) descLines.push(`+${stats.velocidad}% velocidad de movimiento`);
  return descLines.join("<br>");
}
