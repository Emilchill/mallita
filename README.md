<!DOCTYPE html>
<html lang="es" data-theme="utesa">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Iniciar sesión · Malla UTESA</title>
<link rel="stylesheet" href="css/style.css">
</head>
<body>

  <div class="disclaimer-strip">
    <strong>Proyecto estudiantil independiente</strong> — no es un sitio oficial de UTESA ni está afiliado a la universidad.
  </div>

  <div class="auth-shell">
    <!-- Panel visual -->
    <aside class="auth-visual">
      <div class="auth-visual-top">
        <span class="tag">Herramienta para estudiantes</span>
        <h1>Lleva el control de tu malla curricular, cuatrimestre a cuatrimestre.</h1>
        <p>Marca las materias que ya aprobaste, mira tu porcentaje de avance real y planifica qué te falta para llegar a Proyecto de Grado.</p>
      </div>
      <div>
        <div class="auth-mesh" aria-hidden="true">
          <i></i><i></i><i></i><i></i><i></i><i></i>
          <i></i><i></i><i></i><i></i><i></i><i></i>
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <p class="auth-visual-bottom">Ingeniería Eléctrica · Ingeniería Industrial · Ingeniería en Sistemas Computacionales</p>
      </div>
    </aside>

    <!-- Panel de formulario -->
    <main class="auth-panel">
      <div class="auth-box">
        <span class="kicker">Malla UTESA</span>
        <h2 id="auth-title">Bienvenido de nuevo</h2>
        <p class="sub" id="auth-sub">Inicia sesión para continuar con tu seguimiento académico.</p>

        <div class="tabs" role="tablist">
          <button type="button" role="tab" class="tab-btn tab-active" id="t-login" onclick="setAuthMode('login')">Iniciar sesión</button>
          <button type="button" role="tab" class="tab-btn" id="t-reg" onclick="setAuthMode('register')">Crear cuenta</button>
        </div>

        <form id="auth-form" novalidate>
          <div class="field">
            <label class="field-label" for="email">Correo electrónico</label>
            <input class="input" type="email" id="email" placeholder="tunombre@correo.com" autocomplete="email" required>
          </div>
          <div class="field">
            <label class="field-label" for="pass">Contraseña</label>
            <input class="input" type="password" id="pass" placeholder="Mínimo 6 caracteres" autocomplete="current-password" required minlength="6">
            <p class="pw-req" id="pw-req">Debe tener al menos 6 caracteres.</p>
          </div>
          <div class="field hidden" id="field-confirm">
            <label class="field-label" for="pass2">Confirmar contraseña</label>
            <input class="input" type="password" id="pass2" placeholder="Repite tu contraseña" autocomplete="new-password">
          </div>

          <button type="submit" class="btn btn-primary" id="btn-auth" style="width:100%;">
            <span id="btn-auth-text">Entrar</span>
          </button>

          <div class="err-box" id="err-msg"></div>
          <div class="hint-box" id="hint-msg"></div>
        </form>

        <p class="footer-note">
          Al continuar aceptas que tus datos (nombre, carrera y avance) se guardan de forma segura para
          que puedas retomar tu progreso desde cualquier dispositivo. Esta plataforma es un proyecto
          independiente creado por estudiantes y no representa a UTESA de forma oficial.
        </p>
      </div>
    </main>
  </div>

  <script type="module">
    import { auth } from "./js/firebase-config.js";
    import {
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      onAuthStateChanged,
    } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
    import { getLocalTheme, applyTheme } from "./js/theme.js";

    applyTheme(getLocalTheme());

    let mode = "login";

    window.setAuthMode = (m) => {
      mode = m;
      document.getElementById("t-login").classList.toggle("tab-active", m === "login");
      document.getElementById("t-reg").classList.toggle("tab-active", m === "register");
      document.getElementById("field-confirm").classList.toggle("hidden", m === "login");
      document.getElementById("btn-auth-text").textContent = m === "login" ? "Entrar" : "Crear mi cuenta";
      document.getElementById("auth-title").textContent = m === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta gratis";
      document.getElementById("auth-sub").textContent = m === "login"
        ? "Inicia sesión para continuar con tu seguimiento académico."
        : "Solo toma un minuto. Después elegirás tu carrera y tu tema favorito.";
      hideMsgs();
    };

    function hideMsgs() {
      document.getElementById("err-msg").classList.remove("show");
      document.getElementById("hint-msg").classList.remove("show");
    }
    function showErr(text) {
      const e = document.getElementById("err-msg");
      e.textContent = text;
      e.classList.add("show");
      document.getElementById("hint-msg").classList.remove("show");
    }
    function showHint(text) {
      const h = document.getElementById("hint-msg");
      h.textContent = text;
      h.classList.add("show");
      document.getElementById("err-msg").classList.remove("show");
    }

    document.getElementById("auth-form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      hideMsgs();

      const email = document.getElementById("email").value.trim();
      const pass = document.getElementById("pass").value;
      const pass2 = document.getElementById("pass2").value;
      const btn = document.getElementById("btn-auth");

      if (!email || !email.includes("@")) return showErr("Escribe un correo electrónico válido.");
      if (pass.length < 6) return showErr("La contraseña debe tener al menos 6 caracteres.");
      if (mode === "register" && pass !== pass2) return showErr("Las contraseñas no coinciden. Revísalas.");

      btn.disabled = true;
      const originalText = document.getElementById("btn-auth-text").textContent;
      document.getElementById("btn-auth-text").innerHTML = '<span class="spinner"></span>';

      try {
        if (mode === "login") {
          await signInWithEmailAndPassword(auth, email, pass);
        } else {
          await createUserWithEmailAndPassword(auth, email, pass);
        }
        // onAuthStateChanged se encarga de redirigir
      } catch (e) {
        btn.disabled = false;
        document.getElementById("btn-auth-text").textContent = originalText;
        switch (e.code) {
          case "auth/user-not-found":
            showErr("No existe una cuenta con ese correo. Prueba crear una cuenta nueva.");
            break;
          case "auth/wrong-password":
          case "auth/invalid-credential":
            showErr("Contraseña incorrecta. Verifica e intenta de nuevo.");
            break;
          case "auth/email-already-in-use":
            showErr("Ese correo ya tiene una cuenta. Intenta iniciar sesión en su lugar.");
            break;
          case "auth/invalid-email":
            showErr("El formato del correo no es válido.");
            break;
          case "auth/weak-password":
            showErr("La contraseña es muy débil. Usa al menos 6 caracteres.");
            break;
          case "auth/too-many-requests":
            showErr("Demasiados intentos. Espera un momento antes de volver a intentar.");
            break;
          case "auth/network-request-failed":
            showErr("Problema de conexión. Revisa tu internet e intenta de nuevo.");
            break;
          default:
            showErr("Ocurrió un error inesperado. Intenta de nuevo.");
        }
      }
    });

    // Si ya hay sesión activa, redirige de inmediato
    onAuthStateChanged(auth, (user) => {
      if (user) window.location.href = "dashboard.html";
    });
  </script>
</body>
</html>
