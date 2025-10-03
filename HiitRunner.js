// app/components/HiitRunner.js
import { beep } from './beep.js';

export function HiitRunner(){
  let state = {
    work: 20, rest: 10, rounds: 8,
    phase: 'ready', // ready|work|rest|done
    currentRound: 0, startTs: 0, duration: 0
  };

  function start(){
    state.phase = 'work';
    state.currentRound = 1;
    state.duration = state.work;
    state.startTs = performance.now();
    tick();
    beep(880, 0.08);
  }

  function tick(){
    if(state.phase==='done') return;
    const now = performance.now();
    const elapsed = (now - state.startTs)/1000;
    const left = Math.max(0, state.duration - elapsed);
    render(left);

    if(left <= 0.01){
      if(state.phase==='work'){
        state.phase = 'rest';
        state.duration = state.rest;
        state.startTs = performance.now();
        beep(440, 0.06);
      }else if(state.phase==='rest'){
        if(state.currentRound >= state.rounds){
          state.phase='done'; beep(660,0.2);
        }else{
          state.phase='work'; state.currentRound++; state.duration=state.work; state.startTs=performance.now(); beep(880,0.08);
        }
      }
    }
    if(state.phase!=='done') requestAnimationFrame(tick);
  }

  function render(secondsLeft=state.work){
    const app = document.getElementById('app');
    const total = state.phase==='work'?state.work:state.rest;
    const pct = total? (100*((total-secondsLeft)/total)) : 0;
    app.querySelector('#hiit-time').textContent = Math.ceil(secondsLeft).toString();
    app.querySelector('#hiit-phase').textContent = state.phase.toUpperCase();
    const bar = app.querySelector('#hiit-bar');
    if(bar) bar.style.width = pct + '%';
    app.querySelector('#round-info').textContent = `${state.currentRound}/${state.rounds}`;
  }

  function onStart(e){
    e.preventDefault();
    state.work = parseInt(document.getElementById('work').value, 10)||20;
    state.rest = parseInt(document.getElementById('rest').value, 10)||10;
    state.rounds = parseInt(document.getElementById('rounds').value, 10)||8;
    start();
  }

  setTimeout(() => {
    document.getElementById('hiit-start').addEventListener('click', onStart);
  }, 0);

  return `
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
      </div>
    </section>
    <section class="card">
      <div class="small">Phase</div>
      <div id="hiit-phase" class="small">READY</div>
      <div class="timer" id="hiit-time">0</div>
      <div class="progress"><div id="hiit-bar" style="width:0%"></div></div>
      <div class="small">Round <span id="round-info">0/0</span></div>
    </section>
  `;
}
