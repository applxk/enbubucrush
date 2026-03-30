// Array of Enbubu characters
const enbubuCharacters = [
    { name: 'jungwon', image: '../images/enbubus/jungwon.png' },
    { name: 'heeseung', image: '../images/enbubus/heeseung.png' },
    { name: 'jay', image: '../images/enbubus/jay.png' },
    { name: 'jake', image: '../images/enbubus/jake.png' },
    { name: 'sunghoon', image: '../images/enbubus/sunghoon.png' },
    { name: 'sunoo', image: '../images/enbubus/sunoo.png' },
    { name: 'niki', image: '../images/enbubus/niki.png' },
];

// Grid dimensions
const GRID_COLS = 5;
const GRID_ROWS = 6;
const ANIMATION_SPEED = 200;
const DROP_ANIMATION_SPEED = 400;

// Game state
let gameState = {
    moves: 0,
    goals: {},
    maxMoves: 0,
    grid: [],
    gameOver: false,
    isAnimating: false,
    selectedCell: null,
    score: 0,
    hintTimer: null,
    lastActionTime: Date.now(),
    hintShown: false,
    addMoveUsed: false,
    reduceGoalUsed: false
};

const HINT_DELAY = 10000; // 10 seconds

// Utility functions
function getRandomEnbubuName() {
    const char = enbubuCharacters[Math.floor(Math.random() * enbubuCharacters.length)];
    return char.name;
}

function getEnbubuByName(name) {
    return enbubuCharacters.find(e => e.name === name);
}

function getTwoRandomEnbubus() {
    let selected = [];
    let available = [...enbubuCharacters];
    for (let i = 0; i < 2; i++) {
        const idx = Math.floor(Math.random() * available.length);
        selected.push(available[idx]);
        available.splice(idx, 1);
    }
    return selected;
}

function getRandomGoalCount() {
    return Math.floor(Math.random() * 10) + 3; // 3-12 instead of 5-20
}

function getRandomMoves(totalGoals) {
    // Ensure moves are always sufficient to win
    // Base formula: need at least as many moves as total goals
    // Add buffer for cascades and safety margin
    const baseMoves = Math.ceil(totalGoals * 1.3); // 30% buffer
    const variance = Math.floor(Math.random() * 4) + 2; // Add 2-5 extra moves for randomness
    return Math.max(baseMoves + variance, 10); // Minimum 10 moves
}

// Initialize the game
function initializeGame() {
    let boardReady = false;
    let attempts = 0;
    
    // Keep generating until we have a board with possible moves
    while (!boardReady && attempts < 10) {
        const goalEnbubus = getTwoRandomEnbubus();
        const goal1Count = getRandomGoalCount();
        const goal2Count = getRandomGoalCount();
        const totalGoals = goal1Count + goal2Count;
        const moves = getRandomMoves(totalGoals);
        
        gameState.goals = {
            [goalEnbubus[0].name]: { count: goal1Count, enbubu: goalEnbubus[0] },
            [goalEnbubus[1].name]: { count: goal2Count, enbubu: goalEnbubus[1] }
        };
        gameState.moves = moves;
        gameState.maxMoves = moves;
        gameState.gameOver = false;
        gameState.score = 0;
        
        createInitialGrid();
        
        // Check if board is playable
        if (isBoardSolvable()) {
            boardReady = true;
        }
        
        attempts++;
    }
    
    updateGoalsUI(Object.values(gameState.goals).map(g => g.enbubu), 
                  gameState.goals[Object.keys(gameState.goals)[0]].count,
                  gameState.goals[Object.keys(gameState.goals)[1]].count);
    updateMovesUI();
    
    // Create set of all cells for initial spawn animation
    const allCells = new Set();
    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            allCells.add(`${row},${col}`);
        }
    }
    
    renderGrid(allCells);
    
    // Apply filling animation to all cells
    const gameGrid = document.getElementById('gameGrid');
    const cells = gameGrid.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        cell.classList.add('filling');
    });
    
    // Start hint timer
    resetHintTimer();
}

