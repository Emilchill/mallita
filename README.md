# Malla UTESA — Proyecto Estudiantil Independiente

Herramienta web para que estudiantes de UTESA lleven el seguimiento visual de su
avance en el pensum de **Ingeniería Eléctrica (IEL)**, **Ingeniería Industrial (IID)**
e **Ingeniería en Sistemas Computacionales (ISC)** (Resolución No. 104-22, enero 2023).

> ⚠️ **Este proyecto NO es oficial de UTESA.** Es una herramienta hecha por y para
> estudiantes. Los datos del pensum pueden contener errores de transcripción —
> siempre verifica tu avance real con tu coordinación de carrera.

## Estructura de archivos

```
malla-utesa/
├── index.html          → Login / registro
├── profile.html         → Configuración inicial (nombre, carrera, tema)
├── dashboard.html        → Malla interactiva + progreso
├── css/
│   └── style.css         → 6 temas de color + todos los componentes
├── js/
│   ├── firebase-config.js → Conexión a Firebase (Auth + Firestore)
│   ├── pensums-data.js    → Datos de los 3 pensums (IEL, IID, ISC)
│   ├── theme.js            → Lógica de los 6 temas y su persistencia
│   └── dashboard.js        → Lógica de la malla, progreso, búsqueda y filtros
└── README.md
```

## Cómo funciona

1. **index.html** — El estudiante inicia sesión o crea una cuenta (correo + contraseña
   vía Firebase Authentication). Mensajes de error explícitos para cada caso
   (correo inválido, contraseña incorrecta, cuenta ya existente, etc.).
2. **profile.html** — Solo la primera vez: el estudiante escribe su nombre, elige su
   carrera (se listan automáticamente desde `pensums-data.js`) y elige uno de los
   6 temas de color.
3. **dashboard.html** — Muestra la malla completa dividida por cuatrimestre. Cada
   materia es una tarjeta que se puede marcar como aprobada. El sistema:
   - Calcula el **% de avance real** basado en créditos completados.
   - **Bloquea visualmente** materias cuyos prerrequisitos aún no se han
     aprobado (se detectan automáticamente a partir de la columna de
     prerrequisitos de cada pensum).
   - Permite **buscar** por nombre o clave, y **filtrar** por aprobadas /
     pendientes / electivas.
   - Guarda todo en Firestore (`users/{uid}`) para que el progreso persista
     entre dispositivos.

## Los 6 temas de color

| Tema | Estilo |
|---|---|
| UTESA Clásico | Verde institucional + dorado, fondo claro |
| Medianoche | Modo oscuro azulado |
| Atardecer | Naranja cálido, fondo crema |
| Océano | Verde azulado, fondo claro |
| Violeta Nocturno | Morado sobre fondo oscuro |
| Coral | Rosado/coral, fondo claro |

El tema elegido se guarda en `localStorage` (para verse instantáneamente, incluso
antes de iniciar sesión) **y** en el documento del usuario en Firestore, así que
si el estudiante abre la app en otro dispositivo, su tema lo sigue.

## Configuración de Firebase requerida

El archivo `js/firebase-config.js` ya incluye las credenciales del proyecto
Firebase que estabas usando. Antes de publicar esto para uso real de otros
estudiantes, configura las **reglas de seguridad de Firestore** para que cada
usuario solo pueda leer y escribir su propio documento:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Y habilita el método **Correo/Contraseña** en Firebase Authentication si aún no
está activo.

## Añadir o corregir materias

Todo el contenido académico vive en `js/pensums-data.js`. Cada materia sigue el
formato:

```js
m("CLAVE", "Nombre de la materia", HT, HP, TH, créditos, "prerrequisitos")
```

Para agregar un cuatrimestre nuevo o corregir un dato, solo edita ese archivo —
el resto de la aplicación (progreso, bloqueo por prerrequisitos, búsqueda) se
actualiza automáticamente.
