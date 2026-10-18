// script.js
// Aquí están las funciones que llama index.html.
// Instrucciones: Pega el snippet de Firebase (la configuración que te da Firebase)
// EN index.html justo arriba de la línea <script src="script.js"></script>
// (ver más abajo el fragmento exacto de HTML a pegar).

// Carga las librerías compatibles (versión CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCJiTtVq5IIu6ucWC-_4jufmUtmaeIdV8Y",
  authDomain: "wolfy-weapon-battles.firebaseapp.com",
  projectId: "wolfy-weapon-battles",
  storageBucket: "wolfy-weapon-battles.firebasestorage.app",
  messagingSenderId: "305506151175",
  appId: "1:305506151175:web:f3b217ab0b9faee5c8b3a2",
  measurementId: "G-Q5Q5SWH0E8"
};

// 1. Inicializas la App
const app = initializeApp(firebaseConfig);

// 2. Inicializas Firestore pasando la 'app'
export const db = getFirestore(app);

// A partir de aquí ya puedes llamar a tu base de datos o auth, por ejemplo:
// import { getFirestore } from "firebase/firestore";
// const db = getFirestore(app);

/* -------------------------
   Utils / DOM
   ------------------------- */
const el = id => document.getElementById(id);
const screens = {
  login: el('login-screen'),
  menu: el('server-menu'),
  game: el('game-screen')
};
const displayNameSpan = el('display-name');
const statusMsg = el('status-msg');
const currentServerSpan = el('current-server-id');

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
  screens[name].classList.add('active');
}

/* -------------------------
   Simple local storage helpers
   ------------------------- */
function saveLocalUser(name) {
  localStorage.setItem('ww_username', name);
}
function getLocalUser() {
  return localStorage.getItem('ww_username') || null;
}

/* -------------------------
   Status helper
   ------------------------- */
function setStatus(msg, timeout = 5000) {
  if (!statusMsg) return;
  statusMsg.textContent = msg || '';
  if (timeout) {
    clearTimeout(setStatus._t);
    setStatus._t = setTimeout(() => { statusMsg.textContent = ''; }, timeout);
  }
}

/* -------------------------
   Firebase availability check
   ------------------------- */
function hasFirebase() {
  // This checks for the compat/global firebase object.
  return (typeof window.firebase !== 'undefined') && firebase.apps !== undefined;
}

/* -------------------------
   Account / Navigation
   ------------------------- */
function createAccount() {
  const input = el('username-input');
  const name = input && input.value && input.value.trim();
  if (!name) {
    setStatus('Pon un nombre de lobo válido.');
    return;
  }
  saveLocalUser(name);
  displayNameSpan.textContent = name;
  showScreen('menu');
  setStatus('Cuenta creada / sesión iniciada.');
}

(function initFromLocal() {
  const name = getLocalUser();
  if (name) {
    displayNameSpan.textContent = name;
    showScreen('menu');
  } else {
    showScreen('login');
  }
})();

/* -------------------------
   Room / Game helpers
   ------------------------- */
function makeRoomCode(length = 6) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // evitar ambigüedades
  let code = '';
  for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function createPrivateRoom() {
  const owner = getLocalUser();
  if (!owner) { setStatus('Primero crea una cuenta.'); return; }

  const code = makeRoomCode();
  setStatus(`Creando sala ${code}...`);

  if (hasFirebase()) {
    try {
      // Usamos Firestore (compat). Ajusta colección/estructura según tu diseño.
      const db = firebase.firestore();
      const roomRef = db.collection('rooms').doc(code);
      const snap = await roomRef.get();
      if (snap.exists) {
        setStatus('Choque de código, reintentando...');
        return createPrivateRoom();
      }
      await roomRef.set({
        code,
        owner,
        players: [owner],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setStatus(`Sala creada: ${code}`);
      enterGame(code);
    } catch (err) {
      console.error('Error creando sala en Firebase:', err);
      setStatus('Error al crear sala en Firebase. Revisa la consola.');
    }
  } else {
    // Fallback local (sin Firebase) — simula creación y va a pantalla de juego
    setStatus(`(Local) Sala creada: ${code}`);
    enterGame(code);
  }
}

async function joinWithCode() {
  const code = (el('room-code-input').value || '').trim().toUpperCase();
  if (!code) { setStatus('Introduce un código de sala.'); return; }
  const player = getLocalUser();
  if (!player) { setStatus('Primero crea una cuenta.'); return; }

  setStatus(`Buscando sala ${code}...`);
  if (hasFirebase()) {
    try {
      const db = firebase.firestore();
      const roomRef = db.collection('rooms').doc(code);
      const snap = await roomRef.get();
      if (!snap.exists) {
        setStatus('Sala no encontrada.');
        return;
      }
      // Añadir jugador (evitar duplicados)
      const room = snap.data();
      const players = room.players || [];
      if (!players.includes(player)) {
        players.push(player);
        await roomRef.update({ players });
      }
      setStatus(`Unido a ${code}`);
      enterGame(code);
    } catch (err) {
      console.error('Error uniendo a sala en Firebase:', err);
      setStatus('Error al unirse en Firebase. Revisa la consola.');
    }
  } else {
    // Fallback local
    setStatus(`(Local) Unido a ${code}`);
    enterGame(code);
  }
}

async function joinRandomServer() {
  // Estrategia simple: crear una sala nueva como "random" y entrar.
  // En un diseño real podrías buscar salas con hueco y unirte.
  setStatus('Buscando servidor random...');
  await createPrivateRoom();
}

function enterGame(code) {
  currentServerSpan.textContent = code;
  showScreen('game');
}

function leaveGame() {
  showScreen('menu');
  setStatus('Saliste de la partida.');
}

/* -------------------------
   Expose functions used by HTML inline onclicks
   ------------------------- */
window.createAccount = createAccount;
window.joinRandomServer = joinRandomServer;
window.createPrivateRoom = createPrivateRoom;
window.joinWithCode = joinWithCode;
window.leaveGame = leaveGame;

/* -------------------------
   Debug / info
   ------------------------- */
if (!hasFirebase()) {
  console.warn('Firebase no inicializado. Para usar Firebase, pega el snippet de inicialización en index.html antes de cargar script.js.');
  // Si quieres, puedes habilitar un botón o UI extra para mostrar instrucciones.
}