// Create initial grid
function createInitialGrid() {
    gameState.grid = [];
    let attempts = 0;
    const maxAttempts = 50;
    
    do {
        gameState.grid = [];
        for (let row = 0; row < GRID_ROWS; row++) {
            gameState.grid[row] = [];
            for (let col = 0; col < GRID_COLS; col++) {
                gameState.grid[row][col] = getRandomEnbubuName();
            }
        }
        attempts++;
    } while (hasMatches() && attempts < maxAttempts);
    
    // If we still have matches after maxAttempts, regenerate one more time
    if (hasMatches()) {
        for (let row = 0; row < GRID_ROWS; row++) {
            gameState.grid[row] = [];
            for (let col = 0; col < GRID_COLS; col++) {
                gameState.grid[row][col] = getRandomEnbubuName();
            }
        }
    }
}

// Update Goals UI
function updateGoalsUI(enbubus, count1, count2) {
    const goalsContainer = document.querySelector('.goals-container');
    goalsContainer.innerHTML = '';
    
    const goal1Img = document.createElement('img');
    goal1Img.src = enbubus[0].image;
    goal1Img.className = 'goal-item';
    const goal1Count = document.createElement('span');
    goal1Count.className = 'goal-count';
    goal1Count.dataset.enbubu = enbubus[0].name;
    goal1Count.textContent = count1;
    
    const goal2Img = document.createElement('img');
    goal2Img.src = enbubus[1].image;
    goal2Img.className = 'goal-item';
    const goal2Count = document.createElement('span');
    goal2Count.className = 'goal-count';
    goal2Count.dataset.enbubu = enbubus[1].name;
    goal2Count.textContent = count2;
    
    goalsContainer.appendChild(goal1Img);
    goalsContainer.appendChild(goal1Count);
    goalsContainer.appendChild(goal2Img);
    goalsContainer.appendChild(goal2Count);
}

// Update Moves UI
function updateMovesUI() {
    document.getElementById('moves').textContent = gameState.moves;
}

// Update Goal Display
function updateGoalDisplay(name) {
    document.querySelectorAll('.goal-count').forEach(el => {
        if (el.dataset.enbubu === name) {
            const count = gameState.goals[name].count;
            if (count <= 0) {
                el.textContent = '✓';
                el.classList.add('goal-completed');
            } else {
                el.textContent = count;
                el.classList.remove('goal-completed');
            }
        }
    });
}

// Render the grid
function renderGrid(newCells = new Set()) {
    const gameGrid = document.getElementById('gameGrid');
    const cells = gameGrid.querySelectorAll('.grid-cell');
    
    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            const cellIdx = row * GRID_COLS + col;
            const cell = cells[cellIdx];
            const name = gameState.grid[row][col];
            
            cell.innerHTML = '';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.className = 'grid-cell';
            
            if (!name) return;
            
            const enbubu = getEnbubuByName(name);
            const img = document.createElement('img');
            img.src = enbubu.image;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.style.padding = '5px';
            img.style.boxSizing = 'border-box';
            img.draggable = false;
            
            // Add staggered animation delay for initial spawn
            if (newCells.size === 0 || newCells.has(`${row},${col}`)) {
                img.style.animationDelay = `${(row * GRID_COLS + col) * 30}ms`;
            }
            
            cell.appendChild(img);
            
            // Add both mouse and touch event listeners
            cell.addEventListener('mousedown', startDrag);
            cell.addEventListener('touchstart', startDrag);
        }
    }
}

// Hint system
function showHint() {
    if (gameState.gameOver || gameState.hintShown) return;
    
    const possibleMoves = getPossibleMoves();
    if (possibleMoves.length === 0) return;
    
    // Get the first move as hint
    const hintMove = possibleMoves[0];
    const fromCell = gameState.grid[hintMove.from.row][hintMove.from.col];
    const toCell = gameState.grid[hintMove.to.row][hintMove.to.col];
    
    // Highlight the two cells that should be swapped
    const gameGrid = document.getElementById('gameGrid');
    const cells = gameGrid.querySelectorAll('.grid-cell');
    
    const fromIdx = hintMove.from.row * GRID_COLS + hintMove.from.col;
    const toIdx = hintMove.to.row * GRID_COLS + hintMove.to.col;
    
    cells[fromIdx].classList.add('hint');
    cells[toIdx].classList.add('hint');
    
    gameState.hintShown = true;
    
    // Remove hint after 3 seconds
    setTimeout(() => {
        cells[fromIdx].classList.remove('hint');
        cells[toIdx].classList.remove('hint');
        gameState.hintShown = false;
    }, 3000);
}

