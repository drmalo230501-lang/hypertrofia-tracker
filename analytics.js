function availableWeekKeys() {
const keys = new Set([weekKey()]);
state.sessions.forEach((session) => keys.add(weekKey(parseLocalDate(getSessionDate(session)))));
return [...keys].sort((a, b) => b.localeCompare(a));
}
function populateWeekSelect() {
const select = $('volumeWeekSelect');
const previous = select.value || weekKey();
const keys = availableWeekKeys();
select.innerHTML = keys.map((key) => {
const monday = parseLocalDate(key);
const label = `${formatDate(monday, { day: 'numeric', month: 'short' })} – ${formatDate(addDays(monday, 6), { day: 'numeric', month: 'short', year: 'numeric' })}`;
return `<option value="${key}">${label}</option>`;
}).join('');
select.value = keys.includes(previous) ? previous : weekKey();
}
function renderVolume() {
populateWeekSelect();
populateMuscleSelects();
renderVolumeMuscles();
renderTrendChart();
}
function populateMuscleSelects() {
const options = MUSCLES.map((muscle) => `<option value="${escapeHtml(muscle)}">${escapeHtml(muscle)}</option>`).join('');
const trend = $('trendMuscleSelect');
const current = trend.value || 'Pecho';
trend.innerHTML = options;
trend.value = MUSCLES.includes(current) ? current : 'Pecho';
}
function renderVolumeMuscles() {
const key = $('volumeWeekSelect').value || weekKey();
const sessions = getSessionsForWeek(key);
const volume = calculateMuscleVolume(sessions);
$('volumeMuscleList').innerHTML = MUSCLES.map((muscle) => {
const item = volume[muscle];
const target = state.muscleTargets[muscle] || DEFAULT_TARGETS[muscle];
const status = targetStatus(item.fractional, target);
const percentage = clamp((item.fractional / Math.max(target.max, 1)) * 100, 0, 100);
return `<article class="volume-muscle-card" data-muscle="${escapeHtml(muscle)}">
<div class="volume-card-header"><strong>${escapeHtml(muscle)}</strong><span class="badge ${status.className}">${status.label}</span></div>
<div class="volume-stats">
<div class="volume-stat"><strong>${item.direct.toFixed(1)}</strong><span>Directas</span></div>
<div class="volume-stat"><strong>${item.indirect.toFixed(1)}</strong><span>Indirectas</span></div>
<div class="volume-stat"><strong>${item.hard.toFixed(1)}</strong><span>RIR 0–3</span></div>
</div>
<div class="muscle-row-header"><span>Series fraccionales</span><strong>${item.fractional.toFixed(1)}</strong></div>
<div class="progress-track"><div class="progress-fill ${status.className}" style="width:${percentage}%"></div></div>
<div class="target-editor">
<span>Meta personal:</span>
<input class="target-min" type="number" min="0" max="50" step="1" value="${target.min}" aria-label="Mínimo de ${escapeHtml(muscle)}">
<span>–</span>
<input class="target-max" type="number" min="1" max="60" step="1" value="${target.max}" aria-label="Máximo de ${escapeHtml(muscle)}">
<span>series/semana</span>
</div>
</article>`;
}).join('');
qsa('.volume-muscle-card').forEach((card) => {
const muscle = card.dataset.muscle;
const minInput = qs('.target-min', card);
const maxInput = qs('.target-max', card);
const save = () => {
const min = clamp(Math.round(safeNumber(minInput.value)), 0, 50);
const max = clamp(Math.round(safeNumber(maxInput.value)), Math.max(1, min), 60);
state.muscleTargets[muscle] = { min, max };
minInput.value = String(min);
maxInput.value = String(max);
saveState();
renderVolumeMuscles();
};
minInput.addEventListener('change', save);
maxInput.addEventListener('change', save);
});
}
function renderTrendChart() {
const muscle = $('trendMuscleSelect').value || 'Pecho';
const currentMonday = startOfWeek();
const weeks = Array.from({ length: 6 }, (_, index) => dateKey(addDays(currentMonday, (index - 5) * 7)));
const values = weeks.map((key) => calculateMuscleVolume(getSessionsForWeek(key))[muscle].fractional);
const max = Math.max(...values, state.muscleTargets[muscle]?.max || 1, 1);
$('trendChart').innerHTML = weeks.map((key, index) => {
const height = clamp((values[index] / max) * 150, 2, 150);
return `<div class="bar-column">
<div class="bar-column-value">${values[index].toFixed(1)}</div>
<div class="bar" style="height:${height}px"></div>
<div class="bar-column-label">${formatDate(key, { day: 'numeric', month: 'short' })}</div>
</div>`;
}).join('');
}
function renderHistory() {
populateProgressExerciseSelect();
renderHistoryList();
renderExerciseProgress();
}
function renderHistoryList() {
const query = $('historySearch').value.trim().toLocaleLowerCase('es');
const sessions = [...state.sessions]
.sort((a, b) => safeNumber(b.startedAt) - safeNumber(a.startedAt))
.filter((session) => !query || session.name.toLocaleLowerCase('es').includes(query) || (session.exercises || []).some((exercise) => exercise.name.toLocaleLowerCase('es').includes(query)));
if (!sessions.length) {
$('historyList').innerHTML = '<div class="empty-state"><p>No hay sesiones que coincidan.</p></div>';
return;
}
$('historyList').innerHTML = sessions.map((session) => {
const stats = calculateSessionStats(session);
const exerciseHtml = (session.exercises || []).map((exercise) => {
const sets = getWorkingSets(exercise);
return `<div class="history-exercise">
<h4>${escapeHtml(exercise.name)}</h4>
${sets.length ? sets.map((set) => `<span class="set-chip">${safeNumber(set.weight)} kg × ${safeNumber(set.reps)} · RIR ${set.rir === '' ? '—' : escapeHtml(set.rir)}</span>`).join('') : '<small>Solo calentamientos o sin series completas.</small>'}
</div>`;
}).join('');
return `<details class="history-card">
<summary class="history-card-header">
<div><h3>${escapeHtml(session.name)}</h3><p>${formatDate(getSessionDate(session))} · ${stats.workingSets} series · ${Math.round(stats.durationSeconds / 60)} min</p></div>
<span class="badge">${Math.round(stats.tonnage).toLocaleString('es-MX')} kg</span>
</summary>
<div class="history-exercises">${exerciseHtml || '<small>Sin ejercicios.</small>'}</div>
${session.notes ? `<p class="info-box">${escapeHtml(session.notes)}</p>` : ''}
<div class="button-row"><button class="danger-button delete-session" type="button" data-session-id="${session.id}">Eliminar sesión</button></div>
</details>`;
}).join('');
qsa('.delete-session').forEach((button) => button.addEventListener('click', () => deleteSession(button.dataset.sessionId)));
}
function deleteSession(sessionId) {
const session = state.sessions.find((item) => item.id === sessionId);
if (!session || !confirm(`Eliminar permanentemente “${session.name}”?`)) return;
state.sessions = state.sessions.filter((item) => item.id !== sessionId);
saveState();
renderHistory();
showToast('Sesión eliminada');
}
function populateProgressExerciseSelect() {
const names = [...new Set(state.sessions.flatMap((session) => (session.exercises || []).map((exercise) => exercise.name.trim())).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
const select = $('progressExerciseSelect');
const previous = select.value;
select.innerHTML = names.length ? names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('') : '<option value="">Sin ejercicios</option>';
if (names.includes(previous)) select.value = previous;
}
function estimatedOneRepMax(weight, reps) {
const w = safeNumber(weight);
const r = safeNumber(reps);
if (w <= 0 || r <= 0) return 0;
return w * (1 + r / 30);
}
function renderExerciseProgress() {
const name = $('progressExerciseSelect').value;
if (!name) {
$('exerciseProgress').innerHTML = '<div class="empty-state"><p>Registra ejercicios para analizar progresión.</p></div>';
return;
}
const performances = [];
state.sessions.forEach((session) => {
(session.exercises || []).filter((exercise) => exercise.name === name).forEach((exercise) => {
const sets = getWorkingSets(exercise);
if (!sets.length) return;
const bestSet = [...sets].sort((a, b) => estimatedOneRepMax(b.weight, b.reps) - estimatedOneRepMax(a.weight, a.reps))[0];
performances.push({
date: getSessionDate(session),
bestSet,
e1rm: estimatedOneRepMax(bestSet.weight, bestSet.reps),
tonnage: sets.reduce((sum, set) => sum + safeNumber(set.weight) * safeNumber(set.reps), 0),
reps: sets.reduce((sum, set) => sum + safeNumber(set.reps), 0),
sets: sets.length
});
});
});
performances.sort((a, b) => a.date.localeCompare(b.date));
if (!performances.length) {
$('exerciseProgress').innerHTML = '<div class="empty-state"><p>Este ejercicio todavía no tiene series de trabajo completas.</p></div>';
return;
}
const latest = performances.at(-1);
const best = [...performances].sort((a, b) => b.e1rm - a.e1rm)[0];
const previous = performances.at(-2);
const change = previous?.e1rm ? ((latest.e1rm - previous.e1rm) / previous.e1rm) * 100 : 0;
$('exerciseProgress').innerHTML = `
<div class="analysis-grid">
<div class="analysis-item"><strong>${safeNumber(latest.bestSet.weight)} kg × ${safeNumber(latest.bestSet.reps)}</strong><span>Última mejor serie</span></div>
<div class="analysis-item"><strong>${best.e1rm.toFixed(1)} kg</strong><span>Mejor e1RM estimado</span></div>
<div class="analysis-item"><strong>${latest.tonnage.toLocaleString('es-MX')} kg</strong><span>Volumen de última sesión</span></div>
<div class="analysis-item"><strong>${previous ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : '—'}</strong><span>Cambio vs. sesión previa</span></div>
</div>
<div class="info-box">${getProgressSuggestion(latest, previous)}</div>
<div class="bar-chart">${performances.slice(-8).map((item) => {
const max = Math.max(...performances.slice(-8).map((entry) => entry.e1rm), 1);
return `<div class="bar-column"><div class="bar-column-value">${item.e1rm.toFixed(0)}</div><div class="bar" style="height:${clamp((item.e1rm / max) * 140, 2, 140)}px"></div><div class="bar-column-label">${formatDate(item.date, { day: 'numeric', month: 'short' })}</div></div>`;
}).join('')}</div>`;
}
function getProgressSuggestion(latest, previous) {
if (!previous) return 'Continúa registrando este ejercicio. Con dos o más sesiones la app puede comparar el rendimiento.';
if (latest.e1rm > previous.e1rm * 1.02) return 'Hay una mejora clara del rendimiento estimado. Mantén la técnica y considera progresar gradualmente.';
if (latest.e1rm < previous.e1rm * 0.95) return 'El rendimiento bajó de forma relevante. Revisa fatiga, descanso, técnica y proximidad al fallo antes de aumentar carga.';
return 'El rendimiento está estable. Busca añadir una repetición, mejorar el RIR con la misma carga o aumentar el peso de forma pequeña.';
}
function renderProfile() {
$('profileName').value = state.profile.name;
$('profileSex').value = state.profile.sex;
$('profileAge').value = state.profile.age;
$('profileHeight').value = state.profile.height;
$('profileWeight').value = state.profile.weight;
$('profileWaterGoal').value = state.profile.waterGoal || getWaterGoal() || '';
$('measureDate').value ||= dateKey();
renderMeasurements();
}
function saveProfile() {
state.profile = {
name: $('profileName').value.trim(),
sex: $('profileSex').value.trim(),
age: $('profileAge').value,
height: $('profileHeight').value,
weight: $('profileWeight').value,
waterGoal: safeNumber($('profileWaterGoal').value)
};
if (!state.profile.waterGoal && safeNumber(state.profile.weight) > 0) {
state.profile.waterGoal = Number((safeNumber(state.profile.weight) * 0.035).toFixed(2));
$('profileWaterGoal').value = state.profile.waterGoal;
}
saveState();
showToast('Perfil guardado');
}
function addMeasurement() {
const measurement = {
id: uid('measurement'),
date: $('measureDate').value || dateKey(),
weight: $('measureWeight').value,
chest: $('measureChest').value,
arm: $('measureArm').value,
waist: $('measureWaist').value,
thigh: $('measureThigh').value
};
if (![measurement.weight, measurement.chest, measurement.arm, measurement.waist, measurement.thigh].some((value) => safeNumber(value) > 0)) {
showToast('Registra al menos una medida');
return;
}
state.measurements.push(measurement);
if (safeNumber(measurement.weight) > 0) state.profile.weight = measurement.weight;
saveState();
['measureWeight', 'measureChest', 'measureArm', 'measureWaist', 'measureThigh'].forEach((id) => $(id).value = '');
renderMeasurements();
showToast('Medición guardada');
}
function renderMeasurements() {
const items = [...state.measurements].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
$('measurementHistory').innerHTML = items.length ? items.map((item) => {
const values = [
item.weight && `Peso ${item.weight} kg`, item.chest && `Pecho ${item.chest} cm`, item.arm && `Brazo ${item.arm} cm`,
item.waist && `Cintura ${item.waist} cm`, item.thigh && `Muslo ${item.thigh} cm`
].filter(Boolean);
return `<div class="measurement-card"><div><strong>${formatDate(item.date)}</strong><div class="measurement-values">${values.map((value) => `<span class="set-chip">${escapeHtml(value)}</span>`).join('')}</div></div><button class="icon-button danger-ghost delete-measurement" data-id="${item.id}" type="button">✕</button></div>`;
}).join('') : '<small>Sin mediciones registradas.</small>';
qsa('.delete-measurement').forEach((button) => button.addEventListener('click', () => {
state.measurements = state.measurements.filter((item) => item.id !== button.dataset.id);
saveState();
renderMeasurements();
}));
}
function exportData() {
const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), app: 'Hypertrofia Tracker', data: state }, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const anchor = document.createElement('a');
anchor.href = url;
anchor.download = `hypertrofia-tracker-backup-${dateKey()}.json`;
anchor.click();
URL.revokeObjectURL(url);
showToast('Respaldo exportado');
}
async function importData(file) {
if (!file) return;
try {
const parsed = JSON.parse(await file.text());
const imported = parsed.data || parsed;
if (!imported || typeof imported !== 'object' || !Array.isArray(imported.sessions)) throw new Error('Formato inválido');
if (!confirm('La importación reemplazará los datos actuales. ¿Continuar?')) return;
state = normalizeState(imported);
saveState();
renderAll();
showToast('Respaldo importado');
} catch (error) {
console.error(error);
showToast('No se pudo importar el archivo');
} finally {
$('importInput').value = '';
}
}
function resetAllData() {
if (!confirm('Se borrarán entrenamientos, mediciones, agua y configuración de este dispositivo. Esta acción no se puede deshacer.')) return;
localStorage.removeItem(STORAGE_KEY);
state = defaultState();
saveState();
stopSessionClock();
resetRestTimer();
renderAll();
showToast('Datos borrados');
}
