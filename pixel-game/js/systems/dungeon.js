class Dungeon {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = []; // 0: wall, 1: floor
        this.tileSize = 40; // pixel size per tile
        this.rooms = [];
        this.exitX = 0;
        this.exitY = 0;
        this.enterX = 0;
        this.enterY = 0;
        this.doorOpen = false;
        this.floor = 1;
        
        // Merchant Door Fields
        this.merchantDoorX = -1;
        this.merchantDoorY = -1;
        this.merchantDoorOpen = false;
    }

    generate() {
        // Clear rooms and grid
        this.rooms = [];
        this.merchantDoorX = -1;
        this.merchantDoorY = -1;
        this.merchantDoorOpen = false;
        
        let hasMerchant = (this.floor > 1 && (this.floor - 1) % 4 === 0);

        // Initialize grid with walls (0)
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = 0;
            }
        }

        // Branching Random Room Generation (15 rooms)
        const numRooms = 15;
        const minRoomSize = 5;
        const maxRoomSize = 9;
        let attempts = 0;

        while (this.rooms.length < numRooms && attempts < 1000) {
            attempts++;
            let roomWidth = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
            let roomHeight = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
            let roomX = Math.floor(Math.random() * (this.width - roomWidth - 1)) + 1;
            let roomY = Math.floor(Math.random() * (this.height - roomHeight - 1)) + 1;

            let newRoom = { 
                x: roomX, 
                y: roomY, 
                w: roomWidth, 
                h: roomHeight,
                type: 'normal' 
            };
            
            // Check for intersection with existing rooms
            let failed = false;
            for (let j = 0; j < this.rooms.length; j++) {
                if (this.intersects(newRoom, this.rooms[j])) {
                    failed = true;
                    break;
                }
            }

            if (!failed) {
                this.createRoom(newRoom);
                // Connect to a random previous room to create a branching layout (tree-based)
                if (this.rooms.length > 0) {
                    let randomPrevIndex = Math.floor(Math.random() * this.rooms.length);
                    // Avoid connecting new rooms to the merchant room (rooms[1]) if it exists on merchant floors
                    if (hasMerchant && this.rooms.length > 2) {
                        while (randomPrevIndex === 1) {
                            randomPrevIndex = Math.floor(Math.random() * this.rooms.length);
                        }
                    }
                    let prevRoom = this.rooms[randomPrevIndex];
                    this.createCorridor(
                        Math.floor(prevRoom.x + prevRoom.w / 2),
                        Math.floor(prevRoom.y + prevRoom.h / 2),
                        Math.floor(newRoom.x + newRoom.w / 2),
                        Math.floor(newRoom.y + newRoom.h / 2)
                    );
                }
                this.rooms.push(newRoom);
            }
        }

        // Set Room Types
        if (this.rooms.length > 0) {
            this.rooms[0].type = 'start';
        }
        if (this.rooms.length > 1) {
            if (hasMerchant) {
                this.rooms[1].type = 'merchant';
            } else {
                this.rooms[1].type = 'normal';
            }
        }
        if (this.rooms.length > 2) {
            this.rooms[this.rooms.length - 1].type = 'exit';
        }
        for (let i = 2; i < this.rooms.length - 1; i++) {
            if (Math.random() < 0.20) {
                this.rooms[i].type = 'special';
            } else {
                this.rooms[i].type = 'normal';
            }
        }

        // Set exit door in the last room
        let lastRoom = this.rooms[this.rooms.length - 1];
        this.exitX = lastRoom.x + Math.floor(lastRoom.w / 2);
        this.exitY = lastRoom.y + Math.floor(lastRoom.h / 2);

        // Set enter stairs in the first room
        if (this.rooms.length > 0) {
            let startRoom = this.rooms[0];
            this.enterX = startRoom.x + Math.floor(startRoom.w / 2);
            this.enterY = startRoom.y + Math.floor(startRoom.h / 2);
        }

        // Locate closed Merchant Door at the border of merchant room (rooms[1])
        if (this.rooms.length > 1 && hasMerchant) {
            let merchantRoom = this.rooms[1];
            let candidates = [];
            
            // Top border
            for (let x = merchantRoom.x; x < merchantRoom.x + merchantRoom.w; x++) {
                let y = merchantRoom.y;
                if (y - 1 >= 0 && this.grid[y - 1][x] === 1) {
                    candidates.push({ x, y });
                }
            }
            // Bottom border
            for (let x = merchantRoom.x; x < merchantRoom.x + merchantRoom.w; x++) {
                let y = merchantRoom.y + merchantRoom.h - 1;
                if (y + 1 < this.height && this.grid[y + 1][x] === 1) {
                    candidates.push({ x, y });
                }
            }
            // Left border
            for (let y = merchantRoom.y; y < merchantRoom.y + merchantRoom.h; y++) {
                let x = merchantRoom.x;
                if (x - 1 >= 0 && this.grid[y][x - 1] === 1) {
                    candidates.push({ x, y });
                }
            }
            // Right border
            for (let y = merchantRoom.y; y < merchantRoom.y + merchantRoom.h; y++) {
                let x = merchantRoom.x + merchantRoom.w - 1;
                if (x + 1 < this.width && this.grid[y][x + 1] === 1) {
                    candidates.push({ x, y });
                }
            }

            if (candidates.length > 0) {
                let door = candidates[Math.floor(Math.random() * candidates.length)];
                this.merchantDoorX = door.x;
                this.merchantDoorY = door.y;
            } else {
                // Fallback: center-ish of a border cell
                this.merchantDoorX = merchantRoom.x + Math.floor(merchantRoom.w / 2);
                this.merchantDoorY = merchantRoom.y;
            }
        }
    }

    generateBossRoom() {
        // Clear rooms and grid
        this.rooms = [];
        this.merchantDoorX = -1;
        this.merchantDoorY = -1;
        
        let hasMerchant = (this.floor > 1 && (this.floor - 1) % 4 === 0);
        this.merchantDoorOpen = !hasMerchant; // Locked if it's a merchant floor

        // Initialize grid with walls (0)
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = 0;
            }
        }

        // Create one massive room in the center
        let roomWidth = 30;
        let roomHeight = 30;
        let roomX = Math.floor((this.width - roomWidth) / 2);
        let roomY = Math.floor((this.height - roomHeight) / 2);

        let bossRoom = { x: roomX, y: roomY, w: roomWidth, h: roomHeight, type: 'boss' };
        this.createRoom(bossRoom);
        this.rooms.push(bossRoom);

        // Put door at top center
        this.exitX = roomX + Math.floor(roomWidth / 2);
        this.exitY = roomY + 2;

        // Put enter door at bottom center
        this.enterX = roomX + Math.floor(roomWidth / 2);
        this.enterY = roomY + roomHeight - 3;

        // Add Merchant Room adjacent to boss room if it is a merchant floor (e.g. floors 5, 25)
        if (hasMerchant) {
            let mWidth = 6;
            let mHeight = 6;
            let mX = roomX - 8; // to the left of the boss room
            let mY = roomY + 12; // vertically aligned center-ish
            
            let merchantRoom = { x: mX, y: mY, w: mWidth, h: mHeight, type: 'merchant' };
            this.createRoom(merchantRoom);
            this.rooms.push(merchantRoom);

            // Connect merchant room to boss room with a horizontal corridor at y = mY + 2
            let corrY = mY + 2;
            for (let x = mX + mWidth; x <= roomX; x++) {
                this.grid[corrY][x] = 1;
            }

            // Set the merchant door at the entrance (on the boss room border)
            this.merchantDoorX = roomX;
            this.merchantDoorY = corrY;
        }
    }

    intersects(room1, room2) {
        return (room1.x <= room2.x + room2.w &&
                room1.x + room1.w >= room2.x &&
                room1.y <= room2.y + room2.h &&
                room1.y + room1.h >= room2.y);
    }

    createRoom(room) {
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                this.grid[y][x] = 1; // Floor
            }
        }
    }

    createCorridor(x1, y1, x2, y2) {
        let x = x1;
        let y = y1;
        
        while (x !== x2) {
            this.grid[y][x] = 1;
            x += (x2 > x1) ? 1 : -1;
        }
        while (y !== y2) {
            this.grid[y][x] = 1;
            y += (y2 > y1) ? 1 : -1;
        }
    }

    draw(ctx, camera) {
        // Only draw visible tiles
        const startCol = Math.floor(camera.x / this.tileSize);
        const endCol = startCol + (camera.width / this.tileSize);
        const startRow = Math.floor(camera.y / this.tileSize);
        const endRow = startRow + (camera.height / this.tileSize);

        const offsetX = -camera.x + startCol * this.tileSize;
        const offsetY = -camera.y + startRow * this.tileSize;

        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                // Check bounds
                if (c >= 0 && c < this.width && r >= 0 && r < this.height) {
                    let tile = this.grid[r][c];
                    if (tile === 1) {
                        // Check if we are inside a merchant room
                        let isInMerchantRoom = false;
                        let isInSpecialRoom = false;
                        for (let rm of this.rooms) {
                            if (c >= rm.x && c < rm.x + rm.w && r >= rm.y && r < rm.y + rm.h) {
                                if (rm.type === 'merchant') {
                                    isInMerchantRoom = true;
                                    break;
                                } else if (rm.type === 'special') {
                                    isInSpecialRoom = true;
                                    break;
                                }
                            }
                        }

                        if (isInMerchantRoom) {
                            ctx.fillStyle = "#5c1d1d"; // Warm red carpet floor
                            ctx.fillRect(Math.floor((c - startCol) * this.tileSize + offsetX),
                                         Math.floor((r - startRow) * this.tileSize + offsetY),
                                         this.tileSize, this.tileSize);
                            // Gold dots pattern on carpet
                            ctx.fillStyle = "#f1c40f";
                            ctx.beginPath();
                            ctx.arc(Math.floor((c - startCol) * this.tileSize + offsetX) + this.tileSize / 2,
                                    Math.floor((r - startRow) * this.tileSize + offsetY) + this.tileSize / 2,
                                    1.5, 0, Math.PI * 2);
                            ctx.fill();
                        } else if (isInSpecialRoom) {
                            // Dark mystical basalt/purple tile for chest rooms
                            ctx.fillStyle = "#2c2235";
                            ctx.fillRect(Math.floor((c - startCol) * this.tileSize + offsetX),
                                         Math.floor((r - startRow) * this.tileSize + offsetY),
                                         this.tileSize, this.tileSize);
                            // Inner dark purple border
                            ctx.fillStyle = "#3d2d4c";
                            ctx.fillRect(Math.floor((c - startCol) * this.tileSize + offsetX) + 3,
                                         Math.floor((r - startRow) * this.tileSize + offsetY) + 3,
                                         this.tileSize - 6, this.tileSize - 6);
                            ctx.fillStyle = "#2c2235";
                            ctx.fillRect(Math.floor((c - startCol) * this.tileSize + offsetX) + 5,
                                         Math.floor((r - startRow) * this.tileSize + offsetY) + 5,
                                         this.tileSize - 10, this.tileSize - 10);
                        } else {
                            ctx.fillStyle = "#3a3a3a"; // Floor color
                            ctx.fillRect(Math.floor((c - startCol) * this.tileSize + offsetX),
                                         Math.floor((r - startRow) * this.tileSize + offsetY),
                                         this.tileSize, this.tileSize);
                        }
                    } else {
                        ctx.fillStyle = "#1a1a1a"; // Wall color
                        ctx.fillRect(Math.floor((c - startCol) * this.tileSize + offsetX),
                                     Math.floor((r - startRow) * this.tileSize + offsetY),
                                     this.tileSize, this.tileSize);
                        // Wall border
                        ctx.strokeStyle = "#0d0d0d";
                        ctx.strokeRect(Math.floor((c - startCol) * this.tileSize + offsetX),
                                     Math.floor((r - startRow) * this.tileSize + offsetY),
                                     this.tileSize, this.tileSize);
                    }
                    
                    // Draw Door
                    if (c === this.exitX && r === this.exitY) {
                        ctx.fillStyle = this.doorOpen ? '#f1c40f' : '#c0392b'; // Gold if open, Red if closed
                        ctx.fillRect(Math.floor((c - startCol) * this.tileSize + offsetX) + 5,
                                     Math.floor((r - startRow) * this.tileSize + offsetY) + 5,
                                     this.tileSize - 10, this.tileSize - 10);
                        
                        // Door frame
                        ctx.strokeStyle = '#000';
                        ctx.strokeRect(Math.floor((c - startCol) * this.tileSize + offsetX) + 5,
                                     Math.floor((r - startRow) * this.tileSize + offsetY) + 5,
                                     this.tileSize - 10, this.tileSize - 10);
                    }

                    // Draw Merchant Door
                    if (c === this.merchantDoorX && r === this.merchantDoorY) {
                        ctx.save();
                        let rx = Math.floor((c - startCol) * this.tileSize + offsetX);
                        let ry = Math.floor((r - startRow) * this.tileSize + offsetY);

                        if (this.merchantDoorOpen) {
                            // Open door: Translucent golden portal
                            let grad = ctx.createRadialGradient(
                                rx + this.tileSize / 2,
                                ry + this.tileSize / 2,
                                2,
                                rx + this.tileSize / 2,
                                ry + this.tileSize / 2,
                                this.tileSize / 2
                            );
                            grad.addColorStop(0, 'rgba(241, 196, 15, 0.4)');
                            grad.addColorStop(1, 'rgba(241, 196, 15, 0.05)');
                            ctx.fillStyle = grad;
                            ctx.fillRect(rx, ry, this.tileSize, this.tileSize);
                            
                            // Golden glowing thin frame
                            ctx.strokeStyle = 'rgba(241, 196, 15, 0.6)';
                            ctx.lineWidth = 2;
                            ctx.strokeRect(rx + 2, ry + 2, this.tileSize - 4, this.tileSize - 4);
                        } else {
                            // Closed door: Solid magical golden gate with a lock
                            // Gold gradient for the door base
                            let doorGrad = ctx.createLinearGradient(rx, ry, rx + this.tileSize, ry + this.tileSize);
                            doorGrad.addColorStop(0, '#f39c12');
                            doorGrad.addColorStop(0.5, '#f1c40f');
                            doorGrad.addColorStop(1, '#d35400');
                            ctx.fillStyle = doorGrad;
                            ctx.fillRect(rx + 4, ry + 4, this.tileSize - 8, this.tileSize - 8);
                            
                            // Golden border
                            ctx.strokeStyle = '#f1c40f';
                            ctx.lineWidth = 3;
                            ctx.strokeRect(rx + 4, ry + 4, this.tileSize - 8, this.tileSize - 8);
                            
                            // Magical runic lines across the door
                            ctx.strokeStyle = '#fff';
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.moveTo(rx + 8, ry + 8);
                            ctx.lineTo(rx + this.tileSize - 8, ry + this.tileSize - 8);
                            ctx.moveTo(rx + this.tileSize - 8, ry + 8);
                            ctx.lineTo(rx + 8, ry + this.tileSize - 8);
                            ctx.stroke();

                            // Lock icon
                            ctx.fillStyle = '#111';
                            ctx.beginPath();
                            ctx.arc(rx + this.tileSize / 2, ry + this.tileSize / 2 - 2, 4, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.fillRect(rx + this.tileSize / 2 - 2, ry + this.tileSize / 2 - 2, 4, 8);
                            
                            // Lock glow circle
                            ctx.strokeStyle = '#fff';
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.arc(rx + this.tileSize / 2, ry + this.tileSize / 2 - 2, 6, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                        ctx.restore();
                    }

                    // Draw Enter Door (to previous floor)
                    if (this.floor > 1 && c === this.enterX && r === this.enterY) {
                        ctx.fillStyle = '#9b59b6'; // Purple Portal
                        ctx.fillRect(Math.floor((c - startCol) * this.tileSize + offsetX) + 5,
                                     Math.floor((r - startRow) * this.tileSize + offsetY) + 5,
                                     this.tileSize - 10, this.tileSize - 10);
                        
                        // Frame
                        ctx.strokeStyle = '#fff';
                        ctx.strokeRect(Math.floor((c - startCol) * this.tileSize + offsetX) + 5,
                                     Math.floor((r - startRow) * this.tileSize + offsetY) + 5,
                                     this.tileSize - 10, this.tileSize - 10);

                        // Portal symbol "◀"
                        ctx.fillStyle = '#fff';
                        ctx.font = '12px monospace';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('◀', Math.floor((c - startCol) * this.tileSize + offsetX) + this.tileSize / 2,
                                           Math.floor((r - startRow) * this.tileSize + offsetY) + this.tileSize / 2);
                    }
                }
            }
        }
    }
    
    isWall(x, y) {
        let gridX = Math.floor(x / this.tileSize);
        let gridY = Math.floor(y / this.tileSize);
        if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
            return true; // Out of bounds is wall
        }
        if (gridX === this.merchantDoorX && gridY === this.merchantDoorY && !this.merchantDoorOpen) {
            return true; // Closed merchant door is a wall
        }
        return this.grid[gridY][gridX] === 0;
    }

    isWallRect(x, y, w, h) {
        // We use a small epsilon (0.1) so that being exactly on the edge doesn't count as a collision
        let leftTile = Math.floor((x - w/2 + 0.1) / this.tileSize);
        let rightTile = Math.floor((x + w/2 - 0.1) / this.tileSize);
        let topTile = Math.floor((y - h/2 + 0.1) / this.tileSize);
        let bottomTile = Math.floor((y + h/2 - 0.1) / this.tileSize);

        for (let r = topTile; r <= bottomTile; r++) {
            for (let c = leftTile; c <= rightTile; c++) {
                if (c < 0 || c >= this.width || r < 0 || r >= this.height) {
                    return true; // Out of bounds is wall
                }
                if (this.grid[r][c] === 0) {
                    return true; // Wall tile
                }
                if (c === this.merchantDoorX && r === this.merchantDoorY && !this.merchantDoorOpen) {
                    return true; // Closed merchant door acts as wall
                }
            }
        }
        return false;
    }
}
