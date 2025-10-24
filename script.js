
/* -----------------------------
  Configuración y estado global
------------------------------*/
let move_speed = 1.25;
let gravity = 0.30;

const bird = document.querySelector(".bird");
const img = document.getElementById("bird-1");
const backgroundEl = document.getElementById("background");

const scoreValueEl = document.getElementById("score-value");
const messageBox = document.getElementById("message");
const messageContent = document.getElementById("message-content");

const mainMenu = document.getElementById("main-menu");
const btnPlay = document.getElementById("btn-play");
const btnInstructions = document.getElementById("btn-instructions");
const btnLeaderboard = document.getElementById("btn-leaderboard");
const btnResume = document.getElementById("btn-resume");
const btnRestart = document.getElementById("btn-restart");
const btnReturnMenu = document.getElementById("btn-return-menu");

const instructionsPanel = document.getElementById("instructions-panel");
const instructionsBack = document.getElementById("instructions-back");

const leaderboardPanel = document.getElementById("leaderboard-panel");
const leaderboardList = document.getElementById("leaderboard-list");
const leaderboardBack = document.getElementById("leaderboard-back");
const clearRanking = document.getElementById("clear-ranking");

const nameModal = document.getElementById("name-modal");
const playerNameInput = document.getElementById("player-name-input");
const modalStart = document.getElementById("modal-start");
const modalCancel = document.getElementById("modal-cancel");

const pausePanel = document.getElementById("pause-panel");
const levelSelect = document.getElementById("level-select");

const gameoverModal = document.getElementById("gameover-modal");
const finalScoreVal = document.getElementById("final-score-val");
const gameoverTitle = document.getElementById("gameover-title");
const recordMsg = document.getElementById("record-msg");
const goMenuBtn = document.getElementById("go-menu");
const tryAgainBtn = document.getElementById("try-again");

const deathSound = new Audio("images/sounds effect_die.mp3");
const scoreSound = new Audio("images/sounds effect_point.mp3");

let game_state = "Start"; // Start | Play | Pause | End
img.style.display = "none";

let bird_dy = 0;
let controlsAdded = false;
let pipeCounter = 0;
let bird_props = bird.getBoundingClientRect();
let background_rect = backgroundEl.getBoundingClientRect();

let currentPlayerName = null;
let currentLevel = 0; // index in levels[]

let rafHandle = null;
let lastSpawnTime = 0;
let gamePaused = false;

/* -----------------------------
  Define niveles (fácil de ampliar)
  Cada nivel contiene:
   - background image
   - pipe styles (gradient, border)
   - message style (color)
------------------------------*/
const levels = [
  {
    id: 0,
    name: "Atardecer",
    background: "images/background-img.png",
    pipeStyle: {
      background: "radial-gradient(circle at 50% 20%, #9be89b 30%, #4caf50 60%)",
      border: "4px solid rgba(0,0,0,0.6)"
    },
    messages: { color: "#fff" }
  },
  {
    id: 1,
    name: "Bosque",
    background: "images/background-2.png", // asegúrate de tener esta imagen
    pipeStyle: {
      background: "linear-gradient(180deg, #ffb27b 0%, #ff6b6b 100%)",
      border: "4px solid rgba(0,0,0,0.6)"
    },
    messages: { color: "#fff8e6" }
  }
];

/* -----------------------------
  Ranking (localStorage) con merge por nombre
------------------------------*/
const LS_KEY = "flappy_rank_v2";

