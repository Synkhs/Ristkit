/* ============================================
   RistKit Studio — Editor de juegos (IDE)
   Fase 2: CodeMirror 6, multiarchivo, consola, FPS
   ============================================ */

(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  const ta = $("#codeInput");
  const cmHost = $("#cmEditor");
  const fileTabs = $("#fileTabs");
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
  player.x += player.vx;
  player.x = Math.max(0, Math.min(W - player.w, player.x));
  const prevBottom = player.y + player.h - player.vy;
  player.y += player.vy;
  player.onGround = false;
  for (const p of platforms) {
    if (player.x + player.w > p.x && player.x < p.x + p.w &&
        player.y + player.h > p.y && player.y < p.y + p.h &&
        player.vy >= 0 && prevBottom <= p.y + 4) {
      player.y = p.y - player.h; player.vy = 0; player.onGround = true;
    }
  }
  if (player.x + player.w > goal.x && player.x < goal.x + goal.w &&
      player.y + player.h > goal.y && player.y < goal.y + goal.h) won = true;
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#a855f7";
  for (const p of platforms) { ctx.beginPath(); ctx.roundRect(p.x, p.y, p.w, p.h, 7); ctx.fill(); }
  ctx.fillStyle = won ? "#4ade80" : "#facc15";
  ctx.fillRect(goal.x, goal.y, 3, goal.h);
  ctx.beginPath(); ctx.moveTo(goal.x+3, goal.y); ctx.lineTo(goal.x+28, goal.y+9); ctx.lineTo(goal.x+3, goal.y+18); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(player.x, player.y, player.w, player.h, 6); ctx.fill();
  ctx.fillStyle = "#7c3aed"; ctx.fillRect(player.x+5, player.y+8, 5, 5); ctx.fillRect(player.x+16, player.y+8, 5, 5);
  if (won) {
    ctx.fillStyle = "rgba(10,10,15,.75)"; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = "#a855f7"; ctx.font = "bold 30px system-ui"; ctx.textAlign = "center";
    ctx.fillText("¡Nivel completado!", W/2, H/2 - 6);
    ctx.fillStyle = "#9a9ab0"; ctx.font = "15px system-ui"; ctx.fillText(Math.round(time/60)+" segundos", W/2, H/2+26);
  }
}
(function loop(){ update(); draw(); requestAnimationFrame(loop); })();
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
let paddle = { x:W/2-45, w:90, h:12 };
let score = 0;
addEventListener("mousemove", e => {
  const rect = ctx.canvas.getBoundingClientRect();
  paddle.x = (e.clientX - rect.left) * (W / rect.width) - paddle.w / 2;
});
function update() {
  ball.x += ball.vx; ball.y += ball.vy;
  if (ball.x - ball.r < 0 || ball.x + ball.r > W) ball.vx *= -1;
  if (ball.y - ball.r < 0) ball.vy *= -1;
  if (ball.y + ball.r > H - 30 && ball.y + ball.r < H && ball.x > paddle.x && ball.x < paddle.x + paddle.w && ball.vy > 0) {
    ball.vy = -Math.abs(ball.vy) * 1.03; ball.vx += ((ball.x - (paddle.x + paddle.w/2)) / paddle.w) * 4; score++;
  }
  if (ball.y - ball.r > H) { ball = { x:W/2, y:H/2, vx:4*(Math.random()<.5?1:-1), vy:3, r:10 }; score = 0; }
}
function draw() {
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = "#a855f7"; ctx.shadowColor = "#a855f7"; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(paddle.x, H-30, paddle.w, paddle.h, 6); ctx.fill();
  ctx.fillStyle = "#9a9ab0"; ctx.font = "14px system-ui"; ctx.fillText("Puntos: " + score, 14, 24);
}
(function loop(){ update(); draw(); requestAnimationFrame(loop); })();
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
function place(){ do { food = { x:(Math.random()*N)|0, y:(Math.random()*N)|0 }; } while (snake.some(s => s.x===food.x && s.y===food.y)); }
addEventListener("keydown", e => {
  const d = { ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1}, ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0} }[e.key];
  if (d && (d.x !== -dir.x || d.y !== -dir.y)) { next = d; e.preventDefault(); }
});
function step() {
  if (dead) return;
  dir = next;
  const head = { x:snake[0].x+dir.x, y:snake[0].y+dir.y };
  if (head.x<0||head.y<0||head.x>=N||head.y>=N||snake.some(s=>s.x===head.x&&s.y===head.y)){ dead=true; return; }
  snake.unshift(head);
  if (head.x===food.x && head.y===food.y){ score+=10; place(); } else snake.pop();
}
function draw() {
  ctx.clearRect(0,0,400,400);
  ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(food.x*CELL+10, food.y*CELL+10, 7, 0, 7); ctx.fill();
  snake.forEach((s,i)=>{ ctx.fillStyle = i ? "rgba(168,85,247,"+(1-i/(snake.length+6))+")" : "#a855f7"; ctx.beginPath(); ctx.roundRect(s.x*CELL+1,s.y*CELL+1,CELL-2,CELL-2,5); ctx.fill(); });
  ctx.fillStyle="#9a9ab0"; ctx.font="14px system-ui"; ctx.fillText("Puntos: "+score,10,18);
  if (dead){ ctx.fillStyle="rgba(10,10,15,.8)"; ctx.fillRect(0,0,400,400); ctx.fillStyle="#a855f7"; ctx.font="bold 26px system-ui"; ctx.textAlign="center"; ctx.fillText("Game Over",200,195); ctx.font="14px system-ui"; ctx.fillStyle="#9a9ab0"; ctx.fillText("Recarga para jugar",200,225); }
}
setInterval(step, 120);
(function loop(){ draw(); requestAnimationFrame(loop); })();
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

  /* ---------- Estado multiarchivo ---------- */
  // index.html = maestro (ta.value). style.css y game.js = búferes extra que se inyectan al compilar.
  const FILES = { "style.css": "", "game.js": "" };
  let activeFile = "index.html";

  /* ---------- Consola integrada + puente del iframe ---------- */
  const consoleBody = $("#consoleBody");
  const fpsEl = $("#ideFps");
  let cfilter = { log: true, warn: true, error: true };

  const CONSOLE_BRIDGE =
    `<script>(function(){` +
    `function s(l,a){try{parent.postMessage({__rk:1,level:l,args:a.map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}})},'*')}catch(e){}}` +
    `['log','info','warn','error'].forEach(function(l){var o=console[l];console[l]=function(){s(l,[].slice.call(arguments));o.apply(console,arguments)}});` +
    `window.addEventListener('error',function(e){s('error',[e.message+(e.lineno?' (línea '+e.lineno+')':'')])});` +
    `var n=0,last=performance.now();(function f(){n++;var t=performance.now();if(t-last>=1000){parent.postMessage({__rk:1,fps:Math.round(n*1000/(t-last))},'*');n=0;last=t}requestAnimationFrame(f)})();` +
    `})();<` + `/script>`;

  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || d.__rk !== 1) return;
    if (typeof d.fps === "number") { if (fpsEl) fpsEl.textContent = d.fps + " FPS"; return; }
    if (d.level && Array.isArray(d.args)) logLine(d.level, d.args.join(" "));
  });

  function logLine(level, text) {
    if (!consoleBody) return;
    if (!cfilter[level]) return;
    const empty = consoleBody.querySelector(".ide__console-empty");
    if (empty) empty.remove();
    const row = document.createElement("div");
    row.className = `ide__console-line ${level}`;
    row.innerHTML = `<span class="lvl">${level.toUpperCase()}</span><span class="msg"></span>`;
    row.querySelector(".msg").textContent = text;
    consoleBody.appendChild(row);
    while (consoleBody.children.length > 200) consoleBody.removeChild(consoleBody.firstChild);
    consoleBody.scrollTop = consoleBody.scrollHeight;
  }

  $$filters();
  function $$filters() {
    document.querySelectorAll("[data-cfilter]").forEach((b) => {
      b.addEventListener("click", () => {
        const f = b.dataset.cfilter;
        cfilter[f] = !cfilter[f];
        b.classList.toggle("active", cfilter[f]);
        // Reaplicar visibilidad
        consoleBody?.querySelectorAll(".ide__console-line").forEach((l) => {
          l.style.display = cfilter[l.classList.contains("warn") ? "warn" : l.classList.contains("error") ? "error" : "log"] ? "" : "none";
        });
      });
    });
    $("#consoleClear")?.addEventListener("click", () => { if (consoleBody) consoleBody.innerHTML = ""; });
  }

  /* ---------- Compilación multiarchivo → HTML único ---------- */
  function compile() {
    let html = ta.value;
    const css = (FILES["style.css"] || "").trim();
    const js = (FILES["game.js"] || "").trim();
    if (css) html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `<style>\n${css}\n</style></head>`) : `<style>${css}</style>` + html;
    if (js) html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `<script>\n${js}\n</script></body>`) : html + `<script>${js}</script>`;
    return html;
  }

  /* ---------- CodeMirror 6 (import dinámico con fallback) ---------- */
  let cmView = null;
  let cmLangCache = {};
  let langComp = null; // Compartment de CodeMirror para cambiar lenguaje en caliente

  function currentLang() {
    if (activeFile === "style.css") return cmLangCache.css || null;
    if (activeFile === "game.js") return cmLangCache.js || null;
    return cmLangCache.html || null;
  }

  async function initCM() {
    if (!cmHost) return false;
    try {
      const mods = await Promise.all([
        import("https://esm.sh/codemirror@6.0.2"),
        import("https://esm.sh/@codemirror/state@6.7.6"),
        import("https://esm.sh/@codemirror/view@6.36.4"),
        import("https://esm.sh/@codemirror/lang-html@6.4.12"),
        import("https://esm.sh/@codemirror/lang-css@6.3.1"),
        import("https://esm.sh/@codemirror/lang-javascript@6.2.5"),
        import("https://esm.sh/@codemirror/theme-one-dark@6.1.3"),
        import("https://esm.sh/@codemirror/autocomplete@6.20.3"),
        import("https://esm.sh/@codemirror/commands@6.11.1"),
      ]);
      const CM = mods[0], State = mods[1], View = mods[2];
      cmLangCache = { html: mods[3].html(), css: mods[4].css(), js: mods[5].javascript() };
      const theme = mods[6].oneDark;
      const { autocompletion } = mods[7];

      const rkWords = [
        "canvas","ctx","getContext","requestAnimationFrame","addEventListener","localStorage",
        "document","window","Math","console","player","enemy","score","game","update","draw","loop",
        "drawImage","fillRect","fillStyle","clearRect","arc","beginPath","fill","stroke","roundRect",
        "getElementById","querySelector","Audio","AudioContext","fetch","JSON","keydown","keyup",
      ];
      function rkComplete(context) {
        let word = context.matchBefore(/[\w$]*/);
        if (!word || (word.from === word.to && !context.explicit)) return null;
        return { from: word.from, options: rkWords.map((w) => ({ label: w, type: "keyword" })) };
      }

      langComp = new State.Compartment();
      const startState = State.EditorState.create({
        doc: ta.value,
        extensions: [
          CM.basicSetup,
          theme,
          autocompletion({ override: [rkComplete] }),
          langComp.of(cmLangCache.html),
          View.EditorView.updateListener.of((u) => {
            if (u.docChanged) syncFromCM(u.state.doc.toString());
            if (u.selectionSet || u.docChanged) updatePosFromCM(u.state);
          }),
          View.keymap.of([
            { key: "Mod-Enter", run: () => { run(); return true; } },
            { key: "Mod-s", run: () => { save(); return true; } },
          ]),
          View.EditorView.theme({
            "&": { backgroundColor: "transparent" },
            ".cm-content": { caretColor: "#a855f7", padding: "14px 6px" },
            ".cm-gutters": { backgroundColor: "rgba(255,255,255,.02)" },
          }),
        ],
      });

      cmView = new View.EditorView({ state: startState, parent: cmHost });
      ta.classList.add("visually-hidden");
      updatePosFromCM(cmView.state);
      return true;
    } catch (err) {
      console.warn("[editor] CodeMirror no cargó, usando textarea:", err);
      ta.classList.remove("visually-hidden");
      ta.style.cssText = "flex:1;background:transparent;border:0;outline:none;resize:none;padding:18px;font-family:var(--font-mono);font-size:.82rem;line-height:1.65;color:#e2e2f0;white-space:pre;overflow:auto;tab-size:2;caret-color:var(--purple);min-height:420px;width:100%;";
      if (cmHost) cmHost.style.display = "none";
      return false;
    }
  }

  function syncFromCM(text) {
    ta.value = text;
    updateStats();
    scheduleAutosave();
  }

  function setCMContent(text) {
    if (cmView) {
      cmView.dispatch({ changes: { from: 0, to: cmView.state.doc.length, insert: text } });
    } else {
      ta.value = text;
    }
    updateStats();
  }

  function updatePosFromCM(state) {
    if (!statusPos || !state) return;
    const line = state.doc.lineAt(state.selection.main.head);
    if (statusPos) statusPos.textContent = `Ln ${line.number}, Col ${line.from === state.selection.main.head ? 1 : state.selection.main.head - line.from + 1}`;
  }

  /* ---------- Cambio de pestaña ---------- */
  function switchFile(name) {
    // Guardar el contenido actual en su búfer
    if (activeFile === "index.html") ta.value = cmView ? cmView.state.doc.toString() : ta.value;
    else FILES[activeFile] = cmView ? cmView.state.doc.toString() : ta.value;
    activeFile = name;
    fileTabs?.querySelectorAll(".ide__file").forEach((b) => {
      const on = b.dataset.file === name;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    const content = name === "index.html" ? ta.value : (FILES[name] || "");
    const lang = name === "style.css" ? cmLangCache.css : name === "game.js" ? cmLangCache.js : cmLangCache.html;
    if (cmView && langComp && lang) {
      cmView.dispatch({
        changes: { from: 0, to: cmView.state.doc.length, insert: content },
        effects: langComp.reconfigure(lang),
      });
      updateStats();
    } else {
      setCMContent(content);
    }
  }

  fileTabs?.addEventListener("click", (e) => {
    const btn = e.target.closest(".ide__file");
    if (btn && btn.dataset.file) switchFile(btn.dataset.file);
  });

  /* ---------- Render / ejecución ---------- */
  function setStatus(text, ok = true) {
    if (!statusMsg) return;
    statusMsg.textContent = text;
    statusMsg.className = ok ? "ok" : "";
    statusMsg.style.color = ok ? "" : "#f87171";
  }

  function run() {
    // Sincronizar el búfer activo antes de compilar
    if (activeFile === "index.html") ta.value = cmView ? cmView.state.doc.toString() : ta.value;
    else FILES[activeFile] = cmView ? cmView.state.doc.toString() : ta.value;

    const code = compile();
    if (!code.trim()) return setStatus("● No hay código para ejecutar", false);
    setStatus("● Ejecutando...");
    if (consoleBody) consoleBody.innerHTML = "";
    if (fpsEl) fpsEl.textContent = "-- FPS";
    preview.srcdoc = CONSOLE_BRIDGE + code;
    setTimeout(() => setStatus("● Ejecutado — vista previa activa"), 250);
    updateStats();
  }

  function updateStats() {
    const src = activeFile === "index.html" ? ta.value : (FILES[activeFile] || "");
    const lines = src.split("\n").length;
    if (statusSize) statusSize.textContent = `${lines} líneas · ${src.length} caracteres`;
  }

  function loadCode(code, name, id) {
    ta.value = code;
    FILES["style.css"] = "";
    FILES["game.js"] = "";
    currentId = id || null;
    if (nameInput && name) nameInput.value = name;
    // Volver a la pestaña index.html
    activeFile = "index.html";
    fileTabs?.querySelectorAll(".ide__file").forEach((b) => {
      const on = b.dataset.file === "index.html";
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (cmView) setCMContent(code); else updateStats();
    run();
  }

  /* ---------- Atajos en el textarea (fallback) ---------- */
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const s = ta.selectionStart, en = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + "  " + ta.value.slice(en);
      ta.selectionStart = ta.selectionEnd = s + 2;
      updateStats();
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
    if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
  });
  ta.addEventListener("input", updateStats);

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
    if (activeFile === "index.html") ta.value = cmView ? cmView.state.doc.toString() : ta.value;
    else FILES[activeFile] = cmView ? cmView.state.doc.toString() : ta.value;
    const code = compile();
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
    if (activeFile === "index.html") ta.value = cmView ? cmView.state.doc.toString() : ta.value;
    else FILES[activeFile] = cmView ? cmView.state.doc.toString() : ta.value;
    const code = compile();
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
      position: "absolute", zIndex: "50", background: "#16161f",
      border: "1px solid rgba(255,255,255,.1)", borderRadius: "12px", padding: "7px",
      minWidth: "250px", boxShadow: "0 20px 50px rgba(0,0,0,.6)", display: "grid", gap: "3px",
    });
    Object.entries(TEMPLATES).forEach(([key, tpl]) => {
      const item = document.createElement("button");
      item.type = "button";
      item.textContent = tpl.label;
      Object.assign(item.style, {
        background: "transparent", border: "0", color: "#f4f4f8", textAlign: "left",
        padding: "10px 13px", borderRadius: "8px", cursor: "pointer", fontSize: ".87rem",
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

  /* ---------- Registro + arranque ---------- */
  window.RK.editorLoader = (code, name, id) => loadCode(code, name, id);
  window.RK.editorCompile = () => { if (activeFile === "index.html") ta.value = cmView ? cmView.state.doc.toString() : ta.value; return compile(); };

  // Autosave
  const lastKey = "ristkit_editor_autosave";
  let autosaveTimer = null;
  function scheduleAutosave() { clearTimeout(autosaveTimer); autosaveTimer = setTimeout(writeAutosave, 1200); }
  function writeAutosave() {
    try {
      if (activeFile === "index.html" && cmView) ta.value = cmView.state.doc.toString();
      localStorage.setItem(lastKey, JSON.stringify({ code: ta.value, name: nameInput?.value || "", files: FILES }));
    } catch { /* storage lleno */ }
  }
  setInterval(writeAutosave, 3000);

  let initial = null, initialName = "", initialFiles = null;
  try {
    const auto = JSON.parse(localStorage.getItem(lastKey) || "null");
    if (auto && auto.code) { initial = auto.code; initialName = auto.name || ""; initialFiles = auto.files || null; }
  } catch { /* ignore */ }

  // Carga inicial SÍNCRONA con el textarea (evita parpadeo vacío)
  if (initialFiles) Object.assign(FILES, initialFiles);
  loadCode(initial || TEMPLATES.platform.code, initialName || TEMPLATES.platform.name, null);
  if (initial) setStatus("● Proyecto restaurado");

  // Montar CodeMirror de forma asíncrona; al montar toma el contenido de ta.value
  initCM();
})();
