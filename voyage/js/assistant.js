// assistant.js — Interface de chat avec le service IA (ia-irlande.rochane.fr).
// Aucune clé API ici : le serveur porte la clé, le navigateur ne fait qu'envoyer la question.

const API_URL = 'https://ia-irlande.rochane.fr/chat';
const STORAGE_KEY = 'irlande-assistant-conversation';
const MAX_HISTORY = 12;   // derniers messages transmis au service, comme côté serveur
const TIMEOUT_MS = 70000;

const SUGGESTIONS = [
  'Que fait-on le 10 août ?',
  'Où dort-on à Galway ?',
  'Combien a-t-on dépensé ?',
  'Quels usages connaître dans un pub irlandais ?'
];

const log = document.getElementById('chat-log');
const form = document.getElementById('composer');
const input = document.getElementById('input');
const btnSend = document.getElementById('btn-send');
const btnClear = document.getElementById('btn-clear');
const btnGeo = document.getElementById('btn-geo');

// Position transmise à l'assistant. Éteint par défaut : la permission n'est
// demandée qu'au premier appui, jamais à l'ouverture de l'onglet.
let geoActif = false;

const GEO_OPTIONS = { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 };

function positionActuelle() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      GEO_OPTIONS
    );
  });
}

function setGeo(actif) {
  geoActif = actif;
  btnGeo.setAttribute('aria-pressed', actif ? 'true' : 'false');
}

btnGeo.addEventListener('click', async () => {
  if (busy) return;
  if (geoActif) { setGeo(false); return; }

  btnGeo.disabled = true;
  const p = await positionActuelle();
  btnGeo.disabled = false;

  if (p) {
    setGeo(true);
  } else {
    setGeo(false);
    addBubble('error',
      "Position indisponible. Autorisez la localisation dans votre navigateur, " +
      "ou continuez : les réponses partiront de votre hôtel.");
  }
});

let conversation = loadConversation();
let busy = false;

// ─── Persistance dans la session ────────────────────────────────────────────
function loadConversation() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(m =>
      m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
    );
  } catch (e) {
    return []; // session illisible ou stockage refusé : on repart d'une conversation vide
  }
}

function saveConversation() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(conversation));
  } catch (e) {
    // Stockage indisponible (navigation privée, quota) : la conversation reste en mémoire.
  }
}

// ─── Rendu ──────────────────────────────────────────────────────────────────
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// Le modèle renvoie souvent du **gras** : on le rend, tout le reste est échappé.
function renderText(text) {
  return escapeHTML(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function addBubble(role, text) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = renderText(text);
  log.appendChild(div);
  scrollToBottom();
  return div;
}

function scrollToBottom() {
  requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'msg bot typing';
  div.id = 'typing';
  div.setAttribute('aria-label', 'L’assistant rédige sa réponse');
  div.innerHTML = '<span></span><span></span><span></span>';
  log.appendChild(div);
  scrollToBottom();
  return div;
}

function renderIntro() {
  const wrap = document.createElement('div');
  wrap.className = 'intro';
  wrap.id = 'intro';

  const h2 = document.createElement('h2');
  h2.textContent = 'Votre compagnon de voyage';
  const p = document.createElement('p');
  p.textContent = 'Posez une question sur votre séjour ou sur l’Irlande en général.';

  const box = document.createElement('div');
  box.className = 'suggestions';
  SUGGESTIONS.forEach(s => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = s;
    b.addEventListener('click', () => send(s));
    box.appendChild(b);
  });

  wrap.append(h2, p, box);
  log.appendChild(wrap);
}

function removeIntro() {
  document.getElementById('intro')?.remove();
}

function renderAll() {
  log.innerHTML = '';
  if (!conversation.length) {
    renderIntro();
  } else {
    conversation.forEach(m => addBubble(m.role === 'user' ? 'user' : 'bot', m.content));
  }
  btnClear.disabled = !conversation.length;
}

// ─── Envoi ──────────────────────────────────────────────────────────────────
function setBusy(state) {
  busy = state;
  btnSend.disabled = state;
  input.disabled = state;
}

async function send(rawText) {
  const text = (rawText ?? input.value).trim();
  if (!text || busy) return;

  removeIntro();
  addBubble('user', text);

  // L'historique transmis est celui d'AVANT ce message : le serveur ajoute la question.
  const history = conversation.slice(-MAX_HISTORY);
  conversation.push({ role: 'user', content: text });
  saveConversation();

  input.value = '';
  autoGrow();
  setBusy(true);
  btnClear.disabled = false;
  const typing = showTyping();

  // Position rafraîchie à chaque envoi : sur une journée de route, une position
  // figée du matin serait pire que pas de position du tout. Un échec ne bloque
  // pas l'envoi, le serveur retombe sur l'hôtel de la nuit.
  let position = null;
  if (geoActif) {
    position = await positionActuelle();
    if (!position) {
      setGeo(false);
      addBubble('error', "Position introuvable, la réponse partira de votre hôtel.");
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(position ? { message: text, history, position } : { message: text, history }),
      signal: controller.signal
    });

    // Le service renvoie un « reply » lisible même sur erreur ; on l'utilise s'il existe.
    const data = await resp.json().catch(() => null);
    typing.remove();

    if (data && typeof data.reply === 'string' && data.reply.trim()) {
      const reply = data.reply.trim();
      if (resp.ok) {
        addBubble('bot', reply);
        conversation.push({ role: 'assistant', content: reply });
        saveConversation();
      } else {
        addBubble('error', reply);
      }
    } else if (resp.ok) {
      addBubble('error', "L’assistant n’a rien répondu. Reformulez votre question.");
    } else {
      addBubble('error', "L’assistant n’est pas joignable pour le moment. Réessayez dans un instant.");
    }
  } catch (e) {
    typing.remove();
    if (e.name === 'AbortError') {
      addBubble('error', "La réponse met trop de temps à arriver. Réessayez.");
    } else {
      addBubble('error',
        "Impossible de joindre l’assistant. Vérifiez votre connexion internet, puis réessayez.");
    }
  } finally {
    clearTimeout(timer);
    setBusy(false);
    scrollToBottom();
    if (!rawText) input.focus();
  }
}

// ─── Saisie ─────────────────────────────────────────────────────────────────
function autoGrow() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
}

input.addEventListener('input', autoGrow);

// Sur écran tactile, Entrée insère un retour à la ligne : on envoie avec le bouton.
const isTouch = window.matchMedia('(pointer: coarse)').matches;
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !isTouch) {
    e.preventDefault();
    send();
  }
});

form.addEventListener('submit', e => {
  e.preventDefault();
  send();
});

btnClear.addEventListener('click', () => {
  if (busy) return;
  if (conversation.length && !confirm('Effacer toute la conversation ?')) return;
  conversation = [];
  saveConversation();
  renderAll();
  input.focus();
});

renderAll();
scrollToBottom();
