'use strict';

const STORAGE_KEY = 'hypertrofiaTrackerV2';
const CLOUD_SESSION_KEY = 'hypertrofiaCloudSession';
const APP_VERSION = 3;

const MUSCLE_GROUPS = {
  upper: ['Pecho', 'Espalda', 'Deltoide anterior', 'Deltoide lateral', 'Deltoide posterior', 'Bíceps', 'Tríceps', 'Antebrazo'],
  lower: ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Pantorrillas', 'Aductores', 'Erectores espinales'],
  core: ['Recto abdominal', 'Oblicuos', 'Erectores espinales']
};
const MUSCLES = [...new Set([...MUSCLE_GROUPS.upper, ...MUSCLE_GROUPS.lower, ...MUSCLE_GROUPS.core])];
const DEFAULT_TARGETS = {
  'Pecho': { min: 8, max: 16 }, 'Espalda': { min: 10, max: 18 },
  'Deltoide anterior': { min: 4, max: 10 }, 'Deltoide lateral': { min: 8, max: 16 },
  'Deltoide posterior': { min: 6, max: 14 }, 'Bíceps': { min: 6, max: 14 },
  'Tríceps': { min: 6, max: 14 }, 'Antebrazo': { min: 4, max: 10 },
  'Cuádriceps': { min: 8, max: 16 }, 'Isquiotibiales': { min: 6, max: 14 },
  'Glúteos': { min: 6, max: 16 }, 'Pantorrillas': { min: 8, max: 16 },
  'Aductores': { min: 4, max: 10 }, 'Recto abdominal': { min: 4, max: 12 },
  'Oblicuos': { min: 4, max: 10 }, 'Erectores espinales': { min: 4, max: 10 }
};
const MUSCLE_ICONS = {
  'Pecho': '🫸', 'Espalda': '🪽', 'Deltoide anterior': '🔺', 'Deltoide lateral': '🏹',
  'Deltoide posterior': '🔙', 'Bíceps': '💪', 'Tríceps': '🦾', 'Antebrazo': '✊',
  'Cuádriceps': '🦵', 'Isquiotibiales': '🏃', 'Glúteos': '🍑', 'Pantorrillas': '🧦',
  'Aductores': '↔️', 'Recto abdominal': '🧱', 'Oblicuos': '🔄', 'Erectores espinales': '🗼'
};
const EXERCISE_LIBRARY = [...EXERCISES_UPPER, ...EXERCISES_LOWER, ...EXERCISES_CORE];
const DEFAULT_ROUTINES = [
  { id:'default-upper-a', builtin:true, name:'Upper A', focus:'upper', exercises:['Press de banca','Jalón al pecho','Press militar','Remo en máquina','Elevaciones laterales','Curl inclinado','Extensión de tríceps en polea'] },
  { id:'default-upper-b', builtin:true, name:'Upper B', focus:'upper', exercises:['Press inclinado con mancuernas','Dominadas','Remo con barra','Reverse fly','Elevación lateral en polea','Curl martillo','Extensión sobre cabeza'] },
  { id:'default-lower-a', builtin:true, name:'Lower A', focus:'lower', exercises:['Sentadilla','Peso muerto rumano','Extensión de rodilla','Curl femoral sentado','Elevación de pantorrillas de pie','Crunch en polea'] },
  { id:'default-lower-b', builtin:true, name:'Lower B', focus:'lower', exercises:['Prensa de piernas','Hip thrust','Zancadas','Curl femoral acostado','Aductor en máquina','Elevación de pantorrillas sentado'] }
];

const $ = (id) => document.getElementById(id);
const main = $('mainContent');
const modalRoot = $('modalRoot');
let currentRoute = location.hash.replace('#/','') || 'dashboard';
let analysisTab = 'volume';
let builder = { focus:null, muscle:null, selected:[] };
let routineDraft = null;
let restTimer = { running:false, startedAt:null, elapsed:0, target:180, alerted:false };
let sessionClockId = null;
let restClockId = null;
let wakeLock = null;
let deferredInstallPrompt = null;
let cloudPushTimer = null;
let state = null;
