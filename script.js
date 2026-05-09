/**
 * Snake Game Logic
 */

// Canvas Context
const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreElement = document.getElementById('current-score');
const highScoreElement = document.getElementById('high-score');
const finalScoreElement = document.getElementById('final-score');

// Screens / Overlays
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// Buttons
const startBtn = document.getElementById('start-btn');
const resumeBtn = document.getElementById('resume-btn');
const restartBtn = document.getElementById('restart-btn');

// Mobile Control Buttons
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

// Game Constants
const GRID_SIZE = 20; // Size of a single grid square
const TILE_COUNT = canvas.width / GRID_SIZE; // Total tiles per row/col (20)

// Difficulty Settings
const DIFFICULTY_SETTINGS = {
    easy: { initialSpeed: 200, minSpeed: 120, speedDecrement: 1 },
    medium: { initialSpeed: 140, minSpeed: 60, speedDecrement: 2 },
    hard: { initialSpeed: 90, minSpeed: 40, speedDecrement: 3 }
};

// Colors
const SNAKE_COLOR = '#00e676'; // Primary neon green
const SNAKE_HEAD_COLOR = '#ffffff';
const FOOD_COLOR = '#ff2a5f'; // Secondary neon pink

// Game State Enum
const GameState = {
    START: 'START',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
};

// State Variables
let currentState = GameState.START;
let snake = [];
let food = { x: 0, y: 0 };
let dx = 0; // x velocity
let dy = 0; // y velocity
let nextDx = 0; // queued x velocity
let nextDy = 0; // queued y velocity
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoopTimeout;

let currentLevel = 'medium';
let initialSpeed = DIFFICULTY_SETTINGS[currentLevel].initialSpeed;
let minSpeed = DIFFICULTY_SETTINGS[currentLevel].minSpeed;
let speedDecrement = DIFFICULTY_SETTINGS[currentLevel].speedDecrement;
let speed = initialSpeed;

// Prevent multiple direction changes in a single frame to avoid rapid self-collision
let directionChanged = false;

// Initialize high score display
highScoreElement.textContent = highScore;
drawInitialState(); // Draw board initially for aesthetics

/**
 * Event Listeners
 */
startBtn.addEventListener('click', startGame);
resumeBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', startGame);

const diffBtns = document.querySelectorAll('.diff-btn');
diffBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const selectedLevel = e.target.dataset.level;
        currentLevel = selectedLevel;
        
        // Update all buttons across screens to reflect the active state
        diffBtns.forEach(b => {
            if (b.dataset.level === selectedLevel) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
    });
});

document.addEventListener('keydown', handleKeyPress);

// Touch listeners for mobile controls to prevent default zooming/scrolling behavior
const addControlListeners = (btn, x, y) => {
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        changeDirection(x, y);
    });
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        changeDirection(x, y);
    });
};

addControlListeners(btnUp, 0, -1);
addControlListeners(btnDown, 0, 1);
addControlListeners(btnLeft, -1, 0);
addControlListeners(btnRight, 1, 0);

/**
 * Keyboard Input Handling
 */
function handleKeyPress(event) {
    // Start game on Enter/Space if on start or game over screen
    if (currentState === GameState.START || currentState === GameState.GAME_OVER) {
        if (event.key === 'Enter' || event.key === ' ') {
            startGame();
        }
        return;
    }

    // Toggle pause on Space or Escape
    if (event.key === ' ' || event.key === 'Escape') {
        togglePause();
        return;
    }

    if (currentState !== GameState.PLAYING) return;

    // Movement (Arrow keys + WASD)
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            changeDirection(0, -1);
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            changeDirection(0, 1);
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            changeDirection(-1, 0);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            changeDirection(1, 0);
            break;
    }
}

/**
 * Queue the next direction safely.
 * Prevents 180-degree immediate reversal.
 */
function changeDirection(newDx, newDy) {
    if (directionChanged) return; // Only one direction change allowed per frame

    // Prevent reversing direction
    if ((newDx === 1 && dx === -1) || 
        (newDx === -1 && dx === 1) || 
        (newDy === 1 && dy === -1) || 
        (newDy === -1 && dy === 1)) {
        return;
    }
    
    // Prevent standing still (in case function called with 0,0)
    if (newDx === 0 && newDy === 0) return;

    nextDx = newDx;
    nextDy = newDy;
    directionChanged = true;
}

