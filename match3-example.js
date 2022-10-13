// ------------------------------------------------------------------------
// How To Make A Match-3 Game With HTML5 Canvas
// Copyright (c) 2015 Rembound.com
// 
// This program is free software: you can redistribute it and/or modify  
// it under the terms of the GNU General Public License as published by  
// the Free Software Foundation, either version 3 of the License, or  
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,  
// but WITHOUT ANY WARRANTY; without even the implied warranty of  
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the  
// GNU General Public License for more details.  
// 
// You should have received a copy of the GNU General Public License  
// along with this program.  If not, see http://www.gnu.org/licenses/.
//
// http://rembound.com/articles/how-to-make-a-match3-game-with-html5-canvas
// ------------------------------------------------------------------------

// The function gets called when the window is fully loaded
window.onload = function() {
    // Get the canvas and context
    var canvas = document.getElementById("viewport");
    var context = canvas.getContext("2d");
    
    // Timing and frames per second
    var lastFrame = 0;
    var fpstime = 0;
    var frameCount = 0;
    var fps = 0;
    
    // Mouse dragging
    var drag = false;
    
    // Level object
    var level = {
        x: 250,         // X position
        y: 113,         // Y position
        TOTALCOLUMNS: 8,     // Number of tile columns
        TOTALROWS: 8,        // Number of tile rows
        TILEWIDTH: 40,  // Visual width of a tile
        TILEHEIGHT: 40, // Visual height of a tile
        tiles: [],      // The two-dimensional tile array
        selectedtile: { selected: false, column: 0, row: 0 }  // change this a bit
    };
    
    // All of the different tile colors in RGB
    // replace with images?
    var tilecolors = [[255, 128, 128],
                      [128, 255, 128],
                      [128, 128, 255],
                      [255, 255, 128],
                      [255, 128, 255],
                      [128, 255, 255],
                      [255, 255, 255]];
    
    // Clusters and moves that were found
    var foundClusters = [];  // { column, row, length, horizontal }
    var moves = [];     // { column1, row1, column2, row2 }

    // Current move
    var currentMove = { column1: 0, row1: 0, column2: 0, row2: 0 };
    
    // Game states
    var gameStates = { init: 0, ready: 1, resolve: 2 }; // resolve = ai bot?
    var gameState = gameStates.init;
    
    // Score
    var myScore = 0;
    
    // TODO: stats


    // Animation variables
    var animationState = 0;
    var animationTime = 0;
    var animationTimeTotal = 0.3;
    
    // Show available moves
    var showMoves = false;
    
    // The AI bot, running or not?
    var aiBot = false;
    
    // Game Over
    var isGameOver = false;
    
    // Gui buttons
    // TODO: Change font
    var gameButtons = [ { x: 30, y: 240, width: 150, height: 50, text: "New Game"},
                    { x: 30, y: 300, width: 150, height: 50, text: "Show Moves"},
                    { x: 30, y: 360, width: 150, height: 50, text: "Enable AI Bot"}];
    
    // TODO: severity
    function log(mymessage)
    {
        console.log(mymessage)
    }




    // Initialize the game
    function init() {
        // Add mouse events
        canvas.addEventListener("mousemove", onMouseMove); // keep
        canvas.addEventListener("mousedown", onMouseDown);
        canvas.addEventListener("mouseup", onMouseUp);
        canvas.addEventListener("mouseout", onMouseOut);
        
        // Initialize the two-dimensional tile array
        for (var columns=0; columns<level.TOTALCOLUMNS; columns++) {
            level.tiles[columns] = [];
            for (var rows=0; rows<level.TOTALROWS; rows++) {
                // Define a tile type and a shift parameter for animation
                level.tiles[columns][rows] = { type: 0, shift:0 }
            }
        }
        startNewGame(); // New game
        // Enter main loop
        main(0);
    }
    
    // Main loop
    function main(tframe) {
        // Request animation frames
        window.requestAnimationFrame(main);
        
        // Update and render the game
        updateGameState(tframe);
        render();
    }
    
    // Update the game state
    function updateGameState(tframe) {
        var dt = (tframe - lastFrame) / 1000;
        lastFrame = tframe;
        
        // Update the fps counter
        updateFrameCounter(dt);
        
        if (gameState == gameStates.ready) {
            // Game is ready for player input
            
            // Check for game over
            if (moves.length <= 0) {
                isGameOver = true;
            }
            
            // Let the AI bot make a move, if enabled
            // remove later
            if (aiBot) {
                animationTime += dt;
                if (animationTime > animationTimeTotal) {
                    // Check if there are moves available
                    findMoves();
                    
                    if (moves.length > 0) {
                        // Get a random valid move
                        var move = moves[Math.floor(Math.random() * moves.length)];
                        
                        // Simulate a player using the mouse to swap two tiles
                        mouseSwap(move.column1, move.row1, move.column2, move.row2);
                    } else {
                        // No moves left, Game Over. We could start a new game.
                        // newGame();
                    }
                    animationTime = 0;
                }
            }
        } else if (gameState == gameStates.resolve) {
            // Game is busy resolving and animating clusters
            animationTime += dt;
            
            if (animationState == 0) {
                // Clusters need to be found and removed
                if (animationTime > animationTimeTotal) {
                    // Find clusters
                    findClusters();
                    
                    if (foundClusters.length > 0) {
                        // Add points to the score
                        for (var i=0; i<foundClusters.length; i++) {
                            // Add extra points for longer clusters
                            myScore += 100 * (foundClusters[i].length - 2);;
                        }
                    
                        // Clusters found, remove them
                        removeClusters();
                        
                        // Tiles need to be shifted
                        animationState = 1;
                    } else {
                        // No clusters found, animation complete
                        gameState = gameStates.ready;
                    }
                    animationTime = 0;
                }
            } else if (animationState == 1) {
                // Tiles need to be shifted
                if (animationTime > animationTimeTotal) {
                    // Shift tiles
                    shiftTiles();
                    
                    // New clusters need to be found
                    animationState = 0;
                    animationTime = 0;
                    
                    // Check if there are new clusters
                    findClusters();
                    if (foundClusters.length <= 0) {
                        // Animation complete
                        gameState = gameStates.ready;
                    }
                }
            } else if (animationState == 2) {
                // Swapping tiles animation
                if (animationTime > animationTimeTotal) {
                    // Swap the tiles
                    swapTwoTiles(currentMove.column1, currentMove.row1, currentMove.column2, currentMove.row2);
                    
                    // Check if the swap made a cluster
                    findClusters();
                    if (foundClusters.length > 0) {
                        // Valid swap, found one or more clusters
                        // Prepare animation states
                        animationState = 0;
                        animationTime = 0;
                        gameState = gameStates.resolve;
                    } else {
                        // Invalid swap, Rewind swapping animation
                        animationState = 3;
                        animationTime = 0;
                    }
                    
                    // Update moves and clusters
                    findMoves();
                    findClusters();
                }
            } else if (animationState == 3) {
                // Rewind swapping animation
                if (animationTime > animationTimeTotal) {
                    // Invalid swap, swap back
                    swapTwoTiles(currentMove.column1, currentMove.row1, currentMove.column2, currentMove.row2);
                    
                    // Animation complete
                    gameState = gameStates.ready;
                }
            }
            
            // Update moves and clusters
            findMoves();
            findClusters();
        }
    }
    
    function updateFrameCounter(dt) {
        if (fpstime > 0.25) {
            // Calculate fps
            fps = Math.round(frameCount / fpstime);
            
            // Reset time and framecount
            fpstime = 0;
            frameCount = 0;
        }
        
        // Increase time and framecount
        fpstime += dt;
        frameCount++;
    }
    
    // Draw text that is centered
    function drawCenterText(text, x, y, width) {
        var textdim = context.measureText(text);
        context.fillText(text, x + (width-textdim.width)/2, y);
    }
    
    // Render the game
    function render() {
        // Draw the frame
        drawGridFrame();
        
        // Draw score
        context.fillStyle = "#000000";
        context.font = "24px Verdana";
        drawCenterText("Score:", 30, level.y+40, 150);
        drawCenterText(myScore, 30, level.y+70, 150);
        drawCenterText("Total Moves: ",30, level.y+100, 150);
        drawCenterText(myScore, 30, level.y+130, 150); // TODO: update
        
        // Draw buttons
        drawButtons();
        
        // Draw level background
        var levelwidth = level.TOTALCOLUMNS * level.TILEWIDTH;
        var levelheight = level.TOTALROWS * level.TILEHEIGHT;
        context.fillStyle = "#000000";
        context.fillRect(level.x - 4, level.y - 4, levelwidth + 8, levelheight + 8);
        
        // Render tiles
        renderTiles();
        
        // Render clusters
        renderClusters();
        
        // Render moves, when there are no clusters
        if (showMoves && foundClusters.length <= 0 && gameState == gameStates.ready) {
            renderMoves();
        }
        
        // Game Over overlay
        if (isGameOver) {
            context.fillStyle = "rgba(0, 0, 0, 0.8)";
            context.fillRect(level.x, level.y, levelwidth, levelheight);
            
            context.fillStyle = "#ffffff";
            context.font = "24px Verdana";
            drawCenterText("Game Over!", level.x, level.y + levelheight / 2 + 10, levelwidth);
        }
    }
    
    // Draw a frame with a border
    function drawGridFrame() {
        // Draw background and a border
        context.fillStyle = "#d0d0d0";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#e8eaec";
        context.fillRect(1, 1, canvas.width-2, canvas.height-2);
        
        // Draw header
        context.fillStyle = "#303030";
        context.fillRect(0, 0, canvas.width, 65);
        
        // Draw title
        context.fillStyle = "#ffffff";
        context.font = "24px Verdana";
        context.fillText("Match 3", 10, 30);
        
        // Display fps
        context.fillStyle = "#ffffff";
        context.font = "12px Verdana";
        context.fillText("Fps: " + fps, 13, 50);
    }
    
    // Draw buttons
    function drawButtons() {
        for (var i=0; i<gameButtons.length; i++) {
            // Draw button shape
            context.fillStyle = "#000000";
            context.fillRect(gameButtons[i].x, gameButtons[i].y, gameButtons[i].width, gameButtons[i].height);
            
            // Draw button text
            context.fillStyle = "#ffffff";
            context.font = "18px Verdana";
            var textdim = context.measureText(gameButtons[i].text);
            context.fillText(gameButtons[i].text, gameButtons[i].x + (gameButtons[i].width-textdim.width)/2, gameButtons[i].y+30);
        }
    }
    
    // Render tiles
    function renderTiles() {
        for (var column=0; column<level.TOTALCOLUMNS; column++) {
            for (var row=0; row<level.TOTALROWS; row++) {
                // Get the shift of the tile for animation
                var shift = level.tiles[column][row].shift;
                
                // Calculate the tile coordinates
                var coord = getTileCoordinate(column, row, 0, (animationTime / animationTimeTotal) * shift);
                
                // Check if there is a tile present
                if (level.tiles[column][row].type >= 0) {
                    // Get the color of the tile
                    var col = tilecolors[level.tiles[column][row].type];
                    
                    // Draw the tile using the color
                    drawTile(coord.tilex, coord.tiley, col[0], col[1], col[2]);
                }
                
                // Draw the selected tile
                if (level.selectedtile.selected) {
                    if (level.selectedtile.column == column && level.selectedtile.row == row) {
                        // Draw a red tile
                        drawTile(coord.tilex, coord.tiley, 255, 0, 0);
                    }
                }
            }
        }
        
        // Render the swap animation
        if (gameState == gameStates.resolve && (animationState == 2 || animationState == 3)) {
            // Calculate the x and y shift
            var shiftx = currentMove.column2 - currentMove.column1;
            var shifty = currentMove.row2 - currentMove.row1;

            // First tile
            var coord1 = getTileCoordinate(currentMove.column1, currentMove.row1, 0, 0);
            var coord1shift = getTileCoordinate(currentMove.column1, currentMove.row1, (animationTime / animationTimeTotal) * shiftx, (animationTime / animationTimeTotal) * shifty);
            var col1 = tilecolors[level.tiles[currentMove.column1][currentMove.row1].type];
            
            // Second tile
            var coord2 = getTileCoordinate(currentMove.column2, currentMove.row2, 0, 0);
            var coord2shift = getTileCoordinate(currentMove.column2, currentMove.row2, (animationTime / animationTimeTotal) * -shiftx, (animationTime / animationTimeTotal) * -shifty);
            var col2 = tilecolors[level.tiles[currentMove.column2][currentMove.row2].type];
            
            // Draw a black background
            drawTile(coord1.tilex, coord1.tiley, 0, 0, 0);
            drawTile(coord2.tilex, coord2.tiley, 0, 0, 0);
            
            // Change the order, depending on the animation state
            if (animationState == 2) {
                // Draw the tiles
                drawTile(coord1shift.tilex, coord1shift.tiley, col1[0], col1[1], col1[2]);
                drawTile(coord2shift.tilex, coord2shift.tiley, col2[0], col2[1], col2[2]);
            } else {
                // Draw the tiles
                drawTile(coord2shift.tilex, coord2shift.tiley, col2[0], col2[1], col2[2]);
                drawTile(coord1shift.tilex, coord1shift.tiley, col1[0], col1[1], col1[2]);
            }
        }
    }
    
    // Get the tile coordinate
    function getTileCoordinate(column, row, columnoffset, rowoffset) {
        var tilex = level.x + (column + columnoffset) * level.TILEWIDTH;
        var tiley = level.y + (row + rowoffset) * level.TILEHEIGHT;
        return { tilex: tilex, tiley: tiley};
    }
    
    // Draw a tile with a color
    function drawTile(x, y, r, g, b) {
        context.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
        context.fillRect(x + 2, y + 2, level.TILEWIDTH - 4, level.TILEHEIGHT - 4);
    }
    
    // Render clusters(matches)
    function renderClusters() {
        for (var i=0; i<foundClusters.length; i++) {
            // Calculate the tile coordinates
            var coord = getTileCoordinate(foundClusters[i].column, foundClusters[i].row, 0, 0);
            
            if (foundClusters[i].horizontal) {
                // Draw a horizontal line
                context.fillStyle = "#00ff00";
                context.fillRect(coord.tilex + level.TILEWIDTH/2, coord.tiley + level.TILEHEIGHT/2 - 4, (foundClusters[i].length - 1) * level.TILEWIDTH, 8);
            } else {
                // Draw a vertical line
                context.fillStyle = "#0000ff";
                context.fillRect(coord.tilex + level.TILEWIDTH/2 - 4, coord.tiley + level.TILEHEIGHT/2, 8, (foundClusters[i].length - 1) * level.TILEHEIGHT);
            }
        }
    }
    
    // Render moves
    function renderMoves() {
        for (var i=0; i<moves.length; i++) {
            // Calculate coordinates of tile 1 and 2
            var coord1 = getTileCoordinate(moves[i].column1, moves[i].row1, 0, 0);
            var coord2 = getTileCoordinate(moves[i].column2, moves[i].row2, 0, 0);
            
            // Draw a line from tile 1 to tile 2
            context.strokeStyle = "#ff0000";
            context.beginPath();
            context.moveTo(coord1.tilex + level.TILEWIDTH/2, coord1.tiley + level.TILEHEIGHT/2);
            context.lineTo(coord2.tilex + level.TILEWIDTH/2, coord2.tiley + level.TILEHEIGHT/2);
            context.stroke();
        }
    }
    
    // Start a new game
    function startNewGame() {
        console.clear(); 
        // Reset score
        myScore = 0;
        
        // Set the gamestate to ready
        gameState = gameStates.ready;
        
        // Reset game over
        isGameOver = false;
        
        // Create the level
        createLevel();
        
        // Find initial clusters and moves
        findMoves();
        findClusters(); 
    }
    
    // Create a random level
    function createLevel() {
        var done = false;
        
        // Keep generating levels until it is correct
        while (!done) {
        
            // Create a level with random tiles
            for (var i=0; i<level.TOTALCOLUMNS; i++) {
                for (var j=0; j<level.TOTALROWS; j++) {
                    level.tiles[i][j].type = getRandomTile();
                }
            }
            
            // Resolve the clusters
            resolveClusters();
            
            // Check if there are valid moves
            findMoves();
            
            // Done when there is a valid move
            if (moves.length > 0) {
                log("no valid moves");
                done = true;
            }
        }
    }
    
    // Get a random tile
    function getRandomTile() {
        return Math.floor(Math.random() * tilecolors.length);
    }
    
    // Remove clusters and insert tiles
    function resolveClusters() {
        // Check for clusters
        findClusters();
        
        // While there are clusters left
        while (foundClusters.length > 0) {
        
            // Remove clusters
            removeClusters();
            
            // Shift tiles
            shiftTiles();
            
            // Check if there are clusters left
            findClusters();
        }
    }
    
    // Find clusters in the level
    function findClusters() {
        // Reset clusters
        foundClusters = []
        
        // Find horizontal clusters
        for (var j=0; j<level.TOTALROWS; j++) {
            // Start with a single tile, cluster of 1
            var matchlength = 1;
            for (var i=0; i<level.TOTALCOLUMNS; i++) {
                var checkcluster = false;
                
                if (i == level.TOTALCOLUMNS-1) {
                    // Last tile
                    checkcluster = true;
                } else {
                    // Check the type of the next tile
                    if (level.tiles[i][j].type == level.tiles[i+1][j].type &&
                        level.tiles[i][j].type != -1) {
                        // Same type as the previous tile, increase matchlength
                        matchlength += 1;
                    } else {
                        // Different type
                        checkcluster = true;
                    }
                }
                
                // Check if there was a cluster
                if (checkcluster) {
                    if (matchlength >= 3) {
                        // Found a horizontal cluster
                        foundClusters.push({ column: i+1-matchlength, row:j,
                                        length: matchlength, horizontal: true });
                        log("found horizontal cluster");
                    }
                    
                    matchlength = 1;
                }
            }
        }

        // Find vertical clusters
        for (var i=0; i<level.TOTALCOLUMNS; i++) {
            // Start with a single tile, cluster of 1
            var matchlength = 1;
            for (var j=0; j<level.TOTALROWS; j++) {
                var checkcluster = false;
                
                if (j == level.TOTALROWS-1) {
                    // Last tile
                    checkcluster = true;
                } else {
                    // Check the type of the next tile
                    if (level.tiles[i][j].type == level.tiles[i][j+1].type &&
                        level.tiles[i][j].type != -1) {
                        // Same type as the previous tile, increase matchlength
                        matchlength += 1;
                        log("match length " + matchlength);
                    } else {
                        // Different type
                        checkcluster = true;
                    }
                }
                
                // Check if there was a cluster
                if (checkcluster) {
                    if (matchlength >= 3) {
                        // Found a vertical cluster
                        foundClusters.push({ column: i, row:j+1-matchlength,
                                        length: matchlength, horizontal: false });
                    }
                    
                    matchlength = 1;
                }
            }
        }
    }
    
    // Find available moves
    function findMoves() {
        // Reset moves
        moves = []
        
        // Check horizontal swaps
        for (var j=0; j<level.TOTALROWS; j++) {
            for (var i=0; i<level.TOTALCOLUMNS-1; i++) {
                // Swap, find clusters and swap back
                swapTwoTiles(i, j, i+1, j);
                findClusters();
                swapTwoTiles(i, j, i+1, j);
                
                // Check if the swap made a cluster
                if (foundClusters.length > 0) {
                    // Found a move
                    moves.push({column1: i, row1: j, column2: i+1, row2: j});
                }
            }
        }
        
        // Check vertical swaps
        for (var i=0; i<level.TOTALCOLUMNS; i++) {
            for (var j=0; j<level.TOTALROWS-1; j++) {
                // Swap, find clusters and swap back
                swapTwoTiles(i, j, i, j+1);
                findClusters();
                swapTwoTiles(i, j, i, j+1);
                
                // Check if the swap made a cluster
                if (foundClusters.length > 0) {
                    // Found a move
                    moves.push({column1: i, row1: j, column2: i, row2: j+1});
                }
            }
        }
        
        // Reset clusters
        foundClusters = []
    }
    
    // Loop over the cluster tiles and execute a function
    function loopClusters(func) {
        for (var i=0; i<foundClusters.length; i++) {
            //  { column, row, length, horizontal }
            var cluster = foundClusters[i];
            var coffset = 0;
            var roffset = 0;
            for (var j=0; j<cluster.length; j++) {
                func(i, cluster.column+coffset, cluster.row+roffset, cluster);
                
                if (cluster.horizontal) {
                    coffset++;
                } else {
                    roffset++;
                }
            }
        }
    }
    
    // Remove the clusters
    function removeClusters() {
        log("removing clusters");
        // Change the type of the tiles to -1, indicating a removed tile
        loopClusters(function(index, column, row, cluster) { level.tiles[column][row].type = -1; });

        // Calculate how much a tile should be shifted downwards
        for (var i=0; i<level.TOTALCOLUMNS; i++) {
            var shift = 0;
            for (var j=level.TOTALROWS-1; j>=0; j--) {
                // Loop from bottom to top
                if (level.tiles[i][j].type == -1) {
                    // Tile is removed, increase shift
                    shift++;
                    level.tiles[i][j].shift = 0;
                } else {
                    // Set the shift
                    level.tiles[i][j].shift = shift;
                }
            }
        }
    }
    
    // Shift tiles and insert new tiles
    function shiftTiles() {
        // Shift tiles
        log("shifting tiles");
        for (var i=0; i<level.TOTALCOLUMNS; i++) {
            for (var j=level.TOTALROWS-1; j>=0; j--) {
                // Loop from bottom to top
                if (level.tiles[i][j].type == -1) {
                    // Insert new random tile
                    level.tiles[i][j].type = getRandomTile();
                } else {
                    // Swap tile to shift it
                    var shift = level.tiles[i][j].shift;
                    if (shift > 0) {
                        swapTwoTiles(i, j, i, j+shift)
                    }
                }
                
                // Reset shift
                level.tiles[i][j].shift = 0;
            }
        }
    }
    
    // Get the tile under the mouse
    // keep this one
    function getMouseTile(pos) {
        // Calculate the index of the tile
        var tx = Math.floor((pos.x - level.x) / level.TILEWIDTH);
        var ty = Math.floor((pos.y - level.y) / level.TILEHEIGHT);
        
        // Check if the tile is valid
        if (tx >= 0 && tx < level.TOTALCOLUMNS && ty >= 0 && ty < level.TOTALROWS) {
            // Tile is valid
            return {
                valid: true,
                x: tx,
                y: ty
            };
        }
        
        // No valid tile
        return {
            valid: false,
            x: 0,
            y: 0
        };
    }
    
    // Check if two tiles can be swapped
    function canSwap(x1, y1, x2, y2) {
        // Check if the tile is a direct neighbor of the selected tile
        if ((Math.abs(x1 - x2) == 1 && y1 == y2) ||
            (Math.abs(y1 - y2) == 1 && x1 == x2)) {
            return true;
        }
        
        return false;
    }
    
    // Swap two tiles in the level
    function swapTwoTiles(x1, y1, x2, y2) {
        var typeswap = level.tiles[x1][y1].type;
        level.tiles[x1][y1].type = level.tiles[x2][y2].type;
        level.tiles[x2][y2].type = typeswap;
    }
    
    // Swap two tiles as a player action
    function mouseSwap(c1, r1, c2, r2) {
        // Save the current move
        currentMove = {column1: c1, row1: r1, column2: c2, row2: r2};
    
        // Deselect
        level.selectedtile.selected = false;
        
        // Start animation
        animationState = 2;
        animationTime = 0;
        gameState = gameStates.resolve;
    }
    
    // On mouse movement
    function onMouseMove(e) {
        // Get the mouse position
        var pos = getMousePosition(canvas, e);
        
        // Check if we are dragging with a tile selected
        if (drag && level.selectedtile.selected) {
            // Get the tile under the mouse
            mt = getMouseTile(pos);
            if (mt.valid) {
                // Valid tile
                
                // Check if the tiles can be swapped
                if (canSwap(mt.x, mt.y, level.selectedtile.column, level.selectedtile.row)){
                    // Swap the tiles
                    mouseSwap(mt.x, mt.y, level.selectedtile.column, level.selectedtile.row);
                }
            }
        }
    }
    
    // On mouse button click
    function onMouseDown(e) {
        // Get the mouse position
        var pos = getMousePosition(canvas, e);
        
        // Start dragging
        if (!drag) {
            // Get the tile under the mouse
            mt = getMouseTile(pos);
            
            if (mt.valid) {
                // Valid tile
                var swapped = false;
                if (level.selectedtile.selected) {
                    if (mt.x == level.selectedtile.column && mt.y == level.selectedtile.row) {
                        // Same tile selected, deselect
                        level.selectedtile.selected = false;
                        drag = true;
                        return;
                    } else if (canSwap(mt.x, mt.y, level.selectedtile.column, level.selectedtile.row)){
                        // Tiles can be swapped, swap the tiles
                        mouseSwap(mt.x, mt.y, level.selectedtile.column, level.selectedtile.row);
                        swapped = true;
                    }
                }
                
                if (!swapped) {
                    // Set the new selected tile
                    level.selectedtile.column = mt.x;
                    level.selectedtile.row = mt.y;
                    level.selectedtile.selected = true;
                }
            } else {
                // Invalid tile
                level.selectedtile.selected = false;
            }

            // Start dragging
            drag = true;
        }
        
        // Check if a button was clicked
        for (var i=0; i<gameButtons.length; i++) {
            if (pos.x >= gameButtons[i].x && pos.x < gameButtons[i].x+gameButtons[i].width &&
                pos.y >= gameButtons[i].y && pos.y < gameButtons[i].y+gameButtons[i].height) {
                
                // Button i was clicked
                if (i == 0) {
                    // New Game
                    startNewGame();
                } else if (i == 1) {
                    // Show Moves
                    showMoves = !showMoves;
                    gameButtons[i].text = (showMoves?"Hide":"Show") + " Moves";
                } else if (i == 2) {
                    // AI Bot
                    aiBot = !aiBot;
                    gameButtons[i].text = (aiBot?"Disable":"Enable") + " AI Bot";
                }
            }
        }
    }

    // TODO: only if super-debug mode is on
    function debugMessage(mymessage){
        console.log(mymessage);
    }

    function titleChange(myTItle){
        document.title = myTItle; 
    }
    
    function onMouseUp(e) {
        // Reset dragging
        drag = false;
    }
    
    function onMouseOut(e) {
        // Reset dragging
        drag = false;
    }
    
    // Get the mouse position
    function getMousePosition(canvas, e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: Math.round((e.clientX - rect.left)/(rect.right - rect.left)*canvas.width),
            y: Math.round((e.clientY - rect.top)/(rect.bottom - rect.top)*canvas.height)
        };
    }
    
    // Call init to start the game
    init();
};