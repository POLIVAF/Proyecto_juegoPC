class Dungeon {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = []; // 0: wall, 1: floor
        this.tileSize = 40; // pixel size per tile
        this.rooms = [];
        this.exitX = 0;
        this.exitY = 0;
        this.doorOpen = false;
        // Do not generate automatically, let game.js call the specific generator
    }

    generate() {
        // Clear rooms and grid
        this.rooms = [];
        
        // Initialize grid with walls (0)
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = 0;
            }
        }

        // BSP or Simple Random Room Generation
        // For simplicity, let's do random room generation
        const numRooms = 10;
        const minRoomSize = 4;
        const maxRoomSize = 10;

        for (let i = 0; i < numRooms; i++) {
            let roomWidth = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
            let roomHeight = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
            let roomX = Math.floor(Math.random() * (this.width - roomWidth - 1)) + 1;
            let roomY = Math.floor(Math.random() * (this.height - roomHeight - 1)) + 1;

            let newRoom = { x: roomX, y: roomY, w: roomWidth, h: roomHeight };
            
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
                // Connect to previous room
                if (this.rooms.length > 0) {
                    let prevRoom = this.rooms[this.rooms.length - 1];
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

        // Set exit door in the last room
        let lastRoom = this.rooms[this.rooms.length - 1];
        this.exitX = lastRoom.x + Math.floor(lastRoom.w / 2);
        this.exitY = lastRoom.y + Math.floor(lastRoom.h / 2);
    }

    generateBossRoom() {
        // Clear rooms and grid
        this.rooms = [];

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

        let bossRoom = { x: roomX, y: roomY, w: roomWidth, h: roomHeight };
        this.createRoom(bossRoom);
        this.rooms.push(bossRoom);

        // Put door at top center
        this.exitX = roomX + Math.floor(roomWidth / 2);
        this.exitY = roomY + 2;
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
                        ctx.fillStyle = "#3a3a3a"; // Floor color
                        ctx.fillRect(Math.floor((c - startCol) * this.tileSize + offsetX),
                                     Math.floor((r - startRow) * this.tileSize + offsetY),
                                     this.tileSize, this.tileSize);
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
            }
        }
        return false;
    }
}
