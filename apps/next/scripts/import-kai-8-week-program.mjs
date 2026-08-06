/**
 * Import "8-Week Training Calendar" for Kai Tranchant.
 * Week 1 starts Monday 2026-08-03. AM/PM same-day sessions are separate workouts.
 *
 * Run: node scripts/import-kai-8-week-program.mjs
 */
import { createClient } from '@supabase/supabase-js'

import loadEnvLocal from './load-env-local.mjs'

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const PROGRAM_NAME = '8-Week Training Calendar'
const CLIENT_NAME = 'Kai Tranchant'
const START_DATE = '2026-08-03'

const DEFAULT_TRACKING = {
  completionLift: false,
  bodyweight: false,
  coachCompletes: false,
  disablePrTracking: false,
  forcePrUpdate: false,
  trackBarSpeed: false,
  trackPeakPower: false,
  trackTime: false,
  trackReps: true,
  trackVolume: true,
  autoProgressLoad: false,
}

const TIME_TRACKING = {
  ...DEFAULT_TRACKING,
  trackTime: true,
  trackReps: false,
  trackVolume: false,
}

const DISTANCE_TRACKING = {
  ...DEFAULT_TRACKING,
  trackReps: false,
  trackVolume: false,
}

/** Preferred library names / aliases for resolveExercise */
const EXERCISE_ALIASES = {
  Running: ['Running, Treadmill', 'Trail Running/Walking', 'Running'],
  'Barbell Squat': ['Barbell Squat'],
  'Romanian Deadlift': ['Romanian Deadlift'],
  'Walking Lunges': [
    'Barbell Walking Lunge',
    'Walking Lunge',
    'Bodyweight Walking Lunge',
  ],
  'Weighted Plank': ['Weighted Plank', 'Plank'],
  'Bench Press': [
    'Barbell Bench Press - Medium Grip',
    'Bench Press - Powerlifting',
  ],
  'Weighted Pull-ups': ['Weighted Pull-ups', 'Pull-Ups'],
  'Push Press': ['Push Press'],
  'Barbell Row': ['Bent Over Barbell Row'],
  'Incline DB Press': ['Incline Dumbbell Press'],
  'Lat Pulldown': ['Wide-Grip Lat Pulldown', 'Close-Grip Front Lat Pulldown'],
  'Seated DB Shoulder Press': ['Dumbbell Shoulder Press'],
  'Cable Row': ['Seated Cable Rows', 'Wide Grip Cable Row'],
  'Lateral Raises': ['Side Lateral Raise', 'Seated Side Lateral Raise'],
  'DB Curl': ['Dumbbell Bicep Curl', 'Dumbbell Alternate Bicep Curl'],
  'Triceps Pushdown': ['Triceps Pushdown'],
  'Face Pulls': ['Face Pull'],
  'Reverse Lunges': ['Barbell Reverse Lunge', 'DB Reverse Lunge'],
  'Hanging Knee Raises': ['Hanging Knee Raises', 'Hanging Leg Raise'],
  SkiErg: ['SkiErg', 'Ski Erg'],
  'Box Step-overs': ['Box Step Over'],
  'Med Ball Slams': [
    'Horizontal Med Ball Slam',
    'Rotational Med Ball Slam',
    'One-Arm Medicine Ball Slam',
    'Overhead Slam',
  ],
  'Sled Push/Pull': ['Sled Push/Pull'],
  Rowing: ['Rowing', 'Rowing, Stationary'],
  'Air Bike': ['Air Bike', 'air bike'],
  "Farmer's Carry": ["Farmer's Walk", 'Offset Farmer Carry', 'Rickshaw Carry'],
  'Kettlebell Swings': ['Kettlebell Swing'],
  'Box Jumps': ['Box Jump (Multiple Response)', 'Front Box Jump'],
  'Wall Balls': ['Wall Balls', 'Wall Ball'],
  'Sandbag/DB Carry': ['Sandbag/DB Carry', "Farmer's Walk", 'Sandbag Load'],
  Burpees: ['Burpees', 'Burpee + Broad Jump'],
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function strength(name, sets, reps, extras = {}) {
  return {
    name,
    sets: String(sets),
    reps: String(reps),
    rep_mode: 'reps',
    each_side: Boolean(extras.eachSide),
    rest_seconds: extras.rest ?? null,
    weight_percent: extras.pct != null ? String(extras.pct) : null,
    workout_notes: extras.notes ?? null,
    prescription: extras.prescription ?? null,
    tracking_options: { ...DEFAULT_TRACKING },
    superset_group: extras.superset ?? null,
    exercise_block: extras.block ?? 'main_lift',
  }
}

function timed(name, sets, seconds, extras = {}) {
  return {
    name,
    sets: String(sets),
    reps: String(seconds),
    rep_mode: 'time',
    each_side: false,
    rest_seconds: extras.rest ?? null,
    weight_percent: null,
    workout_notes: extras.notes ?? null,
    prescription: extras.prescription ?? null,
    tracking_options: { ...TIME_TRACKING },
    superset_group: extras.superset ?? null,
    exercise_block: extras.block ?? 'core',
  }
}

function distance(name, sets, reps, extras = {}) {
  return {
    name,
    sets: String(sets),
    reps: String(reps),
    rep_mode: 'distance',
    each_side: false,
    rest_seconds: extras.rest ?? null,
    weight_percent: null,
    workout_notes: extras.notes ?? null,
    prescription: extras.prescription ?? null,
    tracking_options: { ...DISTANCE_TRACKING },
    superset_group: extras.superset ?? null,
    exercise_block: extras.block ?? 'conditioning',
  }
}

function circuitMove(name, reps, extras = {}) {
  return {
    name,
    sets: String(extras.rounds),
    reps: String(reps),
    rep_mode: extras.mode ?? 'reps',
    each_side: false,
    rest_seconds: extras.rest != null ? String(extras.rest) : null,
    weight_percent: null,
    workout_notes: extras.notes ?? null,
    prescription: null,
    tracking_options:
      extras.mode === 'distance'
        ? { ...DISTANCE_TRACKING }
        : extras.mode === 'time'
          ? { ...TIME_TRACKING }
          : { ...DEFAULT_TRACKING },
    superset_group: 'A',
    exercise_block: 'conditioning',
  }
}

function runWorkout(name, notes) {
  return {
    name,
    notes: 'Single running session — full protocol in exercise notes.',
    exercises: [
      {
        name: 'Running',
        sets: '1',
        reps: '',
        rep_mode: 'reps',
        each_side: false,
        rest_seconds: null,
        weight_percent: null,
        workout_notes: notes,
        prescription: null,
        tracking_options: {
          ...DEFAULT_TRACKING,
          trackReps: false,
          trackVolume: false,
          trackTime: true,
        },
        superset_group: null,
        exercise_block: 'conditioning',
      },
    ],
  }
}

function conditioningWorkout(letter, rounds, restSec, movements) {
  const labels = { A: 'Conditioning A', B: 'Conditioning B', C: 'Conditioning C' }
  return {
    name: `PM ${labels[letter]}`,
    notes: `Format: ${rounds} rounds, rest ${restSec} sec between rounds. Minimal transition time between movements.`,
    exercises: movements.map((move, index) =>
      circuitMove(move.name, move.reps, {
        rounds,
        rest: index === movements.length - 1 ? restSec : 0,
        mode: move.mode,
        notes: move.notes,
      })
    ),
  }
}

const COND_B = [
  { name: 'SkiErg', reps: '300m', mode: 'distance' },
  { name: 'Box Step-overs', reps: '15' },
  { name: 'Med Ball Slams', reps: '15' },
  { name: 'Sled Push/Pull', reps: '40m', mode: 'distance' },
]

const COND_A = [
  { name: 'Rowing', reps: '300m', mode: 'distance' },
  { name: 'Air Bike', reps: '15', notes: '15 calories' },
  { name: "Farmer's Carry", reps: '40m', mode: 'distance' },
  { name: 'Kettlebell Swings', reps: '15' },
  { name: 'Box Jumps', reps: '8' },
]

const COND_C = [
  { name: 'Rowing', reps: '200m', mode: 'distance' },
  { name: 'Wall Balls', reps: '15' },
  { name: 'Sandbag/DB Carry', reps: '40m', mode: 'distance' },
  { name: 'Burpees', reps: '10' },
]

/** Per-week progression knobs (index 0 = week 1) */
const WEEKS = [
  {
    amRun: '10 min easy jog\n3 mi @ ~12:00-12:30/mile\n5 min cool-down',
    condB: { rounds: 3, rest: 60 },
    lower: {
      squatPct: 75,
      rdlNote: null,
      lunge: { name: 'Walking Lunges', reps: '12', eachSide: true },
      finisher: { type: 'plank', sets: 3, secs: 45, notes: 'Weighted plank' },
    },
    norwegian: '10 min warm-up\n4x4min @ ~85% max HR / 3 min jog\n10 min cool-down',
    condA: { rounds: 3, rest: 60 },
    upperHeavy: {
      benchPct: 75,
      pullups: 6,
      pushPress: 8,
      row: 10,
    },
    goalPace:
      '1 mi warm-up\n4x400m @ 1:45\n2 min rest\n10 min cool-down',
    condC: { rounds: 3, rest: 75 },
    longRun: '3 mi easy',
    hyper: {
      incline: { sets: 4, reps: 10, notes: null },
      lat: { sets: 4, reps: 10 },
      shoulder: { sets: 3, reps: 12 },
      cable: { sets: 4, reps: 10 },
      lateral: { sets: 3, reps: 15 },
      curl: { sets: 3, reps: 12 },
      pushdown: { sets: 3, reps: 12 },
      face: { sets: 3, reps: 15 },
    },
  },
  {
    amRun: '10 min easy jog\n3.5 mi @ ~11:45-12:15/mile\n5 min cool-down',
    condB: { rounds: 3, rest: 55 },
    lower: {
      squatPct: 76,
      rdlNote: '+5lb',
      lunge: { name: 'Reverse Lunges', reps: '15', eachSide: true },
      finisher: {
        type: 'hanging',
        sets: 3,
        reps: 15,
        notes: 'Hanging knee raises',
      },
    },
    norwegian: '10 min warm-up\n4x4min @ ~86% max HR / 3 min jog\n10 min cool-down',
    condA: { rounds: 3, rest: 55 },
    upperHeavy: { benchPct: 76, pullups: 7, pushPress: 8, row: 10 },
    goalPace:
      '1 mi warm-up\n5x400m @ 1:45\n2 min rest\n10 min cool-down',
    condC: { rounds: 3, rest: 70 },
    longRun: '3.5 mi easy',
    hyper: {
      incline: { sets: 4, reps: 10, notes: '+weight' },
      lat: { sets: 4, reps: 11 },
      shoulder: { sets: 3, reps: 12 },
      cable: { sets: 4, reps: 11 },
      lateral: { sets: 3, reps: 15 },
      curl: { sets: 3, reps: 12 },
      pushdown: { sets: 3, reps: 12 },
      face: { sets: 3, reps: 15 },
    },
  },
  {
    amRun: '10 min easy jog\n4 mi @ ~11:30-12:00/mile\n5 min cool-down',
    condB: { rounds: 4, rest: 55 },
    lower: {
      squatPct: 78,
      rdlNote: '+5lb',
      lunge: { name: 'Reverse Lunges', reps: '15', eachSide: true },
      finisher: { type: 'plank', sets: 3, secs: 60, notes: 'Weighted plank' },
    },
    norwegian: '10 min warm-up\n4x4min @ ~87% max HR / 3 min jog\n10 min cool-down',
    condA: { rounds: 4, rest: 55 },
    upperHeavy: { benchPct: 78, pullups: 8, pushPress: 9, row: 12 },
    goalPace:
      '1 mi warm-up\n6x400m @ 1:45\n90 sec rest\n10 min cool-down',
    condC: { rounds: 3, rest: 65 },
    longRun: '4 mi easy',
    hyper: {
      incline: { sets: 4, reps: 11, notes: null },
      lat: { sets: 4, reps: 11 },
      shoulder: { sets: 3, reps: 13 },
      cable: { sets: 4, reps: 11 },
      lateral: { sets: 3, reps: 16 },
      curl: { sets: 3, reps: 13 },
      pushdown: { sets: 3, reps: 13 },
      face: { sets: 3, reps: 15 },
    },
  },
  {
    amRun: '10 min easy jog\n4.5 mi @ ~11:15-11:45/mile\n5 min cool-down',
    condB: { rounds: 4, rest: 50 },
    lower: {
      squatPct: 79,
      rdlNote: '+5lb',
      lunge: { name: 'Reverse Lunges', reps: '16', eachSide: true },
      finisher: { type: 'plank', sets: 3, secs: 60, notes: 'Weighted plank' },
    },
    norwegian: '10 min warm-up\n4x4min @ ~88% max HR / 3 min jog\n10 min cool-down',
    condA: { rounds: 4, rest: 50 },
    upperHeavy: { benchPct: 79, pullups: 8, pushPress: 9, row: 12 },
    goalPace:
      '1 mi warm-up\n4x800m @ 3:30\n2:30 rest\n10 min cool-down — first step into sustained goal-pace reps',
    condC: { rounds: 4, rest: 60 },
    longRun: '4.5 mi easy',
    hyper: {
      incline: { sets: 4, reps: 12, notes: null },
      lat: { sets: 4, reps: 12 },
      shoulder: { sets: 4, reps: 12 },
      cable: { sets: 4, reps: 12 },
      lateral: { sets: 3, reps: 16 },
      curl: { sets: 3, reps: 13 },
      pushdown: { sets: 3, reps: 13 },
      face: { sets: 3, reps: 16 },
    },
  },
  {
    amRun: '10 min easy jog\n5 mi @ ~11:00-11:30/mile\n5 min cool-down',
    condB: { rounds: 4, rest: 45 },
    lower: {
      squatPct: 81,
      rdlNote: '+5lb',
      lunge: { name: 'Reverse Lunges', reps: '16', eachSide: true },
      finisher: { type: 'plank', sets: 4, secs: 45, notes: 'Weighted plank' },
    },
    norwegian: '10 min warm-up\n4x4min @ ~89% max HR / 3 min jog\n10 min cool-down',
    condA: { rounds: 4, rest: 45 },
    upperHeavy: { benchPct: 81, pullups: 9, pushPress: 10, row: 13 },
    goalPace:
      '1 mi warm-up\n5x800m @ 3:30\n2:15 rest\n10 min cool-down',
    condC: { rounds: 4, rest: 55 },
    longRun: '5 mi easy',
    hyper: {
      incline: { sets: 4, reps: 12, notes: '+weight' },
      lat: { sets: 4, reps: 12 },
      shoulder: { sets: 4, reps: 12 },
      cable: { sets: 4, reps: 12 },
      lateral: { sets: 4, reps: 15 },
      curl: { sets: 4, reps: 12 },
      pushdown: { sets: 4, reps: 12 },
      face: { sets: 3, reps: 16 },
    },
  },
  {
    amRun: '10 min easy jog\n5.5 mi @ ~10:45-11:15/mile\n5 min cool-down',
    condB: { rounds: 5, rest: 45 },
    lower: {
      squatPct: 83,
      rdlNote: '+5lb',
      lunge: { name: 'Reverse Lunges', reps: '17', eachSide: true },
      finisher: { type: 'plank', sets: 4, secs: 50, notes: 'Weighted plank' },
    },
    norwegian: '10 min warm-up\n4x4min @ ~90% max HR / 3 min jog\n10 min cool-down',
    condA: { rounds: 5, rest: 45 },
    upperHeavy: { benchPct: 83, pullups: 9, pushPress: 10, row: 13 },
    goalPace:
      '1 mi warm-up\n3x1200m @ 5:15\n3 min rest\n10 min cool-down',
    condC: { rounds: 4, rest: 50 },
    longRun: '5.5 mi easy',
    hyper: {
      incline: { sets: 4, reps: 13, notes: null },
      lat: { sets: 4, reps: 13 },
      shoulder: { sets: 4, reps: 13 },
      cable: { sets: 4, reps: 13 },
      lateral: { sets: 4, reps: 15 },
      curl: { sets: 4, reps: 12 },
      pushdown: { sets: 4, reps: 12 },
      face: { sets: 4, reps: 15 },
    },
  },
  {
    amRun: '10 min easy jog\n6 mi @ ~10:30-11:00/mile\n5 min cool-down',
    condB: { rounds: 5, rest: 40 },
    lower: {
      squatPct: 85,
      rdlNote: '+5lb',
      lunge: { name: 'Reverse Lunges', reps: '17', eachSide: true },
      finisher: { type: 'plank', sets: 4, secs: 50, notes: 'Weighted plank' },
    },
    norwegian: '10 min warm-up\n4x4min @ ~92% max HR / 3 min jog\n10 min cool-down',
    condA: { rounds: 5, rest: 40 },
    upperHeavy: { benchPct: 85, pullups: 10, pushPress: 10, row: 14 },
    goalPace:
      '1 mi warm-up\n4x1200m @ 5:15\n2:45 rest\n10 min cool-down',
    condC: { rounds: 5, rest: 45 },
    longRun: '6 mi easy',
    hyper: {
      incline: { sets: 4, reps: 13, notes: '+weight' },
      lat: { sets: 4, reps: 13 },
      shoulder: { sets: 4, reps: 13 },
      cable: { sets: 4, reps: 13 },
      lateral: { sets: 4, reps: 16 },
      curl: { sets: 4, reps: 13 },
      pushdown: { sets: 4, reps: 13 },
      face: { sets: 4, reps: 15 },
    },
  },
  {
    amRun: '10 min easy jog\n6.5 mi @ ~10:15-10:45/mile\n5 min cool-down',
    condB: { rounds: 6, rest: 40 },
    lower: {
      squatPct: 87,
      rdlNote: '+5lb',
      lunge: { name: 'Reverse Lunges', reps: '18', eachSide: true },
      finisher: { type: 'plank', sets: 4, secs: 55, notes: 'Weighted plank' },
    },
    norwegian:
      '10 min warm-up\n4x4min @ ~93-95% max HR / 3 min jog\n10 min cool-down',
    condA: { rounds: 6, rest: 40 },
    upperHeavy: { benchPct: 87, pullups: 10, pushPress: 11, row: 14 },
    goalPace:
      '1 mi warm-up\nthen attempt 2 continuous miles @ 7:00/mile pace or faster\n10 min cool-down — this is your direct test of the running goal',
    condC: { rounds: 5, rest: 40 },
    longRun: '6.5-7 mi easy — new distance benchmark',
    hyper: {
      incline: { sets: 4, reps: 14, notes: null },
      lat: { sets: 4, reps: 14 },
      shoulder: { sets: 4, reps: 14 },
      cable: { sets: 4, reps: 14 },
      lateral: { sets: 4, reps: 16 },
      curl: { sets: 4, reps: 13 },
      pushdown: { sets: 4, reps: 13 },
      face: { sets: 4, reps: 16 },
    },
  },
]

function buildWeekWorkouts(weekIndex, week) {
  const dayBase = weekIndex * 7
  const workouts = []

  workouts.push({
    day_offset: dayBase + 0,
    ...runWorkout('AM Run', week.amRun),
  })
  workouts.push({
    day_offset: dayBase + 0,
    ...conditioningWorkout('B', week.condB.rounds, week.condB.rest, COND_B),
  })

  const lowerFinisher =
    week.lower.finisher.type === 'plank'
      ? timed('Weighted Plank', week.lower.finisher.sets, week.lower.finisher.secs, {
          notes: week.lower.finisher.notes,
          block: 'core',
        })
      : strength(
          'Hanging Knee Raises',
          week.lower.finisher.sets,
          week.lower.finisher.reps,
          { notes: week.lower.finisher.notes, block: 'core' }
        )

  workouts.push({
    day_offset: dayBase + 1,
    name: 'Lower',
    notes: null,
    exercises: [
      strength('Barbell Squat', 5, 5, {
        pct: week.lower.squatPct,
        block: 'main_lift',
      }),
      strength('Romanian Deadlift', 4, 8, {
        notes: week.lower.rdlNote,
        block: 'accessory',
      }),
      strength(week.lower.lunge.name, 3, week.lower.lunge.reps, {
        eachSide: week.lower.lunge.eachSide,
        block: 'accessory',
      }),
      lowerFinisher,
    ],
  })

  workouts.push({
    day_offset: dayBase + 2,
    ...runWorkout('AM Norwegian 4x4', week.norwegian),
  })
  workouts.push({
    day_offset: dayBase + 2,
    ...conditioningWorkout('A', week.condA.rounds, week.condA.rest, COND_A),
  })

  workouts.push({
    day_offset: dayBase + 3,
    name: 'Upper (Heavy)',
    notes: null,
    exercises: [
      strength('Bench Press', 5, 5, {
        pct: week.upperHeavy.benchPct,
        block: 'main_lift',
      }),
      strength('Weighted Pull-ups', 4, week.upperHeavy.pullups, {
        notes: 'Add external load as needed',
        block: 'accessory',
      }),
      strength('Push Press', 4, week.upperHeavy.pushPress, {
        block: 'accessory',
      }),
      strength('Barbell Row', 4, week.upperHeavy.row, { block: 'accessory' }),
    ],
  })

  const goalName =
    weekIndex === 7 ? 'AM Goal Pace / Test' : 'AM Goal Pace'
  workouts.push({
    day_offset: dayBase + 4,
    ...runWorkout(goalName, week.goalPace),
  })
  workouts.push({
    day_offset: dayBase + 4,
    ...conditioningWorkout('C', week.condC.rounds, week.condC.rest, COND_C),
  })

  workouts.push({
    day_offset: dayBase + 5,
    ...runWorkout('Long Run', week.longRun),
  })
  workouts.push({
    day_offset: dayBase + 5,
    name: 'PM Upper (Hypertrophy)',
    notes: null,
    exercises: [
      strength('Incline DB Press', week.hyper.incline.sets, week.hyper.incline.reps, {
        notes: week.hyper.incline.notes,
        block: 'main_lift',
      }),
      strength('Lat Pulldown', week.hyper.lat.sets, week.hyper.lat.reps, {
        block: 'accessory',
      }),
      strength(
        'Seated DB Shoulder Press',
        week.hyper.shoulder.sets,
        week.hyper.shoulder.reps,
        { block: 'accessory' }
      ),
      strength('Cable Row', week.hyper.cable.sets, week.hyper.cable.reps, {
        block: 'accessory',
      }),
      strength('Lateral Raises', week.hyper.lateral.sets, week.hyper.lateral.reps, {
        block: 'accessory',
      }),
      strength('DB Curl', week.hyper.curl.sets, week.hyper.curl.reps, {
        block: 'accessory',
      }),
      strength(
        'Triceps Pushdown',
        week.hyper.pushdown.sets,
        week.hyper.pushdown.reps,
        { block: 'accessory' }
      ),
      strength('Face Pulls', week.hyper.face.sets, week.hyper.face.reps, {
        block: 'accessory',
      }),
    ],
  })

  return workouts
}

function normalizeName(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ')
}

async function resolveExercise(coachId, canonicalName, cache, created) {
  if (cache.has(canonicalName)) return cache.get(canonicalName)

  const { data: allExercises, error } = await supabase
    .from('exercises')
    .select('id, name, status')
    .eq('coach_id', coachId)

  if (error) throw error

  const byNormalized = new Map()
  for (const row of allExercises ?? []) {
    byNormalized.set(normalizeName(row.name), row)
  }

  const aliases = EXERCISE_ALIASES[canonicalName] ?? [canonicalName]
  for (const alias of aliases) {
    const hit = byNormalized.get(normalizeName(alias))
    if (hit) {
      cache.set(canonicalName, hit.id)
      return hit.id
    }
  }

  // Prefer an active exact case-insensitive includes match on first alias word
  for (const alias of aliases) {
    const needle = normalizeName(alias)
    const fuzzy = (allExercises ?? []).find(
      (row) =>
        row.status === 'active' && normalizeName(row.name) === needle
    )
    if (fuzzy) {
      cache.set(canonicalName, fuzzy.id)
      return fuzzy.id
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('exercises')
    .insert({
      coach_id: coachId,
      name: canonicalName,
      source: 'custom',
      status: 'active',
      muscle_group: null,
      equipment: null,
    })
    .select('id')
    .single()

  if (insertError) throw insertError

  created.push(canonicalName)
  cache.set(canonicalName, inserted.id)
  return inserted.id
}

async function main() {
  console.log(`Looking up client "${CLIENT_NAME}"…`)
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('id, full_name, coach_id, is_coach_self')
    .ilike('full_name', `%${CLIENT_NAME}%`)

  if (clientError) throw clientError
  if (!clients?.length) {
    throw new Error(`No client found for ${CLIENT_NAME}`)
  }

  const client =
    clients.find((row) => row.is_coach_self) ??
    clients.find((row) => row.full_name === CLIENT_NAME) ??
    clients[0]

  const coachId = client.coach_id
  const clientId = client.id
  console.log(`Client ${client.full_name} (${clientId}), coach ${coachId}`)

  let programId
  const { data: existingProgram } = await supabase
    .from('programs')
    .select('id')
    .eq('coach_id', coachId)
    .eq('name', PROGRAM_NAME)
    .maybeSingle()

  if (existingProgram) {
    programId = existingProgram.id
    console.log(`Updating existing program ${programId}`)
    await supabase
      .from('programs')
      .update({
        status: 'active',
        description:
          '8-week strength + conditioning + running block. Week 1 starts on the assignment Monday. AM/PM sessions are separate workouts on the same day.',
      })
      .eq('id', programId)
  } else {
    const { data: inserted, error } = await supabase
      .from('programs')
      .insert({
        coach_id: coachId,
        name: PROGRAM_NAME,
        description:
          '8-week strength + conditioning + running block. Week 1 starts on the assignment Monday. AM/PM sessions are separate workouts on the same day.',
        status: 'active',
      })
      .select('id')
      .single()
    if (error) throw error
    programId = inserted.id
    console.log(`Created program ${programId}`)
  }

  // Clear previous program template days
  const { data: oldDays } = await supabase
    .from('program_scheduled_workouts')
    .select('id')
    .eq('program_id', programId)

  if (oldDays?.length) {
    await supabase
      .from('program_scheduled_workout_exercises')
      .delete()
      .in(
        'program_scheduled_workout_id',
        oldDays.map((row) => row.id)
      )
    await supabase
      .from('program_scheduled_workouts')
      .delete()
      .eq('program_id', programId)
  }

  const allWorkouts = WEEKS.flatMap((week, index) =>
    buildWeekWorkouts(index, week)
  )
  console.log(`Building ${allWorkouts.length} program workouts…`)

  const exerciseCache = new Map()
  const createdExercises = []

  // Warm cache with a full library load once inside resolveExercise
  for (const workout of allWorkouts) {
    for (const exercise of workout.exercises) {
      await resolveExercise(
        coachId,
        exercise.name,
        exerciseCache,
        createdExercises
      )
    }
  }

  if (createdExercises.length) {
    console.log(`Created missing exercises: ${createdExercises.join(', ')}`)
  } else {
    console.log('All exercises matched existing library entries.')
  }

  for (const workout of allWorkouts) {
    const { data: programWorkout, error: workoutError } = await supabase
      .from('program_scheduled_workouts')
      .insert({
        coach_id: coachId,
        program_id: programId,
        day_offset: workout.day_offset,
        name: workout.name,
        notes: workout.notes,
      })
      .select('id')
      .single()

    if (workoutError) throw workoutError

    const rows = workout.exercises.map((exercise, sortOrder) => ({
      program_scheduled_workout_id: programWorkout.id,
      exercise_id: exerciseCache.get(exercise.name),
      sort_order: sortOrder,
      sets: exercise.sets,
      reps: exercise.reps || null,
      prescription: exercise.prescription,
      superset_group: exercise.superset_group,
      exercise_block: exercise.exercise_block,
      workout_notes: exercise.workout_notes,
      rep_mode: exercise.rep_mode,
      each_side: exercise.each_side,
      tempo: null,
      rest_seconds: exercise.rest_seconds,
      weight_percent: exercise.weight_percent,
      rpe_target: null,
      tracking_options: exercise.tracking_options,
    }))

    const { error: exerciseError } = await supabase
      .from('program_scheduled_workout_exercises')
      .insert(rows)

    if (exerciseError) throw exerciseError
  }

  // Cancel prior active assignment + dematerialize by name/date window manually
  const { data: previousAssignment } = await supabase
    .from('program_assignments')
    .select('program_id, start_date')
    .eq('client_id', clientId)
    .eq('coach_id', coachId)
    .eq('status', 'active')
    .maybeSingle()

  if (previousAssignment?.start_date) {
    console.log(
      `Cancelling previous assignment of ${previousAssignment.program_id}`
    )
  }

  await supabase
    .from('program_assignments')
    .update({ status: 'cancelled' })
    .eq('client_id', clientId)
    .eq('coach_id', coachId)
    .eq('status', 'active')

  // Remove any previously materialized copies of this program on the target dates
  const targetDates = []
  for (let offset = 0; offset < 56; offset++) {
    const date = new Date(`${START_DATE}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() + offset)
    targetDates.push(date.toISOString().slice(0, 10))
  }

  const workoutNames = new Set(allWorkouts.map((workout) => workout.name))
  const { data: existingClientWorkouts } = await supabase
    .from('client_scheduled_workouts')
    .select('id, name, scheduled_date')
    .eq('client_id', clientId)
    .in('scheduled_date', targetDates)

  const idsToClear = (existingClientWorkouts ?? [])
    .filter((row) => workoutNames.has(row.name))
    .map((row) => row.id)

  if (idsToClear.length) {
    console.log(
      `Clearing ${idsToClear.length} existing matching workouts on calendar…`
    )
    await supabase
      .from('client_scheduled_workouts')
      .delete()
      .in('id', idsToClear)
  }

  const { error: assignError } = await supabase.from('program_assignments').insert({
    coach_id: coachId,
    client_id: clientId,
    program_id: programId,
    status: 'active',
    start_date: START_DATE,
  })
  if (assignError) throw assignError

  // Materialize all program workouts onto the client calendar
  let scheduledCount = 0
  for (const workout of allWorkouts) {
    const date = new Date(`${START_DATE}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() + workout.day_offset)
    const scheduledDate = date.toISOString().slice(0, 10)

    const { data: clientWorkout, error: insertError } = await supabase
      .from('client_scheduled_workouts')
      .insert({
        coach_id: coachId,
        client_id: clientId,
        scheduled_date: scheduledDate,
        name: workout.name,
        notes: workout.notes,
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    const rows = workout.exercises.map((exercise, sortOrder) => ({
      scheduled_workout_id: clientWorkout.id,
      exercise_id: exerciseCache.get(exercise.name),
      sort_order: sortOrder,
      sets: exercise.sets,
      reps: exercise.reps || null,
      prescription: exercise.prescription,
      superset_group: exercise.superset_group,
      exercise_block: exercise.exercise_block,
      workout_notes: exercise.workout_notes,
      rep_mode: exercise.rep_mode,
      each_side: exercise.each_side,
      tempo: null,
      rest_seconds: exercise.rest_seconds,
      weight_percent: exercise.weight_percent,
      rpe_target: null,
      tracking_options: exercise.tracking_options,
    }))

    const { error: exerciseError } = await supabase
      .from('scheduled_workout_exercises')
      .insert(rows)
    if (exerciseError) throw exerciseError

    scheduledCount += 1
  }

  console.log(
    `Done. Program "${PROGRAM_NAME}" assigned to ${client.full_name} starting ${START_DATE}.`
  )
  console.log(
    `Scheduled ${scheduledCount} workouts (Aug 3 – Sep 27, Sundays rest).`
  )
  if (createdExercises.length) {
    console.log(`New library exercises: ${createdExercises.join(', ')}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
