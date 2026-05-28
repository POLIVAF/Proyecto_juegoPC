class BossFloor15 extends Boss {
    constructor(x, y, floor) {
        super(x, y, floor);
        this.width = 90;
        this.height = 90;
        this.color = '#2c3e50'; 
        
        // 1,000,000 HP and 10 HP bars
        this.maxHp = 1000000; 
        this._hp = this.maxHp;
        this.visualHp = this.maxHp;
        this.armor = 0.70; // 70% damage reduction
        this.numHpBars = 10;
        this.name = "Archimago del Vacío";
        
        this.projectiles = [];
        this.lightningStrikes = [];
        this.attackTick = 0; // Para controlar el patrón rítmico

        // Custom Mechanics
        this.prevHp = this.maxHp;
        this.teleportCooldown = 0;
        this.summonCooldown = 180; // Summon minions every 6-8 seconds
        
        // Cataclysm Ultimate
        this.cataclysmTimer = 0;
        this.cataclysmCooldown = 300; // time between cataclysms (5 seconds initially)
        this.safeZones = [];
    }

    update(player, dungeon, deltaTime) {
        if (super.update(player, dungeon, deltaTime)) return;
        this.attackTick++;

        if (this.teleportCooldown > 0) this.teleportCooldown--;
        if (this.cataclysmCooldown > 0) this.cataclysmCooldown--;

        // --- HIT DETECTION FOR TELEPORT ON HIT ---
        if (this._hp < this.prevHp) {
            let hpRatio = this._hp / this.maxHp;
            // Only teleport in Phase 2 or with 8% chance in Phase 1
            let chance = this.phase === 2 ? 0.12 : 0.05;
            if (Math.random() < chance && this.teleportCooldown <= 0 && this.cataclysmTimer <= 0) {
                this.teleportNearPlayer(player, dungeon);
            }
            this.prevHp = this._hp;
        }

        // --- CATACLYSM ULTIMATE LOGIC ---
        if (this.phase === 2 && this.cataclysmCooldown <= 0 && this.cataclysmTimer <= 0) {
            this.startCataclysm(player, dungeon);
        }

        if (this.cataclysmTimer > 0) {
            this.cataclysmTimer--;
            this.armor = 0.95; // Extreme resistance during cataclysm
            this.speed = 0; // Stationary
            
            // Draw portal particles pulling in
            if (Math.random() < 0.4 && typeof floatingTexts !== 'undefined') {
                floatingTexts.push({
                    text: "🔮",
                    x: this.x + (Math.random() - 0.5) * 200,
                    y: this.y + (Math.random() - 0.5) * 200,
                    vx: (this.x - (this.x + (Math.random() - 0.5) * 200)) * -0.05,
                    vy: (this.y - (this.y + (Math.random() - 0.5) * 200)) * -0.05,
                    alpha: 1.0,
                    color: "#9b59b6"
                });
            }

            if (this.cataclysmTimer === 0) {
                // Execute Cataclysm!
                this.executeCataclysm(player);
            }
            
            // skip regular actions while casting cataclysm
            this.updateProjectiles(player, dungeon);
            this.updateLightnings(player);
            return;
        }

        // --- PHASE 1: PATRONES RÍTMICOS (> 50% HP) ---
        if (this.phase === 1) {
            // Cada 60 frames lanza una ráfaga en estrella (12 proyectiles ahora!)
            if (this.attackTick % 55 === 0) {
                this.shootPatternSpiral();
            }
        } 
        // --- FASE 2: CAOS AL AZAR (< 50% HP) ---
        else {
            this.color = '#d35400'; // Molten Orange
            
            // Proyectiles al azar en todas direcciones
            if (Math.random() < 0.18) {
                this.shootRandom();
            }

            // Rayos cayendo al azar cerca del jugador para forzar movimiento (más rápidos!)
            if (Math.random() < 0.12) {
                this.createLightningChaos(player);
            }

            // Summon Void Minions
            this.summonCooldown--;
            if (this.summonCooldown <= 0) {
                this.summonMinions(dungeon);
                this.summonCooldown = 420; // every 7 seconds
            }
        }

        this.updateProjectiles(player, dungeon);
        this.updateLightnings(player);
    }

    die() {
        console.log("¡El Archimago ha sido derrotado!");
        return {
            x: this.x,
            y: this.y,
            type: 'STAFF_BLUE',
            name: 'Bastón de Mago Azul',
            description: 'Aumenta el poder arcano un 5%',
            bonus: 0.05,
            color: '#3498db' // Azul para el ítem
        };
    }

    teleportNearPlayer(player, dungeon) {
        let angle = Math.random() * Math.PI * 2;
        let dist = 100 + Math.random() * 80;
        let tx = player.x + Math.cos(angle) * dist;
        let ty = player.y + Math.sin(angle) * dist;
        
        if (!dungeon.isWallRect(tx, ty, this.width, this.height)) {
            // Leave a projectile at old position
            this.projectiles.push({
                x: this.x,
                y: this.y,
                vx: (player.x - this.x) * 0.02,
                vy: (player.y - this.y) * 0.02,
                size: 8
            });

            this.x = tx;
            this.y = ty;
            this.teleportCooldown = 150; // 2.5 seconds cooldown
            if (typeof addFloatingText !== 'undefined') {
                addFloatingText("🔮 TRANSLACIÓN", this.x, this.y - 45, "#9b59b6");
            }
        }
    }

    startCataclysm(player, dungeon) {
        let cx = dungeon.width * dungeon.tileSize / 2;
        let cy = dungeon.height * dungeon.tileSize / 2;
        this.x = cx;
        this.y = cy;
        
        this.cataclysmTimer = 240; // 4 seconds cast
        this.cataclysmCooldown = 720; // 12 seconds cooldown
        
        // Spawn 2 Safe Zones
        this.safeZones = [
            {
                x: player.x + (Math.random() - 0.5) * 80,
                y: player.y + (Math.random() - 0.5) * 80,
                radius: 50
            },
            {
                x: cx + (Math.random() - 0.5) * 240,
                y: cy + (Math.random() - 0.5) * 240,
                radius: 50
            }
        ];
        
        if (typeof addFloatingText !== 'undefined') {
            addFloatingText("⚡ CATACLISMO ARCANO INICIADO ⚡", cx, cy - 60, "#e74c3c");
        }
    }

    executeCataclysm(player) {
        this.armor = 0.70; // Reset armor
        let inSafeZone = false;
        
        this.safeZones.forEach(sz => {
            let dist = Math.sqrt((player.x - sz.x)**2 + (player.y - sz.y)**2);
            if (dist < sz.radius) {
                inSafeZone = true;
            }
        });
        
        if (!inSafeZone) {
            let dmg = Math.max(5, 50 - player.getArmor());
            player.hp -= dmg;
            if (typeof addFloatingText !== 'undefined') {
                addFloatingText("⚡ GOLPEADO POR CATACLISMO -" + dmg, player.x, player.y - 20, "#e74c3c");
            }
        } else {
            if (typeof addFloatingText !== 'undefined') {
                addFloatingText("🛡️ A SALVO", player.x, player.y - 20, "#3498db");
            }
        }
        
        this.safeZones = [];
        // Screen flash effect is handled by drawing a white rectangle over the whole screen next frame
        this.cataclysmFlash = 15; // 15 frames of white screen overlay
    }

    summonMinions(dungeon) {
        if (typeof Enemy !== 'undefined' && typeof enemies !== 'undefined') {
            if (typeof addFloatingText !== 'undefined') {
                addFloatingText("👾 INVOCAR SOMBRAS", this.x, this.y - 45, "#2c3e50");
            }
            let angles = [0, Math.PI];
            angles.forEach(ang => {
                let sx = this.x + Math.cos(ang) * 60;
                let sy = this.y + Math.sin(ang) * 60;
                if (!dungeon.isWallRect(sx, sy, 20, 20)) {
                    let slime = new Enemy(sx, sy, this.floor, 'poison');
                    slime.color = '#34495e'; // Shadow colour
                    slime.name = "Sombra del Vacío";
                    slime.maxHp = 1500; // strong summons
                    slime.hp = slime.maxHp;
                    slime.damage = 15;
                    slime.speed = 2.4;
                    enemies.push(slime);
                }
            });
        }
    }

    // Patrón Ordenado: Dispara 12 balas en círculo (buffed from 8)
    shootPatternSpiral() {
        let numProjectiles = 12;
        for (let i = 0; i < numProjectiles; i++) {
            let angle = (Math.PI * 2 / numProjectiles) * i;
            this.projectiles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                size: 8
            });
        }
    }

    // Ataque al Azar: Dispara ráfagas desordenadas
    shootRandom() {
        let randomAngle = Math.random() * Math.PI * 2;
        this.projectiles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(randomAngle) * (Math.random() * 5 + 2.5),
            vy: Math.sin(randomAngle) * (Math.random() * 5 + 2.5),
            size: 6
        });
    }

    createLightningChaos(player) {
        let offsetX = (Math.random() - 0.5) * 160;
        let offsetY = (Math.random() - 0.5) * 160;
        
        this.lightningStrikes.push({
            x: player.x + offsetX,
            y: player.y + offsetY,
            timer: 20, // Rayos caen un 50% más rápido! (warning de 20 frames en vez de 30)
            active: true
        });
    }

    updateProjectiles(player, dungeon) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;

            let dist = Math.sqrt((p.x - player.x)**2 + (p.y - player.y)**2);
            if (dist < 25) {
                player.hp -= Math.max(1, 10 - player.getArmor());
                this.projectiles.splice(i, 1);
                continue;
            }

            if (dungeon.isWallRect(p.x, p.y, 5, 5)) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    updateLightnings(player) {
        for (let i = this.lightningStrikes.length - 1; i >= 0; i--) {
            let l = this.lightningStrikes[i];
            l.timer--;
            
            if (l.timer === 0) {
                let dist = Math.sqrt((player.x - l.x)**2 + (player.y - l.y)**2);
                if (dist < 55) player.hp -= Math.max(1, 30 - player.getArmor()); // buffed damage
            }
            
            if (l.timer < -15) this.lightningStrikes.splice(i, 1);
        }
    }

    draw(ctx, camera) {
        // Base boss drawing (flash hit, shake)
        super.draw(ctx, camera);

        // Draw screen flash if cataclysm went off
        if (this.cataclysmFlash > 0) {
            this.cataclysmFlash--;
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${this.cataclysmFlash / 15})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
        }

        // Visual of safe zones during Cataclysm casting
        if (this.cataclysmTimer > 0) {
            this.safeZones.forEach(sz => {
                ctx.save();
                let dx = sz.x - camera.x;
                let dy = sz.y - camera.y;
                ctx.strokeStyle = '#3498db';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(dx, dy, sz.radius, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.fillStyle = 'rgba(52, 152, 219, 0.15)';
                ctx.beginPath();
                ctx.arc(dx, dy, sz.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }

        // Visual de proyectiles
        this.projectiles.forEach(p => {
            ctx.save();
            ctx.fillStyle = this.phase === 1 ? '#3498db' : '#e74c3c'; 
            ctx.beginPath();
            ctx.arc(p.x - camera.x, p.y - camera.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Visual de rayos
        this.lightningStrikes.forEach(l => {
            let dx = l.x - camera.x;
            let dy = l.y - camera.y;

            if (l.timer > 0) {
                // Círculo de aviso parpadeante (glowing red outline in P2)
                ctx.save();
                ctx.strokeStyle = this.phase === 1 ? `rgba(255, 255, 255, ${Math.random()})` : `rgba(231, 76, 60, ${Math.random()})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(dx, dy, 55, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else {
                ctx.save();
                // El Rayo (efecto de flash blanco)
                ctx.fillStyle = "white";
                ctx.fillRect(dx - 18, 0, 36, dy + camera.y); // Desde arriba
                // Resplandor en el suelo
                ctx.fillStyle = "#f1c40f";
                ctx.beginPath();
                ctx.arc(dx, dy, 60, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });
    }
}