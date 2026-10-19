/* ============================================================
   RistKit Studio — Sistema global de errores (A7)
   ------------------------------------------------------------
   Captura excepciones no controladas y rechazos de promesas,
   mantiene un búfer de mensajes de consola y ofrece una pantalla
   amigable con botón "Copiar informe de error".
   Se carga el PRIMERO en index.html (antes de los demás scripts)
   para no perder errores de arranque.
   ============================================================ */
(() => {
  "use strict";

  /** @type {{ts:number, level:string, args:string}[]} Búfer circular de consola */
  const BUF_MAX = 200;
  const buf = [];
  /** @type {ErrorEvent|null} Última excepción capturada */
  let lastError = null;
  let overlayShown = false;

  /* ---------- Búfer de consola ---------- */
  const orig = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  function push(level, args) {
    buf.push({ ts: Date.now(), level, args: args.map(fmt).join(" ") });
    if (buf.length > BUF_MAX) buf.shift();
  }

  function fmt(a) {
    if (a instanceof Error) return `${a.name}: ${a.message}${a.stack ? "\n" + a.stack : ""}`;
    if (typeof a === "object") { try { return JSON.stringify(a); } catch { return String(a); } }
    return String(a);
  }

  for (const level of ["log", "info", "warn", "error", "debug"]) {
    console[level] = (...args) => { push(level, args); orig[level](...args); };
  }

  window.addEventListener("error", (e) => {
    lastError = e;
    push("error", [e.message, e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : "", e.error || ""]);
    show(e);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    lastError = { message: fmt(reason), filename: "", lineno: 0, colno: 0, error: reason };
    push("error", ["Promesa rechazada:", reason]);
    show({ message: "Promesa rechazada sin capturar: " + fmt(reason), filename: "", lineno: 0, colno: 0 });
  });

  /* ---------- Pantalla amigable ---------- */
  function show(ev) {
    if (overlayShown) return;
    // No interrumpir la edición deliberada: ignorar errores de iframes de juego (llegan como cross-origin silencioso)
    if (/gameFrame|preview/i.test(ev.filename || "")) return;
    overlayShown = true;

    const el = document.createElement("div");
    el.id = "rkErrorOverlay";
    el.setAttribute("role", "alertdialog");
    el.setAttribute("aria-modal", "true");
    el.innerHTML = `
      <div class="rk-err__box">
        <div class="rk-err__icon" aria-hidden="true">⚠</div>
        <h2>Algo salió mal en el estudio</h2>
        <p class="rk-err__msg">${esc(ev.message || "Error desconocido")}</p>
        <p class="rk-err__loc">${esc(`${ev.filename || ""} ${ev.lineno ? ":" + ev.lineno : ""}`.trim())}</p>
        <div class="rk-err__actions">
          <button class="btn btn--primary btn--sm" id="rkErrCopy">Copiar informe de error</button>
          <button class="btn btn--ghost btn--sm" id="rkErrClose">Continuar</button>
          <button class="btn btn--ghost btn--sm" id="rkErrReload">Recargar</button>
        </div>
        <p class="rk-err__hint">El informe incluye mensaje, traza, versión del navegador y últimas líneas de consola. No incluye tu API key ni el contenido de tus juegos.</p>
      </div>`;
    document.body.appendChild(el);

    const close = () => { el.remove(); overlayShown = false; };
    el.querySelector("#rkErrClose")?.addEventListener("click", close);
    el.querySelector("#rkErrReload")?.addEventListener("click", () => location.reload());
    el.querySelector("#rkErrCopy")?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      try {
        await navigator.clipboard.writeText(report());
        btn.textContent = "¡Copiado!";
        setTimeout(() => (btn.textContent = "Copiar informe de error"), 2000);
      } catch {
        // Fallback: mostrar en textarea por si clipboard falla (http, permisos)
        prompt("Copia el informe manualmente:", report());
      }
    });
  }

  /** @returns {string} Informe legible para pegar en un issue */
  function report() {
    const nav = navigator;
    const lines = buf.slice(-40).map((m) => `[${m.level}] ${m.args}`);
    return [
      "=== Informe de error — RistKit Studio ===",
      `Fecha: ${new Date().toISOString()}`,
      `Mensaje: ${lastError?.message || "(ninguno)"}`,
      `Archivo: ${lastError?.filename || "?"}:${lastError?.lineno || "?"}:${lastError?.colno || "?"}`,
      `Stack: ${lastError?.error?.stack || "(no disponible)"}`,
      `Navegador: ${nav.userAgent}`,
      `Idioma: ${nav.language}`,
      `Pantalla: ${screen.width}x${screen.height} @ ${devicePixelRatio}x`,
      `URL: ${location.href}`,
      "",
      "--- Últimos mensajes de consola ---",
      ...lines,
    ].join("\n");
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- API pública para otros módulos ---------- */
  window.RKErrors = {
    /** Registra un error personalizado en el búfer sin mostrar overlay */
    log(msg, level = "error") { push(level, [msg]); },
    /** Muestra la pantalla amigable a mano */
    show(message, extra) { show({ message, filename: extra?.filename || "", lineno: extra?.lineno || 0, colno: 0 }); },
    report,
  };
})();
