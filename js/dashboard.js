import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { PENSUMS } from "./pensums-data.js";
import { THEMES, applyTheme, getLocalTheme, setLocalTheme, buildThemePicker } from "./theme.js";

let userData = null;
let pensum = null;
let doneSet = new Set();
let activeFilter = "all";
let searchTerm = "";

const CODE_RE = /[A-Z]{2,4}-\d{3}/g;
const COREQ_RE = /CO[-.\s]?REQ\.?\s*([A-Z]{2,4}-\d{3})/gi;

// Detecta prerrequisitos de tipo "cuatrimestre completo", p.ej.:
//   "Aprobar todas las asignaturas hasta el 5.to cuatrimestre"
//   "Haber aprobado todas las asignaturas del 1.er al 9.no cuatrimestre"
//   "Haber aprobado todas las asignaturas incluyendo las del 7.mo cuatrimestre"
// Estos aparecen en Proyecto Integrador, Pasantía, Formación de Emprendedores,
// Anteproyecto de Grado y Proyecto de Grado en las 3 carreras, y NO contienen
// códigos de materia, así que el regex de códigos no los detectaba.
const GATE_ORDINAL_RE = /(\d{1,2})\s*\.?\s*(?:er|do|to|no|mo|vo|ro)\b/gi;
const GATE_KEYWORD_RE = /\b(aprobad[oa]s?|aprobar)\b/i;

/* ---------- Utilidades de prerrequisitos ---------- */
function getCoReqCodes(reqText) {
  const set = new Set();
  let match;
  const re = new RegExp(COREQ_RE);
  while ((match = re.exec(reqText)) !== null) set.add(match[1]);
  return set;
}
function getPrereqCodes(materia) {
  if (!materia.req || materia.req === "-") return [];
  const coReq = getCoReqCodes(materia.req);
  const all = materia.req.match(CODE_RE) || [];
  return [...new Set(all)].filter(code => code !== materia.c && !coReq.has(code));
}

// Devuelve el número de cuatrimestre que debe estar 100% completo para
// desbloquear esta materia, o null si no tiene ese tipo de requisito.
function parseGateCuatrimestre(reqText) {
  if (!reqText || reqText === "-") return null;
  if (!/cuatrimestre/i.test(reqText)) return null;
  if (!GATE_KEYWORD_RE.test(reqText)) return null;
  let match, max = null;
  const re = new RegExp(GATE_ORDINAL_RE.source, "gi");
  while ((match = re.exec(reqText)) !== null) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 12 && (max === null || num > max)) max = num;
  }
  return max;
}

// Estado del "gate" de cuatrimestre para una materia: cuáles son las
// materias reales (no electivas) de los cuatrimestres 1..gate que aún
// faltan por aprobar.
function getGateStatus(materia) {
  const gate = parseGateCuatrimestre(materia.req);
  if (gate === null) return null;
  const missing = [];
  pensum.cuatrimestres.forEach(cuat => {
    if (cuat.n > gate) return;
    cuat.materias.forEach(mat => {
      if (mat.c === "ELECTIVA" || mat.c === materia.c) return;
      if (!doneSet.has(mat.c)) missing.push(mat);
    });
  });
  return { gate, missing, ok: missing.length === 0 };
}

function isUnlocked(materia) {
  const prereqs = getPrereqCodes(materia);
  const codesOk = prereqs.length === 0 || prereqs.every(code => doneSet.has(code));
  const gateStatus = getGateStatus(materia);
  const gateOk = gateStatus === null || gateStatus.ok;
  return codesOk && gateOk;
}

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(text) {
  const t = document.getElementById("toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- Guard de sesión ---------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "index.html"; return; }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) { window.location.href = "profile.html"; return; }

  userData = snap.data();
  pensum = PENSUMS[userData.career] || PENSUMS.ISC;
  doneSet = new Set(userData.done || []);

  applyTheme(userData.theme || getLocalTheme());

  initHeader();
  initThemePopover();
  initToolbar();
  render();

  document.getElementById("loader").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
});

document.getElementById("btn-logout")?.addEventListener("click", () => signOut(auth));

/* ---------- Header ---------- */
function initHeader() {
  document.getElementById("hi-name").textContent = `Hola, ${userData.name.split(" ")[0]}`;
  document.getElementById("hi-career").textContent = `${pensum.nombre} · ${pensum.titulo}`;
  const mark = document.getElementById("brand-mark");
  mark.textContent = pensum.key;
  mark.style.background = pensum.color;
  mark.style.fontSize = "11px";
}

