// app/components/HiitRunner.js
import { beep } from './beep.js';

export function HiitRunner(){
  const state = {
    work: 20,
    rest: 10,
    rounds: 8,
    phase: 'ready', // ready|work|rest|done
    currentRound: 0,
    startTs: 0,
    duration: 0,
    available: [],
    plan: [],
    exerciseIndex: 0
  };

  function setStatus(message=''){
    const statusEl = document.getElementById('hiit-status');
    if(statusEl) statusEl.textContent = message;
  }

  function renderPlanList(){
    const list = document.getElementById('hiit-plan');
    if(!list) return;
    if(!state.plan.length){
      list.innerHTML = '<li class="empty small">No HIIT moves yet. Choose one above and press Add.</li>';
      return;
    }
    list.innerHTML = state.plan.map((item, idx) => `
      <li class="plan-item" data-index="${idx}">
        <div>
          <div class="item-title">${item.name}</div>
          ${item.cues?.length ? `<div class="small">${item.cues.join(' • ')}</div>` : ''}
        </div>
        <button class="btn danger" type="button" data-remove="${idx}">Remove</button>
      </li>
    `).join('');
  }

  function render(secondsLeft = state.phase === 'rest' ? state.rest : state.work){
    const app = document.getElementById('app');
    if(!app) return;
    const total = state.phase === 'work' ? state.work : state.rest;
    const pct = total ? (100 * ((total - secondsLeft) / total)) : 0;
    const timeEl = app.querySelector('#hiit-time');
    if(timeEl) timeEl.textContent = Math.max(0, Math.ceil(secondsLeft)).toString();
    const phaseEl = app.querySelector('#hiit-phase');
    if(phaseEl) phaseEl.textContent = state.phase.toUpperCase();
    const bar = app.querySelector('#hiit-bar');
    if(bar) bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    const roundEl = app.querySelector('#round-info');
    if(roundEl) roundEl.textContent = `${state.currentRound}/${state.rounds}`;

    const exerciseEl = app.querySelector('#hiit-current');
    if(exerciseEl){
      if(state.phase === 'work' && state.plan.length){
        exerciseEl.textContent = state.plan[state.exerciseIndex]?.name || '—';
      }else if(state.phase === 'rest' && state.plan.length){
        const nextIdx = (state.exerciseIndex + 1) % state.plan.length;
        exerciseEl.textContent = `Rest · Upcoming: ${state.plan[nextIdx].name}`;
      }else if(state.phase === 'done'){
        exerciseEl.textContent = 'Workout complete!';
      }else{
        exerciseEl.textContent = state.plan.length ? 'Ready' : 'Add HIIT moves to begin';
      }
      exerciseEl.classList.toggle('resting', state.phase === 'rest');
      exerciseEl.classList.toggle('complete', state.phase === 'done');
    }

    const cuesEl = app.querySelector('#hiit-cues');
    if(cuesEl){
      let cues = [];
      let placeholder = 'Add a HIIT move to see coaching cues.';
      if(state.plan.length){
        if(state.phase === 'work'){
          cues = state.plan[state.exerciseIndex]?.cues ?? [];
          placeholder = 'No saved cues for this move yet.';
        }else if(state.phase === 'rest'){
          const nextIdx = (state.exerciseIndex + 1) % state.plan.length;
          cues = state.plan[nextIdx]?.cues ?? [];
          placeholder = cues.length ? 'Preview cues for the next interval.' : 'No saved cues for the upcoming move.';
        }else if(state.phase === 'done'){
          placeholder = 'Session complete — hydrate and recover!';
        }else{
          const first = state.plan[0];
          cues = first?.cues ?? [];
          placeholder = cues.length ? 'Preview cues for your first interval.' : 'No saved cues for this move yet.';
        }
      }
      cuesEl.innerHTML = cues.length
        ? cues.map(cue => `<li>${cue}</li>`).join('')
        : `<li class="empty">${placeholder}</li>`;
    }

    const planItems = app.querySelectorAll('#hiit-plan .plan-item');
    if(planItems.length){
      const activeIdx = state.plan.length
        ? (state.phase === 'rest' ? (state.exerciseIndex + 1) % state.plan.length : state.exerciseIndex)
        : -1;
      planItems.forEach((el, idx) => {
        if(idx === activeIdx && state.phase !== 'done') el.classList.add('active');
        else el.classList.remove('active');
      });
    }
  }

  function start(){
    if(!state.plan.length){
      setStatus('Add at least one exercise before starting.');
      return;
    }
    state.phase = 'work';
    state.currentRound = 1;
    state.duration = state.work;
    state.startTs = performance.now();
    state.exerciseIndex = 0;
    setStatus('');
    render(state.work);
    tick();
    beep(880, 0.08);
  }

  function tick(){
    if(state.phase === 'done') return;
    const now = performance.now();
    const elapsed = (now - state.startTs) / 1000;
    const left = Math.max(0, state.duration - elapsed);
    render(left);

    if(left <= 0.01){
      if(state.phase === 'work'){
        state.phase = 'rest';
        state.duration = state.rest;
        state.startTs = performance.now();
        beep(440, 0.06);
      }else if(state.phase === 'rest'){
        if(state.currentRound >= state.rounds){
          state.phase = 'done';
          setStatus('Nice work! Session complete.');
          beep(660,0.2);
        }else{
          state.phase = 'work';
          state.currentRound++;
          if(state.plan.length){
            state.exerciseIndex = (state.exerciseIndex + 1) % state.plan.length;
          }
          state.duration = state.work;
          state.startTs = performance.now();
          beep(880,0.08);
        }
      }
    }
    if(state.phase !== 'done') requestAnimationFrame(tick);
  }

  function onStart(e){
    e.preventDefault();
    state.work = parseInt(document.getElementById('work').value, 10) || 20;
    state.rest = parseInt(document.getElementById('rest').value, 10) || 10;
    state.rounds = parseInt(document.getElementById('rounds').value, 10) || 8;
    start();
  }

  function addExercise(e){
    e.preventDefault();
    const select = document.getElementById('hiit-select');
    const exId = select.value;
    if(!exId) return;
    const exercise = state.available.find(ex => ex.id === exId);
    if(!exercise) return;
    state.plan.push({ id: exId, name: exercise.name, cues: exercise.cues || [] });
    select.value = '';
    setStatus('');
    renderPlanList();
    render();
  }

  function onPlanClick(e){
    const btn = e.target.closest('button[data-remove]');
    if(!btn) return;
    const index = parseInt(btn.dataset.remove, 10);
    if(Number.isNaN(index)) return;
    state.plan.splice(index, 1);
    if(state.exerciseIndex >= state.plan.length){
      state.exerciseIndex = Math.max(0, state.plan.length - 1);
    }
    if(!state.plan.length){
      setStatus('Add at least one exercise before starting.');
    }else{
      setStatus('');
    }
    renderPlanList();
    render();
  }

  setTimeout(() => {
    fetch('../exercises.json')
      .then(res => res.json())
      .then(data => {
        state.available = data.filter(ex => ex.type === 'hiit');
        const select = document.getElementById('hiit-select');
        if(select){
          select.innerHTML = '<option value="">Select HIIT move…</option>' +
            state.available.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join('');
        }
      })
      .catch(() => {
        const select = document.getElementById('hiit-select');
        if(select){
          select.innerHTML = '<option value="">Unable to load</option>';
        }
      });

    document.getElementById('hiit-add-form')?.addEventListener('submit', addExercise);
    document.getElementById('hiit-plan')?.addEventListener('click', onPlanClick);
    document.getElementById('hiit-start')?.addEventListener('click', onStart);
    renderPlanList();
    render();
    if(!state.plan.length){
      setStatus('Add at least one exercise before starting.');
    }
  }, 0);

  return `
    <section class="card">
      <h2>Build HIIT Circuit</h2>
      <form id="hiit-add-form" class="row">
        <div style="flex:1 1 220px;min-width:200px;">
          <div class="label">Exercise</div>
          <select id="hiit-select" class="input">
            <option value="">Loading…</option>
          </select>
        </div>
        <div style="align-self:flex-end;">
          <button class="btn primary" type="submit">Add</button>
        </div>
      </form>
      <ul id="hiit-plan" class="plan-list">
        <li class="empty small">Loading…</li>
      </ul>
    </section>
    <section class="card">
      <h2>HIIT</h2>
      <div class="grid cols-3">
        <div>
          <div class="label">Work (s)</div>
          <input id="work" class="input" type="number" value="20" min="5" max="300">
        </div>
        <div>
          <div class="label">Rest (s)</div>
          <input id="rest" class="input" type="number" value="10" min="0" max="300">
        </div>
        <div>
          <div class="label">Rounds</div>
          <input id="rounds" class="input" type="number" value="8" min="1" max="50">
        </div>
      </div>
      <div class="row" style="margin-top:12px">
        <button id="hiit-start" class="btn primary">Start</button>
        <span id="hiit-status" class="small"></span>
      </div>
    </section>
    <section class="card">
      <div class="small">Phase</div>
      <div id="hiit-phase" class="small">READY</div>
      <div class="timer" id="hiit-time">0</div>
      <div id="hiit-current" class="current-callout">Add HIIT moves to begin</div>
      <div class="progress"><div id="hiit-bar" style="width:0%"></div></div>
      <div class="small">Round <span id="round-info">0/0</span></div>
      <div class="label" style="margin-top:12px">Technique cues</div>
      <ul id="hiit-cues" class="cues-list">
        <li class="empty">Add a HIIT move to see coaching cues.</li>
      </ul>
    </section>
  `;
}