/**
 * Game Flow Functions
 */
function startGame() {
    // Initialize Snake in the middle
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    
    dx = 0;
    dy = -1; // Moving Up
    nextDx = 0;
    nextDy = -1;
    
    score = 0;
    
    // Set speed based on selected difficulty
    initialSpeed = DIFFICULTY_SETTINGS[currentLevel].initialSpeed;
    minSpeed = DIFFICULTY_SETTINGS[currentLevel].minSpeed;
    speedDecrement = DIFFICULTY_SETTINGS[currentLevel].speedDecrement;
    speed = initialSpeed;
    
    scoreElement.textContent = score;
    directionChanged = false;
    
    // Hide screens
    startScreen.classList.remove('active');
    pauseScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    
    currentState = GameState.PLAYING;
    
    spawnFood();
    clearTimeout(gameLoopTimeout);
    gameLoop();
}

function togglePause() {
    if (currentState === GameState.PLAYING) {
        currentState = GameState.PAUSED;
        pauseScreen.classList.add('active');
        clearTimeout(gameLoopTimeout);
    } else if (currentState === GameState.PAUSED) {
        currentState = GameState.PLAYING;
        pauseScreen.classList.remove('active');
        gameLoop();
    }
}

function gameOver() {
    currentState = GameState.GAME_OVER;
    clearTimeout(gameLoopTimeout);
    
    // Check and save High Score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
    }
    
    finalScoreElement.textContent = score;
    gameOverScreen.classList.add('active');
}

/**
 * The Core Game Loop
 */
function gameLoop() {
    if (currentState !== GameState.PLAYING) return;

    update();
    draw();

    gameLoopTimeout = setTimeout(gameLoop, speed);
}

/**
 * Game Logic Update (Movement & Collisions)
 */
function update() {
    // Apply queued direction
    dx = nextDx;
    dy = nextDy;
    directionChanged = false; // Reset lock for next frame

    // Calculate new head position
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // 1. Wall Collision Detection
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        gameOver();
        return;
    }

    // 2. Self Collision Detection
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    // Move snake forward
    snake.unshift(head);

    // 3. Food Collision
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        
        // Increase speed smoothly
        if (speed > minSpeed) {
            speed -= speedDecrement;
        }
        
        spawnFood(); // Spawn new food
    } else {
        // Remove tail if no food eaten
        snake.pop();
    }
}

/**
 * Spawn food in a random unoccupied grid position
 */
function spawnFood() {
    let newFood;
    let validLocation = false;
    
    while (!validLocation) {
        newFood = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
        
        validLocation = true;
        
        // Check if food spawns on the snake
        for (let segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                validLocation = false;
                break;
            }
        }
    }
    
    food = newFood;
}

/**
 * Canvas Rendering
 */
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Food
    ctx.fillStyle = FOOD_COLOR;
    ctx.shadowBlur = 15; // Glowing effect
    ctx.shadowColor = FOOD_COLOR;
    
    ctx.beginPath();
    // Draw circular food
    ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE / 2, 
        food.y * GRID_SIZE + GRID_SIZE / 2, 
        GRID_SIZE / 2 - 2, 
        0, 
        Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow

    // Draw Snake
    snake.forEach((segment, index) => {
        // Head gets a distinct color
        ctx.fillStyle = index === 0 ? SNAKE_HEAD_COLOR : SNAKE_COLOR;
        
        const pad = 1; // Gap between segments
        const size = GRID_SIZE - pad * 2;
        
        ctx.beginPath();
        // Use roundRect for modern aesthetics
        ctx.roundRect(
            segment.x * GRID_SIZE + pad, 
            segment.y * GRID_SIZE + pad, 
            size, 
            size, 
            4 // Border radius
        );
        ctx.fill();
        
        // Slight glow on snake head
        if (index === 0) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = SNAKE_HEAD_COLOR;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    });
}

/**
 * Draw an empty/dummy board for initial load aesthetic
 */
function drawInitialState() {
    // Draw some fake food and a short snake for the background
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    food = { x: 5, y: 5 };
    draw();
}
