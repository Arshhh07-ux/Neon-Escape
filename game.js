"use strict";

/* =========================================================
   NEON ESCAPE
   THE LAST SURVIVOR
   ========================================================= */


/* ================= ELEMENTS ================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const hud = document.getElementById("hud");

const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best");
const levelElement = document.getElementById("level");

const energyBar = document.getElementById("energyBar");
const energyText = document.getElementById("energyText");
const livesElement = document.getElementById("lives");

const startScreen = document.getElementById("startScreen");
const pauseScreen = document.getElementById("pauseScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const countdownElement = document.getElementById("countdown");

const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const resumeButton = document.getElementById("resumeButton");
const pauseRestartButton = document.getElementById("pauseRestartButton");

const restartButton = document.getElementById("restartButton");
const menuButton = document.getElementById("menuButton");

const finalScore = document.getElementById("finalScore");
const finalBest = document.getElementById("finalBest");
const finalLevel = document.getElementById("finalLevel");
const finalTime = document.getElementById("finalTime");
const newBest = document.getElementById("newBest");

const mobileControls = document.getElementById("mobileControls");

const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");
const jumpButton = document.getElementById("jumpButton");


/* ================= CANVAS ================= */

let W = 0;
let H = 0;
let DPR = 1;

function resizeCanvas() {

    DPR = Math.min(window.devicePixelRatio || 1, 2);

    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();


/* ================= GAME STATE ================= */

const STATE = {
    MENU: "menu",
    COUNTDOWN: "countdown",
    PLAYING: "playing",
    PAUSED: "paused",
    GAMEOVER: "gameover"
};

let gameState = STATE.MENU;

let score = 0;
let bestScore = 0;
let level = 1;
let energy = 100;
let lives = 3;

let gameTime = 0;
let elapsed = 0;

let speed = 5;
let distance = 0;

let lastTime = 0;
let animationId = 0;

let spawnTimer = 0;
let energyTimer = 0;
let difficultyTimer = 0;

let shake = 0;

let levelFlash = 0;
let levelMessage = "";

let countdownValue = 3;


/* ================= SAVE DATA ================= */

try {
    bestScore = Number(localStorage.getItem("neonEscapeBest")) || 0;
} catch (error) {
    bestScore = 0;
}

bestElement.textContent = formatScore(bestScore);


/* ================= INPUT ================= */

const keys = {
    left: false,
    right: false,
    jump: false
};

function setLeft(value) {
    keys.left = value;
}

function setRight(value) {
    keys.right = value;
}

function jump() {

    if (
        gameState === STATE.PLAYING &&
        player.grounded &&
        !player.dead
    ) {
        player.vy = -13.5;
        player.grounded = false;

        createJumpParticles();
    }
}


/* ================= KEYBOARD ================= */

window.addEventListener("keydown", function(event) {

    const key = event.key.toLowerCase();

    if (
        key === "arrowleft" ||
        key === "a"
    ) {
        keys.left = true;
    }

    if (
        key === "arrowright" ||
        key === "d"
    ) {
        keys.right = true;
    }

    if (
        key === " " ||
        key === "arrowup" ||
        key === "w"
    ) {
        event.preventDefault();

        if (!keys.jump) {
            jump();
        }

        keys.jump = true;
    }

    if (key === "p" || key === "escape") {
        togglePause();
    }

});

window.addEventListener("keyup", function(event) {

    const key = event.key.toLowerCase();

    if (
        key === "arrowleft" ||
        key === "a"
    ) {
        keys.left = false;
    }

    if (
        key === "arrowright" ||
        key === "d"
    ) {
        keys.right = false;
    }

    if (
        key === " " ||
        key === "arrowup" ||
        key === "w"
    ) {
        keys.jump = false;
    }

});


/* ================= TOUCH CONTROLS ================= */

function holdButton(button, down, up) {

    button.addEventListener("pointerdown", function(event) {
        event.preventDefault();
        down();
    });

    button.addEventListener("pointerup", function(event) {
        event.preventDefault();
        up();
    });

    button.addEventListener("pointercancel", function() {
        up();
    });

    button.addEventListener("pointerleave", function() {
        up();
    });
}

holdButton(
    leftButton,
    () => setLeft(true),
    () => setLeft(false)
);

holdButton(
    rightButton,
    () => setRight(true),
    () => setRight(false)
);

jumpButton.addEventListener("pointerdown", function(event) {
    event.preventDefault();
    jump();
});


/* ================= PLAYER ================= */

const player = {

    x: 0,
    y: 0,

    width: 30,
    height: 58,

    vx: 0,
    vy: 0,

    grounded: true,

    dead: false,

    invincible: 0,

    trailTimer: 0,

    reset() {

        this.x = W * 0.25;
        this.y = groundY() - this.height;

        this.vx = 0;
        this.vy = 0;

        this.grounded = true;
        this.dead = false;

        this.invincible = 0;
        this.trailTimer = 0;
    }

};


/* ================= WORLD ================= */

function groundY() {
    return H * 0.79;
}

const stars = [];
const buildings = [];
const particles = [];
const obstacles = [];
const energyOrbs = [];
const powerups = [];
const roadLines = [];


/* ================= CREATE BACKGROUND ================= */

function createBackground() {

    stars.length = 0;
    buildings.length = 0;
    roadLines.length = 0;

    const starCount = Math.max(
        70,
        Math.floor(W * H / 9000)
    );

    for (let i = 0; i < starCount; i++) {

        stars.push({
            x: Math.random() * W,
            y: Math.random() * H * .62,
            r: Math.random() * 1.7 + .2,
            a: Math.random() * .8 + .2,
            twinkle: Math.random() * 4 + 1
        });

    }

    let bx = -20;

    while (bx < W + 100) {

        const width =
            40 +
            Math.random() * 90;

        const height =
            80 +
            Math.random() * H * .34;

        buildings.push({
            x: bx,
            width,
            height,
            windows: Math.floor(
                3 + Math.random() * 7
            )
        });

        bx += width + 8 + Math.random() * 15;
    }

    for (let i = 0; i < 18; i++) {

        roadLines.push({
            x: i * 100,
            length: 50 + Math.random() * 70
        });

    }
}

createBackground();


/* ================= DRAW BACKGROUND ================= */

function drawBackground(time) {

    const horizon = H * .58;

    const gradient = ctx.createLinearGradient(
        0,
        0,
        0,
        H
    );

    gradient.addColorStop(0, "#03020d");
    gradient.addColorStop(.45, "#080422");
    gradient.addColorStop(.72, "#10052b");
    gradient.addColorStop(1, "#03020a");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);


    /* Moon */

    const moonX = W * .76;
    const moonY = H * .22;
    const moonR = Math.min(W, H) * .075;

    const moonGlow = ctx.createRadialGradient(
        moonX,
        moonY,
        0,
        moonX,
        moonY,
        moonR * 2.5
    );

    moonGlow.addColorStop(
        0,
        "rgba(113,86,255,.25)"
    );

    moonGlow.addColorStop(
        1,
        "rgba(113,86,255,0)"
    );

    ctx.fillStyle = moonGlow;

    ctx.beginPath();
    ctx.arc(
        moonX,
        moonY,
        moonR * 2.5,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#6d64b8";

    ctx.globalAlpha = .28;

    ctx.beginPath();
    ctx.arc(
        moonX,
        moonY,
        moonR,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.globalAlpha = 1;


    /* Stars */

    for (const star of stars) {

        const alpha =
            star.a *
            (
                .65 +
                .35 *
                Math.sin(
                    time * .001 * star.twinkle
                )
            );

        ctx.fillStyle =
            "rgba(190,180,255," +
            alpha +
            ")";

        ctx.beginPath();

        ctx.arc(
            star.x,
            star.y,
            star.r,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }


    /* Distant glow */

    const horizonGlow =
        ctx.createLinearGradient(
            0,
            horizon - 100,
            0,
            horizon + 70
        );

    horizonGlow.addColorStop(
        0,
        "rgba(104,44,255,0)"
    );

    horizonGlow.addColorStop(
        .55,
        "rgba(104,44,255,.20)"
    );

    horizonGlow.addColorStop(
        1,
        "rgba(255,30,210,.04)"
    );

    ctx.fillStyle = horizonGlow;

    ctx.fillRect(
        0,
        horizon - 100,
        W,
        170
    );


    /* Buildings */

    for (const building of buildings) {

        const y =
            horizon -
            building.height;

        ctx.fillStyle =
            "rgba(8,6,25,.92)";

        ctx.fillRect(
            building.x,
            y,
            building.width,
            building.height
        );

        ctx.strokeStyle =
            "rgba(91,67,180,.22)";

        ctx.strokeRect(
            building.x,
            y,
            building.width,
            building.height
        );


        const rows = Math.max(
            4,
            Math.floor(building.height / 28)
        );

        const cols = Math.max(
            2,
            Math.floor(building.width / 20)
        );

        for (let r = 0; r < rows; r++) {

            for (let c = 0; c < cols; c++) {

                if (
                    (r * 7 +
                    c * 11 +
                    Math.floor(gameTime / 3000)) % 5 === 0
                ) {
                    continue;
                }

                const wx =
                    building.x +
                    8 +
                    c * 20;

                const wy =
                    y +
                    12 +
                    r * 27;

                if (
                    wx + 5 >
                    building.x +
                    building.width
                ) {
                    continue;
                }

                ctx.fillStyle =
                    c % 3 === 0
                        ? "rgba(0,225,255,.25)"
                        : "rgba(171,76,255,.28)";

                ctx.fillRect(
                    wx,
                    wy,
                    5,
                    8
                );
            }
        }
    }


    /* Ground */

    ctx.fillStyle = "#05030d";

    ctx.fillRect(
        0,
        horizon,
        W,
        H - horizon
    );


    /* Horizon neon line */

    ctx.strokeStyle =
        "rgba(109,73,255,.75)";

    ctx.shadowBlur = 15;
    ctx.shadowColor = "#674aff";

    ctx.beginPath();

    ctx.moveTo(
        0,
        groundY() - 3
    );

    ctx.lineTo(
        W,
        groundY() - 3
    );

    ctx.stroke();

    ctx.shadowBlur = 0;


    /* Road */

    const gy = groundY();

    ctx.fillStyle = "#080511";

    ctx.beginPath();

    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);

    ctx.closePath();
    ctx.fill();


    /* Perspective neon lines */

    const centerX = W * .5;

    ctx.lineWidth = 1;

    for (let i = -9; i <= 9; i++) {

        const bottomX =
            centerX +
            i * W * .11;

        ctx.strokeStyle =
            i % 2 === 0
                ? "rgba(72,49,160,.35)"
                : "rgba(205,38,205,.17)";

        ctx.beginPath();

        ctx.moveTo(
            centerX,
            gy
        );

        ctx.lineTo(
            bottomX,
            H
        );

        ctx.stroke();
    }


    /* Horizontal road lines */

    const cycle = 90;

    for (let i = 0; i < 9; i++) {

        const raw =
            (
                i * cycle +
                distance * 1.2
            ) % (H - gy + cycle);

        const y =
            gy +
            raw;

        const progress =
            (y - gy) /
            (H - gy);

        const width =
            W * (.04 + progress * .72);

        ctx.strokeStyle =
            "rgba(89,66,190," +
            (.12 + progress * .3) +
            ")";

        ctx.beginPath();

        ctx.moveTo(
            centerX - width / 2,
            y
        );

        ctx.lineTo(
            centerX + width / 2,
            y
        );

        ctx.stroke();
    }
}


/* ================= PARTICLES ================= */

function createParticle(
    x,
    y,
    options = {}
) {

    particles.push({

        x,
        y,

        vx:
            options.vx ??
            (Math.random() - .5) * 2,

        vy:
            options.vy ??
            (Math.random() - .5) * 2,

        life:
            options.life ??
            1,

        size:
            options.size ??
            (Math.random() * 3 + 1),

        gravity:
            options.gravity ??
            0,

        type:
            options.type ??
            "normal"

    });
}


function updateParticles(dt) {

    for (let i = particles.length - 1; i >= 0; i--) {

        const p = particles[i];

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.vy += p.gravity * dt;

        p.life -= .025 * dt;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}


function drawParticles() {

    for (const p of particles) {

        ctx.globalAlpha =
            Math.max(0, p.life);

        if (p.type === "spark") {

            ctx.fillStyle = "#00eaff";

        } else if (p.type === "pink") {

            ctx.fillStyle = "#ff48d8";

        } else {

            ctx.fillStyle = "#9a70ff";
        }

        ctx.shadowBlur = 12;
        ctx.shadowColor = ctx.fillStyle;

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}


/* ================= JUMP PARTICLES ================= */

function createJumpParticles() {

    for (let i = 0; i < 14; i++) {

        createParticle(
            player.x + player.width / 2,
            player.y + player.height,
            {
                vx: (Math.random() - .5) * 4,
                vy: Math.random() * 2,
                life: 1,
                size: Math.random() * 3 + 1,
                type: i % 2 === 0
                    ? "spark"
                    : "normal"
            }
        );
    }
}


/* ================= PLAYER TRAIL ================= */

function createPlayerTrail() {

    if (!player.grounded) {
        return;
    }

    player.trailTimer -= 1;

    if (player.trailTimer > 0) {
        return;
    }

    player.trailTimer = 3;

    createParticle(
        player.x + 4,
        player.y + player.height - 5,
        {
            vx: -speed * .3,
            vy: (Math.random() - .5),
            life: .55,
            size: Math.random() * 2 + 1,
            type: "spark"
        }
    );
}


/* ================= OBSTACLES ================= */

function spawnObstacle() {

    const typeRoll = Math.random();

    let type = "barrier";

    if (typeRoll < .2) {
        type = "laser";
    } else if (typeRoll < .42) {
        type = "crate";
    }

    const height =
        type === "crate"
            ? 38 + Math.random() * 15
            : 48 + Math.random() * 35;

    const width =
        type === "laser"
            ? 18
            : 34 + Math.random() * 18;

    obstacles.push({

        x: W + 80,

        y: groundY() - height,

        width,
        height,

        type,

        passed: false,

        pulse: Math.random() * Math.PI * 2
    });
}


/* ================= ENERGY ORBS ================= */

function spawnEnergy() {

    energyOrbs.push({

        x: W + 50,

        y:
            groundY() -
            70 -
            Math.random() * 125,

        r: 8,

        rotation: Math.random() * Math.PI * 2,

        collected: false
    });
}


/* ================= POWERUPS ================= */

function spawnPowerup() {

    const types = [
        "shield",
        "magnet",
        "boost"
    ];

    powerups.push({

        x: W + 80,

        y:
            groundY() -
            95 -
            Math.random() * 100,

        size: 18,

        type:
            types[
                Math.floor(
                    Math.random() *
                    types.length
                )
            ],

        rotation: 0
    });
}


/* ================= UPDATE PLAYER ================= */

function updatePlayer(dt) {

    if (player.dead) {
        return;
    }

    const acceleration = 0.8;

    if (keys.left) {
        player.vx -= acceleration * dt;
    }

    if (keys.right) {
        player.vx += acceleration * dt;
    }

    if (!keys.left && !keys.right) {
        player.vx *= Math.pow(.82, dt);
    }

    player.vx *= Math.pow(.93, dt);

    const maxHorizontal =
        Math.max(
            4,
            speed * .8
        );

    player.vx = clamp(
        player.vx,
        -maxHorizontal,
        maxHorizontal
    );

    player.x += player.vx * dt;

    const leftLimit = W * .08;
    const rightLimit = W * .78;

    if (player.x < leftLimit) {
        player.x = leftLimit;
        player.vx = 0;
    }

    if (
        player.x >
        rightLimit
    ) {
        player.x = rightLimit;
        player.vx = 0;
    }


    /* Gravity */

    player.vy += .68 * dt;

    player.y += player.vy * dt;

    const floor =
        groundY() -
        player.height;

    if (player.y >= floor) {

        player.y = floor;

        player.vy = 0;

        if (!player.grounded) {
            createLandingParticles();
        }

        player.grounded = true;
    } else {
        player.grounded = false;
    }


    if (player.invincible > 0) {
        player.invincible -= dt;
    }

    createPlayerTrail();
}


/* ================= LANDING PARTICLES ================= */

function createLandingParticles() {

    for (let i = 0; i < 9; i++) {

        createParticle(
            player.x + player.width / 2,
            groundY(),
            {
                vx: (Math.random() - .5) * 5,
                vy: -Math.random() * 2,
                life: .7,
                size: Math.random() * 2 + 1,
                type: "spark"
            }
        );
    }
}


/* ================= UPDATE OBSTACLES ================= */

function updateObstacles(dt) {

    for (
        let i = obstacles.length - 1;
        i >= 0;
        i--
    ) {

        const obstacle = obstacles[i];

        obstacle.x -= speed * dt;

        obstacle.pulse += .08 * dt;


        if (
            !obstacle.passed &&
            obstacle.x +
            obstacle.width <
            player.x
        ) {

            obstacle.passed = true;

            score += 25;

            for (let p = 0; p < 4; p++) {

                createParticle(
                    obstacle.x +
                    obstacle.width,
                    obstacle.y +
                    obstacle.height / 2,
                    {
       
