class Player {
    constructor(x, y, name, charClass, gender) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        
        this.name = name;
        this.charClass = charClass;
        this.gender = gender;

        // RPG experience and progression properties
        this.level = 1;
        this.exp = 0;
        this.nextLevelExp = 300;
        this.levelUpGlowTimer = 0;

        // --- SISTEMA DE RESERVA Y DEFENSA ---
        this.reserveHearts = []; // Slots de 100 HP (Piso 10 y 15)
        this.maxReserveSlots = 5;
        this.armor = 0;          // Aumenta con Pergaminos de Armadura
        this.isImmune = false;
        this.immunityTimer = 0;
        this.flashTimer = 0;     // Para el efecto visual de recibir daño
        
        // Base stats based on class
        if (this.charClass === 'warrior') {
            this.baseMaxHp = 150;
            this.maxHp = 150;
            this.hp = 150;
            this.baseMaxMana = 50;
            this.maxMana = 50;
            this.mana = 50;
            this.speed = 2.2;
            this.baseDamage = 25; // Store base before equipment
            this.damage = 25;
            this.color = this.gender === 'male' ? '#e74c3c' : '#c0392b'; // Reds
        } else { // Mage
            this.baseMaxHp = 80;
            this.maxHp = 80;
            this.hp = 80;
            this.baseMaxMana = 150;
            this.maxMana = 150;
            this.mana = 150;
            this.speed = 2.6;
            this.baseDamage = 15;
            this.damage = 15;
            this.color = this.gender === 'male' ? '#3498db' : '#2980b9'; // Blues
        }

        // Inventory & Stats
        this.damage = this.baseDamage;
        this.coins = 0;
        this.inventory = []; // Max 15 items
        this.inventoryMaxSlots = 15;
        this.isInventoryOpen = false; // Controla si se ve la mochila
        
        // Structured Equipment Object (9 Slots)
        this.equipment = {
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

        // Equip Class Starter Weapon (without modifiers)
        if (this.charClass === 'warrior') {
            this.equipment.weapon = {
                type: 'weapon',
                name: 'Espada de Dos Manos Básica',
                color: '#bdc3c7',
                bonus: 0,
                desc: 'Arma inicial sin modificadores.'
            };
        } else {
            this.equipment.weapon = {
                type: 'weapon',
                name: 'Bastón de Mago Básico',
                color: '#bdc3c7',
                bonus: 0,
                desc: 'Bastón inicial sin modificadores.'
            };
        }

        this.damage = this.getDamage();
        this.immunityTimer = 0;
        this.poisonTimer = 0;
        this.stunTimer = 0;
        this.stunImmunityTimer = 0;
        
        // Projectiles for mage
        this.projectiles = [];
        this.facing = { x: 0, y: 1 };
        this.isAttacking = false;
        this.attackTimer = 0;
        
        // Power System
        this.powers = []; // Array of power objects: { id: 'fire', color: 'red', type: 'fire' }
        this.activePowerIndex = 0;
        this.furyAuraTimer = 0;
        this.hitEnemies = [];

        // Combat & Regeneration states
        this.combatTimer = 0;
        this.lastDamageTimer = 0;
        this.stillTimer = 0;
        this.lastHp = this.hp;
    }

    gainExp(amount) {
        if (this.level === undefined) this.level = 1;
        if (this.exp === undefined) this.exp = 0;
        if (this.nextLevelExp === undefined) this.nextLevelExp = 300;

        this.exp += amount;
        let leveledUp = false;
        let oldLevel = this.level;

        while (this.exp >= this.nextLevelExp) {
            this.exp -= this.nextLevelExp;
            this.level++;
            this.nextLevelExp *= 2; // Doubled each level

            // Level Up Stats Boost
            if (this.charClass === 'warrior') {
                this.baseMaxHp += 20;
                this.baseMaxMana += 5;
                this.baseDamage += 3;
            } else { // Mage
                this.baseMaxHp += 10;
                this.baseMaxMana += 15;
                this.baseDamage += 2;
            }
            leveledUp = true;
        }

        if (leveledUp) {
            this.recalculateStats();
            this.hp = this.maxHp; // Full heal
            this.mana = this.maxMana; // Full mana restore
            this.levelUpGlowTimer = 60; // 1 second animation at 60 FPS
            
            // Add visual floating text on player
            if (typeof addFloatingText === 'function') {
                addFloatingText("¡SUBIDA DE NIVEL! ⭐", this.x, this.y - 30, "#f1c40f");
            }
            
            // Play synthesized level up chime
            if (typeof playLevelUpSound === 'function') {
                playLevelUpSound();
            }

            // Check level milestones reached: 3, 7, 10, 12
            let triggeredReward = false;
            for (let lv = oldLevel + 1; lv <= this.level; lv++) {
                if ([3, 7, 10, 12].includes(lv)) {
                    triggeredReward = true;
                }
            }

            if (triggeredReward && typeof showRewardScreen === 'function') {
                window.isLevelUpReward = true;
                setTimeout(() => {
                    showRewardScreen();
                }, 500);
            }
        }
        
        // Save progression automatically
        if (typeof saveGame === 'function') {
            saveGame();
        }
    }

