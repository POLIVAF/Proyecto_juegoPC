const RARITIES = {
  common: { key: "common", label: "Común", color: "#bdc3c7" },
  rare: { key: "rare", label: "Raro", color: "#3498db" },
  very_rare: { key: "very_rare", label: "Muy Raro", color: "#9b59b6" },
  epic: { key: "epic", label: "Épico", color: "#e67e22" },
  legendary: { key: "legendary", label: "Legendario", color: "#f1c40f" }
};

function getRarityColor(rarity) {
  return RARITIES[rarity] ? RARITIES[rarity].color : "#bdc3c7";
}

function getRarityLabel(rarity) {
  return RARITIES[rarity] ? RARITIES[rarity].label : "Común";
}

function rollRarity(isBoss = false) {
  let rand = Math.random();
  if (isBoss) {
    // Bosses guarantee higher rarities (Mínimo Raro, alta prob de épico/legendario)
    if (rand < 0.15) return "legendary";  // 15%
    if (rand < 0.45) return "epic";       // 30%
    if (rand < 0.80) return "very_rare";  // 35%
    return "rare";                        // 20%
  } else {
    // Probabilidades para enemigos comunes:
    // común (frecuente): 60%
    // raro (menos frecuente): 24%
    // muy raro (raro): 10%
    // épico (muy difícil): 5%
    // legendario (extremadamente raro): 1%
    if (rand < 0.01) return "legendary"; // 1%
    if (rand < 0.06) return "epic";      // 5%
    if (rand < 0.16) return "very_rare"; // 10%
    if (rand < 0.40) return "rare";      // 24%
    return "common";                     // 60%
  }
}