/* ---------- Popover de temas ---------- */
function initThemePopover() {
  const btn = document.getElementById("btn-theme");
  const pop = document.getElementById("theme-pop");
  const container = document.getElementById("theme-picker-container");

  buildThemePicker(container, async (themeId) => {
    setLocalTheme(themeId);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), { theme: themeId });
      showToast("Tema guardado ✓");
    } catch {
      showToast("No se pudo guardar el tema, pero se aplicó localmente.");
    }
  });

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const willShow = !pop.classList.contains("show");
    pop.classList.toggle("show", willShow);
    btn.setAttribute("aria-expanded", String(willShow));
  });
  document.addEventListener("click", (e) => {
    if (!pop.contains(e.target) && e.target !== btn) pop.classList.remove("show");
  });
}

/* ---------- Toolbar (búsqueda + filtros) ---------- */
function initToolbar() {
  document.getElementById("search-input").addEventListener("input", (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    render();
  });
  document.querySelectorAll("#filter-chips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      activeFilter = chip.dataset.filter;
      document.querySelectorAll("#filter-chips .chip").forEach(c => c.classList.remove("chip-active"));
      chip.classList.add("chip-active");
      render();
    });
  });
}

/* ---------- Toggle de materia ---------- */
async function toggleSubject(materia) {
  const isDone = doneSet.has(materia.c);
  if (!isDone && !isUnlocked(materia)) {
    const gateStatus = getGateStatus(materia);
    if (gateStatus && !gateStatus.ok) {
      const n = gateStatus.missing.length;
      showToast(`Debes completar todas las materias hasta el ${gateStatus.gate}.º cuatrimestre. Te falta${n === 1 ? "" : "n"} ${n} materia${n === 1 ? "" : "s"}.`);
    } else {
      showToast("Aún te faltan prerrequisitos para esta materia.");
    }
    return;
  }
  if (isDone) doneSet.delete(materia.c);
  else doneSet.add(materia.c);

  const doneArr = [...doneSet];
  userData.done = doneArr;
  render();

  try {
    await updateDoc(doc(db, "users", auth.currentUser.uid), { done: doneArr });
  } catch {
    showToast("No se pudo guardar. Revisa tu conexión.");
  }
}

/* ---------- Cálculo de progreso ---------- */
function computeStats() {
  const allReales = pensum.cuatrimestres.flatMap(c => c.materias).filter(m => m.c !== "ELECTIVA");
  const doneReales = allReales.filter(m => doneSet.has(m.c));
  const doneElectivas = pensum.electivas.filter(m => doneSet.has(m.c));

  const creditosHechos = doneReales.reduce((s, m) => s + m.cr, 0) + doneElectivas.reduce((s, m) => s + m.cr, 0);
  const totalCreditos = pensum.totalCreditos;
  const pct = Math.min(100, Math.round((creditosHechos / totalCreditos) * 100));

  return {
    doneCount: doneReales.length + doneElectivas.length,
    totalCount: allReales.length + pensum.electivas.length,
    creditosHechos,
    totalCreditos,
    pct,
  };
}

function renderStats() {
  const s = computeStats();
  document.getElementById("perc-txt").textContent = s.pct + "%";
  document.getElementById("perc-desc").textContent = `${s.creditosHechos} de ${s.totalCreditos} créditos completados`;
  document.getElementById("stat-done").textContent = s.doneCount;
  document.getElementById("stat-pending").textContent = Math.max(0, s.totalCount - s.doneCount);
  document.getElementById("stat-credits").textContent = `${s.creditosHechos} / ${s.totalCreditos}`;
  document.getElementById("credits-bar-fill").style.width = Math.min(100, (s.creditosHechos / s.totalCreditos) * 100) + "%";

  const circumference = 326.7;
  const offset = circumference - (s.pct / 100) * circumference;
  document.getElementById("ring-fg").style.strokeDashoffset = offset;
}

/* ---------- Render de una tarjeta de materia ---------- */
function subjectMatchesSearch(m) {
  if (!searchTerm) return true;
  return m.n.toLowerCase().includes(searchTerm) || m.c.toLowerCase().includes(searchTerm);
}
function subjectMatchesFilter(m) {
  const done = doneSet.has(m.c);
  if (activeFilter === "done") return done;
  if (activeFilter === "pending") return !done;
  return true;
}

