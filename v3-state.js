'use strict';
function uid(prefix='id'){ return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }
function num(value, fallback=0){ const n=Number(value); return Number.isFinite(n)?n:fallback; }
function clamp(value,min,max){ return Math.min(max,Math.max(min,value)); }
function escapeHtml(value){ return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function dateKey(date=new Date()){ const d=new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function parseDate(key){ return new Date(`${String(key).slice(0,10)}T12:00:00`); }
function addDays(date,days){ const d=new Date(date); d.setDate(d.getDate()+days); return d; }
function startOfWeek(date=new Date()){ const d=new Date(date); d.setHours(0,0,0,0); const day=d.getDay(); d.setDate(d.getDate()+(day===0?-6:1-day)); return d; }
function weekKey(date=new Date()){ return dateKey(startOfWeek(date)); }
function formatDate(value, options={day:'numeric',month:'short',year:'numeric'}){ return new Intl.DateTimeFormat('es-MX',options).format(typeof value==='string'?parseDate(value):new Date(value)); }
function formatDuration(seconds){ const s=Math.max(0,Math.round(num(seconds))); const h=String(Math.floor(s/3600)).padStart(2,'0'); const m=String(Math.floor((s%3600)/60)).padStart(2,'0'); const sec=String(s%60).padStart(2,'0'); return `${h}:${m}:${sec}`; }
function showToast(message){ const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>el.classList.remove('show'),1800); }
function libraryExercise(name){ const pool=[...EXERCISE_LIBRARY,...(state?.customExercises||[])]; return pool.find(e=>e.name.toLocaleLowerCase('es')===String(name).toLocaleLowerCase('es')); }
function normalizeSecondary(items=[]){ return items.map(item=>Array.isArray(item)?{muscle:item[0],factor:num(item[1],.5)}:typeof item==='string'?{muscle:item,factor:.5}:{muscle:item.muscle,factor:num(item.factor,.5)}).filter(x=>MUSCLES.includes(x.muscle)); }
function planFromExercise(exercise){ return { id:uid('plan'), name:exercise.name, icon:exercise.icon||'🏋️', primaryMuscle:exercise.primary, secondaryMuscles:normalizeSecondary(exercise.secondary), equipment:exercise.equipment||'Otro', setsTarget:3, repMin:exercise.rep?.[0]||8, repMax:exercise.rep?.[1]||12, targetRir:2, restSeconds:exercise.rest||120, increment:exercise.increment??2.5 }; }
function defaultRoutineObject(raw){ return { ...raw, exercises:raw.exercises.map(name=>planFromExercise(libraryExercise(name))).filter(Boolean) }; }
function defaultState(){ return {
  version:APP_VERSION, updatedAt:new Date().toISOString(),
  profile:{name:'',sex:'',age:'',height:'',weight:'',waterGoal:0},
  muscleTargets:structuredClone(DEFAULT_TARGETS), sessions:[], activeSession:null,
  routines:DEFAULT_ROUTINES.map(defaultRoutineObject), mesocycles:[], activeMesocycleId:null,
  recovery:{}, measurements:[], waterHistory:{}, dayStatus:{}, customExercises:[],
  settings:{restTargetSeconds:180,overRestSeconds:300,barWeight:20,wakeLock:true,autoRest:true,cloud:{url:'',anonKey:'',email:'',autoSync:false}},
  migrationCompleted:false,v3MigrationCompleted:false
}; }
function normalizeState(raw){ const base=defaultState(); if(!raw||typeof raw!=='object')return base; return {
  ...base,...raw,version:APP_VERSION, profile:{...base.profile,...(raw.profile||{})},
  muscleTargets:{...base.muscleTargets,...(raw.muscleTargets||{})}, settings:{...base.settings,...(raw.settings||{}),cloud:{...base.settings.cloud,...(raw.settings?.cloud||{})}},
  sessions:Array.isArray(raw.sessions)?raw.sessions:[], routines:Array.isArray(raw.routines)&&raw.routines.length?raw.routines:base.routines,
  mesocycles:Array.isArray(raw.mesocycles)?raw.mesocycles:[], recovery:raw.recovery&&typeof raw.recovery==='object'?raw.recovery:{},
  measurements:Array.isArray(raw.measurements)?raw.measurements:[], waterHistory:raw.waterHistory&&typeof raw.waterHistory==='object'?raw.waterHistory:{},
  dayStatus:raw.dayStatus&&typeof raw.dayStatus==='object'?raw.dayStatus:{}, customExercises:Array.isArray(raw.customExercises)?raw.customExercises:[],
  activeSession:raw.activeSession&&typeof raw.activeSession==='object'?raw.activeSession:null
}; }
function loadState(){ try{return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'));}catch(e){console.error(e);return defaultState();} }
state=loadState();
function migrateV2(){
  if(state.v3MigrationCompleted)return;
  state.routines=(state.routines||[]).map(r=>({
    ...r,
    exercises:(r.exercises||[]).map(ex=>typeof ex==='string'
      ? planFromExercise(libraryExercise(ex))
      : {...ex,setsTarget:num(ex.setsTarget,3),repMin:num(ex.repMin,8),repMax:num(ex.repMax,12),targetRir:num(ex.targetRir,2),restSeconds:num(ex.restSeconds,120),increment:num(ex.increment,2.5)})
  }));
  state.sessions=(state.sessions||[]).map(session=>({
    ...session,
    readiness:session.readiness||null,
    exercises:(session.exercises||[]).map(ex=>{
      const preset=libraryExercise(ex.name);
      const p=preset?planFromExercise(preset):null;
      return {
        ...ex,
        plan:ex.plan||(p?{setsTarget:p.setsTarget,repMin:p.repMin,repMax:p.repMax,targetRir:p.targetRir,restSeconds:p.restSeconds,increment:p.increment}:null),
        sets:(ex.sets||[]).map(set=>({...set,completedAt:set.completedAt||null}))
      };
    })
  }));
  state.version=3;
  state.v3MigrationCompleted=true;
  saveState(false);
}
function saveState(sync=true){ state.updatedAt=new Date().toISOString(); localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); if(sync&&state.settings.cloud.autoSync)scheduleCloudPush(); }
function getAllExercises(){ const map=new Map(); [...EXERCISE_LIBRARY,...(state?.customExercises||[])].forEach(e=>{if(e?.name)map.set(e.name.toLocaleLowerCase('es'),e);}); return [...map.values()]; }
function getSessionsForWeek(key){ const start=parseDate(key),end=addDays(start,7); return state.sessions.filter(s=>{const d=parseDate(s.date||dateKey(s.startedAt));return d>=start&&d<end;}); }
function workingSets(exercise){ return (exercise.sets||[]).filter(s=>!s.warmup&&num(s.reps)>0); }
function sessionStats(session){ let working=0,hard=0,tonnage=0; for(const ex of session.exercises||[])for(const set of workingSets(ex)){working++; if(set.rir!==''&&set.rir!=null&&num(set.rir,99)<=3)hard++; tonnage+=num(set.weight)*num(set.reps);} const end=session.endedAt||Date.now(); return {working,hard,tonnage,duration:session.startedAt?Math.max(0,(end-session.startedAt)/1000):0}; }
function muscleVolume(sessions){ const result=Object.fromEntries(MUSCLES.map(m=>[m,{direct:0,indirect:0,fractional:0,hard:0,byDay:{}}])); for(const session of sessions){const day=session.date||dateKey(session.startedAt); for(const ex of session.exercises||[]){for(const set of workingSets(ex)){const isHard=set.rir!==''&&set.rir!=null&&num(set.rir,99)<=3; if(result[ex.primaryMuscle]){result[ex.primaryMuscle].direct++;result[ex.primaryMuscle].fractional++;if(isHard)result[ex.primaryMuscle].hard++;result[ex.primaryMuscle].byDay[day]=(result[ex.primaryMuscle].byDay[day]||0)+1;} for(const sec of normalizeSecondary(ex.secondaryMuscles)){if(sec.muscle===ex.primaryMuscle)continue;result[sec.muscle].indirect+=sec.factor;result[sec.muscle].fractional+=sec.factor;if(isHard)result[sec.muscle].hard+=sec.factor;result[sec.muscle].byDay[day]=(result[sec.muscle].byDay[day]||0)+sec.factor;}}}} return result; }
function readinessFor(key=dateKey()){ const r=state.recovery[key]; if(!r)return null; const sleepHours=clamp(num(r.sleepHours,7),0,10); const sleepQuality=clamp(num(r.sleepQuality,3),1,5); const energy=clamp(num(r.energy,3),1,5); const stress=clamp(num(r.stress,3),1,5); const soreness=clamp(num(r.soreness,2),1,5); const jointPain=clamp(num(r.jointPain,1),1,5); const score=Math.round(clamp((sleepHours/8)*25+(sleepQuality/5)*20+(energy/5)*25+((6-stress)/5)*12+((6-soreness)/5)*10+((6-jointPain)/5)*8,0,100)); return {...r,score}; }
function performanceForExercise(name){ return [...state.sessions].sort((a,b)=>num(b.startedAt)-num(a.startedAt)).flatMap(s=>(s.exercises||[]).filter(e=>e.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es')).map(e=>({session:s,exercise:e,sets:workingSets(e)}))).filter(x=>x.sets.length); }
function progressionSuggestion(plan){ const history=performanceForExercise(plan.name); if(!history.length)return {weight:'',label:'Primera sesión: usa una carga que permita el RIR objetivo.',action:'Base'}; const last=history[0]; const weights=last.sets.map(s=>num(s.weight)); const weight=weights.length?Math.max(...weights):0; const reps=last.sets.map(s=>num(s.reps)); const avgRir=last.sets.reduce((a,s)=>a+num(s.rir,plan.targetRir),0)/last.sets.length; const allTop=reps.length>=plan.setsTarget&&reps.slice(0,plan.setsTarget).every(r=>r>=plan.repMax); const veryHard=avgRir<Math.max(0,plan.targetRir-1); let next=weight,action='Mantener',label=`Última vez: ${weight||'PC'} kg · ${reps.join(', ')} reps · RIR medio ${avgRir.toFixed(1)}.`; if(allTop&&avgRir>=plan.targetRir){next=weight+num(plan.increment,2.5);action='Subir';label+=` Completaste el rango: prueba ${next} kg.`;} else if(veryHard&&history[1]){const prevTotal=history[1].sets.reduce((a,s)=>a+num(s.reps),0),lastTotal=reps.reduce((a,r)=>a+r,0); if(lastTotal<prevTotal*.9){next=Math.max(0,Math.round((weight*.95)*2)/2);action='Reducir';label+=` El rendimiento cayó: considera ${next} kg o menos series.`;}} else label+=` Mantén ${weight||'la misma carga'} e intenta sumar repeticiones.`; return {weight:next||'',action,label}; }
function sessionAdherence(session){ const planned=(session.exercises||[]).reduce((a,e)=>a+num(e.plan?.setsTarget),0); const completed=(session.exercises||[]).reduce((a,e)=>a+workingSets(e).length,0); return planned?Math.round(Math.min(1,completed/planned)*100):100; }
function coachSummary(){ const key=weekKey(),sessions=getSessionsForWeek(key),volume=muscleVolume(sessions),stats=sessions.reduce((a,s)=>{const x=sessionStats(s);a.hard+=x.hard;a.tonnage+=x.tonnage;return a;},{hard:0,tonnage:0}); const under=MUSCLES.filter(m=>volume[m].fractional<(state.muscleTargets[m]?.min||0)).sort((a,b)=>volume[a].fractional-volume[b].fractional).slice(0,3); const over=MUSCLES.filter(m=>volume[m].fractional>(state.muscleTargets[m]?.max||99)); const ready=readinessFor(); let text=sessions.length?`Llevas ${sessions.length} sesiones y ${stats.hard} series cerca del fallo.`:'Todavía no has registrado sesiones esta semana.'; if(under.length)text+=` Prioridad pendiente: ${under.join(', ')}.`; if(over.length)text+=` Volumen elevado en ${over.join(', ')}.`; if(ready&&ready.score<55)text+=` Tu recuperación de hoy es baja; considera mantener cargas o reducir una serie.`; return text; }
