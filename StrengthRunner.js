// app/components/StrengthRunner.js
import { beep } from './beep.js';

export function StrengthRunner(){
  const defaultPlan = [
    { name:'Goblet Squat', reps:10, sets:3, rest:60 },
    { name:'Push‑Ups', reps:10, sets:3, rest:60 },
    { name:'Bent‑Over Row', reps:12, sets:3, rest:60 }
  ];
  let idx=0, setNum=1, resting=false, restEnd=0;

  function completeSet(){
    const current = defaultPlan[idx];
    if(setNum < current.sets){
      setNum++; startRest(current.rest);
    }else{
      if(idx < defaultPlan.length-1){
        idx++; setNum=1; startRest(90);
      }else{
        document.getElementById('strength-status').textContent = 'All done!';
        beep(660,0.2);
      }
    }
  }

  function startRest(seconds){
    resting = true; restEnd = performance.now() + seconds*1000;
    tick();
  }

  function tick(){
    if(!resting) return;
    const left = Math.max(0, (restEnd - performance.now())/1000);
    document.getElementById('rest-time').textContent = Math.ceil(left).toString();
    const pct = (1 - (left/((restEnd - (restEnd - 1000*parseFloat(document.getElementById('rest-time').dataset.total||'1')))/1000)));
    if(left<=0.01){
      resting=false; beep(880,0.08);
      document.getElementById('rest-time').textContent = '0';
    }else{
      requestAnimationFrame(tick);
    }
  }

  function onComplete(e){
    e.preventDefault();
    completeSet();
    renderDetails();
  }

  function renderDetails(){
    const curr = defaultPlan[idx];
    document.getElementById('ex-name').textContent = curr.name;
    document.getElementById('ex-sets').textContent = `${setNum}/${curr.sets}`;
    document.getElementById('ex-reps').textContent = `${curr.reps}`;
    document.getElementById('rest-time').dataset.total = curr.rest;
  }

  setTimeout(()=>{
    document.getElementById('set-done').addEventListener('click', onComplete);
    renderDetails();
  },0);

  return `
  <section class="card">
    <h2>Strength (Minimal Demo)</h2>
    <div class="grid cols-3">
      <div><div class="label">Exercise</div><div id="ex-name">—</div></div>
      <div><div class="label">Set</div><div id="ex-sets">—</div></div>
      <div><div class="label">Target Reps</div><div id="ex-reps">—</div></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button id="set-done" class="btn success">Complete Set</button>
      <span id="strength-status" class="small"></span>
    </div>
  </section>
  <section class="card">
    <div class="label">Rest</div>
    <div class="timer" id="rest-time" data-total="60">0</div>
    <div class="small">Auto‑beep when rest finishes.</div>
  </section>
  `;
}
