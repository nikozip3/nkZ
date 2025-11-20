/*
 * Battle Arena – Juego MOBA para navegador
 *
 * Este script implementa la lógica de juego de un MOBA simplificado para un
 * entorno de un solo jugador. Los jugadores pueden seleccionar uno de cuatro
 * héroes, elegir entre dos aspectos y enfrentarse a enemigos controlados
 * por la IA. Se incluye un sistema de tienda de objetos para mejorar las
 * estadísticas del héroe durante la partida. El control está adaptado tanto
 * a teclado como a dispositivos táctiles mediante botones en pantalla.
 */

(function () {
  // Referencias a elementos del DOM
  const menuEl = document.getElementById("menu");
  const characterGrid = document.getElementById("character-selection");
  const startButton = document.getElementById("start-button");
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const hud = document.getElementById("hud");
  const healthBarFill = document.querySelector("#health-bar .fill");
  const goldLabel = document.getElementById("gold");
  const killsLabel = document.getElementById("kills");
  const shopButton = document.getElementById("shop-button");
  const shopPanel = document.getElementById("shop-panel");
  const shopItemsContainer = document.getElementById("shop-items");
  const closeShopBtn = document.getElementById("close-shop");
  const mobileControls = document.getElementById("mobile-controls");
  const upBtn = document.getElementById("up-btn");
  const downBtn = document.getElementById("down-btn");
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const attackBtn = document.getElementById("attack-btn");

  // Datos de héroes y objetos
  const characters = [
    {
      id: "blaze",
      nombre: "Blaze",
      descripcion: "Guerrero ágil con poder de fuego.",
      skins: ["assets/blaze.png", "assets/blaze_cyber.png"],
      baseStats: { maxHealth: 120, speed: 2.8, attackDamage: 22 },
      color: "#e53935",
      habilidad: "Lanza una bola de fuego que inflige daño en área.",
    },
    {
      id: "aether",
      nombre: "Aether",
      descripcion: "Mago del viento con habilidades de apoyo.",
      skins: ["assets/aether.png", "assets/aether_storm.png"],
      baseStats: { maxHealth: 100, speed: 3.0, attackDamage: 18 },
      color: "#42a5f5",
      habilidad: "Empuja a los enemigos con una ráfaga de aire.",
    },
    {
      id: "titan",
      nombre: "Titan",
      descripcion: "Tanque poderoso con armadura pesada.",
      skins: ["assets/titan.png", "assets/titan_mecha.png"],
      baseStats: { maxHealth: 200, speed: 2.2, attackDamage: 20 },
      color: "#8d6e63",
      habilidad: "Genera un escudo que bloquea daño temporalmente.",
    },
    {
      id: "nix",
      nombre: "Nix",
      descripcion: "Asesino sigiloso con alta movilidad.",
      skins: ["assets/nix.png", "assets/nix_shadow.png"],
      baseStats: { maxHealth: 90, speed: 3.3, attackDamage: 24 },
      color: "#7b1fa2",
      habilidad: "Realiza un dash que atraviesa enemigos.",
    },
  ];

  const items = [
    {
      id: "atk",
      nombre: "Cristal de poder",
      descripcion: "Aumenta el daño de ataque en 8 puntos.",
      costo: 100,
      apply: function (player) {
        player.attackDamage += 8;
      },
    },
    {
      id: "def",
      nombre: "Placa de escudo",
      descripcion: "Aumenta la salud máxima en 50 puntos.",
      costo: 120,
      apply: function (player) {
        player.maxHealth += 50;
        player.health += 50;
      },
    },
    {
      id: "spd",
      nombre: "Botas veloces",
      descripcion: "Aumenta la velocidad en 0.5 unidades.",
      costo: 80,
      apply: function (player) {
        player.speed += 0.5;
      },
    },
  ];

  // Variables del juego
  let selectedCharacterIndex = null;
  let selectedSkinIndex = 0;
  let gameState = "menu"; // 'menu' | 'playing' | 'gameover'
  let player = null;
  let enemies = [];
  let projectiles = [];
  let lastTime = 0;
  let goldTimer = 0;
  let killCount = 0;
  let running = false;

  // Variables de control de entrada
  const keys = {};
  const controlState = {
    up: false,
    down: false,
    left: false,
    right: false,
    attack: false,
  };

  // Cargar imágenes en memoria para evitar parpadeo
  const imageCache = {};
  function loadImages(callback) {
    let loaded = 0;
    const total = characters.reduce(
      (sum, c) => sum + c.skins.length,
      0
    );
    characters.forEach((char) => {
      char.skins.forEach((src) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          imageCache[src] = img;
          loaded++;
          if (loaded === total) callback();
        };
        img.onerror = () => {
          // Si falla la carga, aún contamos para no bloquear
          loaded++;
          if (loaded === total) callback();
        };
      });
    });
  }

  // --------------------- Menú de selección ---------------------
  function buildCharacterSelection() {
    characterGrid.innerHTML = "";
    characters.forEach((char, index) => {
      const card = document.createElement("div");
      card.classList.add("character-card");
      card.dataset.index = index;
      const imgEl = document.createElement("img");
      imgEl.src = char.skins[0];
      imgEl.alt = char.nombre;
      const info = document.createElement("div");
      info.classList.add("char-info");
      const nameEl = document.createElement("div");
      nameEl.classList.add("name");
      nameEl.textContent = char.nombre;
      const descEl = document.createElement("div");
      descEl.classList.add("desc");
      descEl.textContent = char.descripcion;
      info.appendChild(nameEl);
      info.appendChild(descEl);
      // Skin selector
      const skinSelector = document.createElement("div");
      skinSelector.classList.add("skin-selector");
      char.skins.forEach((src, sIndex) => {
        const btn = document.createElement("button");
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (selectedCharacterIndex === index) {
            selectedSkinIndex = sIndex;
            updateSkinButtons(index);
          }
        });
        skinSelector.appendChild(btn);
      });
      info.appendChild(skinSelector);
      card.appendChild(imgEl);
      card.appendChild(info);
      card.addEventListener("click", () => {
        selectedCharacterIndex = index;
        selectedSkinIndex = 0;
        updateSelection();
      });
      characterGrid.appendChild(card);
    });
  }

  function updateSelection() {
    const cards = document.querySelectorAll(".character-card");
    cards.forEach((card) => {
      const idx = parseInt(card.dataset.index);
      if (idx === selectedCharacterIndex) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });
    if (selectedCharacterIndex !== null) {
      startButton.disabled = false;
      updateSkinButtons(selectedCharacterIndex);
    }
  }

  function updateSkinButtons(charIndex) {
    const card = characterGrid.children[charIndex];
    const buttons = card.querySelectorAll(".skin-selector button");
    buttons.forEach((btn, i) => {
      if (i === selectedSkinIndex) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  // --------------------- Inicialización de juego ---------------------
  function startGame() {
    gameState = "playing";
    menuEl.style.display = "none";
    canvas.style.display = "block";
    hud.style.display = "block";
    // Mostrar controles móviles en pantallas pequeñas
    if (window.innerWidth < 768) {
      mobileControls.classList.remove("hidden");
    }
    initPlayer();
    initEnemies();
    buildShop();
    lastTime = performance.now();
    running = true;
    requestAnimationFrame(gameLoop);
  }

  function initPlayer() {
    const char = characters[selectedCharacterIndex];
    player = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      radius: 32,
      maxHealth: char.baseStats.maxHealth,
      health: char.baseStats.maxHealth,
      speed: char.baseStats.speed,
      attackDamage: char.baseStats.attackDamage,
      skin: char.skins[selectedSkinIndex],
      ability: char.habilidad,
      color: char.color,
      gold: 100,
      items: [],
      attackCooldown: 0,
    };
    goldTimer = 0;
    killCount = 0;
    updateHUD();
  }

  function initEnemies() {
    enemies = [];
    const availableIndices = [0, 1, 2, 3].filter(
      (i) => i !== selectedCharacterIndex
    );
    // Generar algunos enemigos; cada uno se spawnea en un borde aleatorio del lienzo
    const enemyCount = 1; // solo un enemigo a la vez para facilitar el combate
    for (let i = 0; i < enemyCount; i++) {
      const idx = availableIndices[i % availableIndices.length];
      const char = characters[idx];
      // Seleccionar borde aleatorio
      const side = Math.floor(Math.random() * 4);
      let spawnX, spawnY;
      switch (side) {
        case 0: // arriba
          spawnX = Math.random() * canvas.width;
          spawnY = -50;
          break;
        case 1: // abajo
          spawnX = Math.random() * canvas.width;
          spawnY = canvas.height + 50;
          break;
        case 2: // izquierda
          spawnX = -50;
          spawnY = Math.random() * canvas.height;
          break;
        case 3: // derecha
          spawnX = canvas.width + 50;
          spawnY = Math.random() * canvas.height;
          break;
      }
      enemies.push({
        x: spawnX,
        y: spawnY,
        radius: 30,
        maxHealth: char.baseStats.maxHealth,
        health: char.baseStats.maxHealth,
        speed: char.baseStats.speed * 0.4,
        attackDamage: char.baseStats.attackDamage * 0.2, // enemigos hacen muy poco daño
        skin: char.skins[0],
        color: char.color,
        attackCooldown: 0,
      });
    }
  }

  // --------------------- Sistema de tienda ---------------------
  function buildShop() {
    shopItemsContainer.innerHTML = "";
    items.forEach((item) => {
      const card = document.createElement("div");
      card.classList.add("item-card");
      const nameEl = document.createElement("h3");
      nameEl.textContent = item.nombre;
      const descEl = document.createElement("p");
      descEl.textContent = item.descripcion;
      const costEl = document.createElement("div");
      costEl.classList.add("cost");
      costEl.textContent = `Costo: ${item.costo} oro`;
      card.appendChild(nameEl);
      card.appendChild(descEl);
      card.appendChild(costEl);
      card.addEventListener("click", () => buyItem(item, card));
      shopItemsContainer.appendChild(card);
    });
  }

  function buyItem(item, cardEl) {
    if (player.gold >= item.costo && !player.items.includes(item.id)) {
      player.gold -= item.costo;
      item.apply(player);
      player.items.push(item.id);
      // Marcar como comprado
      cardEl.classList.add("disabled");
      updateHUD();
    }
  }

  shopButton.addEventListener("click", () => {
    shopPanel.classList.remove("hidden");
    // Pausar el juego mientras la tienda está abierta
    if (running) {
      running = false;
    }
  });
  closeShopBtn.addEventListener("click", () => {
    shopPanel.classList.add("hidden");
    // Reanudar el juego al cerrar la tienda
    if (!running && gameState === "playing") {
      running = true;
      lastTime = performance.now();
      requestAnimationFrame(gameLoop);
    }
  });

  // --------------------- HUD ---------------------
  function updateHUD() {
    const hpPercent = (player.health / player.maxHealth) * 100;
    healthBarFill.style.width = hpPercent + "%";
    goldLabel.textContent = `💰 ${Math.floor(player.gold)}`;
    killsLabel.textContent = `Eliminaciones: ${killCount}`;
  }

  // --------------------- Entrada del jugador ---------------------
  // Entradas de teclado
  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  // Controles móviles
  function bindControl(btn, dirKey) {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      controlState[dirKey] = true;
    });
    btn.addEventListener("pointerup", () => {
      controlState[dirKey] = false;
    });
    btn.addEventListener("pointerleave", () => {
      controlState[dirKey] = false;
    });
  }
  bindControl(upBtn, "up");
  bindControl(downBtn, "down");
  bindControl(leftBtn, "left");
  bindControl(rightBtn, "right");
  attackBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    controlState.attack = true;
  });
  attackBtn.addEventListener("pointerup", () => {
    controlState.attack = false;
  });

  // --------------------- Bucle de juego ---------------------
  function gameLoop(timestamp) {
    if (!running) return;
    const delta = (timestamp - lastTime) / 1000; // en segundos
    lastTime = timestamp;
    update(delta);
    draw();
    requestAnimationFrame(gameLoop);
  }

  function update(dt) {
    if (gameState !== "playing") return;
    // Actualizar oro pasivo: 10 de oro por segundo
    player.gold += 10 * dt;
    goldTimer += dt;

    // Movimiento del jugador
    let moveX = 0;
    let moveY = 0;
    if (keys["w"] || keys["ArrowUp"] || controlState.up) moveY -= 1;
    if (keys["s"] || keys["ArrowDown"] || controlState.down) moveY += 1;
    if (keys["a"] || keys["ArrowLeft"] || controlState.left) moveX -= 1;
    if (keys["d"] || keys["ArrowRight"] || controlState.right) moveX += 1;
    const len = Math.hypot(moveX, moveY);
    if (len > 0) {
      moveX /= len;
      moveY /= len;
      player.x += moveX * player.speed * 100 * dt;
      player.y += moveY * player.speed * 100 * dt;
      // Limitar dentro del lienzo
      player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
    }
    // Ataque manual
    if ((keys[" "] || keys["Space"] || controlState.attack) && player.attackCooldown <= 0) {
      fireProjectile(player, true);
      player.attackCooldown = 0.5; // 0.5 segundos de enfriamiento
    }
    if (player.attackCooldown > 0) {
      player.attackCooldown -= dt;
    }

    // Actualizar proyectiles
    projectiles.forEach((p) => {
      p.x += p.dx * dt;
      p.y += p.dy * dt;
      p.life -= dt;
    });
    // Eliminar proyectiles fuera de vida o fuera del canvas
    projectiles = projectiles.filter(
      (p) =>
        p.life > 0 &&
        p.x > -50 &&
        p.x < canvas.width + 50 &&
        p.y > -50 &&
        p.y < canvas.height + 50
    );

    // Comportamiento de enemigos
    enemies.forEach((e) => {
      // Movimiento hacia el jugador
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        const vx = (dx / dist) * e.speed * 80 * dt;
        const vy = (dy / dist) * e.speed * 80 * dt;
        e.x += vx;
        e.y += vy;
      }
      // Ataque de enemigo
      if (dist < 400 && e.attackCooldown <= 0) {
        fireProjectile(e, false);
        e.attackCooldown = 1.2;
      }
      if (e.attackCooldown > 0) e.attackCooldown -= dt;
    });

    // Colisiones de proyectiles con jugadores/enemigos
    projectiles.forEach((p) => {
      if (p.ownerIsPlayer) {
        // contra enemigos
        enemies.forEach((e) => {
          const d = Math.hypot(p.x - e.x, p.y - e.y);
          if (d < e.radius) {
            e.health -= p.damage;
            p.life = 0;
            // Verificar muerte
            if (e.health <= 0) {
              killCount++;
              player.gold += 50;
              // reusar enemigo: respawn
              respawnEnemy(e);
            }
          }
        });
      } else {
        // proyectiles de enemigos contra jugador
        const d = Math.hypot(p.x - player.x, p.y - player.y);
        if (d < player.radius) {
          player.health -= p.damage;
          p.life = 0;
          if (player.health <= 0) {
            endGame();
          }
        }
      }
    });

    updateHUD();
  }

  function draw() {
    // Limpiar fondo
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dibujar mapa sencillo (gradiente radial)
    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      Math.max(canvas.width, canvas.height) / 1.5
    );
    gradient.addColorStop(0, "#0f1931");
    gradient.addColorStop(1, "#040613");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Dibujar jugador
    drawEntity(player, true);
    // Dibujar enemigos
    enemies.forEach((e) => drawEntity(e, false));
    // Dibujar proyectiles
    projectiles.forEach((p) => {
      ctx.beginPath();
      ctx.fillStyle = p.ownerIsPlayer ? "#ffca28" : "#ef5350";
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawEntity(entity, isPlayer) {
    const img = imageCache[entity.skin];
    if (img) {
      const size = entity.radius * 2;
      ctx.drawImage(img, entity.x - entity.radius, entity.y - entity.radius, size, size);
    } else {
      // Fallback: dibujo de círculo
      ctx.beginPath();
      ctx.fillStyle = isPlayer ? "#00e676" : "#e53935";
      ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dibujar un contorno alrededor del jugador para identificarlo
    if (isPlayer) {
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(66, 165, 245, 0.8)";
      ctx.arc(entity.x, entity.y, entity.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function fireProjectile(owner, ownerIsPlayer) {
    // Calcular dirección: hacia el cursor en PC o hacia frente actual
    let targetX, targetY;
    if (ownerIsPlayer) {
      // Utilizar la posición del mouse si disponible
      if (lastPointer) {
        targetX = lastPointer.x;
        targetY = lastPointer.y;
      } else {
        // disparar recto hacia arriba si no hay puntero
        targetX = owner.x;
        targetY = owner.y - 100;
      }
    } else {
      targetX = player.x;
      targetY = player.y;
    }
    const dx = targetX - owner.x;
    const dy = targetY - owner.y;
    const dist = Math.hypot(dx, dy);
    const speed = 350;
    const vx = (dx / dist) * speed;
    const vy = (dy / dist) * speed;
    projectiles.push({
      x: owner.x,
      y: owner.y,
      dx: vx,
      dy: vy,
      damage: owner.attackDamage,
      life: 2, // segundos
      ownerIsPlayer: ownerIsPlayer,
    });
  }

  function respawnEnemy(enemy) {
    // Restaurar vida y posición aleatoria en el borde
    enemy.health = enemy.maxHealth;
    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0:
        enemy.x = Math.random() * canvas.width;
        enemy.y = -50;
        break;
      case 1:
        enemy.x = Math.random() * canvas.width;
        enemy.y = canvas.height + 50;
        break;
      case 2:
        enemy.x = -50;
        enemy.y = Math.random() * canvas.height;
        break;
      case 3:
        enemy.x = canvas.width + 50;
        enemy.y = Math.random() * canvas.height;
        break;
    }
  }

  function endGame() {
    running = false;
    gameState = "gameover";
    alert(`Has sido derrotado. Eliminaciones: ${killCount}`);
    location.reload();
  }

  // --------------------- Manejo de puntero (para disparar) ---------------------
  let lastPointer = null;
  canvas.addEventListener("pointermove", (e) => {
    if (gameState !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    lastPointer = {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  });
  canvas.addEventListener("pointerleave", () => {
    lastPointer = null;
  });

  // El botón de inicio
  startButton.addEventListener("click", () => {
    if (selectedCharacterIndex !== null) {
      startGame();
    }
  });

  // Ajustar el tamaño del canvas al tamaño de la ventana
  function resizeCanvas() {
    // Ajustar el lienzo al tamaño de la ventana. No aplicamos escalado para simplificar el sistema de coordenadas.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  window.addEventListener("resize", () => {
    resizeCanvas();
  });

  // Inicialización
  function init() {
    resizeCanvas();
    buildCharacterSelection();
    updateSelection();
  }
  // Cargar imágenes y arrancar
  loadImages(() => {
    init();
  });
})();