function buildCard(materia) {
  if (materia.c === "ELECTIVA") {
    const div = document.createElement("div");
    div.className = "subject-card locked";
    div.innerHTML = `
      <span class="clave mono">SLOT</span>
      <span class="nombre">Espacio para materia electiva</span>
      <span class="meta"><span>Ver sección Electivas ↓</span><span class="cr">${materia.cr} CR</span></span>
    `;
    div.addEventListener("click", () => {
      document.getElementById("electivas-anchor")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return div;
  }

  const done = doneSet.has(materia.c);
  const gateStatus = getGateStatus(materia);
  const unlocked = done || isUnlocked(materia);
  const card = document.createElement("div");
  card.className = "subject-card" + (done ? " done" : "") + (!unlocked ? " locked" : "") + (gateStatus ? " gate-card" : "");

  if (gateStatus) {
    card.title = gateStatus.ok
      ? `Requiere: todas las materias hasta el ${gateStatus.gate}.º cuatrimestre (cumplido ✓)`
      : `Requiere: todas las materias hasta el ${gateStatus.gate}.º cuatrimestre — faltan ${gateStatus.missing.length}: ${gateStatus.missing.slice(0, 6).map(mt => mt.c).join(", ")}${gateStatus.missing.length > 6 ? "…" : ""}`;
  } else {
    card.title = materia.req && materia.req !== "-" ? `Requisitos: ${materia.req}` : "Sin requisitos";
  }

  card.innerHTML = `
    ${!unlocked ? `<svg class="lock-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>` : ""}
    <div class="sello">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"></path></svg>
    </div>
    <span class="clave mono">${materia.c}</span>
    <span class="nombre">${materia.n}</span>
    <span class="meta"><span>${gateStatus ? `Cuatrimestre ${gateStatus.gate} completo` : (materia.hp > 0 ? "Teórico-práctico" : "Teórico")}</span><span class="cr">${materia.cr} CR</span></span>
  `;
  card.addEventListener("click", () => toggleSubject(materia));
  return card;
}

/* ---------- Render principal de la malla ---------- */
function render() {
  renderStats();
  const cont = document.getElementById("malla-content");
  cont.innerHTML = "";

  let anyVisible = false;

  pensum.cuatrimestres.forEach(cuat => {
    const visibleMaterias = cuat.materias.filter(m =>
      subjectMatchesSearch(m) && (m.c === "ELECTIVA" ? activeFilter === "all" : subjectMatchesFilter(m))
    );
    if (activeFilter === "electivas") return; // se muestra aparte más abajo
    if (visibleMaterias.length === 0) return;
    anyVisible = true;

    const block = document.createElement("div");
    block.className = "cuatri-block";
    block.innerHTML = `
      <div class="cuatri-head">
        <span class="num">${String(cuat.n).padStart(2, "0")}</span>
        <span class="title">Cuatrimestre</span>
        <span class="cnt">${visibleMaterias.filter(m => doneSet.has(m.c)).length}/${visibleMaterias.filter(m => m.c !== "ELECTIVA").length} completadas</span>
      </div>
    `;
    const grid = document.createElement("div");
    grid.className = "materias-grid";
    visibleMaterias.forEach(m => grid.appendChild(buildCard(m)));
    block.appendChild(grid);
    cont.appendChild(block);
  });

  // Sección de electivas
  const visibleElectivas = pensum.electivas.filter(m => subjectMatchesSearch(m) && subjectMatchesFilter(m));
  if ((activeFilter === "all" || activeFilter === "electivas" || (searchTerm && visibleElectivas.length)) && visibleElectivas.length > 0) {
    anyVisible = true;
    const block = document.createElement("div");
    block.className = "cuatri-block";
    block.id = "electivas-anchor";
    block.innerHTML = `
      <div class="cuatri-head">
        <span class="num">EL</span>
        <span class="title">Electivas</span>
        <span class="cnt">${visibleElectivas.filter(m => doneSet.has(m.c)).length}/${visibleElectivas.length} completadas</span>
      </div>
      <div class="electivas-note">Debes cursar un mínimo de créditos electivos según tu pensum. Elige y marca las que curses.</div>
    `;
    const grid = document.createElement("div");
    grid.className = "materias-grid";
    visibleElectivas.forEach(m => grid.appendChild(buildCard(m)));
    block.appendChild(grid);
    cont.appendChild(block);
  }

  if (!anyVisible) {
    cont.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.35-4.35"></path></svg>
        <p>No encontramos materias que coincidan con tu búsqueda o filtro.</p>
      </div>
    `;
  }
}