    recalculateStats() {
        if (this.baseMaxHp === undefined) this.baseMaxHp = this.charClass === 'warrior' ? 150 : 80;
        if (this.baseMaxMana === undefined) this.baseMaxMana = this.charClass === 'warrior' ? 50 : 150;

        let extraHp = 0;
        let extraMana = 0;
        let totalFuerza = 0;
        let totalDmgPercent = 0;
        let totalDefense = 0;
        let totalCooldownReduction = 0; // in %

        if (this.equipment) {
            for (let slot in this.equipment) {
                let eq = this.equipment[slot];
                if (!eq) continue;

                // Flat bonus from existing items
                if (eq.bonus !== undefined) {
                    totalDmgPercent += eq.bonus;
                }

                // Stats from accessories
                if (eq.stats) {
                    if (eq.stats.fuerza) totalFuerza += eq.stats.fuerza;
                    if (eq.stats.daño) totalDmgPercent += eq.stats.daño / 100;
                    if (eq.stats.defensa) totalDefense += eq.stats.defensa;
                    if (eq.stats.mana) extraMana += eq.stats.mana;
                    if (eq.stats.vida) extraHp += eq.stats.vida;
                    if (eq.stats.cooldown) totalCooldownReduction += eq.stats.cooldown;
                }
            }
        }

        // Apply Strength (fuerza): +2% damage per point
        totalDmgPercent += totalFuerza * 0.02;

        this.maxHp = this.baseMaxHp + extraHp;
        this.maxMana = this.baseMaxMana + extraMana;

        // Keep current HP and Mana capped
        this.hp = Math.min(this.maxHp, this.hp);
        this.mana = Math.min(this.maxMana, this.mana);

        // Damage calculation
        this.damage = this.baseDamage * (1 + totalDmgPercent);

        // Defense calculations
        this.accessoryDefense = totalDefense;
        this.cooldownReduction = Math.min(50, totalCooldownReduction); // cap at 50%
    }

    getArmor() {
        return (this.armor || 0) + (this.accessoryDefense || 0);
    }

    getCooldown(baseCooldown) {
        let reduction = this.cooldownReduction || 0; // in percent
        return Math.max(5, Math.round(baseCooldown * (1 - reduction / 100)));
    }

    getDamage() {
        this.recalculateStats();
        return this.damage;
    }

