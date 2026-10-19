/* ============================================================
   RistKit Studio — i18n (capa mínima)
   ------------------------------------------------------------
   Preparado para añadir idiomas sin reescribir la interfaz.
   Uso en HTML:  <span data-i18n="clave"></span>
                 <input data-i18n-placeholder="clavePh">
   Uso en JS:    I18N.t("clave")   →  texto traducido
   Añadir un idioma: crear DICTS["en"] = { clave: "..." } y
   llamar a I18N.setLang("en"). Mientras solo existe "es".
   ============================================================ */
(() => {
  "use strict";

  /** Diccionarios. "es" es la fuente de verdad (idioma por defecto). */
  const DICTS = {
    es: {
      "nav.inicio": "Inicio",
      "nav.juegos": "Juegos",
      "nav.crear": "Crear",
      "nav.guias": "Guías",
      "nav.asistente": "Asistente IA",
      "legal.privacidad": "Aviso de privacidad",
      "legal.terminos": "Términos de servicio",
      "legal.cookies": "Cookies",
      "ai.deleteKey": "Borrar mi API key",
      "ai.keyLocal": "Tu API key se guarda solo en este navegador.",
      "game.sandboxNote": "El juego corre en un iframe aislado (sin acceso a tus datos).",
      "toast.saved": "Juego guardado en tu arcade",
      "404.title": "Página no encontrada",
      "404.text": "La página que buscas no existe o se ha movido.",
      "404.back": "Volver al inicio",
    },
  };

  let lang = document.documentElement.lang || "es";

  function t(key, vars) {
    const dict = DICTS[lang] || DICTS.es;
    let s = dict[key] ?? DICTS.es[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
    return s;
  }

  /** Aplica [data-i18n] e [data-i18n-placeholder] a todo el DOM. */
  function applyAll(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    root.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  }

  window.I18N = {
    get lang() { return lang; },
    t,
    applyAll,
    /** Registra un diccionario extra (futuros idiomas o plugins). */
    extend(langCode, dict) { DICTS[langCode] = { ...(DICTS[langCode] || {}), ...dict }; },
    setLang(code) {
      if (!DICTS[code]) console.warn(`[i18N] Idioma "${code}" no disponible; se mantiene "${lang}".`);
      else { lang = code; document.documentElement.lang = code; applyAll(); }
    },
  };

  // Aplica las cadenas al cargar el DOM
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => applyAll());
  else applyAll();
})();
