import swordIcon from "lucide-static/icons/sword.svg";
import shieldIcon from "lucide-static/icons/shield.svg";
import wandIcon from "lucide-static/icons/wand.svg";
import shirtIcon from "lucide-static/icons/shirt.svg";
import crownIcon from "lucide-static/icons/crown.svg";
import dropletIcon from "lucide-static/icons/droplet.svg";
import scrollIcon from "lucide-static/icons/scroll.svg";
import heartIcon from "lucide-static/icons/heart.svg";
import gemIcon from "lucide-static/icons/gem.svg";

// SVG URL mappings
const SVG_URLS = {
  sword: swordIcon,
  shield: shieldIcon,
  wand: wandIcon,
  shirt: shirtIcon,
  crown: crownIcon,
  droplet: dropletIcon,
  scroll: scrollIcon,
  heart: heartIcon,
  gem: gemIcon
};

// Caches for optimization
const rawSvgCache = new Map();   // url -> raw SVG string
const imageCache = new Map();    // key -> Image object

/**
 * Helper to fetch and cache raw SVG content from its Vite asset URL
 */
async function getRawSvg(url) {
  if (rawSvgCache.has(url)) {
    return rawSvgCache.get(url);
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const text = await res.text();
    rawSvgCache.set(url, text);
    return text;
  } catch (err) {
    console.error("Failed to load SVG content:", url, err);
    return "";
  }
}

/**
 * Preloads all defined SVG icons into the raw cache
 */
async function preloadAllIcons() {
  const promises = Object.entries(SVG_URLS).map(async ([key, url]) => {
    await getRawSvg(url);
  });
  await Promise.all(promises);
  console.log("All Lucide SVGs preloaded successfully.");
}

/**
 * Converts manipulated SVG string to a canvas-compatible Image object
 * Uses Blob, URL.createObjectURL, onload/onerror callbacks, andURL.revokeObjectURL for safety
 */
function svgToImage(svgString, color, size) {
  return new Promise((resolve, reject) => {
    // Replace currentColor with custom color
    let processedSvg = svgString;
    processedSvg = processedSvg.replace(/stroke="currentColor"/g, `stroke="${color}"`);
    
    // Replace default width and height attributes (usually 24)
    processedSvg = processedSvg.replace(/width="24"/g, `width="${size}"`);
    processedSvg = processedSvg.replace(/height="24"/g, `height="${size}"`);

    const blob = new Blob([processedSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url); // prevent memory leak
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url); // prevent memory leak
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Gets or generates customized Image object from cache
 */
async function getIconImage(iconName, color, size) {
  const cacheKey = `${iconName}_${color}_${size}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey);
  }

  const url = SVG_URLS[iconName];
  if (!url) {
    console.warn(`Icon ${iconName} not defined in SVG_URLS.`);
    return null;
  }

  const rawSvg = await getRawSvg(url);
  if (!rawSvg) return null;

  try {
    const img = await svgToImage(rawSvg, color, size);
    imageCache.set(cacheKey, img);
    return img;
  } catch (err) {
    console.error(`Failed to generate Image for ${cacheKey}:`, err);
    return null;
  }
}

/**
 * Maps item parameters to Lucide icon key names
 */
function getIconName(item) {
  if (!item) return "gem";

  const type = item.type || "";
  const slot = item.slot || "";
  const name = item.name || "";
  const icon = item.icon || "";

  // Potions
  if (type.includes("potion") || type === "red_potion" || type === "blue_potion") {
    return "droplet";
  }

  // Scrolls
  if (type.includes("scroll") || type === "upgrade_scroll" || type === "armor_scroll") {
    return "scroll";
  }

  // Hearts
  if (type === "heart" || type === "reserve_heart" || type === "heart_plus") {
    return "heart";
  }

  // Weapons
  if (
    slot === "weapon" || 
    type === "weapon" || 
    type === "rare_weapon" || 
    type === "very_rare_weapon" || 
    type === "epic_weapon" || 
    type === "super_rare_weapon" || 
    type === "mythic_weapon" || 
    type === "STAFF_BLUE" || 
    type === "GREATSWORD_FROST"
  ) {
    const isMage = (item.classRestriction === "mage") ||
                   (type === "STAFF_BLUE") ||
                   (icon === "🔮") ||
                   (name.includes("Bastón") || name.includes("Cetro") || name.includes("Báculo"));
    return isMage ? "wand" : "sword";
  }

  // Armor slots
  if (slot === "head") return "crown";
  if (slot === "chest") return "shirt";
  if (slot === "legs" || slot === "gloves") return "shield";

  // Accessories
  if (slot === "ring" || slot === "pendant") return "gem";

  return "gem"; // fallback
}

/**
 * Renders a loaded icon to an HTML slot by drawing it onto a temporary Canvas with ctx.drawImage()
 */
function renderIconToSlot(slotElement, img, size) {
  slotElement.innerHTML = "";
  if (!img) return;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  
  const ctx = canvas.getContext("2d");
  
  // Center drawing of the icon
  const x = (size - img.width) / 2;
  const y = (size - img.height) / 2;
  
  ctx.drawImage(img, x, y);
  slotElement.appendChild(canvas);
}

// Expose global system variables and methods to game.js
window.InventoryIcons = {
  SVG_URLS,
  rawSvgCache,
  imageCache,
  preloadAllIcons,
  getIconImage,
  getIconName,
  renderIconToSlot
};

// Auto-start preloading raw icons on module load
preloadAllIcons();
