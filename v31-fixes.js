'use strict';

const v31BaseRenderActiveWorkout = renderActiveWorkout;

renderActiveWorkout = function() {
  const session = state.activeSession;
  if (session) {
    let changed = false;
    session.exercises.forEach((exercise, index) => {
      if (typeof exercise.uiOpen !== 'boolean') {
        exercise.uiOpen = index === 0;
        changed = true;
      }
    });
    if (changed) saveState(false);
  }
  return v31BaseRenderActiveWorkout();
};

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
    ${b.purpose === 'session' ? v31RenderSavedRoutines() + v31RenderRecentSessions() : ''}
    ${v31RenderFocusChoices()}
    ${v31RenderMuscleSelector()}
    ${v31RenderExerciseGroups()}
    ${v31RenderSelectedPlans()}
    ${v31RenderStickyAction()}
  `;
};

v31StartRoutine = function(id) {
  const routine = state.routines.find((item) => item.id === id);
  if (!routine) return;
  if (currentRoute !== 'workout') v31EnsureBuilder().mode = 'live';
  v31StartPlans(routine.exercises.map((plan) => structuredClone(plan)), routine.name, routine.id);
};

startRoutine = v31StartRoutine;
render();
