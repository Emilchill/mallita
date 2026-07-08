// theme.js
// Maneja los 6 temas de color disponibles y su persistencia.
// - Antes de iniciar sesión: se guarda en localStorage (clave "malla_theme").
// - Después de iniciar sesión: se guarda también en Firestore (users/{uid}.theme)
//   para que el estudiante vea su tema en cualquier dispositivo donde inicie sesión.

export const THEMES = [
  { id: "utesa",     nombre: "UTESA Clásico",   swatch: ["#00542B", "#C89B3C", "#F7F8F5"] },
  { id: "medianoche",nombre: "Medianoche",      swatch: ["#5B8DEF", "#F2B84B", "#0B1220"] },
  { id: "atardecer", nombre: "Atardecer",       swatch: ["#E85D2C", "#FFB627", "#FFF6ED"] },
  { id: "oceano",    nombre: "Océano",          swatch: ["#0E7C86", "#21B0A6", "#EFF7F9"] },
  { id: "violeta",   nombre: "Violeta Nocturno",swatch: ["#8B6FEA", "#E85DA0", "#150F26"] },
  { id: "coral",     nombre: "Coral",           swatch: ["#E23F63", "#FF8FA3", "#FFF4F5"] },
];

const STORAGE_KEY = "malla_theme";
const DEFAULT_THEME = "utesa";

export function getLocalTheme() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
}

export function setLocalTheme(id) {
  localStorage.setItem(STORAGE_KEY, id);
}

export function applyTheme(id) {
  const valid = THEMES.some(t => t.id === id) ? id : DEFAULT_THEME;
  document.documentElement.setAttribute("data-theme", valid);
  setLocalTheme(valid);
  document.querySelectorAll("[data-theme-option]").forEach(el => {
    el.classList.toggle("theme-active", el.getAttribute("data-theme-option") === valid);
  });
}

// Construye el selector visual de temas dentro de un contenedor dado.
// onSelect(id) se llama cada vez que el usuario elige un tema (para persistir en Firestore).
export function buildThemePicker(container, onSelect) {
  container.innerHTML = "";
  const current = document.documentElement.getAttribute("data-theme") || getLocalTheme();
  THEMES.forEach(t => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-swatch" + (t.id === current ? " theme-active" : "");
    btn.setAttribute("data-theme-option", t.id);
    btn.title = t.nombre;
    btn.innerHTML = `
      <span class="theme-dots">
        <i style="background:${t.swatch[0]}"></i><i style="background:${t.swatch[1]}"></i><i style="background:${t.swatch[2]}"></i>
      </span>
      <span class="theme-label">${t.nombre}</span>
    `;
    btn.addEventListener("click", () => {
      applyTheme(t.id);
      if (typeof onSelect === "function") onSelect(t.id);
    });
    container.appendChild(btn);
  });
}
