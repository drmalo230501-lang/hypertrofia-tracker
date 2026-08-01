'use strict';

/*
 * Hypertrofia Tracker v3.1.1
 * Ejercicios personalizados con nombre y emoji en cada grupo muscular.
 */

const V32_EMOJI_PRESETS = ['🏋️', '💪', '🦵', '🪽', '🏹', '🔥', '⚡', '🧱', '🪢', '🔨', '🍑', '🦾'];
let v32CustomContext = null;

function v32FirstGrapheme(value) {
  const text = String(value || '').trim();
  if (!text) return '🏋️';
  try {
    const segmenter = new Intl.Segmenter('es', { granularity: 'grapheme' });
    return [...segmenter.segment(text)][0]?.segment || '🏋️';
  } catch {
    return Array.from(text)[0] || '🏋️';
  }
}

function v32CustomExerciseTile(muscle) {
  return `<button class="v31-exercise-tile custom v32-create-exercise" data-v31-action="custom-exercise" data-muscle="${escapeHtml(muscle)}">
    <span class="v31-exercise-icon">➕</span>
    <span class="v31-exercise-copy">
      <strong>Crear ejercicio</strong>
      <small>Escribe el nombre y elige un emoji</small>
    </span>
    <span class="v31-check">+</span>
  </button>`;
}

v31RenderExerciseGroups = function() {
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
          ${v32CustomExerciseTile(muscle)}
        </div>
      </details>`;
    }).join('')}
  </section>`;
};

v31RenderPicker = function() {
  if (!v31Picker) return;
  const muscles = v31MusclesForFocus(v31Picker.focus);
  openModal(`<header class="modal-header"><div><p class="eyebrow">AÑADIR EJERCICIOS</p><h2>Elige varios a la vez</h2></div><button class="icon-button" data-v31-action="close-modal">✕</button></header>
    <p class="muted">Primero marca uno o varios músculos.</p>
    <div class="v31-muscle-grid">${muscles.map((muscle) => `<button class="v31-muscle-chip ${v31Picker.muscles.includes(muscle) ? 'selected' : ''}" data-v31-picker-muscle="${escapeHtml(muscle)}"><span>${MUSCLE_ICONS[muscle] || '•'}</span><strong>${escapeHtml(muscle)}</strong></button>`).join('')}</div>
    <div class="v31-muscle-sections">${v31Picker.muscles.map((muscle) => `<details class="v31-muscle-section panel" open>
      <summary><span><b>${MUSCLE_ICONS[muscle] || '•'} ${escapeHtml(muscle)}</b></span><span>⌄</span></summary>
      <div class="v31-exercise-grid">
        ${getAllExercises().filter((exercise) => exercise.primary === muscle).map((exercise) => {
          const selected = v31Picker.plans.some((plan) => plan.name === exercise.name);
          return `<button class="v31-exercise-tile ${selected ? 'selected' : ''}" data-v31-picker-exercise="${escapeHtml(exercise.name)}">
            <span class="v31-exercise-icon">${exercise.icon || '🏋️'}</span>
            <span class="v31-exercise-copy">
              <strong>${escapeHtml(exercise.name)}</strong>
              <small>${escapeHtml(exercise.equipment || '')}</small>
              <em>${escapeHtml(v31ContributionText(exercise))}</em>
            </span>
            <span class="v31-check">${selected ? '✓' : '+'}</span>
          </button>`;
        }).join('')}
        ${v32CustomExerciseTile(muscle)}
      </div>
    </details>`).join('')}</div>
    ${v31Picker.target.startsWith('replace:') ? '' : `<div class="v31-sticky-action modal-action"><div><strong>${v31Picker.plans.length} elegidos</strong></div><button class="primary-button" data-v31-action="confirm-picker">Añadir</button></div>`}`);
};

