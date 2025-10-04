 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/StrengthRunner.js b/StrengthRunner.js
index 5ae5b068cc213a076527759f222ffec6dffb1933..460d82e44bc308172fb5587989adcd8a4b1abf9f 100644
--- a/StrengthRunner.js
+++ b/StrengthRunner.js
@@ -1,82 +1,629 @@
 // app/components/StrengthRunner.js
 import { beep } from './beep.js';
 
+const STORAGE_KEY = 'zbf:data';
+const FALLBACK_STRENGTH = [
+  { id: 'air-squat', name: 'Air Squat', type: 'strength' },
+  { id: 'pushup', name: 'Push‑Ups', type: 'strength' },
+  { id: 'goblet-squat', name: 'Goblet Squat', type: 'strength' },
+  { id: 'split-squat', name: 'Split Squat', type: 'strength' },
+  { id: 'row', name: 'Bent‑Over Row', type: 'strength' },
+  { id: 'deadbug', name: 'Dead Bug', type: 'strength' }
+];
+
+function readData(){
+  try{
+    const raw = localStorage.getItem(STORAGE_KEY);
+    return raw ? JSON.parse(raw) : {};
+  }catch(err){
+    return {};
+  }
+}
+
+function writeData(payload){
+  try{
+    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload || {}));
+  }catch(err){
+    // Swallow storage errors (quota, private mode, etc.)
+  }
+}
+
+function clampPositiveInt(value, fallback){
+  const num = Number.parseInt(value, 10);
+  return Number.isFinite(num) && num > 0 ? num : fallback;
+}
+
+function clampNonNegativeInt(value, fallback){
+  const num = Number.parseInt(value, 10);
+  return Number.isFinite(num) && num >= 0 ? num : fallback;
+}
+
 export function StrengthRunner(){
-  const defaultPlan = [
-    { name:'Goblet Squat', reps:10, sets:3, rest:60 },
-    { name:'Push‑Ups', reps:10, sets:3, rest:60 },
-    { name:'Bent‑Over Row', reps:12, sets:3, rest:60 }
-  ];
-  let idx=0, setNum=1, resting=false, restEnd=0;
-
-  function completeSet(){
-    const current = defaultPlan[idx];
-    if(setNum < current.sets){
-      setNum++; startRest(current.rest);
+  const state = {
+    exercises: [],
+    plan: [],
+    transitionRest: 60,
+    editIndex: null,
+    workout: createWorkoutState()
+  };
+
+  const els = {};
+
+  function createWorkoutState(){
+    return {
+      status: 'idle', // idle | active | finished
+      movementIndex: 0,
+      set: 1,
+      resting: false,
+      restEnd: 0,
+      restContext: null
+    };
+  }
+
+  function lookupExerciseName(id, fallbackName){
+    if(typeof fallbackName === 'string' && fallbackName.trim()){
+      return fallbackName.trim();
+    }
+    const fromState = state.exercises.find(ex => ex.id === id);
+    if(fromState) return fromState.name;
+    const fallback = FALLBACK_STRENGTH.find(ex => ex.id === id);
+    return fallback ? fallback.name : '';
+  }
+
+  function normalizeMovement(movement){
+    if(!movement || typeof movement !== 'object') return null;
+    const id = typeof movement.id === 'string' ? movement.id : '';
+    const name = lookupExerciseName(id, movement.name);
+    if(!id || !name) return null;
+    return {
+      id,
+      name,
+      sets: clampPositiveInt(movement.sets, 1),
+      reps: clampPositiveInt(movement.reps, 1),
+      rest: clampNonNegativeInt(movement.rest, 0)
+    };
+  }
+
+  function readStoredPlan(){
+    const data = readData();
+    const rawPlan = data && typeof data === 'object' ? data.strengthPlan : null;
+    if(!rawPlan || typeof rawPlan !== 'object'){
+      return { movements: [], transitionRest: 60 };
+    }
+    const movements = Array.isArray(rawPlan.movements)
+      ? rawPlan.movements.map(normalizeMovement).filter(Boolean)
+      : [];
+    const transitionRest = clampNonNegativeInt(rawPlan.transitionRest, 60);
+    return { movements, transitionRest };
+  }
+
+  function persistPlan(){
+    const stored = readData();
+    stored.strengthPlan = {
+      movements: state.plan.map(normalizeMovement).filter(Boolean),
+      transitionRest: clampNonNegativeInt(state.transitionRest, 60)
+    };
+    writeData(stored);
+  }
+
+  function cacheElements(){
+    const root = document.getElementById('app');
+    if(!root) return;
+    els.form = root.querySelector('[data-strength-form]');
+    els.exerciseSelect = root.querySelector('[data-field="exercise"]');
+    els.setsInput = root.querySelector('[data-field="sets"]');
+    els.repsInput = root.querySelector('[data-field="reps"]');
+    els.restInput = root.querySelector('[data-field="rest"]');
+    els.modeLabel = root.querySelector('[data-builder-mode]');
+    els.submitButton = root.querySelector('[data-submit-movement]');
+    els.resetButton = root.querySelector('[data-reset-movement]');
+    els.planSummary = root.querySelector('[data-plan-summary]');
+    els.transitionRestInput = root.querySelector('[data-transition-rest]');
+    els.startButton = root.querySelector('[data-start-workout]');
+    els.runnerName = root.querySelector('[data-runner-name]');
+    els.runnerSet = root.querySelector('[data-runner-set]');
+    els.runnerReps = root.querySelector('[data-runner-reps]');
+    els.statusLabel = root.querySelector('[data-strength-status]');
+    els.completeButton = root.querySelector('[data-complete-set]');
+    els.restTimer = root.querySelector('[data-rest-timer]');
+    els.restLabel = root.querySelector('[data-rest-label]');
+  }
+
+  function bindEvents(){
+    if(els.form){
+      els.form.addEventListener('submit', onFormSubmit);
+    }
+    if(els.resetButton){
+      els.resetButton.addEventListener('click', (event) => {
+        event.preventDefault();
+        resetForm();
+      });
+    }
+    if(els.planSummary){
+      els.planSummary.addEventListener('click', onPlanAction);
+    }
+    if(els.transitionRestInput){
+      els.transitionRestInput.addEventListener('change', onTransitionRestChange);
+      els.transitionRestInput.addEventListener('blur', onTransitionRestChange);
+    }
+    if(els.startButton){
+      els.startButton.addEventListener('click', startWorkout);
+    }
+    if(els.completeButton){
+      els.completeButton.addEventListener('click', completeSet);
+    }
+  }
+
+  async function hydrate(){
+    const stored = readStoredPlan();
+    state.plan = stored.movements;
+    state.transitionRest = stored.transitionRest;
+    state.workout = createWorkoutState();
+
+    if(els.transitionRestInput){
+      els.transitionRestInput.value = state.transitionRest;
+    }
+
+    renderPlanSummary();
+    resetWorkout();
+
+    await ensureExercises();
+    resetForm();
+  }
+
+  async function ensureExercises(){
+    if(state.exercises.length){
+      renderExerciseOptions();
+      return;
+    }
+    try{
+      const res = await fetch('./exercises.json', { cache: 'no-store' });
+      if(res.ok){
+        const data = await res.json();
+        if(Array.isArray(data)){
+          state.exercises = data.filter(ex => ex && ex.type === 'strength');
+        }
+      }
+    }catch(err){
+      // Ignore network failures; fallback will be used below.
+    }
+    if(!Array.isArray(state.exercises) || !state.exercises.length){
+      state.exercises = [...FALLBACK_STRENGTH];
+    }
+    renderExerciseOptions();
+  }
+
+  function renderExerciseOptions(){
+    if(!els.exerciseSelect) return;
+    const options = state.exercises.length ? state.exercises : FALLBACK_STRENGTH;
+    if(!options.length){
+      els.exerciseSelect.innerHTML = '<option value="">No strength moves available</option>';
+      els.exerciseSelect.disabled = true;
+      return;
+    }
+    els.exerciseSelect.disabled = false;
+    const currentValue = els.exerciseSelect.value;
+    const markup = options.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join('');
+    els.exerciseSelect.innerHTML = markup;
+
+    let nextValue = '';
+    if(state.editIndex !== null && state.editIndex >= 0){
+      nextValue = state.plan[state.editIndex]?.id || '';
+    }else if(options.some(ex => ex.id === currentValue)){
+      nextValue = currentValue;
     }else{
-      if(idx < defaultPlan.length-1){
-        idx++; setNum=1; startRest(90);
+      nextValue = options[0].id;
+    }
+    els.exerciseSelect.value = nextValue;
+  }
+
+  function setBuilderMode(mode){
+    if(els.modeLabel){
+      els.modeLabel.textContent = mode === 'edit' ? 'Edit Movement' : 'Add Movement';
+    }
+    if(els.submitButton){
+      els.submitButton.textContent = mode === 'edit' ? 'Update Movement' : 'Add Movement';
+    }
+  }
+
+  function resetForm(){
+    state.editIndex = null;
+    renderExerciseOptions();
+    if(els.setsInput) els.setsInput.value = '3';
+    if(els.repsInput) els.repsInput.value = '10';
+    if(els.restInput) els.restInput.value = '60';
+    setBuilderMode('add');
+  }
+
+  function fillForm(movement){
+    if(!movement) return;
+    if(els.exerciseSelect){
+      if(!state.exercises.some(ex => ex.id === movement.id)){
+        // Ensure the exercise exists in the dropdown.
+        state.exercises = [...state.exercises, { id: movement.id, name: movement.name, type: 'strength' }];
+        renderExerciseOptions();
+      }
+      els.exerciseSelect.value = movement.id;
+    }
+    if(els.setsInput) els.setsInput.value = movement.sets;
+    if(els.repsInput) els.repsInput.value = movement.reps;
+    if(els.restInput) els.restInput.value = movement.rest;
+    setBuilderMode('edit');
+  }
+
+  function adjustEditIndexAfterRemoval(index){
+    if(state.editIndex === null || state.editIndex < 0) return;
+    if(state.editIndex === index){
+      resetForm();
+    }else if(state.editIndex > index){
+      state.editIndex -= 1;
+      const movement = state.plan[state.editIndex];
+      if(movement){
+        fillForm(movement);
+      }
+    }
+  }
+
+  function adjustEditIndexAfterMove(oldIndex, newIndex){
+    if(state.editIndex === null || state.editIndex < 0) return;
+    if(state.editIndex === oldIndex){
+      state.editIndex = newIndex;
+    }else if(oldIndex < state.editIndex && newIndex >= state.editIndex){
+      state.editIndex -= 1;
+    }else if(oldIndex > state.editIndex && newIndex <= state.editIndex){
+      state.editIndex += 1;
+    }
+    if(state.editIndex !== null && state.editIndex >= 0){
+      const movement = state.plan[state.editIndex];
+      if(movement){
+        fillForm(movement);
       }else{
-        document.getElementById('strength-status').textContent = 'All done!';
-        beep(660,0.2);
+        resetForm();
       }
     }
   }
 
-  function startRest(seconds){
-    resting = true; restEnd = performance.now() + seconds*1000;
-    tick();
+  function onFormSubmit(event){
+    event.preventDefault();
+    if(!els.exerciseSelect || !els.setsInput || !els.repsInput || !els.restInput) return;
+
+    const exerciseId = els.exerciseSelect.value;
+    const exercise = state.exercises.find(ex => ex.id === exerciseId) || FALLBACK_STRENGTH.find(ex => ex.id === exerciseId);
+    if(!exercise){
+      return;
+    }
+
+    const movement = normalizeMovement({
+      id: exercise.id,
+      name: exercise.name,
+      sets: clampPositiveInt(els.setsInput.value, 1),
+      reps: clampPositiveInt(els.repsInput.value, 1),
+      rest: clampNonNegativeInt(els.restInput.value, 0)
+    });
+    if(!movement) return;
+
+    if(state.editIndex !== null && state.editIndex >= 0){
+      state.plan[state.editIndex] = movement;
+    }else{
+      state.plan.push(movement);
+    }
+
+    persistPlan();
+    renderPlanSummary();
+    resetWorkout();
+    resetForm();
+  }
+
+  function onPlanAction(event){
+    const button = event.target.closest('button[data-action]');
+    if(!button) return;
+    const index = Number.parseInt(button.dataset.index, 10);
+    if(Number.isNaN(index)) return;
+    const action = button.dataset.action;
+
+    if(action === 'edit'){
+      state.editIndex = index;
+      fillForm(state.plan[index]);
+      return;
+    }
+
+    if(action === 'remove'){
+      state.plan.splice(index, 1);
+      persistPlan();
+      renderPlanSummary();
+      resetWorkout();
+      adjustEditIndexAfterRemoval(index);
+      return;
+    }
+
+    if(action === 'up' && index > 0){
+      const [movement] = state.plan.splice(index, 1);
+      state.plan.splice(index - 1, 0, movement);
+      adjustEditIndexAfterMove(index, index - 1);
+    }
+    if(action === 'down' && index < state.plan.length - 1){
+      const [movement] = state.plan.splice(index, 1);
+      state.plan.splice(index + 1, 0, movement);
+      adjustEditIndexAfterMove(index, index + 1);
+    }
+    persistPlan();
+    renderPlanSummary();
+    resetWorkout();
+  }
+
+  function onTransitionRestChange(){
+    if(!els.transitionRestInput) return;
+    state.transitionRest = clampNonNegativeInt(els.transitionRestInput.value, state.transitionRest || 60);
+    els.transitionRestInput.value = state.transitionRest;
+    persistPlan();
+    if(state.workout.status !== 'active'){
+      updateRestDisplay('Press start to begin.', 0);
+    }
+  }
+
+  function startWorkout(event){
+    event.preventDefault();
+    if(!state.plan.length) return;
+    state.workout = createWorkoutState();
+    state.workout.status = 'active';
+    updateRunner();
+    updateRestDisplay('Ready for next set.', 0);
+  }
+
+  function completeSet(event){
+    event.preventDefault();
+    if(state.workout.status !== 'active' || state.workout.resting) return;
+    const movement = state.plan[state.workout.movementIndex];
+    if(!movement) return;
+
+    if(state.workout.set < movement.sets){
+      startRestTimer(movement.rest, { type: 'betweenSets' });
+    }else if(state.workout.movementIndex < state.plan.length - 1){
+      startRestTimer(state.transitionRest, { type: 'afterExercise' });
+    }else{
+      finishWorkout();
+      return;
+    }
+    updateRunner();
+  }
+
+  function finishWorkout(){
+    state.workout.status = 'finished';
+    state.workout.resting = false;
+    state.workout.restContext = null;
+    beep(660, 0.2);
+    updateRunner();
+    updateRestDisplay('Workout complete.', 0);
+  }
+
+  function resetWorkout(){
+    state.workout = createWorkoutState();
+    updateRunner();
+    updateRestDisplay('Press start to begin.', 0);
+  }
+
+  function updateRestDisplay(label, seconds){
+    if(els.restLabel){
+      els.restLabel.textContent = label;
+    }
+    if(els.restTimer){
+      const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
+      els.restTimer.textContent = Math.ceil(safeSeconds).toString();
+      els.restTimer.dataset.total = safeSeconds.toString();
+    }
+  }
+
+  function startRestTimer(seconds, context){
+    const restSeconds = clampNonNegativeInt(seconds, 0);
+    if(restSeconds === 0){
+      handleRestComplete(context);
+      return;
+    }
+    state.workout.resting = true;
+    state.workout.restContext = context;
+    state.workout.restEnd = performance.now() + restSeconds * 1000;
+    updateRestDisplay(context?.type === 'afterExercise' ? 'Transition rest…' : 'Rest between sets…', restSeconds);
+    requestAnimationFrame(tick);
   }
 
   function tick(){
-    if(!resting) return;
-    const left = Math.max(0, (restEnd - performance.now())/1000);
-    document.getElementById('rest-time').textContent = Math.ceil(left).toString();
-    const pct = (1 - (left/((restEnd - (restEnd - 1000*parseFloat(document.getElementById('rest-time').dataset.total||'1')))/1000)));
-    if(left<=0.01){
-      resting=false; beep(880,0.08);
-      document.getElementById('rest-time').textContent = '0';
+    if(!state.workout.resting) return;
+    if(!els.restTimer) return;
+    const remaining = Math.max(0, (state.workout.restEnd - performance.now()) / 1000);
+    els.restTimer.textContent = Math.ceil(remaining).toString();
+    if(remaining <= 0.01){
+      handleRestComplete(state.workout.restContext);
     }else{
       requestAnimationFrame(tick);
     }
   }
 
-  function onComplete(e){
-    e.preventDefault();
-    completeSet();
-    renderDetails();
+  function handleRestComplete(context){
+    state.workout.resting = false;
+    state.workout.restContext = null;
+    updateRestDisplay('Rest complete.', 0);
+    beep(880, 0.08);
+
+    if(!context){
+      updateRunner();
+      return;
+    }
+
+    if(context.type === 'betweenSets'){
+      const movement = state.plan[state.workout.movementIndex];
+      if(movement && state.workout.set < movement.sets){
+        state.workout.set += 1;
+      }
+    }else if(context.type === 'afterExercise'){
+      state.workout.movementIndex += 1;
+      state.workout.set = 1;
+      if(state.workout.movementIndex >= state.plan.length){
+        finishWorkout();
+        return;
+      }
+    }
+    updateRunner();
+  }
+
+  function updateRunner(){
+    if(!els.runnerName || !els.runnerSet || !els.runnerReps || !els.statusLabel || !els.completeButton) return;
+
+    if(!state.plan.length){
+      els.runnerName.textContent = '—';
+      els.runnerSet.textContent = '—';
+      els.runnerReps.textContent = '—';
+      els.statusLabel.textContent = 'Add movements to build a plan.';
+      els.completeButton.disabled = true;
+      updateStartButton();
+      return;
+    }
+
+    updateStartButton();
+
+    if(state.workout.status === 'finished'){
+      els.runnerName.textContent = '—';
+      els.runnerSet.textContent = '—';
+      els.runnerReps.textContent = '—';
+      els.statusLabel.textContent = 'All done!';
+      els.completeButton.disabled = true;
+      return;
+    }
+
+    const movement = state.plan[state.workout.movementIndex] || state.plan[0];
+    els.runnerName.textContent = movement.name;
+    els.runnerReps.textContent = movement.reps;
+
+    if(state.workout.status === 'idle'){
+      els.runnerSet.textContent = `0/${movement.sets}`;
+      els.statusLabel.textContent = 'Press start when ready.';
+      els.completeButton.disabled = true;
+      return;
+    }
+
+    els.runnerSet.textContent = `${state.workout.set}/${movement.sets}`;
+    if(state.workout.resting){
+      els.statusLabel.textContent = state.workout.restContext?.type === 'afterExercise' ? 'Transition rest…' : 'Rest between sets…';
+      els.completeButton.disabled = true;
+    }else{
+      els.statusLabel.textContent = 'Complete the set when you finish your reps.';
+      els.completeButton.disabled = false;
+    }
+  }
+
+  function updateStartButton(){
+    if(els.startButton){
+      els.startButton.disabled = state.plan.length === 0;
+    }
   }
 
-  function renderDetails(){
-    const curr = defaultPlan[idx];
-    document.getElementById('ex-name').textContent = curr.name;
-    document.getElementById('ex-sets').textContent = `${setNum}/${curr.sets}`;
-    document.getElementById('ex-reps').textContent = `${curr.reps}`;
-    document.getElementById('rest-time').dataset.total = curr.rest;
+  function renderPlanSummary(){
+    if(!els.planSummary) return;
+    if(!state.plan.length){
+      els.planSummary.innerHTML = '<p class="small">Add exercises to build your strength session.</p>';
+      updateStartButton();
+      return;
+    }
+
+    const rows = state.plan.map((movement, index) => {
+      const upDisabled = index === 0 ? 'disabled' : '';
+      const downDisabled = index === state.plan.length - 1 ? 'disabled' : '';
+      return `
+        <tr>
+          <td>${index + 1}</td>
+          <td>${movement.name}</td>
+          <td>${movement.sets} × ${movement.reps}</td>
+          <td>${movement.rest}s</td>
+          <td>
+            <div class="row" style="gap:4px;flex-wrap:nowrap">
+              <button type="button" class="btn" data-action="edit" data-index="${index}" style="padding:6px 8px;font-size:12px">Edit</button>
+              <button type="button" class="btn" data-action="remove" data-index="${index}" style="padding:6px 8px;font-size:12px">Remove</button>
+              <button type="button" class="btn" data-action="up" data-index="${index}" style="padding:6px 8px;font-size:12px" ${upDisabled}>↑</button>
+              <button type="button" class="btn" data-action="down" data-index="${index}" style="padding:6px 8px;font-size:12px" ${downDisabled}>↓</button>
+            </div>
+          </td>
+        </tr>`;
+    }).join('');
+
+    els.planSummary.innerHTML = `
+      <table style="width:100%;border-collapse:collapse">
+        <thead>
+          <tr style="text-align:left">
+            <th style="padding:6px 0">#</th>
+            <th style="padding:6px 0">Exercise</th>
+            <th style="padding:6px 0">Sets × Reps</th>
+            <th style="padding:6px 0">Rest (s)</th>
+            <th style="padding:6px 0">Actions</th>
+          </tr>
+        </thead>
+        <tbody>${rows}</tbody>
+      </table>`;
+    updateStartButton();
   }
 
-  setTimeout(()=>{
-    document.getElementById('set-done').addEventListener('click', onComplete);
-    renderDetails();
-  },0);
+  queueMicrotask(() => {
+    cacheElements();
+    bindEvents();
+    hydrate();
+  });
 
   return `
-  <section class="card">
-    <h2>Strength (Minimal Demo)</h2>
-    <div class="grid cols-3">
-      <div><div class="label">Exercise</div><div id="ex-name">—</div></div>
-      <div><div class="label">Set</div><div id="ex-sets">—</div></div>
-      <div><div class="label">Target Reps</div><div id="ex-reps">—</div></div>
-    </div>
-    <div class="row" style="margin-top:12px">
-      <button id="set-done" class="btn success">Complete Set</button>
-      <span id="strength-status" class="small"></span>
-    </div>
-  </section>
-  <section class="card">
-    <div class="label">Rest</div>
-    <div class="timer" id="rest-time" data-total="60">0</div>
-    <div class="small">Auto‑beep when rest finishes.</div>
-  </section>
+    <section class="card">
+      <h2>Strength Session</h2>
+      <form data-strength-form class="grid cols-2" style="gap:16px">
+        <div class="grid cols-2" style="gap:12px">
+          <div>
+            <div class="label">Exercise</div>
+            <select data-field="exercise" class="input" required></select>
+          </div>
+          <div>
+            <div class="label">Sets</div>
+            <input data-field="sets" class="input" type="number" min="1" value="3">
+          </div>
+          <div>
+            <div class="label">Reps</div>
+            <input data-field="reps" class="input" type="number" min="1" value="10">
+          </div>
+          <div>
+            <div class="label">Rest per set (s)</div>
+            <input data-field="rest" class="input" type="number" min="0" value="60">
+          </div>
+        </div>
+        <div>
+          <div class="label" data-builder-mode>Add Movement</div>
+          <div class="row" style="gap:8px">
+            <button data-submit-movement class="btn primary" type="submit">Add Movement</button>
+            <button data-reset-movement class="btn" type="button">Reset</button>
+          </div>
+        </div>
+      </form>
+      <div class="row" style="margin-top:12px;gap:16px;align-items:flex-end;flex-wrap:wrap">
+        <div>
+          <div class="label">Transition rest between movements (s)</div>
+          <input data-transition-rest class="input" type="number" min="0" value="60">
+        </div>
+        <button data-start-workout class="btn success" type="button">Start Workout</button>
+      </div>
+    </section>
+    <section class="card">
+      <h3>Plan Review</h3>
+      <div data-plan-summary></div>
+    </section>
+    <section class="card">
+      <h3>Workout Runner</h3>
+      <div class="grid cols-3">
+        <div><div class="label">Exercise</div><div data-runner-name>—</div></div>
+        <div><div class="label">Set</div><div data-runner-set>—</div></div>
+        <div><div class="label">Target Reps</div><div data-runner-reps>—</div></div>
+      </div>
+      <div class="row" style="margin-top:12px">
+        <button data-complete-set class="btn success" type="button">Complete Set</button>
+        <span data-strength-status class="small"></span>
+      </div>
+    </section>
+    <section class="card">
+      <div class="label">Rest</div>
+      <div class="timer" data-rest-timer data-total="0">0</div>
+      <div class="small" data-rest-label>Press start to begin.</div>
+    </section>
   `;
 }
 
EOF
)
