'use strict';
const EXERCISES_LOWER = [
  { name:'Sentadilla', icon:'🏋️', region:'lower', primary:'Cuádriceps', secondary:[['Glúteos',.5],['Aductores',.33],['Erectores espinales',.33]], equipment:'Barra', rep:[5,10], rest:210, increment:2.5 },
  { name:'Prensa de piernas', icon:'🦵', region:'lower', primary:'Cuádriceps', secondary:[['Glúteos',.5],['Aductores',.33]], equipment:'Máquina', rep:[8,15], rest:180, increment:10 },
  { name:'Hack squat', icon:'📐', region:'lower', primary:'Cuádriceps', secondary:[['Glúteos',.5]], equipment:'Máquina', rep:[6,12], rest:180, increment:5 },
  { name:'Extensión de rodilla', icon:'🦿', region:'lower', primary:'Cuádriceps', secondary:[], equipment:'Máquina', rep:[10,20], rest:90, increment:2.5 },
  { name:'Peso muerto rumano', icon:'🏗️', region:'lower', primary:'Isquiotibiales', secondary:[['Glúteos',.5],['Erectores espinales',.33]], equipment:'Barra', rep:[6,12], rest:180, increment:2.5 },
  { name:'Curl femoral sentado', icon:'🪑', region:'lower', primary:'Isquiotibiales', secondary:[], equipment:'Máquina', rep:[8,15], rest:90, increment:2.5 },
  { name:'Curl femoral acostado', icon:'🛏️', region:'lower', primary:'Isquiotibiales', secondary:[], equipment:'Máquina', rep:[8,15], rest:90, increment:2.5 },
  { name:'Hip thrust', icon:'🌉', region:'lower', primary:'Glúteos', secondary:[['Isquiotibiales',.33]], equipment:'Barra', rep:[6,12], rest:150, increment:5 },
  { name:'Patada de glúteo', icon:'🦵', region:'lower', primary:'Glúteos', secondary:[], equipment:'Polea', rep:[10,20], rest:75, increment:2.5 },
  { name:'Zancadas', icon:'🚶', region:'lower', primary:'Cuádriceps', secondary:[['Glúteos',.5],['Aductores',.25]], equipment:'Mancuernas', rep:[8,15], rest:120, increment:2 },
  { name:'Elevación de pantorrillas de pie', icon:'⬆️', region:'lower', primary:'Pantorrillas', secondary:[], equipment:'Máquina', rep:[8,20], rest:75, increment:5 },
  { name:'Elevación de pantorrillas sentado', icon:'🪑', region:'lower', primary:'Pantorrillas', secondary:[], equipment:'Máquina', rep:[10,25], rest:75, increment:2.5 },
  { name:'Aductor en máquina', icon:'↔️', region:'lower', primary:'Aductores', secondary:[], equipment:'Máquina', rep:[10,20], rest:75, increment:5 },
  { name:'Hiperextensiones', icon:'🗼', region:'lower', primary:'Erectores espinales', secondary:[['Glúteos',.5],['Isquiotibiales',.5]], equipment:'Peso corporal', rep:[8,20], rest:90, increment:5 }
];
