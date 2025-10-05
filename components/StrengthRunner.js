// app/components/StrengthRunner.js
import { beep } from './beep.js';

export function StrengthRunner(){
  const state = {
    available: [],
    plan: [],
    idx: 0,
    setNum: 1,
    resting: false,
    restEnd: 0,
    finished: false
  };

  function renderPlanList(){
    const list = document.getElementById('strength-plan');
    if(!list) return;
    if(!state.plan.length){
      list.innerHTML = '<li class="empty small">No exercises added yet. Pick one above and press Add.</li>';
      return;
    }
    list.innerHTML = state.plan.map((item, i) => `
      <li class="plan-item" data-index="${i}">
        <div>
          <div class="item-title">${item.name}</div>
          <div class="small">${item.sets} sets × ${item.reps} reps • Rest ${item.rest}s</div>
          ${item.cues?.length ? `<div class="small">${item.cues.join(' • ')}</div>` : ''}
        </div>
        <button class="btn danger" type="button" data-remove="${i}">Remove</button>
      </li>
    `).join('');
    highlightPlan();
  }

  function highlightPlan(){
    const list = document.getElementById('strength-plan');
    if(!list) return;
    const items = list.querySelectorAll('.plan-item');
    const activeIdx = (!state.plan.length || state.finished) ? -1 : state.idx;
    items.forEach((item, idx) => {
      if(idx === activeIdx) item.classList.add('active');
      else item.classList.remove('active');
    });
  }

  function renderDetails(){
    const nameEl = document.getElementById('ex-name');
    const setEl = document.getElementById('ex-sets');
    const repEl = document.getElementById('ex-reps');
    const restEl = document.getElementById('rest-time');
    const statusEl = document.getElementById('strength-status');
    const actionBtn = document.getElementById('set-done');
    const cuesEl = document.getElementById('strength-cues');

    if(!state.plan.length){
      nameEl.textContent = 'Add exercises to begin';
      setEl.textContent = '—';
      repEl.textContent = '—';
      restEl.textContent = '0';
      restEl.dataset.total = '0';
      if(actionBtn) actionBtn.disabled = true;
      if(statusEl) statusEl.textContent = '';
      if(cuesEl) cuesEl.innerHTML = '<li class="empty">Add exercises to see setup cues.</li>';
      return;
    }

    const curr = state.plan[state.idx];
    nameEl.textContent = curr.name;
    setEl.textContent = `${state.setNum}/${curr.sets}`;
    repEl.textContent = `${curr.reps}`;
    restEl.dataset.total = `${curr.rest}`;
    if(actionBtn) actionBtn.disabled = !!state.finished || state.resting;
    if(statusEl) statusEl.textContent = state.finished
      ? 'All done!'
      : `Exercise ${state.idx + 1} of ${state.plan.length}`;
    if(cuesEl){
      cuesEl.innerHTML = curr.cues?.length
        ? curr.cues.map(cue => `<li>${cue}</li>`).join('')
        : '<li class="empty">No saved cues for this move yet.</li>';
    }
    highlightPlan();
  }

  function completeSet(){
    if(!state.plan.length) return;
    const current = state.plan[state.idx];
    if(state.setNum < current.sets){
      state.setNum++;
      state.finished = false;
      startRest(current.rest);
    }else{
      if(state.idx < state.plan.length - 1){
        state.idx++;
        state.setNum = 1;
        state.finished = false;
        startRest(90);
      }else{
        state.finished = true;
        beep(660,0.2);
      }
    }
    renderDetails();
  }

  function startRest(seconds){
    state.resting = true;
    state.restEnd = performance.now() + seconds * 1000;
    const restEl = document.getElementById('rest-time');
    restEl.dataset.total = `${seconds}`;
    tick();
  }

  function tick(){
    if(!state.resting) return;
    const restEl = document.getElementById('rest-time');
    const left = Math.max(0, (state.restEnd - performance.now()) / 1000);
    restEl.textContent = Math.ceil(left).toString();
    if(left <= 0.01){
      state.resting = false;
      restEl.textContent = '0';
      beep(880,0.08);
      renderDetails();
    }else{
      requestAnimationFrame(tick);
    }
  }

  function onComplete(e){
    e.preventDefault();
    completeSet();
  }

  function addExercise(e){
    e.preventDefault();
    const select = document.getElementById('strength-select');
    const sets = parseInt(document.getElementById('strength-sets').value, 10) || 3;
    const reps = parseInt(document.getElementById('strength-reps').value, 10) || 10;
    const rest = parseInt(document.getElementById('strength-rest').value, 10) || 60;
    const exId = select.value;
    if(!exId) return;
    const exercise = state.available.find(ex => ex.id === exId);
    if(!exercise) return;

    state.plan.push({ id: exId, name: exercise.name, sets, reps, rest, cues: exercise.cues || [] });
    state.finished = false;
    select.value = '';
    if(state.plan.length === 1){
      state.idx = 0;
      state.setNum = 1;
    }
    renderPlanList();
    renderDetails();
  }

  function onPlanClick(e){
    const btn = e.target.closest('button[data-remove]');
    if(!btn) return;
    const index = parseInt(btn.dataset.remove, 10);
    if(Number.isNaN(index)) return;
    state.plan.splice(index, 1);
    state.finished = false;
    if(state.idx >= state.plan.length){
      state.idx = Math.max(0, state.plan.length - 1);
      state.setNum = 1;
    }
    if(!state.plan.length){
      state.resting = false;
      const restEl = document.getElementById('rest-time');
      if(restEl){
        restEl.textContent = '0';
        restEl.dataset.total = '0';
      }
    }
    renderPlanList();
    renderDetails();
  }

  setTimeout(()=>{
    fetch('../exercises.json')
      .then(res => res.json())
      .then(data => {
        state.available = data.filter(ex => ex.type === 'strength');
        const select = document.getElementById('strength-select');
        if(select){
          select.innerHTML = '<option value="">Select exercise…</option>' +
            state.available.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join('');
        }
      })
      .catch(() => {
        const select = document.getElementById('strength-select');
        if(select){
          select.innerHTML = '<option value="">Unable to load</option>';
        }
      });

    document.getElementById('strength-add-form')?.addEventListener('submit', addExercise);
    document.getElementById('strength-plan')?.addEventListener('click', onPlanClick);
    document.getElementById('set-done')?.addEventListener('click', onComplete);
    renderPlanList();
    renderDetails();
  },0);

  return `
  <section class="card">
    <h2>Build Strength Workout</h2>
    <form id="strength-add-form" class="row">
      <div style="flex:1 1 220px;min-width:180px;">
        <div class="label">Exercise</div>
        <select id="strength-select" class="input">
          <option value="">Loading…</option>
        </select>
      </div>
      <div style="width:90px;">
        <div class="label">Sets</div>
        <input id="strength-sets" class="input" type="number" min="1" max="10" value="3">
      </div>
      <div style="width:90px;">
        <div class="label">Reps</div>
        <input id="strength-reps" class="input" type="number" min="1" max="50" value="10">
      </div>
      <div style="width:110px;">
        <div class="label">Rest (s)</div>
        <input id="strength-rest" class="input" type="number" min="15" max="300" value="60">
      </div>
      <div style="align-self:flex-end;">
        <button class="btn primary" type="submit">Add</button>
      </div>
    </form>
    <ul id="strength-plan" class="plan-list">
      <li class="empty small">No exercises added yet. Pick one above and press Add.</li>
    </ul>
  </section>
  <section class="card">
    <h2>Strength Session</h2>
    <div class="grid cols-3">
      <div><div class="label">Exercise</div><div id="ex-name">—</div></div>
      <div><div class="label">Set</div><div id="ex-sets">—</div></div>
      <div><div class="label">Target Reps</div><div id="ex-reps">—</div></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button id="set-done" class="btn success" disabled>Complete Set</button>
      <span id="strength-status" class="small"></span>
    </div>
    <div class="label" style="margin-top:12px">Technique cues</div>
    <ul id="strength-cues" class="cues-list">
      <li class="empty">Add exercises to see setup cues.</li>
    </ul>
  </section>
  <section class="card">
    <div class="label">Rest</div>
    <div class="timer" id="rest-time" data-total="60">0</div>
    <div class="small">Auto‑beep when rest finishes.</div>
  </section>
  `;
}