function resetHintTimer() {
    if (gameState.gameOver) return;
    
    // Clear existing timer
    if (gameState.hintTimer) {
        clearTimeout(gameState.hintTimer);
    }
    
    gameState.lastActionTime = Date.now();
    
    // Set new hint timer for 10 seconds
    gameState.hintTimer = setTimeout(() => {
        showHint();
        // Reset timer for next hint after 10 more seconds
        gameState.hintTimer = setTimeout(() => {
            resetHintTimer();
        }, HINT_DELAY);
    }, HINT_DELAY);
}

// Drag and swap logic
let draggedCell = null;
let dragStart = null;

function startDrag(e) {
    if (gameState.gameOver || gameState.isAnimating) return;
    
    // Prevent default touch behavior (scrolling, etc.)
    if (e.touches) {
        e.preventDefault();
    }
    
    resetHintTimer();
    
    draggedCell = e.currentTarget;
    
    // Handle both mouse and touch events
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    dragStart = { x: clientX, y: clientY };
    draggedCell.classList.add('dragging');
    
    // Remove any existing listeners before adding new ones
    document.removeEventListener('mousemove', moveDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', moveDrag);
    document.removeEventListener('touchend', endDrag);
    
    document.addEventListener('mousemove', moveDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', moveDrag, { passive: false });
    document.addEventListener('touchend', endDrag);
}

function moveDrag(e) {
    if (!draggedCell) return;
    
    // Prevent default touch behavior
    if (e.touches) {
        e.preventDefault();
    }
    
    // Handle both mouse and touch events
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 20) {
        draggedCell.style.opacity = '0.7';
    }
}

function endDrag(e) {
    if (!draggedCell) return;
    
    document.removeEventListener('mousemove', moveDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', moveDrag);
    document.removeEventListener('touchend', endDrag);
    
    // Handle both mouse and touch events
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    draggedCell.style.opacity = '1';
    draggedCell.classList.remove('dragging');
    
    // Determine direction and find target cell
    if (dist > 30) {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const row = parseInt(draggedCell.dataset.row);
        const col = parseInt(draggedCell.dataset.col);
        let targetRow = row;
        let targetCol = col;
        
        if (angle > -45 && angle <= 45) targetCol++; // Right
        else if (angle > 45 && angle <= 135) targetRow++; // Down
        else if (angle > -135 && angle <= -45) targetRow--; // Up
        else targetCol--; // Left
        
        if (targetRow >= 0 && targetRow < GRID_ROWS && targetCol >= 0 && targetCol < GRID_COLS) {
            performSwap(row, col, targetRow, targetCol);
        }
    }
    
    draggedCell = null;
    dragStart = null;
}

// Perform the swap
function performSwap(row1, col1, row2, col2) {
    gameState.isAnimating = true;
    
    // Swap in grid
    [gameState.grid[row1][col1], gameState.grid[row2][col2]] = 
    [gameState.grid[row2][col2], gameState.grid[row1][col1]];
    
    renderGrid();
    
    // Check for matches
    setTimeout(() => {
        const matches = findMatches();
        
        if (matches.size > 0) {
            // Valid move - decrease moves
            gameState.moves--;
            updateMovesUI();
            
            // Mark matched cells and apply animation
            const cells = document.querySelectorAll('.grid-cell');
            matches.forEach(key => {
                const [r, c] = key.split(',').map(Number);
                cells[r * GRID_COLS + c].classList.add('matched');
            });
            
            // Wait for pop animation and process cascades
            setTimeout(() => {
                removeMatches(matches);
                applyGravity(() => {
                    fillGaps(() => {
                        // Check for automatic cascades
                        setTimeout(() => {
                            const newMatches = findMatches();
                            if (newMatches.size > 0) {
                                // Continue cascade without consuming additional moves
                                continueCascade(newMatches);
                            } else {
                                // Cascade ended, check if game is over
                                gameState.isAnimating = false;
                                
                                // Reset hint timer after move completes
                                resetHintTimer();
                                
                                checkGameEnd();
                            }
                        }, ANIMATION_SPEED);
                    });
                });
            }, 600); // Wait for pop animation to complete
        } else {
            // No match - swap back (invalid move, no move consumed)
            [gameState.grid[row1][col1], gameState.grid[row2][col2]] = 
            [gameState.grid[row2][col2], gameState.grid[row1][col1]];
            renderGrid();
            gameState.isAnimating = false;
        }
    }, ANIMATION_SPEED);
}

// Find matches
function findMatches() {
    const matched = new Set();
    
    // Horizontal
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS - 2; c++) {
            const a = gameState.grid[r][c];
            const b = gameState.grid[r][c + 1];
            const d = gameState.grid[r][c + 2];
            if (a && a === b && b === d) {
                matched.add(`${r},${c}`);
                matched.add(`${r},${c + 1}`);
                matched.add(`${r},${c + 2}`);
            }
        }
    }
    
    // Vertical
    for (let c = 0; c < GRID_COLS; c++) {
        for (let r = 0; r < GRID_ROWS - 2; r++) {
            const a = gameState.grid[r][c];
            const b = gameState.grid[r + 1][c];
            const d = gameState.grid[r + 2][c];
            if (a && a === b && b === d) {
                matched.add(`${r},${c}`);
                matched.add(`${r + 1},${c}`);
                matched.add(`${r + 2},${c}`);
            }
        }
    }
    
    return matched;
}

