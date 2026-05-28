class Boss {
    constructor(x, y, floor) {
        this.x = x;
        this.y = y;
        this.width = 60; // Bigger than normal enemy
        this.height = 60;
        this.floor = floor;
        
        let damageMultiplier = 1 + (floor - 1) * 0.2;
        
        // HP scale
        this.maxHp = Math.pow(10, (floor / 5) + 3);
        // Fallback for extreme bounds or non-divisible floors
        if (isNaN(this.maxHp) || this.maxHp < 300) {
            this.maxHp = 300 * (1 + (floor - 1) * 0.5);
        }
        
        // Armor/Resistance scale
        if (floor === 5) {
            this.armor = 0.20; // 20% resistance
            this.name = "Guardián de la Cripta";
        } else if (floor === 10) {
            this.armor = 0.50; // 50% resistance
            this.name = "General Púrpura";
        } else if (floor === 15) {
            this.armor = 0.75; // 75% resistance
            this.name = "Archimago del Vacío";
        } else {
            this.armor = 0.1 * (floor / 5);
            this.name = "Jefe del Piso " + floor;
        }
        
        this._hp = this.maxHp; // internal backing variable
        this.visualHp = this.maxHp;
        this.numHpBars = 1; // overridden by subclasses if needed
        this.lastHitTimer = 0;
        
        this.speed = 1.8;
        this.damage = 25 * damageMultiplier;
        this.color = '#c0392b'; // Dark Red
        
        // Status Effects
        this.burnTimer = 0;
        this.slowTimer = 0;
        this.stunTimer = 0;
        
        // Boss Mechanics
        this.isImmune = false;
        this.phase = 1; // 1: >50% HP, 2: <50% HP
        
        // State Machine
        this.state = 'CHASE'; // CHASE, DOUBLE_ATTACK, AREA_ATTACK, CASTING_ULTIMATE, RECOVERY
        this.stateTimer = 0;
        
        // Attack visuals
        this.attackArea = null; // {x, y, radius, timer, maxTimer, damage}
        
        // Floor 5 Specific: Shockwaves
        this.shockwaves = [];
        this.shockwaveCooldown = 0;
    }

    get hp() {
        return this._hp;
    }

    set hp(value) {
        if (this._hp === undefined) {
            this._hp = value;
            return;
        }
        if (value < this._hp) {
            let dmg = this._hp - value;
            let reduction = this.armor || 0;
            let finalDmg = dmg * (1 - reduction);
            this._hp = Math.max(0, this._hp - finalDmg);
            this.lastHitTimer = 10; // flash white for 10 frames
        } else {
            this._hp = value;
        }
    }

    getBarColor(index) {
        const palette = [
            '#c0392b', // 1: Deep Red
            '#e74c3c', // 2: Crimson
            '#e67e22', // 3: Orange
            '#f39c12', // 4: Orange-Yellow
            '#f1c40f', // 5: Yellow
            '#2ecc71', // 6: Green
            '#1abc9c', // 7: Teal
            '#3498db', // 8: Blue
            '#9b59b6', // 9: Purple
            '#8e44ad'  // 10: Dark Violet
        ];
        return palette[(index - 1) % palette.length];
    }

    applyStatus(type, player) {
        if (this.isImmune) return; // Cannot apply status while immune
        if (type === 'fire') {
            this.burnTimer = 300; // 5 seconds of burn (assuming 60fps)
        } else if (type === 'water') {
            this.slowTimer = 180; // 3 seconds of slow
        } else if (type === 'charge') {
            this.stunTimer = 90; // 1.5 seconds
        } else if (type === 'knockback' && player) {
            // Push boss only slightly (12 pixels)
            let dx = this.x - player.x;
            let dy = this.y - player.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            let pushX = 0;
            let pushY = 0;
            if (dist > 0) {
                pushX = (dx / dist) * 12;
                pushY = (dy / dist) * 12;
            } else {
                pushX = player.facing.x * 12;
                pushY = player.facing.y * 12;
            }
            let steps = 4;
            for (let s = 0; s < steps; s++) {
                let stepX = this.x + pushX / steps;
                let stepY = this.y + pushY / steps;
                if (typeof dungeon !== 'undefined' && !dungeon.isWallRect(stepX, stepY, this.width, this.height)) {
                    this.x = stepX;
                    this.y = stepY;
                } else {
                    break;
                }
            }
        }
    }

    spawnShockwave() {
        this.shockwaves.push({
            x: this.x,
            y: this.y,
            r: 0,
            maxR: 130,
            speed: 3.5,
            damage: this.damage * 0.8,
            hitPlayer: false
        });
    }

    updateShockwaves(player, deltaTime) {
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            let s = this.shockwaves[i];
            s.r += s.speed;
            
            if (!s.hitPlayer) {
                let dx = player.x - s.x;
                let dy = player.y - s.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < s.r + 12 && dist > s.r - 12) {
                    player.hp -= Math.max(1, s.damage - player.getArmor());
                    s.hitPlayer = true;
                    if (typeof addFloatingText !== 'undefined') {
                        addFloatingText("💥 ONDA!", player.x, player.y - 20, "#e74c3c");
                    }
                }
            }
            
            if (s.r >= s.maxR) {
                this.shockwaves.splice(i, 1);
            }
        }
    }

    update(player, dungeon, deltaTime) {
        if (this.lastHitTimer > 0) {
            this.lastHitTimer--;
        }

        // Update visual HP
        if (this.visualHp > this._hp) {
            let diff = this.visualHp - this._hp;
            let step = this.maxHp * 0.005 + diff * 0.05;
            this.visualHp = Math.max(this._hp, this.visualHp - step);
        } else {
            this.visualHp = this._hp;
        }

        // Update Floor 5 shockwaves
        if (this.floor === 5 && this._hp > 0) {
            this.updateShockwaves(player, deltaTime);
        }

        if (this.attackCooldown === undefined) this.attackCooldown = 0;
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        // Handle Status
        if (this.burnTimer > 0) {
            this._hp = Math.max(0, this._hp - 15 * (deltaTime / 1000)); // status damage bypasses setter
            this.burnTimer--;
        }
        
        let currentSpeed = this.speed;
        if (this.slowTimer > 0) {
            currentSpeed *= 0.5; // Slowed by 50%
            this.slowTimer--;
        }

        if (this.stunTimer > 0) {
            this.stunTimer--;
            return true; // Indicates stunned (returns true so child classes like Floor10/15 know)
        }

        // Floor 5 Frenzy check
        if (this.floor === 5) {
            let hpRatio = this._hp / this.maxHp;
            if (hpRatio <= 0.35 && this.phase === 1) {
                this.phase = 2;
                this.speed = 2.5; // Speed buff
                this.color = '#e74c3c'; // Glows bright red
                if (typeof addFloatingText !== 'undefined') {
                    addFloatingText("¡FURIOSA!", this.x, this.y - 30, "#e74c3c");
                }
            }
        } else {
            // General Phase check
            if (this._hp <= this.maxHp / 2 && this.phase === 1) {
                this.phase = 2;
                this.state = 'CASTING_ULTIMATE';
                this.stateTimer = 180; // 3 seconds cast time
                this.isImmune = true;
                this.color = '#f1c40f'; // Glows yellow while casting
                
                // Create ultimate area
                this.attackArea = {
                    x: dungeon.width * dungeon.tileSize / 2, // Center of room
                    y: dungeon.height * dungeon.tileSize / 2,
                    radius: dungeon.width * dungeon.tileSize / 4, // Half the room
                    timer: 180,
                    maxTimer: 180,
                    damage: this.damage * 3
                };
            }
        }

        // State Machine
        if (this.floor === 5) {
            // Frenzy particle effects
            if (this.phase === 2 && Math.random() < 0.2) {
                if (typeof floatingTexts !== 'undefined') {
                    floatingTexts.push({
                        text: "🔥",
                        x: this.x + (Math.random() - 0.5) * this.width,
                        y: this.y + (Math.random() - 0.5) * this.height,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: -2,
                        alpha: 1.0,
                        color: "#e74c3c"
                    });
                }
            }

            if (this.state === 'CHASE') {
                this.color = this.phase === 2 ? '#e74c3c' : '#c0392b';
                this.isImmune = false;
                let dx = player.x - this.x;
                let dy = player.y - this.y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    let newX = this.x + (dx / dist) * currentSpeed;
                    let newY = this.y + (dy / dist) * currentSpeed;
                    
                    if (!dungeon.isWallRect(newX, this.y, this.width, this.height)) this.x = newX;
                    if (!dungeon.isWallRect(this.x, newY, this.width, this.height)) this.y = newY;
                }

                if (this.phase === 2) {
                    this.shockwaveCooldown--;
                    if (this.shockwaveCooldown <= 0) {
                        this.spawnShockwave();
                        this.shockwaveCooldown = 180;
                    }
                }

                let attackChance = this.phase === 2 ? 0.025 : 0.008;
                if (Math.random() < attackChance) {
                    if (Math.random() > 0.4) {
                        this.state = 'AREA_ATTACK';
                        let chargeTime = this.phase === 2 ? 25 : 50;
                        let radius = this.phase === 2 ? 150 : 100;
                        this.stateTimer = chargeTime;
                        this.attackArea = { x: this.x, y: this.y, radius: radius, timer: chargeTime, maxTimer: chargeTime, damage: this.damage * 1.5 };
                    } else {
                        this.state = 'DOUBLE_ATTACK';
                        this.stateTimer = this.phase === 2 ? 20 : 35;
                    }
                }

            } else if (this.state === 'AREA_ATTACK') {
                this.stateTimer--;
                if (this.attackArea) {
                    this.attackArea.timer = this.stateTimer;
                    if (this.stateTimer <= 0) {
                        let dx = player.x - this.attackArea.x;
                        let dy = player.y - this.attackArea.y;
                        let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < this.attackArea.radius + player.width/2) {
                            player.hp -= Math.max(1, this.attackArea.damage - player.getArmor());
                        }
                        
                        for (let a = 0; a < 8; a++) {
                            let angle = (Math.PI * 2 / 8) * a;
                            if (typeof addFloatingText !== 'undefined') {
                                addFloatingText("💥", this.x + Math.cos(angle) * 40, this.y + Math.sin(angle) * 40, "#e67e22");
                            }
                        }
                        
                        this.attackArea = null;
                        this.state = 'RECOVERY';
                        this.stateTimer = this.phase === 2 ? 25 : 50;
                    }
                }

            } else if (this.state === 'DOUBLE_ATTACK') {
                this.stateTimer--;
                let dx = player.x - this.x;
                let dy = player.y - this.y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    let dashSpeed = currentSpeed * (this.phase === 2 ? 3.2 : 2.5);
                    let newX = this.x + (dx / dist) * dashSpeed;
                    let newY = this.y + (dy / dist) * dashSpeed;
                    if (!dungeon.isWallRect(newX, this.y, this.width, this.height)) this.x = newX;
                    if (!dungeon.isWallRect(this.x, newY, this.width, this.height)) this.y = newY;
                }
                if (this.stateTimer <= 0) {
                    this.state = 'CHASE';
                }

            } else if (this.state === 'RECOVERY') {
                this.stateTimer--;
                if (this.stateTimer <= 0) {
                    this.state = 'CHASE';
                }
            }
        } else {
            // General Boss (Floor 10/15 are subclasses, so this is for other bosses if any)
            if (this.state === 'CHASE') {
                this.color = '#c0392b';
                this.isImmune = false;
                let dx = player.x - this.x;
                let dy = player.y - this.y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    let newX = this.x + (dx / dist) * currentSpeed;
                    let newY = this.y + (dy / dist) * currentSpeed;
                    
                    if (!dungeon.isWallRect(newX, this.y, this.width, this.height)) this.x = newX;
                    if (!dungeon.isWallRect(this.x, newY, this.width, this.height)) this.y = newY;
                }

                let attackChance = this.phase === 2 ? 0.015 : 0.005;
                if (Math.random() < attackChance) {
                    if (Math.random() > 0.5) {
                        this.state = 'AREA_ATTACK';
                        let chargeTime = this.phase === 2 ? 30 : 60;
                        this.stateTimer = chargeTime;
                        this.attackArea = { x: this.x, y: this.y, radius: 100, timer: chargeTime, maxTimer: chargeTime, damage: this.damage * 1.5 };
                    } else {
                        this.state = 'DOUBLE_ATTACK';
                        this.stateTimer = this.phase === 2 ? 25 : 40;
                    }
                }

            } else if (this.state === 'AREA_ATTACK') {
                this.stateTimer--;
                if (this.attackArea) {
                    this.attackArea.timer = this.stateTimer;
                    if (this.stateTimer <= 0) {
                        let dx = player.x - this.attackArea.x;
                        let dy = player.y - this.attackArea.y;
                        let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < this.attackArea.radius + player.width/2) {
                            player.hp -= Math.max(1, this.attackArea.damage - player.getArmor());
                        }
                        this.attackArea = null;
                        this.state = 'RECOVERY';
                        this.stateTimer = 60;
                    }
                }

            } else if (this.state === 'DOUBLE_ATTACK') {
                this.stateTimer--;
                let dx = player.x - this.x;
                let dy = player.y - this.y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    let dashSpeed = currentSpeed * 2.5;
                    let newX = this.x + (dx / dist) * dashSpeed;
                    let newY = this.y + (dy / dist) * dashSpeed;
                    if (!dungeon.isWallRect(newX, this.y, this.width, this.height)) this.x = newX;
                    if (!dungeon.isWallRect(this.x, newY, this.width, this.height)) this.y = newY;
                }
                if (this.stateTimer <= 0) {
                    this.state = 'CHASE';
                }

            } else if (this.state === 'CASTING_ULTIMATE') {
                this.stateTimer--;
                if (this.attackArea) {
                    this.attackArea.timer = this.stateTimer;
                    if (this.stateTimer <= 0) {
                        let dx = player.x - this.attackArea.x;
                        let dy = player.y - this.attackArea.y;
                        let dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < this.attackArea.radius + player.width/2) {
                            player.hp -= Math.max(1, this.attackArea.damage - player.getArmor());
                        }
                        this.attackArea = null;
                        this.isImmune = false;
                        this.state = 'RECOVERY';
                        this.color = '#7f8c8d';
                        this.stateTimer = 180;
                    }
                }

            } else if (this.state === 'RECOVERY') {
                this.stateTimer--;
                if (this.stateTimer <= 0) {
                    this.state = 'CHASE';
                }
            }
        }
    }

    draw(ctx, camera) {
        let drawX = this.x - camera.x;
        let drawY = this.y - camera.y;

        // Draw Floor 5 shockwaves
        if (this.floor === 5) {
            this.shockwaves.forEach(s => {
                ctx.save();
                ctx.strokeStyle = `rgba(231, 76, 60, ${1 - (s.r / s.maxR)})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(s.x - camera.x, s.y - camera.y, s.r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            });
        }

        // Draw attack areas
        if (this.attackArea) {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
            ctx.beginPath();
            ctx.arc(this.attackArea.x - camera.x, this.attackArea.y - camera.y, this.attackArea.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(231, 76, 60, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            let progress = 1 - (this.attackArea.timer / this.attackArea.maxTimer);
            ctx.arc(this.attackArea.x - camera.x, this.attackArea.y - camera.y, this.attackArea.radius * progress, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Shake if taking damage or burning
        let offsetX = 0;
        if (this.burnTimer > 0 || this.lastHitTimer > 0) offsetX = (Math.random() - 0.5) * 4;

        let baseColor = this.color;
        if (this.slowTimer > 0) {
            baseColor = '#2980b9'; // Blue slow
        }

        ctx.fillStyle = baseColor;
        ctx.fillRect(drawX - this.width/2 + offsetX, drawY - this.height/2, this.width, this.height);

        // Flash white on hit
        if (this.lastHitTimer > 0) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.fillRect(drawX - this.width/2 + offsetX, drawY - this.height/2, this.width, this.height);
        }

        // Dizzy stars if stunned
        if (this.stunTimer > 0) {
            ctx.fillStyle = '#f1c40f';
            ctx.font = '14px monospace';
            ctx.fillText('💫', drawX - 6, drawY - this.height/2 - 12);
        }

        if (this.isImmune) {
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 3;
            ctx.strokeRect(drawX - this.width/2 - 5, drawY - this.height/2 - 5, this.width + 10, this.height + 10);
        }

        // Floating world space health bar
        if (this._hp > 0) {
            ctx.fillStyle = 'black';
            ctx.fillRect(drawX - 30, drawY - 40, 60, 6);
            
            // Trailing visual HP
            ctx.fillStyle = 'rgba(236, 240, 241, 0.7)';
            ctx.fillRect(drawX - 30, drawY - 40, 60 * (this.visualHp / this.maxHp), 6);
            
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(drawX - 30, drawY - 40, 60 * (this._hp / this.maxHp), 6);
        }
    }

    drawHUD(ctx) {
        if (this._hp <= 0) return;

        let barW = Math.min(500, canvas.width * 0.7);
        let barH = 16;
        let barX = (canvas.width - barW) / 2;
        let barY = 50;

        // Draw Boss Name
        ctx.save();
        ctx.font = "bold 15px 'Courier New', Courier, monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(this.name.toUpperCase(), canvas.width / 2, barY - 10);

        // Draw Background Container
        ctx.fillStyle = "rgba(20, 20, 20, 0.85)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeRect(barX, barY, barW, barH);

        let numBars = this.numHpBars || 1;
        let segmentVal = this.maxHp / numBars;
        let activeIdx = Math.ceil(this._hp / segmentVal); // 1 to numBars

        if (activeIdx > 0) {
            // Draw previous bar underneath (fully filled)
            if (activeIdx > 1) {
                ctx.fillStyle = this.getBarColor(activeIdx - 1);
                ctx.fillRect(barX + 1, barY + 1, barW - 2, barH - 2);
            }

            // Draw visual trailing HP bar (damage bar)
            let visualHpInCurrentBar = this.visualHp - (activeIdx - 1) * segmentVal;
            let visualPercent = Math.max(0, Math.min(1, visualHpInCurrentBar / segmentVal));
            ctx.fillStyle = "rgba(236, 240, 241, 0.75)"; // Light silver/white trail
            ctx.fillRect(barX + 1, barY + 1, (barW - 2) * visualPercent, barH - 2);

            // Draw current active health bar
            let hpInCurrentBar = this._hp - (activeIdx - 1) * segmentVal;
            let hpPercent = Math.max(0, Math.min(1, hpInCurrentBar / segmentVal));
            ctx.fillStyle = this.getBarColor(activeIdx);
            ctx.fillRect(barX + 1, barY + 1, (barW - 2) * hpPercent, barH - 2);
        }

        // Draw Multiplier Badge (e.g. x10)
        if (numBars > 1) {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 13px 'Courier New', Courier, monospace";
            ctx.textAlign = "left";
            ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
            ctx.shadowBlur = 4;
            ctx.fillText("x" + activeIdx, barX + barW + 12, barY + 13);
        }

        // Draw Health Numbers below/inside
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px 'Courier New', Courier, monospace";
        ctx.textAlign = "right";
        ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx.shadowBlur = 4;
        ctx.fillText(Math.round(this._hp).toLocaleString() + " / " + Math.round(this.maxHp).toLocaleString() + " HP", barX + barW, barY + barH + 14);

        ctx.restore();
    }

    getExpReward(floor) {
        if (this.constructor.name === 'BossFloor15') {
            return 1200;
        } else if (this.constructor.name === 'Floor10Boss') {
            return 500;
        }
        return 150 * floor;
    }
}
