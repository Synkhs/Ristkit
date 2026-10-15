/* ============================================
   RistKit Studio — Núcleo (nav, arcade, modal)
   ============================================ */

(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---------- Almacenamiento compartido de juegos ---------- */
  const GAMES_KEY = "ristkit_games_v1";

  const RK = (window.RK = {
    games: {
      all() {
        try {
          const raw = JSON.parse(localStorage.getItem(GAMES_KEY)) || [];
          const list = raw.filter((g) => g && typeof g === "object");
          let healed = list.length !== raw.length;
          for (const g of list) {
            if (typeof g.id !== "string" || !g.id) {
              g.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
              healed = true;
            }
          }
          if (healed) localStorage.setItem(GAMES_KEY, JSON.stringify(list));
          return list;
        } catch { return []; }
      },
      save(list) {
        localStorage.setItem(GAMES_KEY, JSON.stringify(list));
      },
      add(game) {
        const list = RK.games.all();
        const now = Date.now();
        const saved = {
          ...game,
          id:
            typeof game.id === "string" && game.id
              ? game.id
              : now.toString(36) + Math.random().toString(36).slice(2, 6),
          createdAt: game.createdAt || now,
          updatedAt: now,
        };
        const idx = list.findIndex((g) => g.id === saved.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...saved };
        else list.unshift(saved);
        RK.games.save(list);
        return saved;
      },
      remove(id) {
        RK.games.save(RK.games.all().filter((g) => g.id !== id));
      },
      get(id) {
        return RK.games.all().find((g) => g.id === id) || null;
      },
    },
    editorLoader: null, // lo registra editor.js
    toast,
  });

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg, type = "") {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  /* ---------- Preloader ---------- */
  const preloader = $("#preloader");
  const hidePreloader = () => preloader?.classList.add("hidden");
  if (document.readyState === "complete") setTimeout(hidePreloader, 450);
  else {
    window.addEventListener("load", () => setTimeout(hidePreloader, 450));
    setTimeout(hidePreloader, 3000);
  }

  /* ---------- Navbar ---------- */
  const navbar = $("#navbar");
  const navMenu = $("#navMenu");
  const navToggle = $("#navToggle");
  const navBackdrop = $("#navBackdrop");
  const scrollProgress = $("#scrollProgress");
  const navLinks = $$(".navbar__link");
  const sections = $$("main section[id]");

  const onScroll = () => {
    navbar.classList.toggle("scrolled", window.scrollY > 24);
    if (scrollProgress) {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      scrollProgress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const setActiveLink = () => {
    const pos = window.scrollY + 140;
    let current = "inicio";
    sections.forEach((sec) => { if (pos >= sec.offsetTop) current = sec.id; });
    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (href && href.startsWith("#")) link.classList.toggle("active", href === `#${current}`);
    });
  };
  window.addEventListener("scroll", setActiveLink, { passive: true });
  setActiveLink();

  const closeMenu = () => {
    navMenu?.classList.remove("open");
    navToggle?.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
    navBackdrop?.classList.remove("show");
    document.body.classList.remove("menu-open");
  };
  const openMenu = () => {
    navMenu?.classList.add("open");
    navToggle?.classList.add("open");
    navToggle?.setAttribute("aria-expanded", "true");
    navBackdrop?.classList.add("show");
    document.body.classList.add("menu-open");
  };
  navToggle?.addEventListener("click", () => {
    navMenu?.classList.contains("open") ? closeMenu() : openMenu();
  });
  navBackdrop?.addEventListener("click", closeMenu);
  navLinks.forEach((l) => l.addEventListener("click", closeMenu));
  document.addEventListener("click", (e) => {
    if (navMenu && !navMenu.contains(e.target) && !navToggle.contains(e.target)) closeMenu();
  });
  window.addEventListener("resize", () => { if (innerWidth > 768) closeMenu(); });

  /* ---------- Reveal ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach((el) => revealObserver.observe(el));

  /* ---------- Contadores ---------- */
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const duration = 1500;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(ease(p) * target);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  $$(".stat__number").forEach((el) => counterObserver.observe(el));

  /* ---------- Modal de juegos ---------- */
  const modal = $("#gameModal");
  const frame = $("#gameFrame");
  const modalTitle = $("#modalTitle");
  const modalClose = $("#modalClose");
  let lastFocused = null;

  function openGame({ title, src, code }) {
    if (!modal) return;
    lastFocused = document.activeElement;
    modalTitle.textContent = title || "Juego";
    if (src) { frame.removeAttribute("srcdoc"); frame.src = src; }
    else if (code) { frame.src = "about:blank"; frame.srcdoc = code; }
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => modalClose?.focus(), 320);
  }
  function closeGame() {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(() => { frame.src = "about:blank"; frame.removeAttribute("srcdoc"); }, 350);
    lastFocused?.focus?.();
  }
  $("#modalClose")?.addEventListener("click", closeGame);
  modal?.addEventListener("click", (e) => { if (e.target === modal) closeGame(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal?.classList.contains("open")) closeGame(); });

  /* ---------- Filtros del arcade ---------- */
  const arcadeGrid = $("#arcadeGrid");
  $$(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const f = btn.dataset.filter;
      $$(".game-card", arcadeGrid).forEach((card) => {
        const cat = card.dataset.category;
        const match = f === "all" || cat === f;
        card.classList.toggle("hidden", !match);
      });
      updateEmptyState(f);
    });
  });

  function updateEmptyState(filter) {
    const empty = $(".arcade__empty", arcadeGrid);
    const visible = $$(".game-card:not(.hidden)", arcadeGrid).length;
    if (filter === "mine" && visible === 0 && !empty) {
      const div = document.createElement("div");
      div.className = "arcade__empty";
      div.innerHTML = `Aún no has creado juegos. Abre el <a href="#editor" style="color:var(--purple)">editor</a>, pulsa “Guardar” y aparecerán aquí.`;
      arcadeGrid.appendChild(div);
    } else if (empty && (filter !== "mine" || visible > 0)) {
      empty.remove();
    }
  }

  /* ---------- Tarjetas de juegos del usuario ---------- */
  const SVG_PENCIL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
  const SVG_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>`;

  function renderMyGames() {
    if (!arcadeGrid) return;
    $$(".game-card[data-mine]", arcadeGrid).forEach((el) => el.remove());
    const games = RK.games.all();

    games.forEach((g) => {
      const card = document.createElement("article");
      card.className = "game-card reveal visible";
      card.dataset.category = "mine";
      card.dataset.mine = "1";
      card.innerHTML = `
        <div class="game-card__thumb thumb--mine">
          <svg viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 22h24a16 16 0 0115.5 19.7A7 7 0 0151.7 48L47 41a6 6 0 00-4.5-2H21.5a6 6 0 00-4.5 2l-4.7 7a7 7 0 01-7.8-6.3A16 16 0 0120 22z"/><path d="M17 31v8M13 35h8"/><circle cx="46" cy="32" r="1.6" fill="#fff"/><circle cx="51" cy="37" r="1.6" fill="#fff"/></svg>
          <span class="game-card__play">▶</span>
        </div>
        <div class="game-card__body">
          <div class="game-card__row">
            <span class="game-card__tag game-card__tag--mine">Tuyo</span>
            <span style="font-size:.75rem;color:var(--text-muted)">${new Date(g.updatedAt || g.createdAt).toLocaleDateString("es")}</span>
          </div>
          <h3 class="game-card__title"></h3>
          <p class="game-card__text">Creado en el editor RistKit. Guardado en tu navegador.</p>
          <div class="game-card__actions">
            <button class="btn btn--primary btn--sm" data-mine-play="${g.id}">Jugar</button>
            <button class="icon-btn" data-mine-edit="${g.id}" title="Editar">${SVG_PENCIL}</button>
            <button class="icon-btn icon-btn--danger" data-mine-delete="${g.id}" title="Eliminar">${SVG_TRASH}</button>
          </div>
        </div>`;
      $(".game-card__title", card).textContent = g.name || "Sin nombre";
      arcadeGrid.appendChild(card);
    });

    const statMine = $("#statMine");
    if (statMine) {
      statMine.dataset.count = games.length;
      statMine.textContent = games.length;
    }
    const activeFilter = $(".filter-btn.active")?.dataset.filter || "all";
    updateEmptyState(activeFilter);
  }

  arcadeGrid?.addEventListener("click", (e) => {
    const play = e.target.closest("[data-play]");
    const editExt = e.target.closest("[data-edit-external]");
    const minePlay = e.target.closest("[data-mine-play]");
    const mineEdit = e.target.closest("[data-mine-edit]");
    const mineDel = e.target.closest("[data-mine-delete]");

    if (play) {
      openGame({ title: play.dataset.title, src: play.dataset.play });
    } else if (editExt) {
      loadExternal(editExt.dataset.editExternal);
    } else if (minePlay) {
      const g = RK.games.get(minePlay.dataset.minePlay);
      if (g) openGame({ title: g.name, code: g.code });
    } else if (mineEdit) {
      const g = RK.games.get(mineEdit.dataset.mineEdit);
      if (g) {
        RK.editorLoader?.(g.code, g.name, g.id);
        document.querySelector("#editor")?.scrollIntoView({ behavior: "smooth" });
        toast(`Editando "${g.name}"`, "success");
      }
    } else if (mineDel) {
      const id = mineDel.dataset.mineDelete;
      const g = RK.games.get(id);
      if (g && confirm(`¿Eliminar "${g.name}"?`)) {
        RK.games.remove(id);
        renderMyGames();
        toast("Juego eliminado");
      }
    }
  });

  async function loadExternal(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(res.status);
      const code = await res.text();
      const name = path.split("/").pop().replace(".html", "").replace(/-/g, " ");
      RK.editorLoader?.(code, name, null);
      document.querySelector("#editor")?.scrollIntoView({ behavior: "smooth" });
      toast(`"${name}" cargado en el editor — ¡puedes modificarlo!`, "success");
    } catch {
      toast("No se pudo cargar el código (¿estás en file://?). Usa un servidor local.", "error");
    }
  }

  RK.renderMyGames = renderMyGames;

  /* ---------- Copiar esqueleto ---------- */
  $$(".copy-btn[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const pre = document.getElementById(btn.dataset.copy + "Code");
      if (!pre) return;
      const text = pre.innerText;
      try {
        await navigator.clipboard.writeText(text);
        const old = btn.innerHTML;
        btn.innerHTML = "✓ Copiado";
        setTimeout(() => (btn.innerHTML = old), 1600);
      } catch {
        toast("No se pudo copiar automáticamente", "error");
      }
    });
  });

  /* ---------- Scroll suave ---------- */
  $$('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      const top = target.getBoundingClientRect().top + window.scrollY - 66;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  /* ---------- Cursor glow ---------- */
  const glow = $("#cursorGlow");
  if (glow && window.matchMedia("(pointer: fine)").matches) {
    let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
    window.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; });
    (function loop() {
      gx += (tx - gx) * 0.08;
      gy += (ty - gy) * 0.08;
      glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- Año + render inicial ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  renderMyGames();

  /* ---------- Botones del asistente (abrir panel) ---------- */
  const openAI = () => {
    document.dispatchEvent(new CustomEvent("rk:open-ai"));
  };
  $("#openAssistant")?.addEventListener("click", openAI);
  $("#openAssistant2")?.addEventListener("click", openAI);
})();