// Check if grid has matches
function hasMatches() {
    return findMatches().size > 0;
}

// Remove matched pieces and update goals
function removeMatches(matches) {
    matches.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        const name = gameState.grid[r][c];
        
        if (gameState.goals[name]) {
            gameState.goals[name].count--;
            updateGoalDisplay(name);
        }
        
        // Create burst particles
        createBurstEffect(r, c);
        
        gameState.grid[r][c] = null;
    });
}

// Create burst particle effect
function createBurstEffect(row, col) {
    const cells = document.querySelectorAll('.grid-cell');
    const cellIdx = row * GRID_COLS + col;
    const cell = cells[cellIdx];
    
    if (!cell) return;
    
    const rect = cell.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Create 6-8 particles
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.width = '8px';
        particle.style.height = '8px';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        
        // Random colors - match theme
        const colors = ['#FF6B9D', '#FFC75F', '#845EC2', '#FFE5F0'];
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Random direction
        const angle = (i / particleCount) * Math.PI * 2;
        const velocity = 150 + Math.random() * 100;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        
        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');
        particle.style.animation = `particle 0.6s ease-out forwards`;
        
        document.body.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => particle.remove(), 600);
    }
}

// Apply gravity - pieces fall down with animation
function applyGravity(callback) {
    let moved = true;
    let iterations = 0;
    
    const drop = () => {
        moved = false;
        const cells = document.querySelectorAll('.grid-cell');
        
        for (let c = 0; c < GRID_COLS; c++) {
            for (let r = GRID_ROWS - 1; r >= 0; r--) {
                if (gameState.grid[r][c] === null) {
                    let sourceRow = r - 1;
                    while (sourceRow >= 0 && gameState.grid[sourceRow][c] === null) {
                        sourceRow--;
                    }
                    
                    if (sourceRow >= 0) {
                        gameState.grid[r][c] = gameState.grid[sourceRow][c];
                        gameState.grid[sourceRow][c] = null;
                        
                        // Mark the cell that will receive the falling piece
                        const cellIdx = r * GRID_COLS + c;
                        cells[cellIdx].classList.add('dropping');
                        
                        moved = true;
                    }
                }
            }
        }
        
        renderGrid();
        iterations++;
        
        if (moved && iterations < 10) {
            setTimeout(drop, DROP_ANIMATION_SPEED / 2);
        } else {
            // Remove dropping class after animation completes
            setTimeout(() => {
                cells.forEach(cell => cell.classList.remove('dropping'));
                callback();
            }, DROP_ANIMATION_SPEED);
        }
    };
    
    drop();
}

