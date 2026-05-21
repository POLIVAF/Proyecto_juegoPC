class Player {
    constructor(x, y, name, charClass, gender) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        
        this.name = name;
        this.charClass = charClass;
        this.gender = gender;

        // --- SISTEMA DE RESERVA Y DEFENSA ---
        this.reserveHearts = []; // Slots de 100 HP (Piso 10 y 15)
        this.maxReserveSlots = 5;
        this.armor = 0;          // Aumenta con Pergaminos de Armadura
        this.isImmune = false;
        this.immunityTimer = 0;
        this.flashTimer = 0;     // Para el efecto visual de recibir daño
        
        // Base stats based on class
        if (this.charClass === 'warrior') {
            this.maxHp = 150;
            this.hp = 150;
            this.maxMana = 50;
            this.mana = 50;
            this.speed = 3;
            this.baseDamage = 25; // Store base before equipment
            this.damage = 25;
            this.color = this.gender === 'male' ? '#e74c3c' : '#c0392b'; // Reds
        } else { // Mage
            this.maxHp = 80;
            this.hp = 80;
            this.maxMana = 150;
            this.mana = 150;
            this.speed = 4;
            this.baseDamage = 15;
            this.damage = 15;
            this.color = this.gender === 'male' ? '#3498db' : '#2980b9'; // Blues
        }

        // Inventory & Stats
        this.damage = this.baseDamage;
        this.inventory = []; // Max 15 items
        this.inventoryMaxSlots = 15;
        this.isInventoryOpen = false; // Controla si se ve la mochila
        this.equipment = []; // Max 4 weapons/armor
        this.immunityTimer = 0;
        this.idleTimer = 0;
        this.poisonTimer = 0;
        this.stunTimer = 0;

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
    }

    update(keys, mouse, camera, dungeon, deltaTime) {
        // Handle Status Effects
        if (this.poisonTimer > 0) {
            this.poisonTimer--;
            this.hp -= (2 / 60); // 2 HP per second at 60fps
        }
        
        if (this.furyAuraTimer > 0) {
            this.furyAuraTimer--;
        }
        
        if (this.stunTimer > 0) {
            this.stunTimer--;
            this.isAttacking = false;
            return; // Cannot move or attack while stunned
        }

        // --- Lógica de Movimiento y Ataque original ---
        let dx = 0;
        let dy = 0;
        let currentSpeed = this.speed;

        if (this.powers.length > 0) {
            this.activePowerIndex = Math.min(this.activePowerIndex, this.powers.length - 1);
        }

        // Switch active power
        if (keys['1']) this.activePowerIndex = 0;
        if (keys['2']) this.activePowerIndex = 1;
        if (keys['3']) this.activePowerIndex = 2;

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
            if (keys['w'] || keys['ArrowUp']) dy -= 1;
            if (keys['s'] || keys['ArrowDown']) dy += 1;
            if (keys['a'] || keys['ArrowLeft']) dx -= 1;
            if (keys['d'] || keys['ArrowRight']) dx += 1;

            // Normalize diagonal movement
            if (dx !== 0 && dy !== 0) {
                let length = Math.sqrt(dx * dx + dy * dy);
                dx /= length;
                dy /= length;
            }
        }

        // Keep track of facing for attacks
        if (dx !== 0 || dy !== 0) {
            this.facing = { x: dx, y: dy };
            // Normalize facing direction
            let fLen = Math.sqrt(this.facing.x * this.facing.x + this.facing.y * this.facing.y);
            if (fLen > 0) {
                this.facing.x /= fLen;
                this.facing.y /= fLen;
            }
            this.idleTimer = 0; // Reset idle
        } else {
            this.idleTimer++;
            // Regenerate HP and Mana if idle for 1 second (approx 60 frames)
            if (this.idleTimer >= 60) {
                if (this.idleTimer % 30 === 0) { // Every half second after 1s
                    this.hp = Math.min(this.maxHp, this.hp + 1);
                    this.mana = Math.min(this.maxMana, this.mana + 1);
                }
            }
        }
        
        if (this.immunityTimer > 0) {
            this.immunityTimer--;
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
            this.attack(dungeon);
            this.attackTimer = 30; // cooldown
        }

        // Attack logic via Mouse Click
        if (mouse.clicked && this.attackTimer <= 0) {
            if (mouse.isVirtualButton) {
                // Virtual attack button preserves current facing direction
                mouse.isVirtualButton = false;
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
            }

            this.attack(dungeon);
            this.attackTimer = 30;
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

    attack(dungeon) {
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
        
        // Calculate Equipment Bonus
        let equipBonus = 0;
        for (let eq of this.equipment) {
            if (eq.type === 'weapon') equipBonus += 5;
        }
        
        let multiplier = 1 + (powerLevel - 1) * 0.2;
        
        if (this.currentAttackPower === 'wind') {
            // Wind Power: Aura of immunity, no attack
            this.immunityTimer = (1.5 + (powerLevel * 0.2)) * 60; // Frames (assuming 60fps)
            this.attackTimer = 30;
            this.isAttacking = false;
            return;
        }

        if (this.charClass === 'warrior') {
            // Melee attack
            let bDamage = 10;
            if (this.currentAttackPower === 'fire') bDamage = 15;
            if (this.currentAttackPower === 'water') bDamage = 12;
            if (this.currentAttackPower === 'earth') bDamage = 15;
            
            // Warrior specific powers
            if (this.currentAttackPower === 'double_strike') {
                bDamage = 20; // Deals double damage (2 hits combined)
            } else if (this.currentAttackPower === 'charge') {
                bDamage = 14;
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
                bDamage = 15;
            } else if (this.currentAttackPower === 'fury') {
                // Fury buff: increases current player damage by 2%
                this.damage = this.damage * 1.02;
                this.furyAuraTimer = 60; // 1 second red aura
                this.attackTimer = 30;
                this.isAttacking = false;
                console.log("¡Furia activa! Daño aumentado a: " + Math.round(this.damage));
                return;
            }

            this.damage = (bDamage + equipBonus) * multiplier;

            if (this.currentAttackPower === 'water') {
                this.attackTimer = 15; // Faster
            } else if (this.currentAttackPower === 'earth') {
                this.attackTimer = 45; // Slower
            } else {
                this.attackTimer = 30; // Normal
            }

            setTimeout(() => {
                this.isAttacking = false;
            }, 200); // Attack animation duration
        } else if (this.charClass === 'mage') {
            // Ranged attack
            let bDamage = 10;
            let pColor = '#fff';
            let pSpeed = 6;
            let pRadius = 5;
            
            if (this.currentAttackPower === 'fire') {
                pColor = '#e74c3c';
                pSpeed = 8;
                bDamage = 15;
            } else if (this.currentAttackPower === 'water') {
                pColor = '#3498db';
                this.attackTimer = 10; // Rapid fire
                bDamage = 12;
            } else if (this.currentAttackPower === 'earth') {
                pColor = '#d35400';
                pRadius = 15; // Bigger
                pSpeed = 4; // Slower
                this.attackTimer = 45; // Slower casting
                bDamage = 15;
            }

            this.projectiles.push({
                x: this.x,
                y: this.y,
                vx: this.facing.x * pSpeed,
                vy: this.facing.y * pSpeed,
                radius: pRadius,
                color: pColor,
                power: this.currentAttackPower,
                damage: (bDamage + equipBonus) * multiplier,
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
    }
}
