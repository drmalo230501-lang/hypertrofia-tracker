'use strict';

/*
 * Hypertrofia Tracker v3.1
 * Flujo dinámico: selección múltiple de músculos, ejercicios agrupados,
 * sesiones retroactivas y tarjetas colapsables.
 */

const V31_INDIRECT_SET_FACTOR = 0.5;
let v31Picker = null;

normalizeSecondary = function(items = []) {
  const seen = new Set();
  return items
    .map((item) => Array.isArray(item) ? item[0] : (typeof item === 'string' ? item : item?.muscle))
    .filter((muscle) => MUSCLES.includes(muscle))
    .filter((muscle) => {
      if (seen.has(muscle)) return false;
      seen.add(muscle);
      return true;
    })
    .map((muscle) => ({ muscle, factor: V31_INDIRECT_SET_FACTOR }));
};

planFromExercise = function(exercise) {
  return {
    id: uid('plan'),
    name: exercise.name,
    icon: exercise.icon || '🏋️',
    primaryMuscle: exercise.primary,
    secondaryMuscles: normalizeSecondary(exercise.secondary),
    equipment: exercise.equipment || 'Otro',
    setsTarget: 3,
    repMin: exercise.rep?.[0] || 8,
    repMax: exercise.rep?.[1] || 12,
    targetRir: 2,
    restSeconds: exercise.rest || 120,
    increment: exercise.increment ?? 2.5
  };
};