v31OpenCustomExercise = function(muscle) {
  if (!MUSCLES.includes(muscle)) {
    showToast('Selecciona un músculo');
    return;
  }
  v32CustomContext = {
    source: v31Picker ? 'picker' : 'builder',
    target: v31Picker?.target || null,
    muscle
  };
  const secondaryOptions = MUSCLES.filter((item) => item !== muscle);
  openModal(`<header class="modal-header"><div><p class="eyebrow">NUEVO EJERCICIO</p><h2>${MUSCLE_ICONS[muscle] || '•'} ${escapeHtml(muscle)}</h2></div><button class="icon-button" data-v31-action="close-modal">✕</button></header>
    <div class="v32-custom-form">
      <label>Nombre del ejercicio
        <input id="v31CustomName" autocomplete="off" placeholder="Ej. Press convergente">
      </label>
      <label>Emoji
        <div class="v32-emoji-input">
          <input id="v32CustomEmoji" autocomplete="off" inputmode="text" maxlength="12" value="🏋️" aria-label="Emoji del ejercicio">
          <span id="v32EmojiPreview" aria-hidden="true">🏋️</span>
        </div>
      </label>
      <div>
        <p class="v32-field-label">Emojis rápidos</p>
        <div class="v32-emoji-grid">
          ${V32_EMOJI_PRESETS.map((emoji) => `<button type="button" data-v32-emoji="${emoji}" aria-label="Usar emoji ${emoji}">${emoji}</button>`).join('')}
        </div>
      </div>
    </div>
    <input id="v31CustomPrimary" type="hidden" value="${escapeHtml(muscle)}">
    <details class="v32-secondary-details">
      <summary>Músculos secundarios opcionales</summary>
      <p class="muted">Marca únicamente los que participen de forma relevante. Cada uno contará automáticamente como 0.5 series.</p>
      <div class="v31-secondary-grid">${secondaryOptions.map((item) => `<label class="v31-secondary-chip"><input type="checkbox" name="v31Secondary" value="${escapeHtml(item)}"><span>${MUSCLE_ICONS[item] || '•'} ${escapeHtml(item)}</span></label>`).join('')}</div>
    </details>
    <button class="primary-button full-width" data-v31-action="save-custom-exercise">Guardar y seleccionar</button>`);
  setTimeout(() => $('v31CustomName')?.focus(), 0);
};

v31SaveCustomExercise = function() {
  const name = $('v31CustomName')?.value.trim();
  const primary = $('v31CustomPrimary')?.value;
  const emoji = v32FirstGrapheme($('v32CustomEmoji')?.value);

  if (!name || !primary) {
    showToast('Escribe el nombre del ejercicio');
    return;
  }

  const duplicate = getAllExercises().some((exercise) =>
    exercise.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es')
  );
  if (duplicate) {
    showToast('Ya existe un ejercicio con ese nombre');
    return;
  }

  const secondary = qsa('input[name="v31Secondary"]:checked', modalRoot)
    .map((input) => [input.value, V31_INDIRECT_SET_FACTOR]);

  const exercise = {
    name,
    icon: emoji,
    region: MUSCLE_GROUPS.lower.includes(primary)
      ? 'lower'
      : MUSCLE_GROUPS.upper.includes(primary)
        ? 'upper'
        : 'core',
    primary,
    secondary,
    equipment: 'Personalizado',
    rep: [8, 15],
    rest: 120,
    increment: 2.5
  };
  const plan = planFromExercise(exercise);
  state.customExercises.push(exercise);

  if (v32CustomContext?.source === 'picker' && v31Picker) {
    if (String(v31Picker.target).startsWith('replace:')) {
      const index = num(String(v31Picker.target).split(':')[1]);
      const current = state.activeSession?.exercises[index];
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
      }
      saveState();
      v31Picker = null;
      v32CustomContext = null;
      modalRoot.innerHTML = '';
      render();
      showToast('Ejercicio creado y sustituido');
      return;
    }

    v31Picker.plans.push(plan);
    saveState(false);
    v32CustomContext = null;
    v31RenderPicker();
    showToast('Ejercicio creado y seleccionado');
    return;
  }

  const b = v31EnsureBuilder();
  b.plans.push(plan);
  if (!b.muscles.includes(primary)) b.muscles.push(primary);
  saveState(false);
  v32CustomContext = null;
  modalRoot.innerHTML = '';
  render();
  showToast('Ejercicio creado y seleccionado');
};

document.addEventListener('click', (event) => {
  const emojiButton = event.target.closest('[data-v32-emoji]');
  if (!emojiButton) return;
  const emoji = emojiButton.dataset.v32Emoji;
  const input = $('v32CustomEmoji');
  const preview = $('v32EmojiPreview');
  if (input) input.value = emoji;
  if (preview) preview.textContent = emoji;
});

document.addEventListener('input', (event) => {
  if (event.target.id !== 'v32CustomEmoji') return;
  const emoji = v32FirstGrapheme(event.target.value);
  const preview = $('v32EmojiPreview');
  if (preview) preview.textContent = emoji;
});