// Fill empty spaces with new pieces
function fillGaps(callback) {
    const newCells = new Set();
    const cells = document.querySelectorAll('.grid-cell');
    
    let attempts = 0;
    const maxAttempts = 10;
    
    // Keep trying until we have a solvable board
    do {
        // Reset grid to last valid state if retrying
        if (attempts > 0) {
            for (let r = 0; r < GRID_ROWS; r++) {
                for (let c = 0; c < GRID_COLS; c++) {
                    if (newCells.has(`${r},${c}`)) {
                        gameState.grid[r][c] = null;
                    }
                }
            }
            newCells.clear();
        }
        
        // Fill empty cells with random pieces
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (gameState.grid[r][c] === null) {
                    gameState.grid[r][c] = getRandomEnbubuName();
                    newCells.add(`${r},${c}`);
                }
            }
        }
        
        attempts++;
    } while (!isBoardSolvable() && attempts < maxAttempts);
    
    // If still not solvable after attempts, force regenerate the entire board
    if (!isBoardSolvable()) {
        createInitialGrid();
        newCells.clear();
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                newCells.add(`${row},${col}`);
            }
        }
    }
    
    renderGrid(newCells);
    
    // Mark new cells with filling animation
    newCells.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        const cellIdx = r * GRID_COLS + c;
        cells[cellIdx].classList.add('filling');
    });
    
    setTimeout(() => {
        cells.forEach(cell => cell.classList.remove('filling'));
        callback();
    }, DROP_ANIMATION_SPEED);
}

// Continue cascade
function continueCascade(matches) {
    gameState.isAnimating = true;
    
    // Mark matched cells for pop animation
    const cells = document.querySelectorAll('.grid-cell');
    matches.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        cells[r * GRID_COLS + c].classList.add('matched');
    });
    
    // Wait for pop animation to complete
    setTimeout(() => {
        removeMatches(matches);
        applyGravity(() => {
            fillGaps(() => {
                // After filling, check if more cascades occurred
                setTimeout(() => {
                    const newMatches = findMatches();
                    if (newMatches.size > 0) {
                        // More cascades to process
                        continueCascade(newMatches);
                    } else {
                        // No more cascades - game continues or ends
                        gameState.isAnimating = false;
                        
                        // Reset hint timer after cascade completes
                        resetHintTimer();
                        
                        checkGameEnd();
                    }
                }, ANIMATION_SPEED);
            });
        });
    }, 600); // Wait for pop animation
}

// Check game end
function checkGameEnd() {
    // Check if all goals are met (count at or below 0)
    const allCleared = Object.values(gameState.goals).every(g => g.count <= 0);
    
    // Check if no moves left
    const noMoves = gameState.moves <= 0;
    
    // Win if all goals are cleared
    if (allCleared) {
        endGame(true);
        return;
    }
    
    // Lose if no moves left and goals not cleared
    if (noMoves) {
        endGame(false);
        return;
    }
    
    // Game continues
    return;
}

// Find all possible winning moves on current board
function getPossibleMoves() {
    const possibleMoves = [];
    
    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            // Try swapping right
            if (col < GRID_COLS - 1) {
                [gameState.grid[row][col], gameState.grid[row][col + 1]] = 
                [gameState.grid[row][col + 1], gameState.grid[row][col]];
                
                if (findMatches().size > 0) {
                    possibleMoves.push({
                        from: { row, col },
                        to: { row, col: col + 1 },
                        matchCount: findMatches().size
                    });
                }
                
                [gameState.grid[row][col], gameState.grid[row][col + 1]] = 
                [gameState.grid[row][col + 1], gameState.grid[row][col]];
            }
            
            // Try swapping down
            if (row < GRID_ROWS - 1) {
                [gameState.grid[row][col], gameState.grid[row + 1][col]] = 
                [gameState.grid[row + 1][col], gameState.grid[row][col]];
                
                if (findMatches().size > 0) {
                    possibleMoves.push({
                        from: { row, col },
                        to: { row: row + 1, col },
                        matchCount: findMatches().size
                    });
                }
                
                [gameState.grid[row][col], gameState.grid[row + 1][col]] = 
                [gameState.grid[row + 1][col], gameState.grid[row][col]];
            }
        }
    }
    
    return possibleMoves;
}

