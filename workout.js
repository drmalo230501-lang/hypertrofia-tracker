function renderDashboard() {
const currentWeek = weekKey();
const sessions = getSessionsForWeek(currentWeek);
const stats = sessions.reduce((acc, session) => {
const sessionStats = calculateSessionStats(session);
acc.hardSets += sessionStats.hardSets;
acc.tonnage += sessionStats.tonnage;
acc.duration += sessionStats.durationSeconds;
return acc;
}, { hardSets: 0, tonnage: 0, duration: 0 });
const volume = calculateMuscleVolume(sessions);
const name = state.profile.name.trim();
$('dashboardGreeting').innerHTML = `
<p class="eyebrow">${formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }).toLocaleUpperCase('es-MX')}</p>
<h2>${name ? `Hola, ${escapeHtml(name)}` : 'Tu progreso empieza con datos útiles'}</h2>
<p>${state.activeSession ? 'Tienes una sesión activa. Continúa registrando tus series para mantener el volumen semanal actualizado.' : 'Registra cada serie de trabajo con peso, repeticiones y RIR para evaluar volumen y progresión.'}</p>
<div class="button-row">
<button class="primary-button" type="button" data-go="workout">${state.activeSession ? 'Continuar entrenamiento' : 'Iniciar entrenamiento'}</button>
</div>`;
$('metricSessions').textContent = String(sessions.length);
$('metricHardSets').textContent = stats.hardSets.toFixed(stats.hardSets % 1 ? 1 : 0);
$('metricTonnage').textContent = `${Math.round(stats.tonnage).toLocaleString('es-MX')} kg`;
$('metricDuration').textContent = `${Math.round(stats.duration / 60)} min`;
const monday = parseLocalDate(currentWeek);
$('weekRange').textContent = `${formatDate(monday, { day: 'numeric', month: 'short' })}–${formatDate(addDays(monday, 6), { day: 'numeric', month: 'short' })}`;
const today = dateKey();
$('weekStrip').innerHTML = Array.from({ length: 7 }, (_, index) => {
const day = addDays(monday, index);
const key = dateKey(day);
const count = sessions.filter((session) => getSessionDate(session) === key).length;
const isRest = !count && state.dayStatus[key] === 'rest';
return `<button type="button" class="week-day ${key === today ? 'today' : ''} ${count ? 'trained' : ''} ${isRest ? 'rested' : ''}" data-day-status="${key}" ${count ? 'disabled' : ''}>
<span>${formatDate(day, { weekday: 'short' }).replace('.', '')}</span>
<strong>${day.getDate()}</strong>
<span>${count ? '🏋️' : (isRest ? '🛏️' : '—')}</span>
</button>`;
}).join('');
const priorityMuscles = MUSCLES
.map((muscle) => ({ muscle, ...volume[muscle], target: state.muscleTargets[muscle] || DEFAULT_TARGETS[muscle] }))
.sort((a, b) => {
const aRatio = a.target.min ? a.fractional / a.target.min : 0;
const bRatio = b.target.min ? b.fractional / b.target.min : 0;
return aRatio - bRatio;
})
.slice(0, 5);
$('dashboardMuscles').innerHTML = priorityMuscles.map((item) => {
const status = targetStatus(item.fractional, item.target);
const percentage = clamp((item.fractional / Math.max(item.target.max, 1)) * 100, 0, 100);
return `<div class="muscle-row">
<div class="muscle-row-header"><strong>${escapeHtml(item.muscle)}</strong><span>${item.fractional.toFixed(1)} / ${item.target.min}–${item.target.max}</span></div>
<div class="progress-track"><div class="progress-fill ${status.className}" style="width:${percentage}%"></div></div>
</div>`;
}).join('');
const goal = getWaterGoal();
const water = safeNumber(state.waterHistory[dateKey()]);
$('waterTodayLabel').textContent = `${water.toFixed(2)} / ${goal.toFixed(2)} L`;
$('waterProgress').style.width = `${goal > 0 ? clamp((water / goal) * 100, 0, 100) : 0}%`;
$('waterProgress').className = `progress-fill ${goal > 0 && water >= goal ? 'success' : ''}`;
}
function getWaterGoal() {
const manual = safeNumber(state.profile.waterGoal);
if (manual > 0) return manual;
const weight = safeNumber(state.profile.weight);
return weight > 0 ? Number((weight * 0.035).toFixed(2)) : 0;
}
function toggleRestDay(key) {
if (state.dayStatus[key] === 'rest') delete state.dayStatus[key];
else state.dayStatus[key] = 'rest';
saveState();
renderDashboard();
showToast(state.dayStatus[key] === 'rest' ? 'Día de descanso marcado' : 'Estado del día eliminado');
}
function addWater(amount) {
const key = dateKey();
state.waterHistory[key] = Number((safeNumber(state.waterHistory[key]) + amount).toFixed(2));
saveState();
renderDashboard();
showToast('Agua registrada');
}
function createSession(name = '') {
return {
id: uid('session'),
name: name.trim() || `Entrenamiento ${formatDate(new Date(), { day: '2-digit', month: 'short' })}`,
date: dateKey(),
startedAt: Date.now(),
endedAt: null,
notes: '',
exercises: []
};
}
function startWorkout(copyLast = false) {
if (state.activeSession) {
navigate('workout');
return;
}
const requestedName = $('newSessionName').value;
const session = createSession(requestedName);
if (copyLast && state.sessions.length) {
const last = [...state.sessions].sort((a, b) => safeNumber(b.startedAt) - safeNumber(a.startedAt))[0];
session.name = requestedName.trim() || `${last.name} — copia`;
session.exercises = (last.exercises || []).map((exercise) => ({
id: uid('exercise'),
name: exercise.name,
primaryMuscle: exercise.primaryMuscle,
secondaryMuscles: (exercise.secondaryMuscles || []).map((item) => typeof item === 'string' ? { muscle: item, factor: 0.5 } : { ...item }),
sets: []
}));
}
state.activeSession = session;
saveState();
renderWorkout();
showToast('Entrenamiento iniciado');
}
function finishWorkout() {
if (!state.activeSession) return;
const stats = calculateSessionStats(state.activeSession);
if (stats.workingSets === 0 && !confirm('No hay series de trabajo registradas. ¿Deseas finalizar de todos modos?')) return;
state.activeSession.endedAt = Date.now();
state.activeSession.name = $('activeSessionName').value.trim() || state.activeSession.name;
state.activeSession.notes = $('sessionNotes').value;
state.sessions.push(structuredClone(state.activeSession));
state.activeSession = null;
stopSessionClock();
resetRestTimer();
saveState();
renderWorkout();
showToast('Entrenamiento guardado');
}
function cancelWorkout() {
if (!state.activeSession) return;
if (!confirm('Se eliminará la sesión activa y sus series. ¿Continuar?')) return;
state.activeSession = null;
stopSessionClock();
resetRestTimer();
saveState();
renderWorkout();
showToast('Sesión cancelada');
}
function renderWorkout() {
const active = Boolean(state.activeSession);
$('noActiveWorkout').classList.toggle('hidden', active);
$('activeWorkout').classList.toggle('hidden', !active);
populateExerciseControls();
if (!active) {
stopSessionClock();
return;
}
$('activeSessionName').value = state.activeSession.name || '';
$('sessionNotes').value = state.activeSession.notes || '';
$('restTargetInput').value = String(state.settings.restTargetSeconds || 180);
renderExerciseList();
startSessionClock();
}
function populateExerciseControls() {
const suggestions = $('exerciseSuggestions');
suggestions.innerHTML = getAllExercises().map((exercise) => `<option value="${escapeHtml(exercise.name)}"></option>`).join('');
const options = MUSCLES.map((muscle) => `<option value="${escapeHtml(muscle)}">${escapeHtml(muscle)}</option>`).join('');
$('primaryMuscleSelect').innerHTML = options;
$('secondaryMusclesSelect').innerHTML = options;
}
function applyExercisePreset() {
const name = $('exerciseNameInput').value.trim();
const preset = getAllExercises().find((exercise) => exercise.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'));
if (!preset) return;
$('primaryMuscleSelect').value = preset.primary;
qsa('option', $('secondaryMusclesSelect')).forEach((option) => option.selected = (preset.secondary || []).includes(option.value));
}
function addExercise() {
if (!state.activeSession) return;
const name = $('exerciseNameInput').value.trim();
const primaryMuscle = $('primaryMuscleSelect').value;
const secondaryFactor = safeNumber($('secondaryFactorSelect').value, 0.5);
const secondaryMuscles = qsa('option:checked', $('secondaryMusclesSelect'))
.map((option) => option.value)
.filter((muscle) => muscle !== primaryMuscle)
.map((muscle) => ({ muscle, factor: secondaryFactor }));
if (!name) {
showToast('Escribe el nombre del ejercicio');
return;
}
state.activeSession.exercises.push({ id: uid('exercise'), name, primaryMuscle, secondaryMuscles, sets: [] });
if (!getAllExercises().some((exercise) => exercise.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) {
state.customExercises.push({ name, primary: primaryMuscle, secondary: secondaryMuscles.map((item) => item.muscle) });
}
$('exerciseNameInput').value = '';
qsa('option', $('secondaryMusclesSelect')).forEach((option) => option.selected = false);
saveState();
renderExerciseList();
showToast('Ejercicio agregado');
}
function renderExerciseList() {
const container = $('exerciseList');
container.innerHTML = '';
if (!state.activeSession.exercises.length) {
container.innerHTML = '<div class="empty-state"><p>Aún no hay ejercicios. Agrégalos abajo y registra cada serie.</p></div>';
return;
}
const template = $('exerciseCardTemplate');
state.activeSession.exercises.forEach((exercise, exerciseIndex) => {
const fragment = template.content.cloneNode(true);
const card = qs('.exercise-card', fragment);
card.dataset.exerciseId = exercise.id;
const title = qs('.exercise-title-input', fragment);
title.value = exercise.name;
title.addEventListener('input', () => {
exercise.name = title.value;
saveState();
});
const secondaryText = (exercise.secondaryMuscles || []).map((item) => `${item.muscle} ×${safeNumber(item.factor, 0.5)}`).join(', ');
qs('.exercise-muscle-label', fragment).textContent = `Principal: ${exercise.primaryMuscle}${secondaryText ? ` · Secundarios: ${secondaryText}` : ''}`;
qs('.remove-exercise', fragment).addEventListener('click', () => removeExercise(exerciseIndex));
qs('.add-set', fragment).addEventListener('click', () => addSet(exerciseIndex, false));
qs('.copy-last-set', fragment).addEventListener('click', () => addSet(exerciseIndex, true));
const tbody = qs('tbody', fragment);
exercise.sets.forEach((set, setIndex) => tbody.appendChild(createSetRow(exerciseIndex, setIndex, set)));
container.appendChild(fragment);
});
}
function createSetRow(exerciseIndex, setIndex, set) {
const row = document.createElement('tr');
row.innerHTML = `
<td>${setIndex + 1}</td>
<td><input type="number" min="0" step="0.5" inputmode="decimal" aria-label="Peso de la serie ${setIndex + 1}" value="${escapeHtml(set.weight)}"></td>
<td><input type="number" min="0" max="100" step="1" inputmode="numeric" aria-label="Repeticiones de la serie ${setIndex + 1}" value="${escapeHtml(set.reps)}"></td>
<td><input type="number" min="0" max="10" step="1" inputmode="numeric" aria-label="RIR de la serie ${setIndex + 1}" value="${escapeHtml(set.rir)}"></td>
<td><input type="checkbox" aria-label="Serie de calentamiento" ${set.warmup ? 'checked' : ''}></td>
<td><button class="icon-button danger-ghost remove-set" type="button" aria-label="Eliminar serie">✕</button></td>`;
const inputs = qsa('input', row);
inputs[0].addEventListener('input', () => updateSet(exerciseIndex, setIndex, 'weight', inputs[0].value));
inputs[1].addEventListener('input', () => updateSet(exerciseIndex, setIndex, 'reps', inputs[1].value));
inputs[2].addEventListener('input', () => updateSet(exerciseIndex, setIndex, 'rir', inputs[2].value));
inputs[3].addEventListener('change', () => updateSet(exerciseIndex, setIndex, 'warmup', inputs[3].checked));
qs('.remove-set', row).addEventListener('click', () => removeSet(exerciseIndex, setIndex));
return row;
}
function addSet(exerciseIndex, copyLast) {
const exercise = state.activeSession?.exercises[exerciseIndex];
if (!exercise) return;
const last = exercise.sets.at(-1);
exercise.sets.push(copyLast && last
? { id: uid('set'), weight: last.weight, reps: last.reps, rir: last.rir, warmup: last.warmup, restSeconds: 0 }
: { id: uid('set'), weight: '', reps: '', rir: 2, warmup: false, restSeconds: 0 });
saveState();
renderExerciseList();
}
function updateSet(exerciseIndex, setIndex, field, value) {
const set = state.activeSession?.exercises[exerciseIndex]?.sets[setIndex];
if (!set) return;
set[field] = field === 'warmup' ? Boolean(value) : value;
saveState();
}
function removeSet(exerciseIndex, setIndex) {
state.activeSession?.exercises[exerciseIndex]?.sets.splice(setIndex, 1);
saveState();
renderExerciseList();
}
function removeExercise(exerciseIndex) {
const exercise = state.activeSession?.exercises[exerciseIndex];
if (!exercise || !confirm(`Eliminar ${exercise.name} y todas sus series?`)) return;
state.activeSession.exercises.splice(exerciseIndex, 1);
saveState();
renderExerciseList();
}
function startSessionClock() {
stopSessionClock();
const update = () => {
if (!state.activeSession) return;
$('sessionClock').textContent = formatDuration((Date.now() - state.activeSession.startedAt) / 1000);
};
update();
sessionClockInterval = setInterval(update, 1000);
}
function stopSessionClock() {
if (sessionClockInterval) clearInterval(sessionClockInterval);
sessionClockInterval = null;
}
function getRestSeconds() {
return restTimerElapsed + (restTimerStartedAt ? Math.floor((Date.now() - restTimerStartedAt) / 1000) : 0);
}
function renderRestTimer() {
const target = clamp(safeNumber(state.settings.restTargetSeconds, 180), 30, 600);
const elapsed = getRestSeconds();
const remaining = Math.max(0, target - elapsed);
$('restTimerLabel').textContent = formatDuration(remaining).slice(3);
const status = $('restTimerStatus');
if (!restTimerStartedAt && elapsed === 0) {
status.textContent = 'Listo';
status.className = 'badge neutral';
} else if (elapsed < target) {
status.textContent = 'Descansando';
status.className = 'badge neutral';
} else if (elapsed < state.settings.overRestSeconds) {
status.textContent = 'Serie lista';
status.className = 'badge success';
} else {
status.textContent = 'Descanso prolongado';
status.className = 'badge warning';
}
$('restStartBtn').textContent = restTimerStartedAt ? 'Pausar' : (elapsed ? 'Continuar' : 'Iniciar');
if (elapsed >= target && !restAlertedAtTarget) {
restAlertedAtTarget = true;
inAppAlert();
}
if (elapsed >= state.settings.overRestSeconds && !restAlertedOver) {
restAlertedOver = true;
inAppAlert([120, 80, 120]);
}
}
function toggleRestTimer() {
if (restTimerStartedAt) {
restTimerElapsed = getRestSeconds();
restTimerStartedAt = null;
clearInterval(restTimerInterval);
restTimerInterval = null;
} else {
restTimerStartedAt = Date.now();
clearInterval(restTimerInterval);
restTimerInterval = setInterval(renderRestTimer, 500);
}
renderRestTimer();
}
function resetRestTimer() {
restTimerElapsed = 0;
restTimerStartedAt = null;
restAlertedAtTarget = false;
restAlertedOver = false;
clearInterval(restTimerInterval);
restTimerInterval = null;
if ($('restTimerLabel')) renderRestTimer();
}
function inAppAlert(pattern = [160]) {
if (navigator.vibrate) navigator.vibrate(pattern);
try {
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
if (!AudioContextClass) return;
const context = new AudioContextClass();
const oscillator = context.createOscillator();
const gain = context.createGain();
oscillator.frequency.value = 740;
gain.gain.setValueAtTime(0.08, context.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22);
oscillator.connect(gain).connect(context.destination);
oscillator.start();
oscillator.stop(context.currentTime + 0.23);
} catch (_) {}
}
