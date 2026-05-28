class Floor10Boss extends Boss {
    constructor(x, y, floor) {
        super(x, y, floor);
        this.width = 90;
        this.height = 90;
        this.color = '#8e44ad'; // Purple
        
        // 100,000 HP and 10 HP bars
        this.maxHp = 100000;
        this._hp = this.maxHp;
        this.visualHp = this.maxHp;
        this.armor = 0.50; // 50% base damage reduction
        this.numHpBars = 10;
        this.name = "General Púrpura";
        
        this.speed = 2.0;
        this.damage = 40;

        this.projectiles = [];
        this.shootCooldown = 0;
        
        // Custom Mechanics
        this.lastKnownBarIndex = 10;
        
        // Vortex Pull
        this.vortexCooldown = 120; // 2 seconds initial cooldown
        this.vortexTimer = 0; // remaining duration of active vortex pull
        
        // Shield and Portals Phase
        this.shieldTriggered = false;
        this.shieldDuration = 0;
        this.portals = [];
    }

    update(player, dungeon, deltaTime) {
        // Base updates (burn, slow, stun, visual HP trailing)
        if (super.update(player, dungeon, deltaTime)) return;

        // --- SHIELD & PORTALS LOGIC ---
        if (this._hp < this.maxHp * 0.50 && !this.shieldTriggered) {
            this.shieldTriggered = true;
            this.shieldDuration = 240; // 4 seconds at 60 FPS
            this.armor = 0.90; // 90% resistance during shield!
            if (typeof addFloatingText !== 'undefined') {
                addFloatingText("🛡️ ESCUDO ARCANO ACTIVADO", this.x, this.y - 45, "#8e44ad");
            }
            
            // Spawn 4 portals around the boss room
            this.portals = [
                { x: this.x - 120, y: this.y - 120, shootTimer: 0 },
                { x: this.x + 120, y: this.y - 120, shootTimer: 15 },
                { x: this.x - 120, y: this.y + 120, shootTimer: 30 },
                { x: this.x + 120, y: this.y + 120, shootTimer: 45 }
            ];
        }

        if (this.shieldDuration > 0) {
            this.shieldDuration--;
            if (this.shieldDuration <= 0) {
                this.armor = 0.50; // Restore base resistance
                this.portals = [];
                if (typeof addFloatingText !== 'undefined') {
                    addFloatingText("🛡️ ESCUDO DESACTIVADO", this.x, this.y - 45, "#e74c3c");
                }
            }
            
            // Update Portals
            this.portals.forEach(p => {
                p.shootTimer++;
                if (p.shootTimer % 45 === 0) {
                    // Fire at player
                    let dx = player.x - p.x;
                    let dy = player.y - p.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 0) {
                        this.projectiles.push({
                            x: p.x,
                            y: p.y,
                            vx: (dx / dist) * 4.5,
                            vy: (dy / dist) * 4.5,
                            color: '#9b59b6', // purple bolt
                            radius: 6
                        });
                    }
                }
            });
        }

        // --- ENERGY NOVA LOGIC (ON HP BAR DEPLETED) ---
        let segmentVal = this.maxHp / this.numHpBars;
        let activeIdx = Math.ceil(this._hp / segmentVal);
        if (activeIdx < this.lastKnownBarIndex && this._hp > 0) {
            this.triggerEnergyNova();
            this.lastKnownBarIndex = activeIdx;
        }

        // --- VORTEX PULL LOGIC ---
        let dx = player.x - this.x;
        let dy = player.y - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 320 && this.vortexCooldown <= 0 && this.shieldDuration <= 0) {
            this.vortexTimer = 90; // Pull player for 1.5 seconds
            this.vortexCooldown = 360; // 6 seconds cooldown
            if (typeof addFloatingText !== 'undefined') {
                addFloatingText("🌪️ VÓRTICE VACIADOR", this.x, this.y - 45, "#8e44ad");
            }
        }

        if (this.vortexCooldown > 0) {
            this.vortexCooldown--;
        }

        if (this.vortexTimer > 0) {
            this.vortexTimer--;
            // Pull player towards boss
            if (dist > 20) {
                player.x -= (dx / dist) * 3.5;
                player.y -= (dy / dist) * 3.5;
            }
            // Emit purple pull particles
            if (Math.random() < 0.3 && typeof floatingTexts !== 'undefined') {
                floatingTexts.push({
                    text: "✨",
                    x: player.x + (Math.random() - 0.5) * 40,
                    y: player.y + (Math.random() - 0.5) * 40,
                    vx: -(dx / dist) * 2,
                    vy: -(dy / dist) * 2,
                    alpha: 1.0,
                    color: "#9b59b6"
                });
            }
        }

        // --- NORMAL SHOOTING LOGIC ---
        if (this.state === 'CHASE' && this.vortexTimer <= 0 && this.shieldDuration <= 0) {
            this.shootCooldown--;
            if (this.shootCooldown <= 0) {
                this.shootProjectile(player);
                this.shootCooldown = 100; // slightly faster shooting than before
            }
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;

            let dx = p.x - player.x;
            let dy = p.y - player.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 22) {
                player.hp -= Math.max(1, 15 - player.getArmor()); // Damage
                this.projectiles.splice(i, 1);
                continue;
            }

            if (dungeon.isWallRect(p.x, p.y, 5, 5)) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    shootProjectile(player) {
        let dx = player.x - this.x;
        let dy = player.y - this.y;
        let angle = Math.atan2(dy, dx);
        
        this.projectiles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * 5,
            vy: Math.sin(angle) * 5,
            color: '#f1c40f', // gold
            radius: 8
        });
    }

    triggerEnergyNova() {
        if (typeof addFloatingText !== 'undefined') {
            addFloatingText("💥 RUPTURA DE ENERGÍA", this.x, this.y - 45, "#e74c3c");
        }
        
        // Spawn 12 projectiles in circle
        for (let i = 0; i < 12; i++) {
            let angle = (Math.PI * 2 / 12) * i;
            this.projectiles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 4.5,
                vy: Math.sin(angle) * 4.5,
                color: '#e74c3c', // danger red
                radius: 7
            });
        }
        
        // Quick dash to reposition
        this.state = 'DOUBLE_ATTACK';
        this.stateTimer = 25; // dash for 25 frames
    }

    draw(ctx, camera) {
        // Base drawing
        super.draw(ctx, camera);

        // Draw active shield visual (glowing circle outline)
        if (this.shieldDuration > 0) {
            ctx.save();
            ctx.strokeStyle = '#9b59b6';
            ctx.lineWidth = 3;
            // Pulsing size
            let radius = (this.width / 2) + 15 + Math.sin(Date.now() * 0.01) * 5;
            ctx.beginPath();
            ctx.arc(this.x - camera.x, this.y - camera.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw shield fill
            ctx.fillStyle = 'rgba(155, 89, 182, 0.08)';
            ctx.fill();
            ctx.restore();
        }

        // Draw portals
        this.portals.forEach(p => {
            ctx.save();
            let dx = p.x - camera.x;
            let dy = p.y - camera.y;
            
            // Glow effect
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#9b59b6";
            
            ctx.fillStyle = '#111';
            ctx.strokeStyle = '#8e44ad';
            ctx.lineWidth = 3;
            ctx.beginPath();
            let portalRadius = 14 + Math.sin(Date.now() * 0.01 + p.x) * 2;
            ctx.arc(dx, dy, portalRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Portal center glyph
            ctx.fillStyle = '#9b59b6';
            ctx.beginPath();
            ctx.arc(dx, dy, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Draw energy vortex pull effect
        if (this.vortexTimer > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(142, 68, 173, 0.4)';
            ctx.lineWidth = 2;
            // Draw spiral lines pulling towards boss
            let numSpirals = 3;
            let time = Date.now() * 0.005;
            for (let s = 0; s < numSpirals; s++) {
                ctx.beginPath();
                let startAngle = (Math.PI * 2 / numSpirals) * s + time;
                for (let r = 320; r > 10; r -= 10) {
                    let angle = startAngle + (320 - r) * 0.015;
                    let sx = this.x + Math.cos(angle) * r - camera.x;
                    let sy = this.y + Math.sin(angle) * r - camera.y;
                    if (r === 320) ctx.moveTo(sx, sy);
                    else ctx.lineTo(sx, sy);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // Draw projectiles
        this.projectiles.forEach(p => {
            ctx.save();
            ctx.fillStyle = p.color || '#f1c40f';
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color || 'yellow';
            ctx.beginPath();
            ctx.arc(p.x - camera.x, p.y - camera.y, p.radius || 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
}