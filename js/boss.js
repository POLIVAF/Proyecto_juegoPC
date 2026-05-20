class Boss {
    constructor(x, y, floor) {
        this.x = x;
        this.y = y;
        this.width = 60; // Bigger than normal enemy
        this.height = 60;
        
        let hpMultiplier = 1 + (floor - 1) * 0.5; // Bosses scale harder
        let damageMultiplier = 1 + (floor - 1) * 0.2;
        
        this.maxHp = 300 * hpMultiplier;
        this.hp = this.maxHp;
        this.speed = 1.8;
        this.damage = 25 * damageMultiplier;
        this.color = '#c0392b'; // Dark Red
        
        // Status Effects
        this.burnTimer = 0;
        this.slowTimer = 0;
        
        // Boss Mechanics
        this.isImmune = false;
        this.phase = 1; // 1: >50% HP, 2: <50% HP
        
        // State Machine
        this.state = 'CHASE'; // CHASE, DOUBLE_ATTACK, AREA_ATTACK, CASTING_ULTIMATE, RECOVERY
        this.stateTimer = 0;
        
        // Attack visuals
        this.attackArea = null; // {x, y, radius, timer, maxTimer, damage}
    }

    applyStatus(type) {
        if (this.isImmune) return; // Cannot apply status while immune
        if (type === 'fire') {
            this.burnTimer = 300; // 5 seconds of burn (assuming 60fps)
        } else if (type === 'water') {
            this.slowTimer = 180; // 3 seconds of slow
        }
    }

    update(player, dungeon, deltaTime) {
        // Handle Status
        if (this.burnTimer > 0) {
            this.hp -= 5 * (deltaTime / 1000); // Burn DPS
            this.burnTimer--;
        }
        
        let currentSpeed = this.speed;
        if (this.slowTimer > 0) {
            currentSpeed *= 0.5; // Slowed by 50%
            this.slowTimer--;
        }

        // Phase check
        if (this.hp <= this.maxHp / 2 && this.phase === 1) {
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

        // State Machine
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

            // Randomly choose an attack
            let attackChance = this.phase === 2 ? 0.015 : 0.005; // 3x more frequent in phase 2
            if (Math.random() < attackChance) {
                if (Math.random() > 0.5) {
                    this.state = 'AREA_ATTACK';
                    let chargeTime = this.phase === 2 ? 30 : 60;
                    this.stateTimer = chargeTime;
                    this.attackArea = { x: this.x, y: this.y, radius: 100, timer: chargeTime, maxTimer: chargeTime, damage: this.damage * 1.5 };
                } else {
                    this.state = 'DOUBLE_ATTACK';
                    this.stateTimer = this.phase === 2 ? 25 : 40; // Quicker double step
                }
            }

        } else if (this.state === 'AREA_ATTACK') {
            this.stateTimer--;
            if (this.attackArea) {
                this.attackArea.timer = this.stateTimer;
                if (this.stateTimer <= 0) {
                    // Execute attack
                    let dx = player.x - this.attackArea.x;
                    let dy = player.y - this.attackArea.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.attackArea.radius + player.width/2) {
                        player.hp -= this.attackArea.damage;
                    }
                    this.attackArea = null;
                    this.state = 'RECOVERY';
                    this.stateTimer = 60; // Tired for 1s
                }
            }

        } else if (this.state === 'DOUBLE_ATTACK') {
            // Dash towards player quickly
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
                    // Execute ultimate
                    let dx = player.x - this.attackArea.x;
                    let dy = player.y - this.attackArea.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < this.attackArea.radius + player.width/2) {
                        player.hp -= this.attackArea.damage;
                    }
                    this.attackArea = null;
                    this.isImmune = false;
                    this.state = 'RECOVERY';
                    this.color = '#7f8c8d'; // Grey = tired
                    this.stateTimer = 180; // Tired for 3 seconds! Vulnerable!
                }
            }

        } else if (this.state === 'RECOVERY') {
            this.stateTimer--;
            if (this.stateTimer <= 0) {
                this.state = 'CHASE';
            }
        }
    }

    draw(ctx, camera) {
        let drawX = this.x - camera.x;
        let drawY = this.y - camera.y;

        // Draw attack areas
        if (this.attackArea) {
            ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
            ctx.beginPath();
            ctx.arc(this.attackArea.x - camera.x, this.attackArea.y - camera.y, this.attackArea.radius, 0, Math.PI * 2);
            ctx.fill();

            // Progress outline
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            let progress = 1 - (this.attackArea.timer / this.attackArea.maxTimer);
            ctx.arc(this.attackArea.x - camera.x, this.attackArea.y - camera.y, this.attackArea.radius * progress, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = this.color;
        
        // Shake if taking burn damage
        let offsetX = 0;
        if (this.burnTimer > 0) offsetX = (Math.random() - 0.5) * 4;

        ctx.fillRect(drawX - this.width/2 + offsetX, drawY - this.height/2, this.width, this.height);

        if (this.isImmune) {
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 3;
            ctx.strokeRect(drawX - this.width/2 - 5, drawY - this.height/2 - 5, this.width + 10, this.height + 10);
        }

        // HP bar (Boss bar is usually on screen HUD, but we draw it above him for now)
        if (this.hp > 0) {
            ctx.fillStyle = 'black';
            ctx.fillRect(drawX - 30, drawY - 40, 60, 6);
            ctx.fillStyle = 'red';
            ctx.fillRect(drawX - 30, drawY - 40, 60 * (this.hp / this.maxHp), 6);
        }
    }
}
