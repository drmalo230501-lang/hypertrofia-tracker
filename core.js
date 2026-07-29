'use strict';
const STORAGE_KEY = 'hypertrofiaTrackerV2';
const APP_VERSION = 2;
const MUSCLES = [
'Pecho', 'Espalda', 'Deltoide anterior', 'Deltoide lateral', 'Deltoide posterior',
'Bíceps', 'Tríceps', 'Antebrazo', 'Cuádriceps', 'Isquiotibiales', 'Glúteos',
'Pantorrillas', 'Aductores', 'Recto abdominal', 'Oblicuos', 'Erectores espinales'
];
const DEFAULT_TARGETS = {
'Pecho': { min: 8, max: 16 },
'Espalda': { min: 10, max: 18 },
'Deltoide anterior': { min: 4, max: 10 },
'Deltoide lateral': { min: 8, max: 16 },
'Deltoide posterior': { min: 6, max: 14 },
'Bíceps': { min: 6, max: 14 },
'Tríceps': { min: 6, max: 14 },
'Antebrazo': { min: 4, max: 10 },
'Cuádriceps': { min: 8, max: 16 },
'Isquiotibiales': { min: 6, max: 14 },
'Glúteos': { min: 6, max: 16 },
'Pantorrillas': { min: 8, max: 16 },
'Aductores': { min: 4, max: 10 },
'Recto abdominal': { min: 4, max: 12 },
'Oblicuos': { min: 4, max: 10 },
'Erectores espinales': { min: 4, max: 10 }
};
const EXERCISE_LIBRARY = [
{ name: 'Press de banca', primary: 'Pecho', secondary: ['Tríceps', 'Deltoide anterior'] },
{ name: 'Press inclinado con mancuernas', primary: 'Pecho', secondary: ['Tríceps', 'Deltoide anterior'] },
{ name: 'Aperturas en polea', primary: 'Pecho', secondary: [] },
{ name: 'Fondos', primary: 'Pecho', secondary: ['Tríceps', 'Deltoide anterior'] },
{ name: 'Dominadas', primary: 'Espalda', secondary: ['Bíceps', 'Antebrazo'] },
{ name: 'Jalón al pecho', primary: 'Espalda', secondary: ['Bíceps', 'Antebrazo'] },
{ name: 'Remo con barra', primary: 'Espalda', secondary: ['Bíceps', 'Deltoide posterior', 'Erectores espinales'] },
{ name: 'Remo en máquina', primary: 'Espalda', secondary: ['Bíceps', 'Deltoide posterior'] },
{ name: 'Pullover en polea', primary: 'Espalda', secondary: ['Tríceps'] },
{ name: 'Press militar', primary: 'Deltoide anterior', secondary: ['Tríceps', 'Deltoide lateral'] },
{ name: 'Elevaciones laterales', primary: 'Deltoide lateral', secondary: [] },
{ name: 'Pájaros / reverse fly', primary: 'Deltoide posterior', secondary: ['Espalda'] },
{ name: 'Curl con barra', primary: 'Bíceps', secondary: ['Antebrazo'] },
{ name: 'Curl inclinado', primary: 'Bíceps', secondary: ['Antebrazo'] },
{ name: 'Curl martillo', primary: 'Bíceps', secondary: ['Antebrazo'] },
{ name: 'Extensión de tríceps en polea', primary: 'Tríceps', secondary: [] },
{ name: 'Extensión de tríceps sobre cabeza', primary: 'Tríceps', secondary: [] },
{ name: 'Sentadilla', primary: 'Cuádriceps', secondary: ['Glúteos', 'Aductores', 'Erectores espinales'] },
{ name: 'Prensa de piernas', primary: 'Cuádriceps', secondary: ['Glúteos', 'Aductores'] },
{ name: 'Extensión de rodilla', primary: 'Cuádriceps', secondary: [] },
{ name: 'Peso muerto rumano', primary: 'Isquiotibiales', secondary: ['Glúteos', 'Erectores espinales'] },
{ name: 'Curl femoral', primary: 'Isquiotibiales', secondary: [] },
{ name: 'Hip thrust', primary: 'Glúteos', secondary: ['Isquiotibiales'] },
{ name: 'Zancadas', primary: 'Cuádriceps', secondary: ['Glúteos', 'Aductores'] },
{ name: 'Elevación de pantorrillas', primary: 'Pantorrillas', secondary: [] },
{ name: 'Aductor en máquina', primary: 'Aductores', secondary: [] },
{ name: 'Crunch en polea', primary: 'Recto abdominal', secondary: [] },
{ name: 'Elevación de piernas', primary: 'Recto abdominal', secondary: ['Oblicuos'] },
{ name: 'Plancha lateral', primary: 'Oblicuos', secondary: ['Recto abdominal'] },
{ name: 'Hiperextensiones', primary: 'Erectores espinales', secondary: ['Glúteos', 'Isquiotibiales'] }
];
function defaultState() {
return {
version: APP_VERSION,
profile: { name: '', sex: '', age: '', height: '', weight: '', waterGoal: 0 },
muscleTargets: structuredClone(DEFAULT_TARGETS),
sessions: [],
activeSession: null,
measurements: [],
waterHistory: {},
dayStatus: {},
settings: { restTargetSeconds: 180, overRestSeconds: 300 },
customExercises: [],
migrationCompleted: false
};
}
let state = loadState();
let sessionClockInterval = null;
let restTimerInterval = null;
let restTimerStartedAt = null;
let restTimerElapsed = 0;
let restAlertedAtTarget = false;
let restAlertedOver = false;
let deferredInstallPrompt = null;
const $ = (id) => document.getElementById(id);
const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
function uid(prefix = 'id') {
return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function safeNumber(value, fallback = 0) {
const parsed = Number(value);
return Number.isFinite(parsed) ? parsed : fallback;
}
function clamp(value, min, max) {
return Math.min(max, Math.max(min, value));
}
function dateKey(date = new Date()) {
const local = new Date(date);
const y = local.getFullYear();
const m = String(local.getMonth() + 1).padStart(2, '0');
const d = String(local.getDate()).padStart(2, '0');
return `${y}-${m}-${d}`;
}
function startOfWeek(date = new Date()) {
const result = new Date(date);
result.setHours(0, 0, 0, 0);
const day = result.getDay();
result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
return result;
}
function weekKey(date = new Date()) {
return dateKey(startOfWeek(date));
}
function addDays(date, days) {
const result = new Date(date);
result.setDate(result.getDate() + days);
return result;
}
function parseLocalDate(key) {
return new Date(`${key}T12:00:00`);
}
function formatDate(dateOrKey, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
const date = typeof dateOrKey === 'string' ? parseLocalDate(dateOrKey.slice(0, 10)) : new Date(dateOrKey);
return new Intl.DateTimeFormat('es-MX', options).format(date);
}
function formatDuration(seconds) {
const total = Math.max(0, Math.round(safeNumber(seconds)));
const h = String(Math.floor(total / 3600)).padStart(2, '0');
const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
const s = String(total % 60).padStart(2, '0');
return `${h}:${m}:${s}`;
}
function escapeHtml(value) {
return String(value ?? '')
.replaceAll('&', '&amp;')
.replaceAll('<', '&lt;')
.replaceAll('>', '&gt;')
.replaceAll('"', '&quot;')
.replaceAll("'", '&#039;');
}
function showToast(message) {
const toast = $('toast');
toast.textContent = message;
toast.classList.add('show');
clearTimeout(showToast.timer);
showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}
function normalizeState(raw) {
const base = defaultState();
if (!raw || typeof raw !== 'object') return base;
return {
...base,
...raw,
version: APP_VERSION,
profile: { ...base.profile, ...(raw.profile || {}) },
muscleTargets: { ...base.muscleTargets, ...(raw.muscleTargets || {}) },
settings: { ...base.settings, ...(raw.settings || {}) },
sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
measurements: Array.isArray(raw.measurements) ? raw.measurements : [],
customExercises: Array.isArray(raw.customExercises) ? raw.customExercises : [],
waterHistory: raw.waterHistory && typeof raw.waterHistory === 'object' ? raw.waterHistory : {},
dayStatus: raw.dayStatus && typeof raw.dayStatus === 'object' ? raw.dayStatus : {},
activeSession: raw.activeSession && typeof raw.activeSession === 'object' ? raw.activeSession : null
};
}
function loadState() {
try {
const stored = localStorage.getItem(STORAGE_KEY);
return normalizeState(stored ? JSON.parse(stored) : defaultState());
} catch (error) {
console.error('No se pudo cargar el estado', error);
return defaultState();
}
}
function saveState() {
localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function migrateLegacyData() {
if (state.migrationCompleted) return;
try {
const legacyProfile = JSON.parse(localStorage.getItem('datosPersonales') || 'null');
const legacyWater = JSON.parse(localStorage.getItem('historialAgua') || 'null');
if (legacyProfile && typeof legacyProfile === 'object') {
state.profile.name ||= legacyProfile.nombre || '';
state.profile.sex ||= legacyProfile.sexo || '';
state.profile.age ||= legacyProfile.edad || '';
state.profile.height ||= legacyProfile.altura || '';
state.profile.weight ||= legacyProfile.peso || '';
if (!state.profile.waterGoal && safeNumber(legacyProfile.peso) > 0) {
state.profile.waterGoal = Number((safeNumber(legacyProfile.peso) * 0.035).toFixed(2));
}
}
if (legacyWater && typeof legacyWater === 'object' && !Object.keys(state.waterHistory).length) {
state.waterHistory = legacyWater;
}
} catch (error) {
console.warn('Migración parcial omitida', error);
}
state.migrationCompleted = true;
saveState();
}
function getAllExercises() {
const map = new Map();
[...EXERCISE_LIBRARY, ...state.customExercises].forEach((exercise) => {
if (exercise?.name) map.set(exercise.name.toLocaleLowerCase('es'), exercise);
});
return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
function getSessionDate(session) {
return session?.date || dateKey(session?.startedAt ? new Date(session.startedAt) : new Date());
}
function getSessionsForWeek(selectedWeekKey) {
const start = parseLocalDate(selectedWeekKey);
const end = addDays(start, 7);
return state.sessions.filter((session) => {
const date = parseLocalDate(getSessionDate(session));
return date >= start && date < end;
});
}
function getWorkingSets(exercise) {
return (exercise.sets || []).filter((set) => !set.warmup && safeNumber(set.reps) > 0);
}
function calculateSessionStats(session) {
let workingSets = 0;
let hardSets = 0;
let tonnage = 0;
for (const exercise of session.exercises || []) {
for (const set of getWorkingSets(exercise)) {
workingSets += 1;
if (set.rir !== '' && set.rir !== null && safeNumber(set.rir, 99) <= 3) hardSets += 1;
tonnage += safeNumber(set.weight) * safeNumber(set.reps);
}
}
const end = session.endedAt || Date.now();
const durationSeconds = session.startedAt ? Math.max(0, Math.round((end - session.startedAt) / 1000)) : 0;
return { workingSets, hardSets, tonnage, durationSeconds };
}
function emptyMuscleVolume() {
return Object.fromEntries(MUSCLES.map((muscle) => [muscle, { direct: 0, indirect: 0, fractional: 0, hard: 0, sessions: new Set() }]));
}
function calculateMuscleVolume(sessions) {
const volume = emptyMuscleVolume();
for (const session of sessions) {
for (const exercise of session.exercises || []) {
const workSets = getWorkingSets(exercise);
const primary = MUSCLES.includes(exercise.primaryMuscle) ? exercise.primaryMuscle : null;
const secondary = Array.isArray(exercise.secondaryMuscles) ? exercise.secondaryMuscles : [];
for (const set of workSets) {
const isHard = set.rir !== '' && set.rir !== null && safeNumber(set.rir, 99) <= 3;
if (primary) {
volume[primary].direct += 1;
volume[primary].fractional += 1;
if (isHard) volume[primary].hard += 1;
volume[primary].sessions.add(session.id);
}
for (const contribution of secondary) {
const muscle = typeof contribution === 'string' ? contribution : contribution.muscle;
const factor = clamp(safeNumber(typeof contribution === 'string' ? 0.5 : contribution.factor, 0.5), 0, 1);
if (!MUSCLES.includes(muscle) || muscle === primary) continue;
volume[muscle].indirect += factor;
volume[muscle].fractional += factor;
if (isHard) volume[muscle].hard += factor;
volume[muscle].sessions.add(session.id);
}
}
}
}
for (const muscle of MUSCLES) volume[muscle].sessions = volume[muscle].sessions.size;
return volume;
}
function targetStatus(value, target) {
const min = safeNumber(target?.min, 0);
const max = Math.max(min, safeNumber(target?.max, min));
if (value < min) return { label: 'Por debajo de la meta', className: 'danger' };
if (value <= max) return { label: 'Dentro de la meta', className: 'success' };
return { label: 'Sobre la meta', className: 'warning' };
}
function navigate(route) {
const validRoute = ['dashboard', 'workout', 'volume', 'history', 'profile'].includes(route) ? route : 'dashboard';
qsa('.view').forEach((view) => view.classList.toggle('active', view.dataset.route === validRoute));
qsa('[data-route-button]').forEach((button) => button.classList.toggle('active', button.dataset.routeButton === validRoute));
if (location.hash !== `#${validRoute}`) history.replaceState(null, '', `#${validRoute}`);
if (validRoute === 'dashboard') renderDashboard();
if (validRoute === 'workout') renderWorkout();
if (validRoute === 'volume') renderVolume();
if (validRoute === 'history') renderHistory();
if (validRoute === 'profile') renderProfile();
window.scrollTo({ top: 0, behavior: 'smooth' });
}
