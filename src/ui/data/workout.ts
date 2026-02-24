export interface Exercise {
  name: string
  sets: number
  reps: string
  restSec: number
  note?: string
}

export interface Workout {
  type: 'push'|'pull'|'legs'|'rest'
  title: string
  exercises: Exercise[]
}

const REST_COMPOUND = 120
const REST_ISO = 60

export const PPL: Record<Workout['type'], Workout> = {
  push: {
    type:'push',
    title:'PUSH • Peito/Ombro/Tríceps',
    exercises: [
      { name:'Supino barra', sets:4, reps:'6–8', restSec:REST_COMPOUND },
      { name:'Supino inclinado halter', sets:3, reps:'8–10', restSec:REST_COMPOUND },
      { name:'Desenvolvimento halter', sets:3, reps:'8–10', restSec:REST_COMPOUND },
      { name:'Elevação lateral', sets:4, reps:'12–15', restSec:REST_ISO },
      { name:'Tríceps (testa/mergulho)', sets:3, reps:'10–12', restSec:REST_ISO }
    ]
  },
  pull: {
    type:'pull',
    title:'PULL • Costas/Bíceps',
    exercises: [
      { name:'Barra fixa', sets:4, reps:'6–8', restSec:REST_COMPOUND, note:'Se preciso: elástico' },
      { name:'Remada barra', sets:4, reps:'8–10', restSec:REST_COMPOUND },
      { name:'Remada halter', sets:3, reps:'10', restSec:REST_COMPOUND },
      { name:'Face pull / posterior', sets:3, reps:'12', restSec:REST_ISO },
      { name:'Rosca direta', sets:3, reps:'10–12', restSec:REST_ISO }
    ]
  },
  legs: {
    type:'legs',
    title:'LEGS • Pernas',
    exercises: [
      { name:'Agachamento', sets:4, reps:'5–8', restSec:REST_COMPOUND },
      { name:'Terra romeno', sets:3, reps:'8–10', restSec:REST_COMPOUND },
      { name:'Búlgaro/avanço', sets:3, reps:'10', restSec:REST_COMPOUND },
      { name:'Panturrilha', sets:4, reps:'12–15', restSec:REST_ISO },
      { name:'Abdominal', sets:3, reps:'até quase falhar', restSec:REST_ISO }
    ]
  },
  rest: { type:'rest', title:'DESCANSO', exercises: [] }
}

export function workoutForDate(d = new Date()): Workout {
  const day = d.getDay() // 0=Sun
  if (day === 0) return PPL.rest
  if (day === 1) return PPL.push
  if (day === 2) return PPL.pull
  if (day === 3) return PPL.legs
  if (day === 4) return PPL.push
  if (day === 5) return PPL.pull
  return PPL.legs
}
