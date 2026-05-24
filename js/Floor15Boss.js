class BossFloor15 extends Boss {
    constructor(x, y, floor) {
        super(x, y, floor);
        this.width = 80;
        this.height = 80;
        this.color = '#2c3e50'; 
        
        this.maxHp = 2500; 
        this.hp = this.maxHp;
        
        this.projectiles = [];
        this.lightningStrikes = [];
        this.attackTick = 0; // Para controlar el patrón rítmico
    }

    update(player, dungeon, deltaTime) {
        if (super.update(player, dungeon, deltaTime)) return;
        this.attackTick++;

        // --- FASE 1: PATRONES RÍTMICOS (> 50% HP) ---
        if (this.phase === 1) {
            // Cada 60 frames lanza una ráfaga en estrella
            if (this.attackTick % 60 === 0) {
                this.shootPatternSpiral();
            }
        } 
        // --- FASE 2: CAOS AL AZAR (< 50% HP) ---
        else {
            this.color = '#e67e22'; // Color naranja de advertencia/fuego
            
            // Proyectiles al azar en todas direcciones
            if (Math.random() < 0.15) {
                this.shootRandom();
            }

            // Rayos cayendo al azar cerca del jugador para forzar movimiento
            if (Math.random() < 0.1) {
                this.createLightningChaos(player);
            }
        }

        this.updateProjectiles(player, dungeon);
        this.updateLightnings(player);
    }

    // --- EL MÉTODO DIE VA AQUÍ, ANTES DE CERRAR LA CLASE ---
    die() {
        console.log("¡El Archimago ha sido derrotado!");
        
        // Aquí podrías agregar una animación de explosión si tienes un sistema de partículas
        // spawnExplosion(this.x, this.y); 

        // Retornamos el objeto con los datos del Bastón
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

    // Patrón Ordenado: Dispara 8 balas en círculo
    shootPatternSpiral() {
        for (let i = 0; i < 8; i++) {
            let angle = (Math.PI * 2 / 8) * i;
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
            vx: Math.cos(randomAngle) * (Math.random() * 5 + 2),
            vy: Math.sin(randomAngle) * (Math.random() * 5 + 2),
            size: 6
        });
    }

    createLightningChaos(player) {
        // En fase de furia, los rayos caen cerca del jugador pero con offset al azar
        let offsetX = (Math.random() - 0.5) * 150;
        let offsetY = (Math.random() - 0.5) * 150;
        
        this.lightningStrikes.push({
            x: player.x + offsetX,
            y: player.y + offsetY,
            timer: 30, // Más rápido que antes para dar dramatismo
            active: true
        });
    }

    updateProjectiles(player, dungeon) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;

            // Colisión simple
            let dist = Math.sqrt((p.x - player.x)**2 + (p.y - player.y)**2);
            if (dist < 25) {
                player.hp -= Math.max(1, 8 - player.getArmor());
                this.projectiles.splice(i, 1);
                continue;
            }

            // Limpieza si sale del mapa o choca paredes (opcional)
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
                if (dist < 45) player.hp -= Math.max(1, 25 - player.getArmor());
            }
            
            if (l.timer < -15) this.lightningStrikes.splice(i, 1);
        }
    }

    draw(ctx, camera) {
        super.draw(ctx, camera);

        // Visual de proyectiles
        this.projectiles.forEach(p => {
            ctx.fillStyle = this.phase === 1 ? '#3498db' : '#e74c3c'; // Azul en P1, Rojo en P2
            ctx.beginPath();
            ctx.arc(p.x - camera.x, p.y - camera.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Visual de rayos
        this.lightningStrikes.forEach(l => {
            let dx = l.x - camera.x;
            let dy = l.y - camera.y;

            if (l.timer > 0) {
                // Círculo de aviso parpadeante
                ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random()})`;
                ctx.beginPath();
                ctx.arc(dx, dy, 45, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                // El Rayo (efecto de flash blanco)
                ctx.fillStyle = "white";
                ctx.fillRect(dx - 15, 0, 30, dy + camera.y); // Desde arriba
                // Resplandor en el suelo
                ctx.fillStyle = "#f1c40f";
                ctx.beginPath();
                ctx.arc(dx, dy, 50, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
}