/* ============================================
   RistKit Studio — Editor de juegos (IDE)
   ============================================ */

(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  const ta = $("#codeInput");
  const gutter = $("#gutter");
  const preview = $("#preview");
  const nameInput = $("#gameName");
  const statusMsg = $("#statusMsg");
  const statusPos = $("#statusPos");
  const statusSize = $("#statusSize");
  if (!ta) return;

  const toast = (msg, type) => window.RK?.toast?.(msg, type);

  let currentId = null; // id del juego que se está editando

  /* ---------- Plantillas ---------- */
  const TEMPLATES = {
    platform: {
      label: "🎮 Mini plataforma (recomendada)",
      name: "Mini Plataforma",
      code: `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Mini Plataforma</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0a0a0f; display:grid; place-items:center; min-height:100vh; font-family:system-ui; }
  canvas { background:linear-gradient(#16162a,#0a0a0f); border:1px solid #a855f7; border-radius:12px; }
  p { color:#9a9ab0; font-size:.85rem; margin-top:10px; }
</style>
</head>
<body>
<canvas id="game" width="480" height="320"></canvas>
<p>Espacio / ↑ para saltar · Flechas ← → para mover</p>
<script>
const ctx = document.getElementById("game").getContext("2d");
const W = 480, H = 320;

const player = { x:60, y:200, w:26, h:34, vx:0, vy:0, onGround:false };
const gravity = 0.7, speed = 3.6, jump = -12;
const keys = {};

const platforms = [
  { x:0,   y:H-30, w:W, h:30 },
  { x:110, y:230, w:90,  h:14 },
  { x:250, y:180, w:90,  h:14 },
  { x:370, y:120, w:90,  h:14 }
];
const goal = { x:400, y:70, w:30, h:40 };
let won = false, time = 0;

addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === " " || e.key === "ArrowUp") {
    e.preventDefault();
    if (player.onGround && !won) player.vy = jump;
  }
});
addEventListener("keyup", e => keys[e.key] = false);

function update() {
  if (won) return;
  time++;
  player.vx = 0;
  if (keys.ArrowLeft)  player.vx = -speed;
  if (keys.ArrowRight) player.vx = speed;
  player.vy += gravity;

  // Eje X
  player.x += player.vx;
  player.x = Math.max(0, Math.min(W - player.w, player.x));

  // Eje Y + colisiones con plataformas
  const prevBottom = player.y + player.h - player.vy;
  player.y += player.vy;
  player.onGround = false;
  for (const p of platforms) {
    if (player.x + player.w > p.x && player.x < p.x + p.w &&
        player.y + player.h > p.y && player.y < p.y + p.h &&
        player.vy >= 0 && prevBottom <= p.y + 4) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
    }
  }
  // Victoria
  if (player.x + player.w > goal.x && player.x < goal.x + goal.w &&
      player.y + player.h > goal.y && player.y < goal.y + goal.h) won = true;
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // Plataformas
  ctx.fillStyle = "#a855f7";
  for (const p of platforms) {
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, 7);
    ctx.fill();
  }

  // Meta
  ctx.fillStyle = won ? "#4ade80" : "#facc15";
  ctx.fillRect(goal.x, goal.y, 3, goal.h);
  ctx.beginPath();
  ctx.moveTo(goal.x + 3, goal.y);
  ctx.lineTo(goal.x + 28, goal.y + 9);
  ctx.lineTo(goal.x + 3, goal.y + 18);
  ctx.fill();

  // Jugador
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(player.x, player.y, player.w, player.h, 6);
  ctx.fill();
  ctx.fillStyle = "#7c3aed";
  ctx.fillRect(player.x + 5, player.y + 8, 5, 5);
  ctx.fillRect(player.x + 16, player.y + 8, 5, 5);

  if (won) {
    ctx.fillStyle = "rgba(10,10,15,.75)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 30px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("¡Nivel completado!", W / 2, H / 2 - 6);
    ctx.fillStyle = "#9a9ab0";
    ctx.font = "15px system-ui";
    ctx.fillText(Math.round(time / 60) + " segundos", W / 2, H / 2 + 26);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
</script>
</body>
</html>`,
    },
    ball: {
      label: "⚪ Pelota rebotando",
      name: "Pelota Neon",
      code: `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Pelota Neon</title>
<style>
  * { margin:0; padding:0; }
  body { background:#0a0a0f; display:grid; place-items:center; min-height:100vh; font-family:system-ui; }
  canvas { border:1px solid #a855f7; border-radius:12px; background:#0e0e16; }
  p { color:#9a9ab0; font-size:.85rem; margin-top:10px; }
</style>
</head>
<body>
<canvas id="game" width="480" height="320"></canvas>
<p>Mueve el ratón para golpear la pelota</p>
<script>
const ctx = document.getElementById("game").getContext("2d");
const W = 480, H = 320;

let ball = { x:W/2, y:H/2, vx:4, vy:3, r:10 };
let paddle = { x:W/2 - 45, w:90, h:12 };
let score = 0;

addEventListener("mousemove", e => {
  const rect = ctx.canvas.getBoundingClientRect();
  paddle.x = (e.clientX - rect.left) * (W / rect.width) - paddle.w / 2;
});

function update() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.x - ball.r < 0 || ball.x + ball.r > W) ball.vx *= -1;
  if (ball.y - ball.r < 0) ball.vy *= -1;

  // Rebote en la pala
  if (ball.y + ball.r > H - 30 && ball.y + ball.r < H &&
      ball.x > paddle.x && ball.x < paddle.x + paddle.w && ball.vy > 0) {
    ball.vy = -Math.abs(ball.vy) * 1.03;
    ball.vx += ((ball.x - (paddle.x + paddle.w / 2)) / paddle.w) * 4;
    score++;
  }

  // Reinicio
  if (ball.y - ball.r > H) {
    ball = { x:W/2, y:H/2, vx:4 * (Math.random() < .5 ? 1 : -1), vy:3, r:10 };
    score = 0;
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#a855f7";
  ctx.shadowColor = "#a855f7";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, 7);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(paddle.x, H - 30, paddle.w, paddle.h, 6);
  ctx.fill();

  ctx.fillStyle = "#9a9ab0";
  ctx.font = "14px system-ui";
  ctx.fillText("Puntos: " + score, 14, 24);
}

(function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
})();
</script>
</body>
</html>`,
    },
    snake: {
      label: "🐍 Snake compacto",
      name: "Mi Snake",
      code: `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Mi Snake</title>
<style>
  * { margin:0; padding:0; }
  body { background:#0a0a0f; display:grid; place-items:center; min-height:100vh; font-family:system-ui; }
  canvas { border:1px solid #a855f7; border-radius:12px; background:#0e0e16; }
  p { color:#9a9ab0; font-size:.85rem; margin-top:10px; }
</style>
</head>
<body>
<canvas id="game" width="400" height="400"></canvas>
<p>Flechas para mover</p>
<script>
const ctx = document.getElementById("game").getContext("2d");
const CELL = 20, N = 20;
let snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
let dir = {x:1,y:0}, next = dir, food = {x:15,y:10}, score = 0, dead = false;

function place() {
  do { food = { x:(Math.random()*N)|0, y:(Math.random()*N)|0 }; }
  while (snake.some(s => s.x === food.x && s.y === food.y));
}

addEventListener("keydown", e => {
  const d = { ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1}, ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0} }[e.key];
  if (d && (d.x !== -dir.x || d.y !== -dir.y)) { next = d; e.preventDefault(); }
});

function step() {
  if (dead) return;
  dir = next;
  const head = { x:snake[0].x + dir.x, y:snake[0].y + dir.y };
  if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N ||
      snake.some(s => s.x === head.x && s.y === head.y)) { dead = true; return; }
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) { score += 10; place(); }
  else snake.pop();
}

function draw() {
  ctx.clearRect(0, 0, 400, 400);
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(food.x*CELL+10, food.y*CELL+10, 7, 0, 7);
  ctx.fill();
  snake.forEach((s, i) => {
    ctx.fillStyle = i ? "rgba(168,85,247," + (1 - i/(snake.length+6)) + ")" : "#a855f7";
    ctx.beginPath();
    ctx.roundRect(s.x*CELL+1, s.y*CELL+1, CELL-2, CELL-2, 5);
    ctx.fill();
  });
  ctx.fillStyle = "#9a9ab0";
  ctx.font = "14px system-ui";
  ctx.fillText("Puntos: " + score, 10, 18);
  if (dead) {
    ctx.fillStyle = "rgba(10,10,15,.8)";
    ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 26px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", 200, 195);
    ctx.font = "14px system-ui";
    ctx.fillStyle = "#9a9ab0";
    ctx.fillText("Recarga para jugar", 200, 225);
  }
}

setInterval(step, 120);
(function loop() { draw(); requestAnimationFrame(loop); })();
</script>
</body>
</html>`,
    },
    blank: {
      label: "📄 Documento en blanco",
      name: "Mi Juego",
      code: `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mi Juego</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0a0a0f; color:#f4f4f8; display:grid; place-items:center; min-height:100vh; font-family:system-ui; }
</style>
</head>
<body>
<h1>Mi juego HTML</h1>
<script>
  // Escribe aquí tu juego 🎮
  console.log("¡Hola desde RistKit!");
</script>
</body>
</html>`,
    },
  };

  /* ---------- Estado del editor ---------- */
  const ERROR_TRAP =
    `<script>window.onerror=function(m,s,l){try{var d=document.createElement("div");` +
    `d.textContent="⚠ "+m+" (línea "+l+")";` +
    `d.style.cssText="position:fixed;bottom:8px;left:8px;right:8px;background:#7f1d1d;` +
    `color:#fecaca;padding:9px 13px;border-radius:9px;font:12px monospace;z-index:99999;";` +
    `document.body.appendChild(d);}catch(e){}return true;};<` + `/script>`;

  function trap(code) {
    return code.includes("</head>") ? code.replace("</head>", ERROR_TRAP + "</head>") : ERROR_TRAP + code;
  }

  function setStatus(text, ok = true) {
    if (!statusMsg) return;
    statusMsg.textContent = text;
    statusMsg.className = ok ? "ok" : "";
    if (!ok) statusMsg.style.color = "#f87171";
    else statusMsg.style.color = "";
  }

  function run() {
    const code = ta.value;
    if (!code.trim()) return setStatus("● No hay código para ejecutar", false);
    setStatus("● Ejecutando...");
    preview.srcdoc = trap(code);
    setTimeout(() => setStatus("● Ejecutado — vista previa activa"), 250);
    updateStats();
  }

  function updateStats() {
    const lines = ta.value.split("\n").length;
    if (statusSize) statusSize.textContent = `${lines} líneas · ${ta.value.length} caracteres`;
    updateGutter();
    updatePos();
  }

  function updateGutter() {
    const lines = ta.value.split("\n").length;
    const current = gutter.children.length;
    if (lines === current) return;
    if (lines > current) {
      for (let i = current; i < lines; i++) {
        const d = document.createElement("div");
        d.textContent = i + 1;
        gutter.appendChild(d);
      }
    } else {
      while (gutter.children.length > lines) gutter.removeChild(gutter.lastChild);
    }
  }

  function updatePos() {
    const upto = ta.value.slice(0, ta.selectionStart);
    const ln = upto.split("\n").length;
    const col = upto.length - upto.lastIndexOf("\n");
    if (statusPos) statusPos.textContent = `Ln ${ln}, Col ${col}`;
  }

  function loadCode(code, name, id) {
    ta.value = code;
    currentId = id || null;
    if (nameInput && name) nameInput.value = name;
    updateStats();
    run();
    ta.scrollTop = 0;
    gutter.scrollTop = 0;
  }

  /* ---------- Eventos del editor ---------- */
  ta.addEventListener("input", updateStats);
  ta.addEventListener("click", updatePos);
  ta.addEventListener("keyup", updatePos);
  ta.addEventListener("scroll", () => { gutter.scrollTop = ta.scrollTop; });

  // Tab + indentación inteligente
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const s = ta.selectionStart, en = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(en);
      ta.selectionStart = ta.selectionEnd = s + 2;
      updateStats();
    }
    // Ctrl+Enter → ejecutar
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      run();
    }
    // Ctrl+S → guardar
    if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      save();
    }
  });

  /* ---------- Botones ---------- */
  $("#btnRun")?.addEventListener("click", run);

  $("#btnNew")?.addEventListener("click", () => {
    if (ta.value.trim() && !confirm("¿Empezar un juego nuevo? Se perderá lo que no hayas guardado.")) return;
    loadCode(TEMPLATES.blank.code, "", null);
    if (nameInput) nameInput.value = "";
    setStatus("● Nuevo archivo");
    toast("Nuevo juego listo", "success");
  });

  function save() {
    const code = ta.value;
    if (code.trim().length < 20) return toast("El código está demasiado vacío para guardar", "error");
    const name = (nameInput?.value || "").trim() || "Mi juego";
    const saved = window.RK.games.add({ id: currentId || undefined, name, code });
    currentId = saved.id;
    if (nameInput) nameInput.value = saved.name;
    window.RK.renderMyGames();
    toast(`"${saved.name}" guardado en tu arcade`, "success");
    setStatus("● Guardado en tu arcade");
  }
  $("#btnSave")?.addEventListener("click", save);

  $("#btnDownload")?.addEventListener("click", () => {
    const code = ta.value;
    if (!code.trim()) return toast("No hay código para descargar", "error");
    const name = (nameInput?.value || "").trim().replace(/[^\w\sáéíóúñ-]/gi, "") || "mi-juego";
    const blob = new Blob([code], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name.toLowerCase().replace(/\s+/g, "-") + ".html";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    toast("Archivo .html descargado", "success");
  });

  /* ---------- Menú de ejemplos ---------- */
  const templatesBtn = $("#btnTemplates");
  let menu = null;

  function closeMenuTpl() { menu?.remove(); menu = null; }

  templatesBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu) return closeMenuTpl();
    menu = document.createElement("div");
    Object.assign(menu.style, {
      position: "absolute",
      zIndex: "50",
      background: "#16161f",
      border: "1px solid rgba(255,255,255,.1)",
      borderRadius: "12px",
      padding: "7px",
      minWidth: "250px",
      boxShadow: "0 20px 50px rgba(0,0,0,.6)",
      display: "grid",
      gap: "3px",
    });
    Object.entries(TEMPLATES).forEach(([key, tpl]) => {
      const item = document.createElement("button");
      item.type = "button";
      item.textContent = tpl.label;
      Object.assign(item.style, {
        background: "transparent",
        border: "0",
        color: "#f4f4f8",
        textAlign: "left",
        padding: "10px 13px",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: ".87rem",
      });
      item.addEventListener("mouseenter", () => (item.style.background = "rgba(168,85,247,.16)"));
      item.addEventListener("mouseleave", () => (item.style.background = "transparent"));
      item.addEventListener("click", () => {
        if (ta.value.trim() && ta.value !== tpl.code &&
            !confirm("¿Cargar este ejemplo? Se reemplazará el código actual (si no está guardado).")) return;
        loadCode(tpl.code, tpl.name, null);
        currentId = null;
        closeMenuTpl();
        toast(`Ejemplo "${tpl.name}" cargado`, "success");
      });
      menu.appendChild(item);
    });
    templatesBtn.parentElement.style.position = "relative";
    menu.style.top = `${templatesBtn.offsetTop + templatesBtn.offsetHeight + 8}px`;
    menu.style.left = `${templatesBtn.offsetLeft}px`;
    templatesBtn.parentElement.appendChild(menu);

    const off = (ev) => {
      if (!menu.contains(ev.target) && ev.target !== templatesBtn) { closeMenuTpl(); document.removeEventListener("click", off); }
    };
    setTimeout(() => document.addEventListener("click", off), 0);
  });

  /* ---------- Registro para main.js ---------- */
  window.RK.editorLoader = (code, name, id) => loadCode(code, name, id);

  /* ---------- Carga inicial ---------- */
  const lastKey = "ristkit_editor_autosave";
  let initial = null, initialName = "";
  try {
    const auto = JSON.parse(localStorage.getItem(lastKey) || "null");
    if (auto && auto.code) { initial = auto.code; initialName = auto.name || ""; }
  } catch { /* ignore */ }

  loadCode(initial || TEMPLATES.platform.code, initialName || TEMPLATES.platform.name, null);
  if (initial) setStatus("● Proyecto restaurado");

  // Autosave del código mientras escribes
  setInterval(() => {
    try {
      localStorage.setItem(lastKey, JSON.stringify({ code: ta.value, name: nameInput?.value || "" }));
    } catch { /* storage lleno */ }
  }, 2500);
})();
