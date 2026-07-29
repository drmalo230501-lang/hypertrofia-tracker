function bindEvents() {
qsa('[data-route-button]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.routeButton)));
document.addEventListener('click', (event) => {
const goButton = event.target.closest('[data-go]');
if (goButton) navigate(goButton.dataset.go);
const waterButton = event.target.closest('[data-water]');
if (waterButton) addWater(safeNumber(waterButton.dataset.water));
const dayButton = event.target.closest('[data-day-status]');
if (dayButton && !dayButton.disabled) toggleRestDay(dayButton.dataset.dayStatus);
});
$('startWorkoutBtn').addEventListener('click', () => startWorkout(false));
$('copyLastWorkoutBtn').addEventListener('click', () => startWorkout(true));
$('finishWorkoutBtn').addEventListener('click', finishWorkout);
$('cancelWorkoutBtn').addEventListener('click', cancelWorkout);
$('activeSessionName').addEventListener('input', () => {
if (!state.activeSession) return;
state.activeSession.name = $('activeSessionName').value;
saveState();
});
$('sessionNotes').addEventListener('input', () => {
if (!state.activeSession) return;
state.activeSession.notes = $('sessionNotes').value;
saveState();
});
$('exerciseNameInput').addEventListener('change', applyExercisePreset);
$('exerciseNameInput').addEventListener('input', applyExercisePreset);
$('addExerciseBtn').addEventListener('click', addExercise);
$('restStartBtn').addEventListener('click', toggleRestTimer);
$('restResetBtn').addEventListener('click', resetRestTimer);
$('restTargetInput').addEventListener('change', () => {
state.settings.restTargetSeconds = clamp(Math.round(safeNumber($('restTargetInput').value, 180)), 30, 600);
state.settings.overRestSeconds = Math.max(state.settings.restTargetSeconds + 60, state.settings.restTargetSeconds * 1.5);
$('restTargetInput').value = state.settings.restTargetSeconds;
saveState();
resetRestTimer();
});
$('volumeWeekSelect').addEventListener('change', renderVolumeMuscles);
$('trendMuscleSelect').addEventListener('change', renderTrendChart);
$('historySearch').addEventListener('input', renderHistoryList);
$('progressExerciseSelect').addEventListener('change', renderExerciseProgress);
$('saveProfileBtn').addEventListener('click', saveProfile);
$('addMeasurementBtn').addEventListener('click', addMeasurement);
$('exportBtn').addEventListener('click', exportData);
$('importInput').addEventListener('change', (event) => importData(event.target.files?.[0]));
$('resetDataBtn').addEventListener('click', resetAllData);
window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));
window.addEventListener('beforeinstallprompt', (event) => {
event.preventDefault();
deferredInstallPrompt = event;
$('installBtn').classList.remove('hidden');
});
$('installBtn').addEventListener('click', async () => {
if (!deferredInstallPrompt) return;
deferredInstallPrompt.prompt();
await deferredInstallPrompt.userChoice;
deferredInstallPrompt = null;
$('installBtn').classList.add('hidden');
});
}
function renderAll() {
renderDashboard();
renderWorkout();
renderVolume();
renderHistory();
renderProfile();
navigate(location.hash.slice(1) || 'dashboard');
renderRestTimer();
}
async function registerServiceWorker() {
if (!('serviceWorker' in navigator)) return;
try {
const registration = await navigator.serviceWorker.register('./sw.js');
await registration.update();
} catch (error) {
console.warn('Service worker no disponible', error);
}
}
function init() {
migrateLegacyData();
bindEvents();
renderAll();
registerServiceWorker();
}
window.addEventListener('DOMContentLoaded', init);
