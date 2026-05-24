class Enemy {
    constructor(x, y, floor = 1, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.type = type;
        
        // Scale stats by floor
        let hpMultiplier = 1 + (floor - 1) * 0.2;
        let damageMultiplier = 1 + (floor - 1) * 0.1;
        
        this.hp = 30 * hpMultiplier;
        this.speed = 1.5 + Math.random();
        this.damage = 10 * damageMultiplier;
        this.color = '#8e44ad'; // Purple Slime
        
        if (type === 'poison') {
            this.hp *= 0.8; // Squishier
            this.speed += 1.0; // Faster
            this.color = '#27ae60'; // Green
        } else if (type === 'stun') {
            this.hp *= 1.5; // Tankier
            this.speed -= 0.5; // Slower
            this.color = '#e67e22'; // Orange
            this.width = 24;
            this.height = 24;
        } else if (type === 'shooter') {
            this.hp *= 0.8;
            this.color = '#2980b9'; // Blue
        }
        
        // 10% chance to be an Elite enemy
        this.isElite = Math.random() < 0.10;
        if (this.isElite) {
            this.hp *= 2;
            this.damage *= 1.5;
            this.width *= 1.25;
            this.height *= 1.25;
        }

        this.maxHp = this.hp;
        
        // simple wandering state
        this.dirX = (Math.random() - 0.5) * 2;
        this.dirY = (Math.random() - 0.5) * 2;
        this.stateTimer = 0;
        this.isChasing = false;
        
        // Combat
        this.attackCooldown = 0;

        // Status effects
        this.burnTimer = 0;
        this.slowTimer = 0;
        this.stunTimer = 0;
    }

    applyStatus(type, player) {
        if (type === 'fire') {
            this.burnTimer = 180; // 3 seconds
        } else if (type === 'water') {
            this.slowTimer = 120; // 2 seconds
        } else if (type === 'charge') {
            this.stunTimer = 90; // 1.5 seconds at 60 FPS
        } else if (type === 'knockback' && player) {
            // Calculate knockback direction
            let dx = this.x - player.x;
            let dy = this.y - player.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            let pushX = 0;
            let pushY = 0;
            if (dist > 0) {
                pushX = (dx / dist) * 40;
                pushY = (dy / dist) * 40;
            } else {
                pushX = player.facing.x * 40;
                pushY = player.facing.y * 40;
            }
            
            // Move enemy in steps checking walls
            let steps = 8;
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

    update(player, dungeon, deltaTime) {
        // Status Effects
        if (this.burnTimer > 0) {
            this.hp -= 5 * (deltaTime / 1000); // 5 damage per second
            this.burnTimer--;
        }

        let currentSpeed = this.speed;
        if (this.slowTimer > 0) {
            currentSpeed *= 0.5; // 50% slow
            this.slowTimer--;
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        if (this.stunTimer > 0) {
            this.stunTimer--;
            this.attackCooldown = Math.max(this.attackCooldown, 2); // Prevent attack
            return;
        }

        // Simple AI: chase player if close, otherwise wander
        let dx = player.x - this.x;
        let dy = player.y - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 250 && dist > 0) { // Chase or shoot
            this.isChasing = true;
            
            if (this.type === 'shooter') {
                if (dist > 150) {
                    // Move closer
                    this.dirX = dx / dist;
                    this.dirY = dy / dist;
                } else if (dist < 100) {
                    // Back away
                    this.dirX = -(dx / dist);
                    this.dirY = -(dy / dist);
                } else {
                    // Stand still and shoot
                    this.dirX = 0;
                    this.dirY = 0;
                }
                
                // Shoot projectile
                if (this.attackCooldown <= 0) {
                    if (typeof enemyProjectiles !== 'undefined') {
                        enemyProjectiles.push({
                            x: this.x,
                            y: this.y,
                            vx: (dx / dist) * 4,
                            vy: (dy / dist) * 4,
                            radius: 5,
                            color: '#e74c3c',
                            damage: this.damage,
                            life: 100
                        });
                    }
                    this.attackCooldown = 120; // Shoot every 2 seconds
                }
            } else {
                // Melee chase
                this.dirX = dx / dist;
                this.dirY = dy / dist;
            }
        } else { // Wander
            this.isChasing = false;
            if (this.hp < this.maxHp) {
                // Heal fully if player runs away
                this.hp = this.maxHp;
            }
            this.stateTimer--;
            if (this.stateTimer <= 0) {
                this.dirX = (Math.random() - 0.5) * 2;
                this.dirY = (Math.random() - 0.5) * 2;
                this.stateTimer = 60 + Math.random() * 60;
            }
        }

        let newX = this.x + this.dirX * currentSpeed;
        let newY = this.y + this.dirY * currentSpeed;

        // Wall collision logic using Bounding Box
        if (!dungeon.isWallRect(newX, this.y, this.width, this.height)) {
            this.x = newX;
        } else {
            this.dirX *= -1; // Bounce
        }

        if (!dungeon.isWallRect(this.x, newY, this.width, this.height)) {
            this.y = newY;
        } else {
            this.dirY *= -1; // Bounce
        }
    }

    draw(ctx, camera) {
        let drawX = this.x - camera.x;
        let drawY = this.y - camera.y;

        // Shake if burning
        let offsetX = 0;
        if (this.burnTimer > 0) offsetX = (Math.random() - 0.5) * 4;

        ctx.fillStyle = this.color;
        // Turn blue if slowed
        if (this.slowTimer > 0) ctx.fillStyle = '#2980b9';

        ctx.fillRect(drawX - this.width/2 + offsetX, drawY - this.height/2, this.width, this.height);

        // Draw Elite Aura/Crown
        if (this.isElite) {
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 2;
            ctx.strokeRect(drawX - this.width/2 + offsetX, drawY - this.height/2, this.width, this.height);
            ctx.lineWidth = 1;

            ctx.font = '12px sans-serif';
            ctx.fillText('👑', drawX - 6, drawY - this.height/2 - 10);
        }

        // Dizzy stars if stunned
        if (this.stunTimer > 0) {
            ctx.fillStyle = '#f1c40f';
            ctx.font = '10px monospace';
            ctx.fillText('💫', drawX - 5, drawY - 18);
        }

        // HP bar
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'red';
            ctx.fillRect(drawX - 10, drawY - 15, 20, 3);
            ctx.fillStyle = 'green';
            ctx.fillRect(drawX - 10, drawY - 15, 20 * (this.hp / this.maxHp), 3);
        }
    }

    getExpReward(floor) {
        let baseExp = 15;
        if (this.type === 'poison') baseExp = 20;
        else if (this.type === 'shooter') baseExp = 25;
        else if (this.type === 'stun') baseExp = 30;

        let totalExp = baseExp * (1 + (floor - 1) * 0.3);
        if (this.isElite) {
            totalExp *= 2.5;
        }
        return Math.round(totalExp);
    }
}