openModal = function(content) {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal><section class="modal">${content}</section></div>`;
};

closeModal = function() {
  modalRoot.innerHTML = '';
  routineDraft = null;
  v31Picker = null;
};

function v31YesterdayKey() {
  return dateKey(addDays(new Date(), -1));
}

function v31EnsureBuilder() {
  if (!builder || builder.v31 !== true) {
    builder = {
      v31: true,
      purpose: 'session',
      routineId: null,
      routineName: '',
      focus: null,
      muscles: [],
      plans: [],
      mode: 'live',
      date: v31YesterdayKey(),
      durationMinutes: 60
    };
  }
  builder.muscles ||= [];
  builder.plans ||= [];
  builder.mode ||= 'live';
  builder.date ||= v31YesterdayKey();
  builder.durationMinutes ||= 60;
  builder.purpose ||= 'session';
  return builder;
}

function v31ResetBuilder(options = {}) {
  builder = {
    v31: true,
    purpose: options.purpose || 'session',
    routineId: options.routineId || null,
    routineName: options.routineName || '',
    focus: options.focus || null,
    muscles: options.muscles || [],
    plans: options.plans || [],
    mode: options.mode || 'live',
    date: options.date || v31YesterdayKey(),
    durationMinutes: options.durationMinutes || 60
  };
}

function v31MusclesForFocus(focus) {
  if (focus === 'upper') return [...MUSCLE_GROUPS.upper];
  if (focus === 'lower') return [...MUSCLE_GROUPS.lower, ...MUSCLE_GROUPS.core.filter((m) => !MUSCLE_GROUPS.lower.includes(m))];
  if (focus === 'full') return [...MUSCLES];
  return [...MUSCLES];
}

function v31FocusLabel(focus) {
  return focus === 'upper' ? 'Upper body'
    : focus === 'lower' ? 'Lower body'
    : focus === 'full' ? 'Full body'
    : 'Sesión libre';
}

function v31PlanSelected(name) {
  return v31EnsureBuilder().plans.some((plan) => plan.name === name);
}

function v31ContributionText(exerciseOrPlan) {
  const primary = exerciseOrPlan.primaryMuscle || exerciseOrPlan.primary;
  const secondary = normalizeSecondary(exerciseOrPlan.secondaryMuscles || exerciseOrPlan.secondary || []);
  const parts = [`${primary} +1`];
  secondary.filter((item) => item.muscle !== primary).forEach((item) => parts.push(`${item.muscle} +0.5`));
  return parts.join(' · ');
}

function v31RenderModeSwitch() {
  const b = v31EnsureBuilder();
  if (b.purpose !== 'session') return '';
  return `<article class="panel v31-mode-card">
    <div class="panel-heading">
      <div><p class="eyebrow">CUÁNDO</p><h2>${b.mode === 'past' ? 'Registrar un entrenamiento pasado' : 'Entrenar ahora'}</h2></div>
    </div>
    <div class="v31-segmented">
      <button class="${b.mode === 'live' ? 'active' : ''}" data-v31-action="set-mode" data-mode="live">Hoy</button>
      <button class="${b.mode === 'past' ? 'active' : ''}" data-v31-action="set-mode" data-mode="past">Otro día</button>
    </div>
    ${b.mode === 'past' ? `<div class="form-grid two v31-past-fields">
      <label>Fecha<input id="v31PastDate" type="date" value="${escapeHtml(b.date)}" max="${dateKey()}"></label>
      <label>Duración aproximada<input id="v31PastDuration" type="number" min="5" max="360" step="5" value="${num(b.durationMinutes, 60)}"><span>minutos</span></label>
    </div>` : ''}
  </article>`;
}

function v31RenderFocusChoices() {
  const b = v31EnsureBuilder();
  const options = [
    ['upper', '💪', 'Upper', 'Pecho, espalda, hombros y brazos'],
    ['lower', '🦵', 'Lower', 'Piernas, glúteos, pantorrilla y core'],
    ['full', '🧍', 'Full body', 'Combina todo el cuerpo'],
    ['free', '✨', 'Libre', 'Elige cualquier músculo']
  ];
  return `<article class="panel">
    <div class="panel-heading">
      <div><p class="eyebrow">${b.purpose === 'session' ? 'EMPIEZA EN 2 TOQUES' : 'NUEVA RUTINA'}</p><h2>¿Qué quieres trabajar?</h2></div>
    </div>
    <div class="v31-start-grid">
      ${options.map(([id, icon, title, desc]) => `<button class="v31-focus-card ${b.focus === id ? 'selected' : ''}" data-v31-focus="${id}">
        <span>${icon}</span><strong>${title}</strong><small>${desc}</small>
      </button>`).join('')}
    </div>
  </article>`;
}

function v31RenderMuscleSelector() {
  const b = v31EnsureBuilder();
  if (!b.focus) return '';
  const muscles = v31MusclesForFocus(b.focus);
  return `<article class="panel">
    <div class="panel-heading">
      <div><p class="eyebrow">ELIGE VARIOS</p><h2>Músculos de la sesión</h2><p class="muted">Puedes marcar todos los que entrenarás hoy.</p></div>
      <span class="badge">${b.muscles.length} seleccionados</span>
    </div>
    <div class="v31-muscle-grid">
      ${muscles.map((muscle) => `<button class="v31-muscle-chip ${b.muscles.includes(muscle) ? 'selected' : ''}" data-v31-muscle="${escapeHtml(muscle)}">
        <span>${MUSCLE_ICONS[muscle] || '•'}</span><strong>${escapeHtml(muscle)}</strong>
      </button>`).join('')}
    </div>
  </article>`;
}

function v31RenderExerciseTile(exercise) {
  const selected = v31PlanSelected(exercise.name);
  return `<button class="v31-exercise-tile ${selected ? 'selected' : ''}" data-v31-exercise="${escapeHtml(exercise.name)}">
    <span class="v31-exercise-icon">${exercise.icon || '🏋️'}</span>
    <span class="v31-exercise-copy">
      <strong>${escapeHtml(exercise.name)}</strong>
      <small>${escapeHtml(exercise.equipment || '')}</small>
      <em>${escapeHtml(v31ContributionText(exercise))}</em>
    </span>
    <span class="v31-check">${selected ? '✓' : '+'}</span>
  </button>`;
}

function v31RenderExerciseGroups() {
  const b = v31EnsureBuilder();
  if (!b.muscles.length) return '';
  return `<section class="v31-muscle-sections">
    ${b.muscles.map((muscle, index) => {
      const exercises = getAllExercises().filter((exercise) => exercise.primary === muscle);
      const selectedCount = b.plans.filter((plan) => plan.primaryMuscle === muscle).length;
      return `<details class="v31-muscle-section panel" ${index < 2 || selectedCount ? 'open' : ''}>
        <summary>
          <span><b>${MUSCLE_ICONS[muscle] || '•'} ${escapeHtml(muscle)}</b><small>${selectedCount ? `${selectedCount} elegidos` : 'Toca para desplegar ejercicios'}</small></span>
          <span class="v31-chevron">⌄</span>
        </summary>
        <div class="v31-exercise-grid">
          ${exercises.map(v31RenderExerciseTile).join('')}
          <button class="v31-exercise-tile custom" data-v31-action="custom-exercise" data-muscle="${escapeHtml(muscle)}">
            <span class="v31-exercise-icon">✍️</span>
            <span class="v31-exercise-copy"><strong>No está en la lista</strong><small>Crear ejercicio personalizado</small></span>
            <span class="v31-check">+</span>
          </button>
        </div>
      </details>`;
    }).join('')}
  </section>`;
}

function v31RenderPlanSettings(plan, index) {
  return `<details class="v31-plan-settings">
    <summary><span>${plan.icon || '🏋️'} <b>${escapeHtml(plan.name)}</b></span><span>${plan.setsTarget}×${plan.repMin}–${plan.repMax}</span></summary>
    <div class="form-grid three">
      <label>Series<input data-v31-plan-field="setsTarget" data-plan-index="${index}" type="number" min="1" max="10" value="${num(plan.setsTarget, 3)}"></label>
      <label>Reps mín.<input data-v31-plan-field="repMin" data-plan-index="${index}" type="number" min="1" max="50" value="${num(plan.repMin, 8)}"></label>
      <label>Reps máx.<input data-v31-plan-field="repMax" data-plan-index="${index}" type="number" min="1" max="100" value="${num(plan.repMax, 12)}"></label>
      <label>RIR<input data-v31-plan-field="targetRir" data-plan-index="${index}" type="number" min="0" max="5" value="${num(plan.targetRir, 2)}"></label>
      <label>Descanso<input data-v31-plan-field="restSeconds" data-plan-index="${index}" type="number" min="30" max="600" step="15" value="${num(plan.restSeconds, 120)}"></label>
      <label>Subida kg<input data-v31-plan-field="increment" data-plan-index="${index}" type="number" min="0" max="25" step=".5" value="${num(plan.increment, 2.5)}"></label>
    </div>
    <p class="v31-evidence-line">Conteo automático: ${escapeHtml(v31ContributionText(plan))}</p>
    <button class="ghost-button full-width" data-v31-action="remove-plan" data-plan-index="${index}">Quitar ejercicio</button>
  </details>`;
}

function v31RenderSelectedPlans() {
  const b = v31EnsureBuilder();
  if (!b.plans.length) return '';
  return `<article class="panel v31-selected-panel">
    <div class="panel-heading">
      <div><p class="eyebrow">TU SELECCIÓN</p><h2>${b.plans.length} ejercicios</h2><p class="muted">Los ajustes tienen valores recomendados; solo ábrelos si quieres cambiarlos.</p></div>
    </div>
    ${b.purpose !== 'session' ? `<label>Nombre de la rutina<input id="v31RoutineName" value="${escapeHtml(b.routineName || `${v31FocusLabel(b.focus)} personalizada`)}" placeholder="Ej. Upper A"></label>` : ''}
    <div class="v31-selected-list">${b.plans.map(v31RenderPlanSettings).join('')}</div>
  </article>`;
}

function v31RenderStickyAction() {
  const b = v31EnsureBuilder();
  if (!b.plans.length) return '';
  const totalSets = b.plans.reduce((sum, plan) => sum + num(plan.setsTarget, 3), 0);
  return `<div class="v31-sticky-action">
    <div><strong>${b.plans.length} ejercicios</strong><small>${totalSets} series planeadas</small></div>
    <button class="primary-button" data-v31-action="${b.purpose === 'session' ? 'start-session' : 'save-routine'}">
      ${b.purpose === 'session' ? (b.mode === 'past' ? 'Registrar sesión' : 'Empezar') : 'Guardar rutina'}
    </button>
  </div>`;
}

function v31RenderSavedRoutines() {
  if (!state.routines.length) return '';
  const b = v31EnsureBuilder();
  return `<details class="panel v31-library-section">
    <summary><span><b>Rutinas guardadas</b><small>Empieza sin crear nada</small></span><span>⌄</span></summary>
    <div class="v31-routine-list">
      ${state.routines.map((routine) => `<article class="v31-routine-row">
        <div><strong>${escapeHtml(routine.name)}</strong><small>${routine.exercises.length} ejercicios · ${routine.exercises.reduce((sum, plan) => sum + num(plan.setsTarget, 3), 0)} series</small></div>
        <button class="small-button" data-v31-start-routine="${routine.id}">${b.mode === 'past' ? 'Registrar' : 'Iniciar'}</button>
      </article>`).join('')}
    </div>
  </details>`;
}

function v31RenderRecentSessions() {
  const sessions = [...state.sessions].sort((a, b) => num(b.startedAt) - num(a.startedAt)).slice(0, 5);
  if (!sessions.length) return '';
  return `<details class="panel v31-library-section">
    <summary><span><b>Copiar una sesión anterior</b><small>Reutiliza sus ejercicios</small></span><span>⌄</span></summary>
    <div class="v31-routine-list">
      ${sessions.map((session) => `<article class="v31-routine-row">
        <div><strong>${escapeHtml(session.name)}</strong><small>${formatDate(session.date)} · ${(session.exercises || []).length} ejercicios</small></div>
        <button class="small-button" data-v31-copy-session="${session.id}">Copiar</button>
      </article>`).join('')}
    </div>
  </details>`;
}

renderWorkout = function() {
  if (state.activeSession) {
    renderActiveWorkout();
    return;
  }
  const b = v31EnsureBuilder();
  main.innerHTML = `
    <section class="hero-card v31-hero">
      <p class="eyebrow">${b.purpose === 'session' ? 'ENTRENA SIN PERDER TIEMPO' : 'CONSTRUCTOR VISUAL'}</p>
      <h2>${b.purpose === 'session' ? 'Arma tu sesión en menos de un minuto' : (b.routineId ? 'Edita tu rutina' : 'Crea una rutina sencilla')}</h2>
      <p>Selecciona varios músculos, despliega sus ejercicios y marca lo que vas a hacer.</p>
      ${b.purpose !== 'session' ? '<button class="ghost-button" data-v31-action="cancel-routine-builder">Cancelar</button>' : ''}
    </section>
    ${v31RenderModeSwitch()}
    ${v31RenderFocusChoices()}
    ${v31RenderMuscleSelector()}
    ${v31RenderExerciseGroups()}
    ${v31RenderSelectedPlans()}
    ${b.purpose === 'session' ? v31RenderSavedRoutines() + v31RenderRecentSessions() : ''}
    ${v31RenderStickyAction()}
  `;
};

createSessionFromPlans = function(name, plans, routineId = null, options = {}) {
  const activeMeso = state.mesocycles.find((mesocycle) =>
    mesocycle.id === state.activeMesocycleId &&
    !mesocycle.completed &&
    (!routineId || mesocycle.routineIds.includes(routineId))
  );
  const isBackdated = options.mode === 'past';
  const sessionDate = isBackdated ? options.date : dateKey();
  const startedAt = isBackdated
    ? new Date(`${sessionDate}T18:00:00`).getTime()
    : Date.now();
  return {
    id: uid('session'),
    name,
    date: sessionDate,
    startedAt,
    endedAt: null,
    backdated: isBackdated,
    durationMinutes: num(options.durationMinutes, 60),
    routineId,
    mesocycleId: activeMeso?.id || null,
    mesocycleWeek: activeMeso?.currentWeek || null,
    readiness: isBackdated ? readinessFor(sessionDate) : readinessFor(),
    notes: '',
    exercises: plans.map((rawPlan, index) => {
      const plan = structuredClone(rawPlan);
      return {
        id: uid('exercise'),
        name: plan.name,
        icon: plan.icon || '🏋️',
        primaryMuscle: plan.primaryMuscle,
        secondaryMuscles: normalizeSecondary(plan.secondaryMuscles),
        equipment: plan.equipment || '',
        uiOpen: index === 0,
        plan: {
          setsTarget: num(plan.setsTarget, 3),
          repMin: num(plan.repMin, 8),
          repMax: num(plan.repMax, 12),
          targetRir: num(plan.targetRir, 2),
          restSeconds: num(plan.restSeconds, 120),
          increment: num(plan.increment, 2.5)
        },
        sets: []
      };
    })
  };
};

function v31StartPlans(plans, name, routineId = null) {
  const b = v31EnsureBuilder();
  if (!plans.length) {
    showToast('Selecciona al menos un ejercicio');
    return;
  }
  state.activeSession = createSessionFromPlans(name, plans, routineId, {
    mode: b.mode,
    date: b.date,
    durationMinutes: b.durationMinutes
  });
  saveState();
  requestWakeLock();
  v31ResetBuilder();
  navigate('workout');
}

function v31StartBuilderSession() {
  const b = v31EnsureBuilder();
  const muscles = [...new Set(b.plans.map((plan) => plan.primaryMuscle))];
  const name = `${v31FocusLabel(b.focus)} · ${muscles.slice(0, 3).join(' + ')}${muscles.length > 3 ? '…' : ''}`;
  v31StartPlans(b.plans, name);
}

function v31StartRoutine(id) {
  const routine = state.routines.find((item) => item.id === id);
  if (!routine) return;
  v31StartPlans(routine.exercises.map((plan) => structuredClone(plan)), routine.name, routine.id);
}

function v31CopySession(id) {
  const session = state.sessions.find((item) => item.id === id);
  if (!session) return;
  const plans = (session.exercises || []).map((exercise) => ({
    id: uid('plan'),
    name: exercise.name,
    icon: exercise.icon || '🏋️',
    primaryMuscle: exercise.primaryMuscle,
    secondaryMuscles: normalizeSecondary(exercise.secondaryMuscles),
    equipment: exercise.equipment || '',
    setsTarget: num(exercise.plan?.setsTarget, Math.max(workingSets(exercise).length, 3)),
    repMin: num(exercise.plan?.repMin, 8),
    repMax: num(exercise.plan?.repMax, 12),
    targetRir: num(exercise.plan?.targetRir, 2),
    restSeconds: num(exercise.plan?.restSeconds, 120),
    increment: num(exercise.plan?.increment, 2.5)
  }));
  v31StartPlans(plans, `${session.name} — copia`);
}

function v31LoadRoutineBuilder(routine = null) {
  if (!routine) {
    v31ResetBuilder({ purpose: 'routine', routineName: 'Nueva rutina' });
  } else {
    const plans = routine.exercises.map((plan) => ({
      ...structuredClone(plan),
      secondaryMuscles: normalizeSecondary(plan.secondaryMuscles)
    }));
    v31ResetBuilder({
      purpose: 'routine',
      routineId: routine.builtin ? null : routine.id,
      routineName: routine.builtin ? `${routine.name} personalizada` : routine.name,
      focus: routine.focus,
      muscles: [...new Set(plans.map((plan) => plan.primaryMuscle))],
      plans
    });
  }
  navigate('workout');
}

function v31SaveRoutine() {
  const b = v31EnsureBuilder();
  if (!b.plans.length) {
    showToast('Selecciona ejercicios');
    return;
  }
  const routine = {
    id: b.routineId || uid('routine'),
    name: (b.routineName || `${v31FocusLabel(b.focus)} personalizada`).trim(),
    focus: b.focus || 'full',
    builtin: false,
    exercises: b.plans.map((plan) => ({
      ...structuredClone(plan),
      secondaryMuscles: normalizeSecondary(plan.secondaryMuscles)
    }))
  };
  const index = state.routines.findIndex((item) => item.id === routine.id);
  if (index >= 0) state.routines[index] = routine;
  else state.routines.push(routine);
  saveState();
  v31ResetBuilder();
  showToast('Rutina guardada');
  navigate('routines');
}

renderRoutines = function() {
  const active = state.mesocycles.find((mesocycle) => mesocycle.id === state.activeMesocycleId);
  main.innerHTML = `
    <section class="hero-card v31-hero">
      <p class="eyebrow">RUTINAS SIMPLES</p>
      <h2>Guarda tus combinaciones favoritas</h2>
      <p>Elige varios músculos y ejercicios con el mismo constructor visual del entrenamiento.</p>
      <div class="button-row"><button class="primary-button" data-v31-action="new-routine">Crear rutina</button><button class="ghost-button" data-action="new-mesocycle">Nuevo mesociclo</button></div>
    </section>
    ${active ? renderActiveMesocycle(active) : ''}
    <section class="v31-routines-page">
      ${state.routines.map((routine) => `<details class="panel v31-routine-accordion">
        <summary>
          <span><b>${escapeHtml(routine.name)}</b><small>${routine.exercises.length} ejercicios · ${routine.exercises.reduce((sum, plan) => sum + num(plan.setsTarget, 3), 0)} series</small></span>
          <span>⌄</span>
        </summary>
        <div class="v31-routine-exercises">
          ${routine.exercises.map((plan) => `<div><span>${plan.icon || '🏋️'}</span><p><b>${escapeHtml(plan.name)}</b><small>${plan.setsTarget}×${plan.repMin}–${plan.repMax} · ${escapeHtml(v31ContributionText(plan))}</small></p></div>`).join('')}
        </div>
        <div class="button-row">
          <button class="primary-button" data-v31-start-routine="${routine.id}">Iniciar</button>
          <button class="ghost-button" data-v31-edit-routine="${routine.id}">${routine.builtin ? 'Personalizar copia' : 'Editar'}</button>
          ${routine.builtin ? '' : `<button class="danger-button" data-v31-delete-routine="${routine.id}">Eliminar</button>`}
        </div>
      </details>`).join('')}
    </section>
  `;
};

function v31LastPerformanceText(exercise) {
  const previous = performanceForExercise(exercise.name)[0];
  if (!previous) return 'Primera vez';
  return previous.sets.map((set) => `${num(set.weight) || 'PC'}×${num(set.reps)} @${set.rir}`).join(' · ');
}

function v31RenderActiveExercise(exercise, index) {
  const plan = exercise.plan || {};
  const done = workingSets(exercise).length;
  const suggestion = progressionSuggestion({ ...plan, name: exercise.name });
  const sessionLast = (exercise.sets || []).at(-1);
  const suggestedWeight = sessionLast?.weight ?? suggestion.weight ?? '';
  const isOpen = exercise.uiOpen !== false;
  return `<article class="exercise-card v31-active-exercise ${isOpen ? 'open' : ''}" data-exercise-index="${index}">
    <header class="v31-active-header">
      <button class="v31-exercise-toggle" data-v31-action="toggle-active-exercise" data-index="${index}">
        <span class="v31-exercise-icon">${exercise.icon || '🏋️'}</span>
        <span><strong>${escapeHtml(exercise.name)}</strong><small>${done}/${num(plan.setsTarget, 3)} series · ${escapeHtml(exercise.primaryMuscle)}</small></span>
        <span class="v31-chevron">${isOpen ? '⌃' : '⌄'}</span>
      </button>
      <div class="v31-header-actions">
        <button class="icon-button" data-action="move-exercise-up" title="Subir">↑</button>
        <button class="icon-button" data-action="remove-exercise" title="Eliminar">✕</button>
      </div>
    </header>
    <div class="exercise-card-body ${isOpen ? '' : 'hidden'}">
      <div class="v31-plan-strip">
        <span>${plan.setsTarget || 3} series</span><span>${plan.repMin || 8}–${plan.repMax || 12} reps</span><span>RIR ${plan.targetRir ?? 2}</span><span>${plan.restSeconds || 120}s</span>
      </div>
      <p class="v31-evidence-line">Volumen automático: ${escapeHtml(v31ContributionText(exercise))}</p>
      <details class="v31-previous">
        <summary>Ver sesión anterior y sugerencia</summary>
        <div class="last-performance"><strong>Última vez:</strong> ${escapeHtml(v31LastPerformanceText(exercise))}</div>
        <div class="progression-card"><strong>${escapeHtml(suggestion.action)}</strong><br><small>${escapeHtml(suggestion.label)}</small></div>
      </details>
      <div class="v31-set-entry">
        <label><span>Peso</span><input class="quick-weight" type="number" min="0" step=".5" inputmode="decimal" value="${escapeHtml(suggestedWeight)}"><small>kg</small></label>
        <label><span>Reps</span><input class="quick-reps" type="number" min="1" max="100" inputmode="numeric" placeholder="${plan.repMin || 8}–${plan.repMax || 12}"></label>
      </div>
      <div class="v31-rir-block"><small>¿Cuántas repeticiones te quedaban?</small><div class="rir-picker">${[0, 1, 2, 3, 4, 5].map((value) => `<button type="button" data-rir="${value}" class="${value === num(plan.targetRir, 2) ? 'active' : ''}">${value === 5 ? '5+' : value}</button>`).join('')}</div></div>
      <button class="primary-button full-width v31-complete-set" data-action="complete-set">✓ Guardar serie</button>
      <div class="button-row">
        <button class="ghost-button" data-action="complete-warmup">Guardar calentamiento</button>
        <button class="ghost-button" data-action="plate-calculator">Calcular discos</button>
        <button class="ghost-button" data-action="substitute-exercise">Cambiar ejercicio</button>
      </div>
      <details class="v31-set-log" ${(exercise.sets || []).length <= 2 ? 'open' : ''}>
        <summary>Series registradas (${(exercise.sets || []).length})</summary>
        <div class="set-history">${(exercise.sets || []).map((set, setIndex) => `<div class="set-row ${set.warmup ? 'warmup' : ''}">
          <span class="set-number">${setIndex + 1}</span>
          <span><strong>${num(set.weight) || 'PC'} kg × ${num(set.reps)}</strong> · RIR ${set.rir}${set.warmup ? ' · calentamiento' : ''}</span>
          <button class="icon-button" data-action="remove-set" data-set-index="${setIndex}">✕</button>
        </div>`).join('')}</div>
      </details>
    </div>
  </article>`;
}

renderActiveWorkout = function() {
  const session = state.activeSession;
  const stats = sessionStats(session);
  main.innerHTML = `
    <section class="workout-toolbar v31-workout-toolbar">
      <div class="v31-session-heading">
        <div><p class="eyebrow">${session.backdated ? 'REGISTRO PASADO' : 'SESIÓN ACTIVA'}</p><input id="activeSessionName" value="${escapeHtml(session.name)}" aria-label="Nombre de la sesión"></div>
        <div class="v31-session-actions"><strong id="sessionClock" class="session-clock">${session.backdated ? formatDate(session.date) : formatDuration((Date.now() - session.startedAt) / 1000)}</strong><button class="primary-button" data-action="finish-workout">Finalizar</button></div>
      </div>
      ${session.backdated ? `<div class="form-grid two v31-backdated-fields"><label>Fecha<input id="v31ActiveDate" type="date" value="${escapeHtml(session.date)}" max="${dateKey()}"></label><label>Duración<input id="v31ActiveDuration" type="number" min="5" max="360" step="5" value="${num(session.durationMinutes, 60)}"><span>min</span></label></div>` : ''}
      <div class="v31-session-stats"><span>${stats.working} series</span><span>${stats.hard} cerca del fallo</span><span>${Math.round(stats.tonnage).toLocaleString('es-MX')} kg</span></div>
      <div class="button-row"><button class="ghost-button" data-v31-action="open-multi-picker">+ Añadir ejercicios</button><button class="danger-button" data-action="cancel-workout">Cancelar</button></div>
    </section>
    <section class="exercise-list">${session.exercises.map(v31RenderActiveExercise).join('')}</section>
    <details class="panel v31-notes"><summary>Notas de la sesión</summary><textarea id="sessionNotes" placeholder="Técnica, molestias, energía...">${escapeHtml(session.notes || '')}</textarea></details>
  `;
  if (!session.backdated) startSessionClock();
  else stopSessionClock();
};

completeSet = function(card, warmup = false) {
  const index = num(card?.dataset.exerciseIndex);
  const exercise = state.activeSession?.exercises[index];
  if (!exercise) return;
  const weight = card.querySelector('.quick-weight')?.value ?? '';
  const reps = card.querySelector('.quick-reps')?.value ?? '';
  const rir = card.querySelector('[data-rir].active')?.dataset.rir ?? exercise.plan?.targetRir ?? 2;
  if (num(reps) <= 0) {
    showToast('Escribe las repeticiones');
    return;
  }
  exercise.sets.push({
    id: uid('set'),
    weight,
    reps,
    rir,
    warmup,
    restSeconds: exercise.plan?.restSeconds || state.settings.restTargetSeconds,
    completedAt: Date.now()
  });
  exercise.uiOpen = true;
  saveState();
  if (!warmup && !state.activeSession.backdated && state.settings.autoRest) {
    startRest(exercise.plan?.restSeconds || state.settings.restTargetSeconds);
  }
  render();
};

finishWorkout = function() {
  const session = state.activeSession;
  if (!session) return;
  const stats = sessionStats(session);
  if (!stats.working && !confirm('No hay series de trabajo. ¿Finalizar de todos modos?')) return;
  session.name = $('activeSessionName')?.value.trim() || session.name;
  session.notes = $('sessionNotes')?.value || '';
  if (session.backdated) {
    session.date = $('v31ActiveDate')?.value || session.date;
    session.durationMinutes = num($('v31ActiveDuration')?.value, session.durationMinutes || 60);
    session.startedAt = new Date(`${session.date}T18:00:00`).getTime();
    session.endedAt = session.startedAt + session.durationMinutes * 60_000;
  } else {
    session.endedAt = Date.now();
  }
  state.sessions.push(structuredClone(session));
  state.activeSession = null;
  saveState();
  stopSessionClock();
  stopRest();
  releaseWakeLock();
  showToast('Entrenamiento guardado');
  navigate('dashboard');
};

function v31OpenExercisePicker(target = 'active', focus = 'free') {
  v31Picker = { target, focus, muscles: [], plans: [] };
  v31RenderPicker();
}

function v31RenderPicker() {
  if (!v31Picker) return;
  const muscles = v31MusclesForFocus(v31Picker.focus);
  openModal(`<header class="modal-header"><div><p class="eyebrow">AÑADIR EJERCICIOS</p><h2>Elige varios a la vez</h2></div><button class="icon-button" data-v31-action="close-modal">✕</button></header>
    <p class="muted">Primero marca uno o varios músculos.</p>
    <div class="v31-muscle-grid">${muscles.map((muscle) => `<button class="v31-muscle-chip ${v31Picker.muscles.includes(muscle) ? 'selected' : ''}" data-v31-picker-muscle="${escapeHtml(muscle)}"><span>${MUSCLE_ICONS[muscle] || '•'}</span><strong>${escapeHtml(muscle)}</strong></button>`).join('')}</div>
    <div class="v31-muscle-sections">${v31Picker.muscles.map((muscle) => `<details class="v31-muscle-section panel" open><summary><span><b>${MUSCLE_ICONS[muscle] || '•'} ${escapeHtml(muscle)}</b></span><span>⌄</span></summary><div class="v31-exercise-grid">${getAllExercises().filter((exercise) => exercise.primary === muscle).map((exercise) => {
      const selected = v31Picker.plans.some((plan) => plan.name === exercise.name);
      return `<button class="v31-exercise-tile ${selected ? 'selected' : ''}" data-v31-picker-exercise="${escapeHtml(exercise.name)}">${v31RenderExerciseTile(exercise).replace(/^<button[^>]*>|<\/button>$/g, '')}</button>`;
    }).join('')}</div></details>`).join('')}</div>
    ${v31Picker.target.startsWith('replace:') ? '' : `<div class="v31-sticky-action modal-action"><div><strong>${v31Picker.plans.length} elegidos</strong></div><button class="primary-button" data-v31-action="confirm-picker">Añadir</button></div>`}`);
}

openExercisePicker = function(onSelect = 'active', focus = 'free') {
  v31OpenExercisePicker(onSelect, focus || 'free');
};

function v31ConfirmPicker() {
  if (!v31Picker || !state.activeSession) return;
  v31Picker.plans.forEach((plan) => {
    state.activeSession.exercises.push({
      id: uid('exercise'),
      name: plan.name,
      icon: plan.icon,
      primaryMuscle: plan.primaryMuscle,
      secondaryMuscles: normalizeSecondary(plan.secondaryMuscles),
      equipment: plan.equipment,
      uiOpen: true,
      plan: {
        setsTarget: plan.setsTarget,
        repMin: plan.repMin,
        repMax: plan.repMax,
        targetRir: plan.targetRir,
        restSeconds: plan.restSeconds,
        increment: plan.increment
      },
      sets: []
    });
  });
  saveState();
  closeModal();
  render();
  showToast('Ejercicios añadidos');
}

function v31OpenCustomExercise(muscle) {
  const secondaryOptions = MUSCLES.filter((item) => item !== muscle);
  openModal(`<header class="modal-header"><div><p class="eyebrow">PERSONALIZADO</p><h2>Nuevo ejercicio</h2></div><button class="icon-button" data-v31-action="close-modal">✕</button></header>
    <label>Nombre<input id="v31CustomName" placeholder="Ej. Press convergente"></label>
    <input id="v31CustomPrimary" type="hidden" value="${escapeHtml(muscle)}">
    <p class="muted">Principal: <strong>${escapeHtml(muscle)}</strong>. Marca solo músculos secundarios que trabajen de forma relevante; cada uno contará 0.5 series.</p>
    <div class="v31-secondary-grid">${secondaryOptions.map((item) => `<label class="v31-secondary-chip"><input type="checkbox" name="v31Secondary" value="${escapeHtml(item)}"><span>${MUSCLE_ICONS[item] || '•'} ${escapeHtml(item)}</span></label>`).join('')}</div>
    <button class="primary-button full-width" data-v31-action="save-custom-exercise">Guardar y seleccionar</button>`);
}

function v31SaveCustomExercise() {
  const name = $('v31CustomName')?.value.trim();
  const primary = $('v31CustomPrimary')?.value;
  if (!name || !primary) {
    showToast('Escribe el nombre');
    return;
  }
  const secondary = qsa('input[name="v31Secondary"]:checked', modalRoot).map((input) => [input.value, V31_INDIRECT_SET_FACTOR]);
  const exercise = {
    name,
    icon: '✍️',
    region: MUSCLE_GROUPS.lower.includes(primary) ? 'lower' : 'upper',
    primary,
    secondary,
    equipment: 'Personalizado',
    rep: [8, 15],
    rest: 120,
    increment: 2.5
  };
  state.customExercises.push(exercise);
  const b = v31EnsureBuilder();
  b.plans.push(planFromExercise(exercise));
  if (!b.muscles.includes(primary)) b.muscles.push(primary);
  saveState(false);
  closeModal();
  render();
  showToast('Ejercicio creado');
}

function v31HandleClick(event) {
  const button = event.target.closest('[data-v31-action],[data-v31-focus],[data-v31-muscle],[data-v31-exercise],[data-v31-start-routine],[data-v31-copy-session],[data-v31-edit-routine],[data-v31-delete-routine],[data-v31-picker-muscle],[data-v31-picker-exercise]');
  if (!button) return;

  const b = v31EnsureBuilder();

  if (button.dataset.v31Focus) {
    b.focus = button.dataset.v31Focus;
    b.muscles = [];
    b.plans = [];
    render();
    return;
  }

  if (button.dataset.v31Muscle) {
    const muscle = button.dataset.v31Muscle;
    if (b.muscles.includes(muscle)) {
      b.muscles = b.muscles.filter((item) => item !== muscle);
      b.plans = b.plans.filter((plan) => plan.primaryMuscle !== muscle);
    } else {
      b.muscles.push(muscle);
    }
    render();
    return;
  }

  if (button.dataset.v31Exercise) {
    const name = button.dataset.v31Exercise;
    const existing = b.plans.findIndex((plan) => plan.name === name);
    if (existing >= 0) b.plans.splice(existing, 1);
    else {
      const exercise = libraryExercise(name);
      if (exercise) b.plans.push(planFromExercise(exercise));
    }
    render();
    return;
  }

  if (button.dataset.v31StartRoutine) {
    v31StartRoutine(button.dataset.v31StartRoutine);
    return;
  }

  if (button.dataset.v31CopySession) {
    v31CopySession(button.dataset.v31CopySession);
    return;
  }

  if (button.dataset.v31EditRoutine) {
    v31LoadRoutineBuilder(state.routines.find((routine) => routine.id === button.dataset.v31EditRoutine));
    return;
  }

  if (button.dataset.v31DeleteRoutine) {
    if (confirm('¿Eliminar esta rutina?')) {
      state.routines = state.routines.filter((routine) => routine.id !== button.dataset.v31DeleteRoutine);
      saveState();
      render();
    }
    return;
  }

  if (button.dataset.v31PickerMuscle) {
    const muscle = button.dataset.v31PickerMuscle;
    if (v31Picker.muscles.includes(muscle)) {
      v31Picker.muscles = v31Picker.muscles.filter((item) => item !== muscle);
      v31Picker.plans = v31Picker.plans.filter((plan) => plan.primaryMuscle !== muscle);
    } else {
      v31Picker.muscles.push(muscle);
    }
    v31RenderPicker();
    return;
  }

  if (button.dataset.v31PickerExercise) {
    const exercise = libraryExercise(button.dataset.v31PickerExercise);
    if (!exercise || !v31Picker) return;
    if (v31Picker.target.startsWith('replace:')) {
      const index = num(v31Picker.target.split(':')[1]);
      const current = state.activeSession?.exercises[index];
      const plan = planFromExercise(exercise);
      if (current) {
        state.activeSession.exercises[index] = {
          ...current,
          name: plan.name,
          icon: plan.icon,
          primaryMuscle: plan.primaryMuscle,
          secondaryMuscles: normalizeSecondary(plan.secondaryMuscles),
          equipment: plan.equipment,
          plan: {
            setsTarget: current.plan?.setsTarget || plan.setsTarget,
            repMin: plan.repMin,
            repMax: plan.repMax,
            targetRir: current.plan?.targetRir ?? plan.targetRir,
            restSeconds: plan.restSeconds,
            increment: plan.increment
          },
          sets: [],
          uiOpen: true
        };
        saveState();
        closeModal();
        render();
        showToast('Ejercicio sustituido');
      }
      return;
    }
    const index = v31Picker.plans.findIndex((plan) => plan.name === exercise.name);
    if (index >= 0) v31Picker.plans.splice(index, 1);
    else v31Picker.plans.push(planFromExercise(exercise));
    v31RenderPicker();
    return;
  }

  const action = button.dataset.v31Action;
  if (!action) return;

  if (action === 'set-mode') {
    b.mode = button.dataset.mode;
    render();
  } else if (action === 'start-session') {
    v31StartBuilderSession();
  } else if (action === 'save-routine') {
    v31SaveRoutine();
  } else if (action === 'new-routine') {
    v31LoadRoutineBuilder();
  } else if (action === 'cancel-routine-builder') {
    v31ResetBuilder();
    navigate('routines');
  } else if (action === 'remove-plan') {
    b.plans.splice(num(button.dataset.planIndex), 1);
    render();
  } else if (action === 'custom-exercise') {
    v31OpenCustomExercise(button.dataset.muscle);
  } else if (action === 'save-custom-exercise') {
    v31SaveCustomExercise();
  } else if (action === 'toggle-active-exercise') {
    const exercise = state.activeSession?.exercises[num(button.dataset.index)];
    if (exercise) {
      exercise.uiOpen = exercise.uiOpen === false;
      saveState(false);
      render();
    }
  } else if (action === 'open-multi-picker') {
    v31OpenExercisePicker('active', 'free');
  } else if (action === 'confirm-picker') {
    v31ConfirmPicker();
  } else if (action === 'close-modal') {
    closeModal();
  }
}

function v31HandleInput(event) {
  const b = v31EnsureBuilder();
  if (event.target.id === 'v31PastDate') b.date = event.target.value;
  if (event.target.id === 'v31PastDuration') b.durationMinutes = num(event.target.value, 60);
  if (event.target.id === 'v31RoutineName') b.routineName = event.target.value;
  if (event.target.matches('[data-v31-plan-field]')) {
    const plan = b.plans[num(event.target.dataset.planIndex)];
    if (plan) plan[event.target.dataset.v31PlanField] = num(event.target.value);
  }
  if (event.target.id === 'v31ActiveDate' && state.activeSession) {
    state.activeSession.date = event.target.value;
    saveState(false);
  }
  if (event.target.id === 'v31ActiveDuration' && state.activeSession) {
    state.activeSession.durationMinutes = num(event.target.value, 60);
    saveState(false);
  }
}

document.addEventListener('click', v31HandleClick);
document.addEventListener('input', v31HandleInput);

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="substitute-exercise"]');
  if (!button) return;
  const card = button.closest('.exercise-card');
  const index = num(card?.dataset.exerciseIndex);
  const muscle = state.activeSession?.exercises[index]?.primaryMuscle;
  if (!muscle) return;
  setTimeout(() => {
    v31Picker = {
      target: `replace:${index}`,
      focus: MUSCLE_GROUPS.lower.includes(muscle) ? 'lower' : MUSCLE_GROUPS.upper.includes(muscle) ? 'upper' : 'free',
      muscles: [muscle],
      plans: []
    };
    v31RenderPicker();
  }, 0);
});

startRoutine = v31StartRoutine;
v31EnsureBuilder();
