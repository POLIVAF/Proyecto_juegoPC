class Floor10Boss extends Boss {
    constructor(x, y, floor) {
        super(x, y, floor); // Llama al constructor de la clase Boss
        this.width = 90;    // Más imponente
        this.height = 90;
        this.color = '#8e44ad'; // Púrpura oscuro
        
        // Stats de nivel 10
        this.maxHp = 1000; 
        this.hp = this.maxHp;
        this.speed = 2.0;
        this.damage = 40;

        // Nuevas propiedades
        this.projectiles = [];
        this.shootCooldown = 0;
    }

    update(player, dungeon, deltaTime) {
        // Ejecutamos la lógica base (quemadura, slow, fases)
        super.update(player, dungeon, deltaTime);

        // --- LÓGICA DE PROYECTILES ---
        if (this.state === 'CHASE') {
            this.shootCooldown--;
            if (this.shootCooldown <= 0) {
                this.shootProjectile(player);
                this.shootCooldown = 120; // Dispara cada 2 segundos aprox
            }
        }

        // Actualizar movimiento de proyectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;

            // Colisión con jugador
            let dx = p.x - player.x;
            let dy = p.y - player.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 20) {
                player.hp -= 15; // Daño del proyectil
                this.projectiles.splice(i, 1);
                continue;
            }

            // Eliminar si sale de la pared
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
            vy: Math.sin(angle) * 5
        });
    }

    draw(ctx, camera) {
        // Dibujamos el jefe (usa el draw de Boss)
        super.draw(ctx, camera);

        // Dibujar proyectiles (bolas de energía)
        this.projectiles.forEach(p => {
            ctx.fillStyle = '#f1c40f'; // Color oro
            ctx.beginPath();
            ctx.arc(p.x - camera.x, p.y - camera.y, 8, 0, Math.PI * 2);
            ctx.fill();
            // Brillo
            ctx.shadowBlur = 10;
            ctx.shadowColor = "yellow";
        });
        ctx.shadowBlur = 0; // Resetear brillo para lo demás
    }
}