function loadRanking(){
  try {
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return [];
    return JSON.parse(raw);
  } catch(e){ return []; }
}
function saveRanking(list){
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

/**
 * Añade o actualiza el mejor score del jugador
 * - Si el nombre existe, guarda el mayor score (no duplica)
 * - Si no existe, lo añade
 */
function addOrUpdateScore(name, score) {
  if(!name) name = "Anon";
  const list = loadRanking();
  const existing = list.find(item => item.name.toLowerCase() === name.toLowerCase());
  if(existing){
    if(score > existing.score){
      existing.score = parseInt(score);
      existing.ts = Date.now();
    } else {
      // si es menor o igual, sólo actualiza la marca temporal (opcional)
      existing.ts = Date.now();
    }
  } else {
    list.push({ name, score: parseInt(score), ts: Date.now() });
  }
  // ordenar descendente por score y ts
  list.sort((a,b) => b.score - a.score || a.ts - b.ts);
  // mantener top 50 localmente
  saveRanking(list.slice(0,50));
}

function renderLeaderboard(){
  const list = loadRanking();
  leaderboardList.innerHTML = "";
  if(list.length === 0){
    leaderboardList.innerHTML = "<li style='opacity:.85'>Sin resultados aún. ¡Sé el primero!</li>";
    return;
  }
  list.slice(0,10).forEach(entry => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${entry.name}</strong> — <span style="color:gold">${entry.score}</span>`;
    leaderboardList.appendChild(li);
  });
}

/* -----------------------------
  UI helpers
------------------------------*/
function showMessage(html){
  const msg = document.getElementById("message");
  messageContent = messageContent || msg.querySelector("#message-content");
  msg.classList.remove("hidden");
  msg.querySelector("#message-content").innerHTML = html;
}
function hideMessage(){
  const msg = document.getElementById("message");
  msg.classList.add("hidden");
  msg.querySelector("#message-content").innerHTML = "";
}
function showGameOver(finalScore, isNewRecord){
  gameoverModal.classList.remove("hidden");
  finalScoreVal.innerText = finalScore;
  if(isNewRecord){
    recordMsg.innerText = "¡Nuevo récord personal!";
  } else {
    recordMsg.innerText = "";
  }
}

/* -----------------------------
  Menú y modal - interacciones
------------------------------*/
btnPlay.addEventListener("click", () => {
  openNameModal();
});
btnInstructions.addEventListener("click", () => {
  mainMenu.classList.add("hidden");
  instructionsPanel.classList.remove("hidden");
});
btnLeaderboard.addEventListener("click", () => {
  mainMenu.classList.add("hidden");
  renderLeaderboard();
  leaderboardPanel.classList.remove("hidden");
});
instructionsBack.addEventListener("click", () => {
  instructionsPanel.classList.add("hidden");
  mainMenu.classList.remove("hidden");
});
leaderboardBack.addEventListener("click", () => {
  leaderboardPanel.classList.add("hidden");
  mainMenu.classList.remove("hidden");
});
clearRanking.addEventListener("click", () => {
  if(confirm("¿Borrar clasificación local?")) {
    localStorage.removeItem(LS_KEY);
    renderLeaderboard();
  }
});

// Modal nombre
function openNameModal(){
  nameModal.classList.remove("hidden");
  playerNameInput.value = localStorage.getItem("flappy_last_name") || "";
  playerNameInput.focus();
}
modalCancel.addEventListener("click", () => {
  nameModal.classList.add("hidden");
  // volver al menu si veníamos de play
});
modalStart.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  if(name.length === 0){
    alert("Por favor ingresa tu nombre (o cancelar).");
    playerNameInput.focus();
    return;
  }
  localStorage.setItem("flappy_last_name", name);
  currentPlayerName = name;
  nameModal.classList.add("hidden");
  mainMenu.classList.add("hidden");
  // recoger nivel seleccionado
  currentLevel = parseInt(levelSelect.value || "0", 10);
  applyLevel(currentLevel);
  startGame();
});
playerNameInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter") modalStart.click();
  showGameOver(finalScoreVal.innerText, false);
});


/* -----------------------------
  Pause controls
------------------------------*/
btnResume.addEventListener("click", () => resumeGame());
btnRestart.addEventListener("click", () => {
  hidePauseUI();
  restartLevel();
});
btnReturnMenu.addEventListener("click", () => {
  hidePauseUI();
  stopAndReturnToMenu();
});

/* -----------------------------
  Gameover modal actions
------------------------------*/
goMenuBtn.addEventListener("click", () => {
  gameoverModal.classList.add("hidden");
  stopAndReturnToMenu();
});
tryAgainBtn.addEventListener("click", () => {
  gameoverModal.classList.add("hidden");
  restartLevel();
});

/* -----------------------------
  Controls (solo agregar una vez)
------------------------------*/
document.addEventListener("keydown", (e) => {
  // Enter solo funciona para el game over
  if (e.key == "Enter" && game_state == "End") {
    if(!currentPlayerName){
      openNameModal();
      return;
    }
    startGame();
  }

  // Pausa con Escape
  if(e.key === "Escape"){
    if(game_state === "Play") {
      pauseGame();
    } else if(game_state === "Pause") {
      resumeGame();
    }
  }

  // inicio del juego o vuelo
  if (e.key == "ArrowUp" || e.key == " ") {
    if (game_state == "Start") {
      if (currentPlayerName) {
        startGame();
      } else {
        openNameModal();
      }
    } else if (game_state == "Play") {
      img.src = "images/Bird-2.png";
      bird_dy = -6.8;
    }
  }
});
document.addEventListener("keyup", (e) => {
  if (e.key == "ArrowUp" || e.key == " ") {
    img.src = "images/Bird.png";
  }
});

// Soporte táctil para móviles
document.addEventListener("touchstart", (e) => {
  e.preventDefault(); // Prevenir el scroll
  if (game_state == "Start") {
    if (currentPlayerName) {
      startGame();
    } else {
      openNameModal();
    }
  } else if (game_state == "Play") {
    img.src = "images/Bird-2.png";
    bird_dy = -6.8;
  }
}, { passive: false });

document.addEventListener("touchend", (e) => {
  e.preventDefault();
  if (game_state == "Play") {
    img.src = "images/Bird.png";
  }
}, { passive: false });

/* -----------------------------
  Nivel aplicado: cambia fondo y define estilo de pipes
------------------------------*/
function applyLevel(levelIndex){
  const lvl = levels[levelIndex] || levels[0];
  backgroundEl.style.backgroundImage = `url("${lvl.background}")`;
}

/* -----------------------------
  Start / Play / Loop / Spawn / End
------------------------------*/
function startGame(){
  // limpiar pipes
  document.querySelectorAll(".pipe_sprite").forEach(e => e.remove());
  img.style.display = "block";
  // colocar pájaro en el centro
  bird.style.top = "40vh";
  bird_dy = 0;
  pipeCounter = 0;
  game_state = "Play";
  hideMessage();
  setScore(0);
  background_rect = backgroundEl.getBoundingClientRect();
  // aplicar nivel seleccionado
  applyLevel(currentLevel);
  // iniciar loop
  lastSpawnTime = 0;
  gamePaused = false;
  play();
}

function restartLevel(){
  // reinicia el mismo nivel desde menú pausa o gameover
  document.querySelectorAll(".pipe_sprite").forEach(e => e.remove());
  bird.style.top = "40vh";
  bird_dy = 0;
  pipeCounter = 0;
  game_state = "Play";
  hideMessage();
  setScore(0);
  img.style.display = "block";
  lastSpawnTime = 0;
  gamePaused = false;
  play();
}

function stopAndReturnToMenu(){
  // termina partida y vuelve al menu principal
  game_state = "Start";
  gamePaused = false;
  // limpiar estado
  document.querySelectorAll(".pipe_sprite").forEach(e => e.remove());
  img.style.display = "none";
  hideMessage();
  mainMenu.classList.remove("hidden");
  applyLevel(0);
  renderLeaderboard();
}

/* actualiza UI score con animación */
function setScore(n){
  scoreValueEl.innerText = n;
  // animación breve
  scoreValueEl.classList.add("spark");
  setTimeout(()=> scoreValueEl.classList.remove("spark"), 140);
}

/* termina el juego */
function endGame(finalReason){
  if(game_state === "End") return;
  game_state = "End";
  deathSound.play();
  img.style.display = "none";

  const finalScore = parseInt(scoreValueEl.innerText || "0");
  // comprobar si nuevo record personal
  const rawList = loadRanking();
  const existing = rawList.find(it => it.name.toLowerCase() === (currentPlayerName || "").toLowerCase());
  const prevBest = existing ? existing.score : 0;
  const isNewRecord = finalScore > prevBest;

  // guardar o actualizar (si el nombre existe actualiza el best si es mayor)
  if(currentPlayerName){
    addOrUpdateScore(currentPlayerName, finalScore);
  }

  // mostrar modal game over con estilo
  showGameOver(finalScore, isNewRecord);
  // actualizar leaderboard
  renderLeaderboard();
}

/* ------------------------------------------------
   Game loop: lo mantenemos reasignable para pausa/resume
   - Se asigna a window._gameLoop para poder reanudar
-------------------------------------------------*/
function play(){
  // definir parámetros de gap dinámico
  bird_props = bird.getBoundingClientRect();
  const minGap = Math.ceil(bird_props.height * 1.8) + 30;
  const baseGap = Math.max(minGap, Math.floor(background_rect.height * 0.22), 140);
  const initialGap = Math.ceil(baseGap * 1.35);
  const decreaseStart = 15;
  const decreaseSteps = 20;
  const decreasePerPipe = (initialGap - minGap) / decreaseSteps;

  function gameLoop(timestamp){
    if(game_state !== "Play" || gamePaused) {
      // detener RAF; cuando se reanude volveremos a llamar a requestAnimationFrame
      return;
    }

    if(!lastSpawnTime) lastSpawnTime = timestamp;
    if(timestamp - lastSpawnTime > 2600){
      let currentGap;
      if(pipeCounter < decreaseStart) currentGap = initialGap;
      else {
        const stepsPassed = pipeCounter - (decreaseStart - 1);
        currentGap = Math.max(minGap, Math.round(initialGap - stepsPassed * decreasePerPipe));
      }
      pipeCounter++;
      spawnPipePair(currentGap);
      lastSpawnTime = timestamp;
    }

    // mover pipes y detectar colisiones
    const pipes = document.querySelectorAll(".pipe_sprite");
    bird_props = bird.getBoundingClientRect();

    pipes.forEach(element => {
      const pRect = element.getBoundingClientRect();

      // remover fuera de pantalla
      if(pRect.right <= 0){
        element.remove();
        return;
      }

      // colisión AABB
      if(
        bird_props.left < pRect.left + pRect.width &&
        bird_props.left + bird_props.width > pRect.left &&
        bird_props.top < pRect.top + pRect.height &&
        bird_props.top + bird_props.height > pRect.top
      ){
        endGame("Has chocado contra un obstáculo.");
        return;
      }

      // puntaje (solo bottom pipes marcados)
      if(pRect.right < bird_props.left && element.dataset.score === "1"){
        const newScore = parseInt(scoreValueEl.innerText || "0") + 1;
        setScore(newScore);
        try { scoreSound.play(); } catch(e){}
        element.dataset.score = "0";
      }

      // mover el pipe
      element.style.left = (pRect.left - move_speed) + "px";
    });

    // aplicar gravedad
    bird_dy += gravity;
    let nextTop = bird_props.top + bird_dy;
    // límites
    background_rect = backgroundEl.getBoundingClientRect();
    if(nextTop <= 0 || bird_props.bottom + bird_dy >= background_rect.bottom){
      endGame("Has tocado los límites.");
      return;
    }
    bird.style.top = nextTop + "px";
    bird_props = bird.getBoundingClientRect();

    // continuar loop
    rafHandle = requestAnimationFrame(gameLoop);
    window._gameLoop = gameLoop;
  }

  // iniciar RAF
  rafHandle = requestAnimationFrame(gameLoop);
  window._gameLoop = gameLoop;
}


/* spawn pipes con estilo según nivel actual */
function spawnPipePair(gap){
  background_rect = backgroundEl.getBoundingClientRect();
  const availHeight = background_rect.height;
  const minPipeHeight = 40;
  const maxAllowedGap = availHeight - 2 * minPipeHeight - 10;
  if(gap > maxAllowedGap) gap = Math.max(80, maxAllowedGap);
  const lvl = levels[currentLevel] || levels[0];
  const maxTopPipeHeight = Math.max(minPipeHeight, availHeight - gap - minPipeHeight);
  const topPipeHeight = Math.floor(Math.random() * (maxTopPipeHeight - minPipeHeight + 1)) + minPipeHeight;
  const bottomPipeTop = topPipeHeight + gap;

  // top
  const pipe_top = document.createElement("div");
  pipe_top.className = "pipe_sprite";
  pipe_top.style.top = "0px";
  pipe_top.style.left = "100vw";
  pipe_top.style.height = topPipeHeight + "px";
  // aplicar estilo del nivel
  pipe_top.style.background = lvl.pipeStyle.background;
  pipe_top.style.border = lvl.pipeStyle.border;

  // bottom
  const pipe_bottom = document.createElement("div");
  pipe_bottom.className = "pipe_sprite";
  pipe_bottom.style.top = bottomPipeTop + "px";
  pipe_bottom.style.left = "100vw";
  pipe_bottom.style.height = (availHeight - bottomPipeTop) + "px";
  pipe_bottom.dataset.score = "1";
  pipe_bottom.style.background = lvl.pipeStyle.background;
  pipe_bottom.style.border = lvl.pipeStyle.border;

  document.body.appendChild(pipe_top);
  document.body.appendChild(pipe_bottom);
}

/* -----------------------------
  PAUSA / RESUME
------------------------------*/
function pauseGame(){
  if(game_state !== "Play") return;
  game_state = "Pause";
  gamePaused = true;
  // mostrar UI pausa
  pausePanel.classList.remove("hidden");
  // no cancelamos RAF explicitamente; gameLoop checks flags y deja de re-agendar
}
function hidePauseUI(){
  pausePanel.classList.add("hidden");
}
function resumeGame(){
  if(game_state !== "Pause") return;
  game_state = "Play";
  gamePaused = false;
  hidePauseUI();
  // reanudar RAF manualmente
  if(window._gameLoop){
    rafHandle = requestAnimationFrame(window._gameLoop);
  } else {
    // fallback: reiniciar play loop (mantiene pipes actuales)
    play();
  }
}

/* -----------------------------
  Eventos globales de teclado (Enter para volver a jugar desde End)
------------------------------*/
document.addEventListener("keydown", (e) => {
  // Pausa/Resume con Escape
  if (e.key === 'Escape') {
    if (game_state === 'Play') pauseGame();
    else if (game_state === 'Pause') resumeGame();
    return;
  }

  // Si estamos en End, Enter debe realizar la misma acción que "Volver a jugar"
  if (e.key === 'Enter' && game_state === 'End') {
    // si no hay nombre, abrir modal de nombre
    if(!currentPlayerName){
      openNameModal();
      return;
    }
    // ejecutar misma acción que el botón "tryAgain"
    tryAgainBtn.click();
    return;
  }
});

/* -----------------------------
  Inicialización
------------------------------*/
function init(){
  // Mostrar menú
  mainMenu.classList.remove("hidden");
  img.style.display = "none";
  setScore(0);
  renderLeaderboard();
  // aplicar preview de nivel
  applyLevel(parseInt(levelSelect.value || "0", 10));
  levelSelect.addEventListener("change", () => {
    applyLevel(parseInt(levelSelect.value, 10));
  });

  // esconder overlays si estaban abiertos
  nameModal.classList.add("hidden");
  pausePanel.classList.add("hidden");
  gameoverModal.classList.add("hidden");
}
init();
