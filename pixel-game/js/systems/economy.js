/**
 * Economy System Module
 * Handles merchant shop inventory listings and item buy/sell price calculations.
 */

function getShopItems() {
  let scaleFloor = typeof floor !== 'undefined' ? floor : 1;
  let playerClass = (typeof player !== 'undefined' && player) ? player.charClass : "warrior";

  let weaponCommon = generateClassWeapon("common", scaleFloor, playerClass);
  let weaponRare = generateClassWeapon("rare", scaleFloor, playerClass);
  let weaponLegendary = generateClassWeapon("legendary", scaleFloor, playerClass);
  
  weaponCommon.price = 30 + (scaleFloor - 1) * 10;
  weaponRare.price = 75 + (scaleFloor - 1) * 20;
  weaponLegendary.price = 150 + (scaleFloor - 1) * 45;

  // Procedural Shop Armor & Accessories
  let shopArmor = generateRandomEquipment(scaleFloor, "rare");
  shopArmor.price = 50 + (scaleFloor - 1) * 12;

  let shopAccessory = generateRandomAccessory(Math.random() < 0.5 ? "ring" : "pendant", scaleFloor, "rare");
  shopAccessory.price = 45 + (scaleFloor - 1) * 10;

  return [
    {
      type: "red_potion",
      name: "Poción Roja",
      desc: `Restaura ${15 + (scaleFloor - 1) * 2} HP`,
      price: 15 + (scaleFloor - 1) * 3,
      icon: "🔴",
      color: "#e74c3c",
      healAmount: 15 + (scaleFloor - 1) * 2
    },
    {
      type: "blue_potion",
      name: "Poción Azul",
      desc: `Restaura ${15 + (scaleFloor - 1) * 2} Maná`,
      price: 15 + (scaleFloor - 1) * 3,
      icon: "🔵",
      color: "#3498db",
      manaAmount: 15 + (scaleFloor - 1) * 2
    },
    weaponCommon,
    weaponRare,
    weaponLegendary,
    shopArmor,
    shopAccessory,
    {
      type: "upgrade_scroll",
      name: "Pergamino de Mejora",
      desc: "+2 Daño Base Permanente",
      price: 40 + (scaleFloor - 1) * 8,
      icon: "📜",
      color: "#f39c12"
    },
    {
      type: "armor_scroll",
      name: "Pergamino de Armadura",
      desc: "+1 Defensa de Armadura",
      price: 50 + (scaleFloor - 1) * 10,
      icon: "🛡️",
      color: "#95a5a6",
      armorBonus: 1
    },
    {
      type: "reserve_heart",
      name: "Corazón de Reserva",
      desc: "Resucita con 100 HP al morir",
      price: 200,
      icon: "💖",
      color: "#e74c3c"
    }
  ];
}

function getItemSellValue(item) {
  if (!item) return 0;
  
  let scaleFloor = typeof floor !== 'undefined' ? floor : 1;

  // Base sell value based on rarity
  let rarity = item.rarity || "common";
  let baseVal = 5;
  if (rarity === "rare") baseVal = 15;
  else if (rarity === "very_rare") baseVal = 30;
  else if (rarity === "epic") baseVal = 50;
  else if (rarity === "legendary") baseVal = 100;

  // Add floor scaling
  let finalVal = baseVal + scaleFloor * Math.floor(baseVal * 0.1);

  // Check specific item types/overrides
  if (item.type === "red_potion" || item.type === "blue_potion") return 5;
  if (item.type === "upgrade_scroll") return 15;
  if (item.type === "armor_scroll") return 18;
  if (item.type === "reserve_heart") return 90;
  if (item.type === "heart" || item.type === "heart_plus") return 25;
  if (item.type === "STAFF_BLUE" || item.type === "GREATSWORD_FROST") return 80 + scaleFloor * 5;

  return finalVal;
}