// Check if board is solvable
function isBoardSolvable() {
    return getPossibleMoves().length > 0;
}

// Utility function to check game state (for debugging)
function getGameState() {
    const goals = Object.entries(gameState.goals).map(([name, goal]) => ({
        character: name,
        remaining: goal.count,
        cleared: goal.count <= 0
    }));
    
    return {
        moves: gameState.moves,
        maxMoves: gameState.maxMoves,
        goals: goals,
        allGoalsCleared: goals.every(g => g.cleared),
        gameOver: gameState.gameOver,
        isAnimating: gameState.isAnimating,
        possibleMoves: getPossibleMoves().length
    };
}

// End game
function endGame(won) {
    gameState.gameOver = true;
    
    // Clear hint timer
    if (gameState.hintTimer) {
        clearTimeout(gameState.hintTimer);
    }
    
    // Log final game state
    console.log('Game Over - ' + (won ? 'WIN' : 'LOSE'), getGameState());
    
    // Redirect to appropriate screen after a short delay
    setTimeout(() => {
        if (won) {
            window.location.href = 'win.html';
        } else {
            window.location.href = 'lose.html';
        }
    }, 500);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    
    // Add move button
    const addMoveBtn = document.getElementById('addMove');
    if (addMoveBtn) {
        addMoveBtn.addEventListener('click', addMove);
    }
    
    // Reduce goal button
    const reduceGoalBtn = document.getElementById('reduceGoal');
    if (reduceGoalBtn) {
        reduceGoalBtn.addEventListener('click', reduceGoal);
    }
});

// Add 1 move (one time only)
function addMove() {
    if (gameState.gameOver || gameState.isAnimating) return;
    
    // Check if already used
    if (gameState.addMoveUsed) {
        console.log('Add move power-up already used!');
        return;
    }
    
    gameState.addMoveUsed = true;
    gameState.moves++;
    updateMovesUI();
    
    // Visual feedback - highlight the moves display
    const movesDisplay = document.getElementById('moves');
    movesDisplay.classList.add('moves-increased');
    
    // Disable button
    const addMoveBtn = document.getElementById('addMove');
    addMoveBtn.disabled = true;
    addMoveBtn.style.opacity = '0.5';
    addMoveBtn.style.cursor = 'not-allowed';
    
    setTimeout(() => {
        movesDisplay.classList.remove('moves-increased');
    }, 600);
    
    // Reset hint timer
    resetHintTimer();
}

// Reduce 1 goal (one time only)
function reduceGoal() {
    if (gameState.gameOver || gameState.isAnimating) return;
    
    // Check if already used
    if (gameState.reduceGoalUsed) {
        console.log('Reduce goal power-up already used!');
        return;
    }
    
    const goalNames = Object.keys(gameState.goals);
    if (goalNames.length === 0) return;
    
    gameState.reduceGoalUsed = true;
    
    // Reduce the first goal that hasn't been completed
    for (let goalName of goalNames) {
        if (gameState.goals[goalName].count > 0) {
            gameState.goals[goalName].count--;
            updateGoalDisplay(goalName);
            
            // Visual feedback - highlight the reduced goal
            const goalCountElements = document.querySelectorAll('.goal-count');
            goalCountElements.forEach(el => {
                if (el.dataset.enbubu === goalName) {
                    el.classList.add('goal-reduced');
                    
                    setTimeout(() => {
                        el.classList.remove('goal-reduced');
                    }, 600);
                }
            });
            
            // Disable button
            const reduceGoalBtn = document.getElementById('reduceGoal');
            reduceGoalBtn.disabled = true;
            reduceGoalBtn.style.opacity = '0.5';
            reduceGoalBtn.style.cursor = 'not-allowed';
            
            // Check if goal was just completed
            if (gameState.goals[goalName].count <= 0) {
                checkGameEnd();
            }
            
            break;
        }
    }
    
    // Reset hint timer
    resetHintTimer();
}