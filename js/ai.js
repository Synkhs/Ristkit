/* ============================================
   RistKit Studio — Asistente IA (multi-API)
   Soporta: OpenRouter, OpenAI, Anthropic, Groq,
   Mistral, DeepSeek y cualquier API compatible.
   ============================================ */

(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const toast = (m, t) => window.RK?.toast?.(m, t);

  const panel = $("#aiPanel");
  const fab = $("#aiFab");
  if (!panel) return;

  /* ---------- Proveedores ---------- */
  const PROVIDERS = {
    openrouter: {
      label: "OpenRouter",
      baseUrl: "https://openrouter.ai/api/v1",
      type: "openai",
      model: "deepseek/deepseek-chat-v3",
      models: [
        "deepseek/deepseek-chat-v3",
        "openai/gpt-4o-mini",
        "anthropic/claude-3.5-sonnet",
        "google/gemini-2.0-flash-001",
        "meta-llama/llama-3.3-70b-instruct",
        "qwen/qwen-2.5-72b-instruct",
      ],
    },
    openai: {
      label: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      type: "openai",
      model: "gpt-4o-mini",
      models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1", "o4-mini"],
    },
    anthropic: {
      label: "Anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      type: "anthropic",
      model: "claude-sonnet-4-20250514",
      models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
    },
    groq: {
      label: "Groq",
      baseUrl: "https://api.groq.com/openai/v1",
      type: "openai",
      model: "llama-3.3-70b-versatile",
      models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"],
    },
    mistral: {
      label: "Mistral AI",
      baseUrl: "https://api.mistral.ai/v1",
      type: "openai",
      model: "mistral-small-latest",
      models: ["mistral-small-latest", "mistral-large-latest", "open-mistral-nemo"],
    },
    deepseek: {
      label: "DeepSeek",
      baseUrl: "https://api.deepseek.com/v1",
      type: "openai",
      model: "deepseek-chat",
      models: ["deepseek-chat", "deepseek-reasoner"],
    },
    custom: { label: "API personalizada", baseUrl: "", type: "openai", model: "", models: [] },
  };

  const DEFAULT_SYSTEM =
    "Eres RistKit, un asistente experto en creación de juegos HTML5, Canvas y JavaScript. " +
    "Respondes en español, de forma concisa y práctica, con ejemplos de código listos para pegar en el editor. " +
    "Cuando te pidan un juego, entrega un archivo HTML completo y funcional.";

  /* ---------- Estado ---------- */
  const SKEY = "ristkit_ai_settings";
  const CKEY = "ristkit_ai_chat";

  /* ---------- Cifrado opcional de la API key (A3, Web Crypto) ----------
     Si el usuario activa la protección, la key NUNCA se guarda en claro:
     se deriva una clave con PBKDF2 (SHA-256, 150k iteraciones) y se cifra
     con AES-GCM 256. El blob cifrado vive en localStorage; la key descifrada
     solo permanece en memoria (variable unlockedKey) hasta cerrar la pestaña. */
  const KeyVault = {
    /** @type {string|null} Key descifrada en memoria (no se persiste) */
    unlocked: null,
    /** @param {string} p */
    async _derive(p, salt) {
      const enc = new TextEncoder();
      const base = await crypto.subtle.importKey("raw", enc.encode(p), "PBKDF2", false, ["deriveKey"]);
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
        base,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    },
    _b64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); },
    _unb64(s) { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); },
    /** Cifra una key. @returns {Promise<{v:number,salt:string,iv:string,data:string}>} */
    async encrypt(plain, password) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await this._derive(password, salt);
      const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
      return { v: 1, salt: this._b64(salt), iv: this._b64(iv), data: this._b64(data) };
    },
    /** Descifra un blob. @returns {Promise<string>} */
    async decrypt(blob, password) {
      const key = await this._derive(password, this._unb64(blob.salt));
      const out = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: this._unb64(blob.iv) }, key, this._unb64(blob.data)
      );
      return new TextDecoder().decode(out);
    },
  };

  let settings = loadSettings();
  let messages = loadChat();
  let busy = false;

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(SKEY) || "null");
      if (s && typeof s === "object") {
        const merged = { includeCode: true, temperature: 0.7, system: "", ...s };
        // Si la key está cifrada, no hay key en claro que cargar
        if (merged.keyEnc) { merged.apiKey = ""; KeyVault.unlocked = null; }
        return merged;
      }
    } catch { /* ignore */ }
    return { provider: "openrouter", ...PROVIDERS.openrouter, type: "openai", temperature: 0.7, system: "", includeCode: true, apiKey: "" };
  }
  function saveSettings(s) {
    // Nunca persistir la key descifrada en claro si hay blob cifrado
    const toStore = { ...s };
    if (toStore.keyEnc) toStore.apiKey = "";
    settings = toStore;
    localStorage.setItem(SKEY, JSON.stringify(toStore));
    updateStatus();
  }
  /** Devuelve la key operativa en memoria (descifrada o en claro). */
  const activeKey = () => KeyVault.unlocked || settings.apiKey || "";
  function loadChat() {
    try {
      const c = JSON.parse(localStorage.getItem(CKEY) || "null");
      if (Array.isArray(c)) return c;
    } catch { /* ignore */ }
    return [];
  }
  function saveChat() {
    localStorage.setItem(CKEY, JSON.stringify(messages.slice(-40)));
  }

  const provider = () => PROVIDERS[settings.provider] || PROVIDERS.custom;
  const apiType = () => provider().type || "openai";

  /* ---------- Panel: abrir/cerrar ---------- */
  function openPanel(showSettings = false) {
    panel.classList.add("open");
    fab?.classList.add("hidden");
    fab?.setAttribute("aria-expanded", "true");
    switchView(showSettings || !activeKey() ? "settings" : "chat");
    if (!activeKey()) setTimeout(() => $("#aiKey")?.focus(), 350);
  }
  function closePanel() {
    panel.classList.remove("open");
    fab?.classList.remove("hidden");
    fab?.setAttribute("aria-expanded", "false");
  }

  fab?.addEventListener("click", () => (panel.classList.contains("open") ? closePanel() : openPanel()));
  $("#aiCloseBtn")?.addEventListener("click", closePanel);
  document.addEventListener("rk:open-ai", () => openPanel());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("open")) closePanel(); });

  /* ---------- Vistas ---------- */
  const chatView = $("#aiChatView");
  const settingsView = $("#aiSettingsView");
  function switchView(view) {
    chatView.classList.toggle("active", view === "chat");
    settingsView.classList.toggle("active", view === "settings");
  }
  $("#aiSettingsBtn")?.addEventListener("click", () => {
    fillSettingsForm();
    switchView("settings");
  });
  $("#aiBackToChat")?.addEventListener("click", () => switchView("chat"));

  /* ---------- Estado de conexión ---------- */
  function updateStatus() {
    const dot = $("#aiStatusDot");
    const txt = $("#aiStatusText");
    if (!dot || !txt) return;
    const ok = !!(activeKey() && settings.baseUrl && settings.model);
    dot.classList.toggle("off", !ok);
    txt.textContent = ok ? `${settings.model} · ${provider().label}` : "Sin conectar";
  }

  /* ---------- Formulario de ajustes ---------- */
  const el = {
    provider: $("#aiProvider"),
    baseUrl: $("#aiBaseUrl"),
    key: $("#aiKey"),
    model: $("#aiModel"),
    modelList: $("#aiModelList"),
    temp: $("#aiTemp"),
    tempVal: $("#aiTempVal"),
    system: $("#aiSystem"),
    includeCode: $("#aiIncludeCode"),
  };

  function fillSettingsForm() {
    if (!el.provider) return;
    el.provider.value = settings.provider || "openrouter";
    el.baseUrl.value = settings.baseUrl || "";
    // Si la key está cifrada, nunca rellenamos el campo con texto plano
    el.key.value = settings.keyEnc ? "" : (settings.apiKey || "");
    el.key.placeholder = settings.keyEnc ? "Introduce la contraseña para usarla" : "sk-or-...";
    el.model.value = settings.model || "";
    el.temp.value = settings.temperature ?? 0.7;
    el.tempVal.textContent = el.temp.value;
    el.system.value = settings.system || "";
    el.includeCode.checked = settings.includeCode !== false;
    // Estado de cifrado
    const encToggle = $("#aiEncryptToggle");
    const encPassField = $("#aiEncryptPassField");
    const encStatus = $("#aiEncryptStatus");
    const unlockBtn = $("#aiUnlockKey");
    if (encToggle) encToggle.checked = !!settings.keyEnc;
    if (encPassField) encPassField.style.display = settings.keyEnc && !KeyVault.unlocked ? "" : "none";
    if (unlockBtn) unlockBtn.style.display = settings.keyEnc && !KeyVault.unlocked ? "" : "none";
    if (encStatus) {
      encStatus.textContent = settings.keyEnc
        ? (KeyVault.unlocked ? "● Cifrada y desbloqueada en esta sesión" : "● Cifrada — introduce la contraseña para usarla")
        : "Sin cifrar — la key se guarda en claro en este navegador";
    }
    fillModelList();
  }

  /** Pide la contraseña y descifra la key en memoria (sin escribir en disco). */
  async function unlockKey() {
    if (!settings.keyEnc) return true;
    if (KeyVault.unlocked) return true;
    const pass = prompt("Esta API key está cifrada. Introduce la contraseña de descifrado:");
    if (pass == null) return false;
    try {
      KeyVault.unlocked = await KeyVault.decrypt(settings.keyEnc, pass);
      toast("API key descifrada en esta sesión", "success");
      fillSettingsForm();
      updateStatus();
      return true;
    } catch {
      toast("Contraseña incorrecta o key dañada", "error");
      return false;
    }
  }

  function fillModelList(models) {
    if (!el.modelList) return;
    const list = models || provider().models || [];
    el.modelList.innerHTML = list.map((m) => `<option value="${escapeHtml(m)}"></option>`).join("");
  }

  el.provider?.addEventListener("change", () => {
    const p = PROVIDERS[el.provider.value];
    if (!p) return;
    el.baseUrl.value = p.baseUrl;
    el.model.value = p.model;
    fillModelList(p.models);
  });

  el.temp?.addEventListener("input", () => { el.tempVal.textContent = el.temp.value; });

  $("#aiKeyToggle")?.addEventListener("click", () => {
    el.key.type = el.key.type === "password" ? "text" : "password";
  });

  $("#aiSaveSettings")?.addEventListener("click", async () => {
    const p = el.provider.value;
    const baseUrl = el.baseUrl.value.trim().replace(/\/+$/, "");
    const apiKey = el.key.value.trim();
    const model = el.model.value.trim();

    if (!baseUrl) return toast("Indica la URL base de la API", "error");
    if (!apiKey) return toast("Pega tu API key", "error");
    if (!model) return toast("Indica el modelo a usar", "error");

    const encryptOn = $("#aiEncryptToggle")?.checked;
    const encPass = $("#aiEncryptPass")?.value || "";
    let keyEnc = null;
    let plainKey = apiKey;

    if (encryptOn) {
      if (encPass.length < 4) return toast("La contraseña de cifrado debe tener al menos 4 caracteres", "error");
      keyEnc = await KeyVault.encrypt(apiKey, encPass);
      KeyVault.unlocked = apiKey; // queda en memoria para esta sesión
      plainKey = ""; // no persistimos la key en claro
    } else {
      KeyVault.unlocked = null;
    }

    saveSettings({
      provider: p,
      type: (PROVIDERS[p] || {}).type || "openai",
      label: (PROVIDERS[p] || {}).label || "Custom",
      baseUrl,
      apiKey: plainKey,
      keyEnc,
      model,
      temperature: parseFloat(el.temp.value) || 0.7,
      system: el.system.value.trim(),
      includeCode: el.includeCode.checked,
    });
    toast(`Conectado a ${provider().label} — ${model}${encryptOn ? " (key cifrada)" : ""}`, "success");
    switchView("chat");
  });

  /* Borrar la API key guardada en este navegador */
  $("#aiDeleteKey")?.addEventListener("click", () => {
    if (!activeKey() && !settings.keyEnc) return toast("No hay ninguna API key guardada", "error");
    if (!confirm("¿Borrar la API key guardada en este navegador? Deberás pegarla de nuevo para usar el asistente.")) return;
    KeyVault.unlocked = null;
    const { keyEnc, ...rest } = settings;
    saveSettings({ ...rest, apiKey: "" });
    if (el.key) el.key.value = "";
    fillSettingsForm();
    updateStatus();
    toast("API key borrada de este navegador", "success");
  });

  /* Mostrar/ocultar campos de cifrado */
  $("#aiEncryptToggle")?.addEventListener("change", (e) => {
    const passField = $("#aiEncryptPassField");
    if (passField) passField.style.display = e.target.checked ? "" : "none";
  });

  /* Desbloquear key cifrada a demanda */
  $("#aiUnlockKey")?.addEventListener("click", unlockKey);

  $("#aiFetchModels")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    const baseUrl = (el.baseUrl.value || "").trim().replace(/\/+$/, "");
    const key = activeKey() || el.key.value.trim();
    if (!baseUrl) return toast("Indica la URL base primero", "error");
    btn.textContent = "Buscando...";
    btn.disabled = true;
    try {
      const headers = {};
      if (key) headers.Authorization = `Bearer ${key}`;
      if (apiType() === "anthropic" && key) {
        delete headers.Authorization;
        headers["x-api-key"] = key;
        headers["anthropic-version"] = "2023-06-01";
        headers["anthropic-dangerous-direct-browser-access"] = "true";
      }
      const res = await fetch(`${baseUrl}/models`, { headers });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const ids = (data.data || []).map((m) => m.id).filter(Boolean).sort();
      if (!ids.length) throw new Error("vacío");
      fillModelList(ids);
      toast(`${ids.length} modelos disponibles`, "success");
    } catch (err) {
      if (/Failed to fetch|NetworkError|Load failed/i.test(String(err.message || err))) {
        toast("No se pudo conectar (CORS o red). El proveedor puede bloquear el listado desde navegador; escribe el modelo manualmente.", "error");
      } else {
        toast(`No se pudo listar modelos (${err.message}). Escribe el manualmente.`, "error");
      }
    } finally {
      btn.textContent = "Buscar modelos";
      btn.disabled = false;
    }
  });

  /* ---------- Mensajes en pantalla ---------- */
  const msgBox = $("#aiMessages");
  const emptyState = $("#aiEmpty");
  const input = $("#aiInput");
  const sendBtn = $("#aiSend");

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderRich(text) {
    // Escapa HTML y formatea bloques de código inline
    let html = escapeHtml(text);
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => `<pre>${code.replace(/\n$/, "")}</pre>`);
    html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    return html;
  }

  function addBubble(role, content, opts = {}) {
    if (emptyState) emptyState.style.display = "none";
    const wrap = document.createElement("div");
    wrap.className = `ai-msg${role === "user" ? " ai-msg--user" : ""}`;
    const avatar = document.createElement("div");
    avatar.className = "ai-msg__avatar";
    avatar.textContent = role === "user" ? "TÚ" : "RK";
    const bubble = document.createElement("div");
    bubble.className = "ai-msg__bubble" + (opts.error ? " error" : "");
    if (opts.typing) bubble.innerHTML = `<span class="ai-typing"><i></i><i></i><i></i></span>`;
    else if (opts.raw) bubble.innerHTML = renderRich(content);
    else bubble.textContent = content;
    wrap.append(avatar, bubble);
    msgBox.appendChild(wrap);
    msgBox.scrollTop = msgBox.scrollHeight;
    return bubble;
  }

  function renderHistory() {
    if (!msgBox) return;
    $$(".ai-msg", msgBox).forEach((m) => m.remove());
    if (!messages.length) {
      if (emptyState) emptyState.style.display = "";
      return;
    }
    messages.forEach((m) => addBubble(m.role, m.content, { raw: m.role === "assistant", error: m.error }));
  }

  /* ---------- Contexto del editor ---------- */
  function editorCode() {
    const ta = $("#codeInput");
    const code = ta?.value?.trim() || "";
    if (!settings.includeCode || !code) return "";
    const clipped = code.length > 14000 ? code.slice(0, 14000) + "\n// ... (código truncado)" : code;
    return `\n\n--- CÓDIGO ACTUAL DEL EDITOR (mi juego) ---\n\`\`\`html\n${clipped}\n\`\`\`\n--- FIN DEL CÓDIGO ---`;
  }

  function buildMessages() {
    const sys = (settings.system || DEFAULT_SYSTEM) + editorCode();
    const out = [{ role: "system", content: sys }];
    messages.forEach((m) => {
      if (m.error) return;
      out.push({ role: m.role, content: m.content });
    });
    return out;
  }

  /* ---------- Llamadas a la API ---------- */
  async function parseError(res) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data?.error?.message || data?.error?.type || data?.message || JSON.stringify(data).slice(0, 200);
    } catch { /* ignore */ }
    const map = { 401: "API key inválida o sin permisos", 402: "Créditos agotados en tu cuenta", 403: "Acceso denegado", 404: "Modelo o endpoint no encontrado", 429: "Límite de peticiones alcanzado", 500: "Error del proveedor" };
    return `${res.status} — ${map[res.status] || "Error de solicitud"}${detail ? `: ${detail}` : ""}`;
  }

  async function callAPI(messagesIn, onDelta, signal) {
    const base = settings.baseUrl.replace(/\/+$/, "");
    if (apiType() === "anthropic") {
      const sys = messagesIn.find((m) => m.role === "system")?.content || "";
      const conv = messagesIn.filter((m) => m.role !== "system");
      const res = await fetch(`${base}/messages`, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": activeKey(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 4096,
          temperature: settings.temperature,
          system: sys,
          messages: conv,
          stream: true,
        }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return streamSSE(res, (obj) => {
        if (obj.type === "content_block_delta" && obj.delta?.text) onDelta(obj.delta.text);
      });
    }

    // Compatible OpenAI (OpenRouter, OpenAI, Groq, Mistral, DeepSeek, custom...)
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeKey()}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: messagesIn,
        temperature: settings.temperature,
        stream: true,
      }),
    });
    if (!res.ok) throw new Error(await parseError(res));
    return streamSSE(res, (obj) => {
      const delta = obj.choices?.[0]?.delta?.content;
      if (delta) onDelta(delta);
    });
  }

  async function streamSSE(res, onObj) {
    if (!res.body) throw new Error("El proveedor no devolvió stream. Prueba con otro modelo.");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop();
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          onObj(JSON.parse(payload));
        } catch { /* línea parcial */ }
      }
    }
  }

  /* ---------- Envío ---------- */
  let controller = null;

  async function sendMessage(presetText) {
    const text = (presetText ?? input.value).trim();
    if (!text || busy) return;

    // Si la key está cifrada y sin desbloquear, pedir contraseña primero
    if (settings.keyEnc && !KeyVault.unlocked) {
      if (!(await unlockKey())) return;
    }
    if (!activeKey() || !settings.baseUrl || !settings.model) {
      toast("Primero conecta tu API en Configuración", "error");
      fillSettingsForm();
      switchView("settings");
      return;
    }

    busy = true;
    sendBtn.disabled = true;
    input.value = "";
    autoGrow();

    messages.push({ role: "user", content: text });
    addBubble("user", text);
    saveChat();

    const bubble = addBubble("assistant", "", { typing: true });
    controller = new AbortController();

    let acc = "";
    const flush = () => { bubble.innerHTML = renderRich(acc); msgBox.scrollTop = msgBox.scrollHeight; };

    try {
      await callAPI(buildMessages(), (delta) => {
        if (bubble.querySelector(".ai-typing")) bubble.innerHTML = "";
        acc += delta;
        flush();
      }, controller.signal);

      if (!acc) acc = "(respuesta vacía)";
      flush();
      messages.push({ role: "assistant", content: acc });
      saveChat();
    } catch (err) {
      const raw = err.name === "AbortError" ? "Petición cancelada." : String(err.message || err);
      bubble.innerHTML = renderRich(acc);
      if (acc) {
        messages.push({ role: "assistant", content: acc });
        saveChat();
      }
      // Traduce errores técnicos a explicaciones claras en español
      let friendly;
      if (/AbortError|cancelada/i.test(raw) || raw === "Petición cancelada.") {
        friendly = "Petición cancelada.";
      } else if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) {
        friendly =
          "No se pudo conectar con el proveedor.\n" +
          "Causa habitual: el proveedor bloquea las llamadas desde el navegador (política CORS).\n" +
          "Solución: usa OpenRouter (compatible con navegador) o despliega un proxy propio que haga de intermediario.";
      } else if (/401|API key inválida/i.test(raw)) {
        friendly = `${raw}\nLa API key no es válida o no tiene permisos. Revísala en ⚙ Configuración.`;
      } else if (/402|Créditos/i.test(raw)) {
        friendly = `${raw}\nSe han agotado los créditos o el saldo de tu cuenta del proveedor.`;
      } else if (/404|not found/i.test(raw)) {
        friendly = `${raw}\nEl modelo o el endpoint no existe. Comprueba el nombre del modelo en ⚙ Configuración.`;
      } else if (/429|límite/i.test(raw)) {
        friendly = `${raw}\nHas alcanzado el límite de peticiones del proveedor. Espera unos segundos y reintenta.`;
      } else {
        friendly = `${raw}\nRevisa la URL base, el modelo y tu API key en ⚙ Configuración.`;
      }
      addBubble("assistant", `⚠ ${friendly}`, { error: true, raw: true });
      if (/Failed to fetch|NetworkError|CORS|Load failed/i.test(raw)) {
        toast("El proveedor bloqueó la llamada desde el navegador (CORS). Prueba con OpenRouter u otro compatible.", "error");
      }
    } finally {
      busy = false;
      sendBtn.disabled = false;
      controller = null;
      input.focus();
    }
  }

  /* ---------- UI del chat ---------- */
  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  }

  sendBtn?.addEventListener("click", () => sendMessage());
  input?.addEventListener("input", autoGrow);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  $$(".ai-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      input.value = chip.textContent;
      input.focus();
      autoGrow();
    });
  });

  $("#aiClearBtn")?.addEventListener("click", () => {
    if (!messages.length) return;
    if (!confirm("¿Borrar toda la conversación?")) return;
    messages = [];
    saveChat();
    renderHistory();
    toast("Conversación borrada");
  });

  /* ---------- Init ---------- */
  fillSettingsForm();
  updateStatus();
  renderHistory();
})();