    update(keys, mouse, camera, dungeon, deltaTime) {
        // Prevent Wall Sticking (Auto-unlock if stuck in a wall)
        if (dungeon && dungeon.isWallRect) {
            let insideWall = dungeon.isWallRect(this.x, this.y, this.width, this.height);
            if (insideWall) {
                console.warn("Player stuck in wall! Auto-unlocking...");
                let foundSafe = false;
                // Search in concentric squares (up to 3 tiles radius)
                for (let r = 1; r <= 3 && !foundSafe; r++) {
                    let directions = [
                        {x: 0, y: -r}, {x: 0, y: r}, {x: -r, y: 0}, {x: r, y: 0},
                        {x: -r, y: -r}, {x: r, y: -r}, {x: -r, y: r}, {x: r, y: r}
                    ];
                    for (let dir of directions) {
                        let tx = this.x + dir.x * dungeon.tileSize;
                        let ty = this.y + dir.y * dungeon.tileSize;
                        if (!dungeon.isWallRect(tx, ty, this.width, this.height)) {
                            this.x = tx;
                            this.y = ty;
                            foundSafe = true;
                            console.log(`Resolved wall collision, moved player to (${tx}, ${ty})`);
                            break;
                        }
                    }
                }
            }
        }

        // Handle Status Effects
        if (this.poisonTimer > 0) {
            this.poisonTimer--;
            this.hp -= (2 / 60); // 2 HP per second at 60fps
        }
        
        if (this.furyAuraTimer > 0) {
            this.furyAuraTimer--;
        }
        
        if (this.stunImmunityTimer > 0) {
            this.stunImmunityTimer--;
        }

        if (this.stunTimer > 0) {
            this.stunTimer--;
            this.isAttacking = false;
            if (this.stunTimer <= 0) {
                this.stunImmunityTimer = 60; // 1 second immunity after stun ends
            }
            return; // Cannot move or attack while stunned
        }

        // --- Lógica de Movimiento y Ataque original ---
        let dx = 0;
        let dy = 0;
        let currentSpeed = this.speed;

        // Switch active power
        if (keys['1']) this.activePowerIndex = 0;
        if (keys['2']) this.activePowerIndex = 1;
        if (keys['3']) this.activePowerIndex = 2;
        if (keys['4']) this.activePowerIndex = 3;

        if (this.powers.length > 0) {
            this.activePowerIndex = Math.min(this.activePowerIndex, this.powers.length - 1);
        }

        // Joystick controls if active
        if (window.touchJoystick && window.touchJoystick.active) {
            dx = window.touchJoystick.dx;
            dy = window.touchJoystick.dy;
            let magnitude = Math.sqrt(dx * dx + dy * dy);
            if (magnitude > 1) {
                dx /= magnitude;
                dy /= magnitude;
                magnitude = 1;
            }
            // Analog speed: magnitude < 0.5 is walking, >= 0.5 is running
            if (magnitude < 0.5) {
                currentSpeed = this.speed * 0.5; // walk
            } else {
                currentSpeed = this.speed; // run
            }
        } else {
            if (keys['w'] || keys['W'] || keys['KeyW'] || keys['ArrowUp']) dy -= 1;
            if (keys['s'] || keys['S'] || keys['KeyS'] || keys['ArrowDown']) dy += 1;
            if (keys['a'] || keys['A'] || keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
            if (keys['d'] || keys['D'] || keys['KeyD'] || keys['ArrowRight']) dx += 1;

            // Normalize diagonal movement
            if (dx !== 0 && dy !== 0) {
                let length = Math.sqrt(dx * dx + dy * dy);
                dx /= length;
                dy /= length;
            }
        }

        // Find closest enemy for auto-aim
        let closestEnemy = null;
        let closestDist = 250;
        if (typeof enemies !== 'undefined') {
            for (let enemy of enemies) {
                if (!enemy || enemy.hp <= 0) continue;
                let edx = enemy.x - this.x;
                let edy = enemy.y - this.y;
                let dist = Math.sqrt(edx * edx + edy * edy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = enemy;
                }
            }
        }

        // Keep track of facing for attacks
        if (closestEnemy && (this.isAttacking || this.attackTimer > 0)) {
            // Smoothly rotate towards the target during attacks
            let targetDx = closestEnemy.x - this.x;
            let targetDy = closestEnemy.y - this.y;
            let targetLen = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
            if (targetLen > 0) {
                let targetX = targetDx / targetLen;
                let targetY = targetDy / targetLen;
                let lerpRate = 0.25; // Smooth rotation interpolation rate
                this.facing.x += (targetX - this.facing.x) * lerpRate;
                this.facing.y += (targetY - this.facing.y) * lerpRate;
            }
        } else if (dx !== 0 || dy !== 0) {
            // Normal movement facing when not attacking
            this.facing = { x: dx, y: dy };
        }

        // Normalize facing direction
        let fLen = Math.sqrt(this.facing.x * this.facing.x + this.facing.y * this.facing.y);
        if (fLen > 0) {
            this.facing.x /= fLen;
            this.facing.y /= fLen;
        }

        // Detect damage received (if current hp is less than lastHp)
        if (this.hp < this.lastHp) {
            this.lastDamageTimer = 180; // 3 seconds of lockout at 60 FPS
            this.combatTimer = 300;     // 5 seconds of combat at 60 FPS
            this.stillTimer = 0;
        }
        this.lastHp = this.hp;

        // Decrement combat and damage lockouts
        if (this.combatTimer > 0) this.combatTimer--;
        if (this.lastDamageTimer > 0) this.lastDamageTimer--;

        // Determine if player is standing still (quieto)
        if (dx === 0 && dy === 0 && !this.isAttacking) {
            this.stillTimer++;
        } else {
            this.stillTimer = 0;
        }

        // Automatic health regeneration
        // Active if: (out of combat OR standing still for 1.5s/90 frames) AND no damage in last 3s
        if (this.lastDamageTimer <= 0 && (this.combatTimer <= 0 || this.stillTimer >= 90)) {
            let regenRate = this.stillTimer >= 90 ? 0.03 : 0.015; // 3% if still, 1.5% if out of combat and moving
            this.hp = Math.min(this.maxHp, this.hp + (regenRate * this.maxHp) / 60);
        }

        // Automatic mana regeneration
        // Active at 3% when out of combat OR standing still for 1.5s, otherwise 1% when in combat
        let manaRegenRate = (this.combatTimer <= 0 || this.stillTimer >= 90) ? 0.03 : 0.01;
        this.mana = Math.min(this.maxMana, this.mana + (manaRegenRate * this.maxMana) / 60);
        
        if (this.immunityTimer > 0) {
            this.immunityTimer--;
        }
        if (this.flashTimer > 0) {
            this.flashTimer--;
        }

        let newX = this.x + dx * currentSpeed;
        let newY = this.y + dy * currentSpeed;

        // Collision with walls using Axis-Aligned Bounding Box
        if (!dungeon.isWallRect(newX, newY, this.width, this.height)) {
            this.x = newX;
            this.y = newY;
        } else {
            // Try sliding (move only X or only Y)
            if (!dungeon.isWallRect(newX, this.y, this.width, this.height)) {
                this.x = newX;
            } else if (!dungeon.isWallRect(this.x, newY, this.width, this.height)) {
                this.y = newY;
            }
        }
        // Attack logic via Spacebar
        if (keys[' '] && this.attackTimer <= 0) {
            this.attack(dungeon, true); // Auto-aim!
            this.attackTimer = this.getCooldown(30); // cooldown
        }

        // Attack logic via Mouse Click or Hold
        let wantsAttack = mouse.clicked || (window.touchAttackHeld && this.attackTimer <= 0);
        if (wantsAttack && this.attackTimer <= 0) {
            let useAutoAim = false;
            if (mouse.isVirtualButton || window.touchAttackHeld) {
                // Virtual attack button preserves current facing direction
                mouse.isVirtualButton = false;
                useAutoAim = true; // Auto-aim!
            } else {
                // Calculate direction from player to mouse
                let playerScreenX = this.x - camera.x;
                let playerScreenY = this.y - camera.y;
                let aimX = mouse.x - playerScreenX;
                let aimY = mouse.y - playerScreenY;
                
                // Normalize
                let length = Math.sqrt(aimX * aimX + aimY * aimY);
                if (length > 0) {
                    this.facing = { x: aimX / length, y: aimY / length };
                }
                useAutoAim = false; // Manual aim
            }

            this.attack(dungeon, useAutoAim);
            this.attackTimer = this.getCooldown(30);
        }

        if (this.attackTimer > 0) this.attackTimer--;

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            
            if (p.life <= 0 || dungeon.isWall(p.x, p.y)) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    attack(dungeon, useAutoAim = true) {
        this.combatTimer = 300; // 5 seconds at 60 FPS
        this.stillTimer = 0;

        if (useAutoAim) {
            // Find closest enemy for auto-aim snap on initiation
            let closestEnemy = null;
            let closestDist = 250;
            if (typeof enemies !== 'undefined') {
                for (let enemy of enemies) {
                    if (!enemy || enemy.hp <= 0) continue;
                    let edx = enemy.x - this.x;
                    let edy = enemy.y - this.y;
                    let dist = Math.sqrt(edx * edx + edy * edy);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestEnemy = enemy;
                    }
                }
            }

            if (closestEnemy) {
                let targetDx = closestEnemy.x - this.x;
                let targetDy = closestEnemy.y - this.y;
                let targetLen = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
                if (targetLen > 0) {
                    this.facing = { x: targetDx / targetLen, y: targetDy / targetLen };
                }
            }
        }
        let activePower = this.powers[this.activePowerIndex];
        let requestedPower = activePower ? activePower.id : 'none';
        
        // Mana check
        if (requestedPower !== 'none') {
            if (this.mana >= 15) {
                this.mana -= 15;
                this.currentAttackPower = requestedPower;
                this.currentAttackColor = activePower.color;
            } else {
                this.currentAttackPower = 'none'; // Fallback to basic attack
                this.currentAttackColor = 'white';
            }
        } else {
            this.currentAttackPower = 'none';
            this.currentAttackColor = 'white';
        }

        this.isAttacking = true;
        this.hitEnemies = [];
        
        // Find current power level
        let powerLevel = 1;
        if (this.currentAttackPower && this.currentAttackPower !== 'none') {
            let activePowerObj = this.powers[this.activePowerIndex];
            if (activePowerObj) {
                powerLevel = activePowerObj.level || 1;
            }
        }
        
        let multiplier = 1 + (powerLevel - 1) * 0.2;
        
        if (this.currentAttackPower === 'wind') {
            // Wind Power: Aura of immunity, no attack
            this.immunityTimer = (1.5 + (powerLevel * 0.2)) * 60; // Frames (assuming 60fps)
            this.attackTimer = this.getCooldown(30);
            this.isAttacking = false;
            return;
        }

        if (this.charClass === 'warrior') {
            // Melee attack
            let factor = 1.0;
            if (this.currentAttackPower === 'fire') factor = 1.5;
            if (this.currentAttackPower === 'water') factor = 1.2;
            if (this.currentAttackPower === 'earth') factor = 1.5;
            
            // Warrior specific powers
            if (this.currentAttackPower === 'double_strike') {
                factor = 2.0; // Deals double damage
            } else if (this.currentAttackPower === 'charge') {
                factor = 1.4;
                // Dash/Charge forward checking wall collision in steps
                if (dungeon) {
                    let dashDistance = 80;
                    let step = 5;
                    for (let d = 0; d < dashDistance; d += step) {
                        let testX = this.x + this.facing.x * step;
                        let testY = this.y + this.facing.y * step;
                        if (!dungeon.isWallRect(testX, testY, this.width, this.height)) {
                            this.x = testX;
                            this.y = testY;
                        } else {
                            break;
                        }
                    }
                }
            } else if (this.currentAttackPower === 'knockback') {
                factor = 1.5;
            } else if (this.currentAttackPower === 'fury') {
                // Fury buff: permanently increases baseDamage by 2%
                this.baseDamage = this.baseDamage * 1.02;
                this.damage = this.getDamage();
                this.furyAuraTimer = 60; // 1 second red aura
                this.attackTimer = this.getCooldown(30);
                this.isAttacking = false;
                console.log("¡Furia activa! Daño base permanentemente aumentado a: " + Math.round(this.baseDamage));
                return;
            }

            this.damage = this.getDamage() * factor * multiplier;

            if (this.currentAttackPower === 'water') {
                this.attackTimer = this.getCooldown(15); // Faster
            } else if (this.currentAttackPower === 'earth') {
                this.attackTimer = this.getCooldown(45); // Slower
            } else {
                this.attackTimer = this.getCooldown(30); // Normal
            }

            setTimeout(() => {
                this.isAttacking = false;
            }, 200); // Attack animation duration
        } else if (this.charClass === 'mage') {
            // Ranged attack
            let factor = 1.0;
            let pColor = '#fff';
            let pSpeed = 6;
            let pRadius = 5;
            
            if (this.currentAttackPower === 'fire') {
                pColor = '#e74c3c';
                pSpeed = 8;
                factor = 1.5;
            } else if (this.currentAttackPower === 'water') {
                pColor = '#3498db';
                this.attackTimer = this.getCooldown(10); // Rapid fire
                factor = 1.2;
            } else if (this.currentAttackPower === 'earth') {
                pColor = '#d35400';
                pRadius = 15; // Bigger
                pSpeed = 4; // Slower
                this.attackTimer = this.getCooldown(45); // Slower casting
                factor = 1.5;
            }

            this.projectiles.push({
                x: this.x,
                y: this.y,
                vx: this.facing.x * pSpeed,
                vy: this.facing.y * pSpeed,
                radius: pRadius,
                color: pColor,
                power: this.currentAttackPower,
                damage: this.getDamage() * factor * multiplier,
                life: 60
            });
            setTimeout(() => {
                this.isAttacking = false;
            }, 100);
        }
    }

    draw(ctx, camera) {
        let drawX = this.x - camera.x;
        let drawY = this.y - camera.y;

        // 1. Primero manejas la transparencia si es inmune
        if (this.immunityTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // 2. Dibujas el cuerpo base del jugador
        if (this.flashTimer > 0) ctx.fillStyle = 'white';
        else ctx.fillStyle = this.poisonTimer > 0 ? '#27ae60' : this.color;

        ctx.fillRect(drawX - this.width/2, drawY - this.height/2, this.width, this.height);
        
        // --- AQUÍ VA EL CÓDIGO DE LA ARMADURA ---
        // Se dibuja DESPUÉS del cuerpo para que el borde quede por encima
        if (this.armor > 0) {
            ctx.strokeStyle = '#bdc3c7'; // Color plata
            ctx.lineWidth = Math.min(this.armor, 4); // El grosor sube con la armadura
            ctx.strokeRect(drawX - this.width/2, drawY - this.height/2, this.width, this.height);
        }
        // ----------------------------------------

        // Reset globalAlpha for details
        ctx.globalAlpha = 1.0; 
        
        // Draw Stun Effect
        if (this.stunTimer > 0) {
            ctx.fillStyle = '#f1c40f';
            ctx.fillText("⭐", drawX - 10, drawY - this.height/2 - 10);
        }
        
        // Draw Wind Immunity Aura
        if (this.immunityTimer > 0) {
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(drawX, drawY, this.width, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 1;
        }

        // Draw Facing Indicator (eyes)
        ctx.fillStyle = 'white';
        let eyeOffsetX = this.facing.x * 6;
        let eyeOffsetY = this.facing.y * 6;
        ctx.fillRect(drawX + eyeOffsetX - 2, drawY + eyeOffsetY - 2, 4, 4);

        // Draw Warrior Attack
        if (this.isAttacking && this.charClass === 'warrior') {
            ctx.fillStyle = this.currentAttackColor || 'white';
            if (this.currentAttackPower === 'double_strike') {
                ctx.beginPath();
                ctx.arc(drawX + this.facing.x * 16 - this.facing.y * 6, drawY + this.facing.y * 16 + this.facing.x * 6, 12, 0, Math.PI * 2);
                ctx.arc(drawX + this.facing.x * 24 + this.facing.y * 6, drawY + this.facing.y * 24 - this.facing.x * 6, 12, 0, Math.PI * 2);
                ctx.fill();
            } else {
                let radius = this.currentAttackPower === 'earth' ? 25 : 15; // Earth is wider
                ctx.beginPath();
                ctx.arc(drawX + this.facing.x * 20, drawY + this.facing.y * 20, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw Fury Aura
        if (this.furyAuraTimer > 0) {
            ctx.strokeStyle = 'rgba(192, 57, 43, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(drawX, drawY, this.width, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 1;
        }

        // Draw Mage projectiles
        for (let p of this.projectiles) {
            ctx.fillStyle = p.color || '#f1c40f';
            ctx.beginPath();
            ctx.arc(p.x - camera.x, p.y - camera.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw Level Up Glow Effect
        if (this.levelUpGlowTimer > 0) {
            this.levelUpGlowTimer--;
            
            let alpha = this.levelUpGlowTimer / 60;
            
            // Semi-transparent golden pillar
            ctx.fillStyle = `rgba(241, 196, 15, ${alpha * 0.45})`;
            ctx.fillRect(drawX - 25, drawY - 100, 50, 115);
            
            // Glowing expand rings
            ctx.strokeStyle = `rgba(241, 196, 15, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(drawX, drawY, 20 + (60 - this.levelUpGlowTimer) * 0.75, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 1;
            
            // Floating stars (✨) rising
            ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
            ctx.font = "12px sans-serif";
            ctx.textAlign = "center";
            for (let i = 0; i < 5; i++) {
                let sparkY = drawY - 10 - ((60 - this.levelUpGlowTimer) * 1.8 + i * 15) % 90;
                let sparkX = drawX + Math.sin((60 - this.levelUpGlowTimer) * 0.15 + i) * 20;
                ctx.fillText("✨", sparkX, sparkY);
            }
        }
    }
}
