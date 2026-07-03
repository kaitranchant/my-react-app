import { formatDayHeader } from '@/lib/calendar'
import {
  formatExercisePrescriptionSummary,
  getExerciseOptionBadges,
} from '@/lib/scheduled-exercise'
import { clusterExercisesBySuperset } from '@/lib/superset-groups'
import { parseSetCount } from '@/lib/workout-log'
import type { ClientScheduledWorkoutWithExercises } from 'app/types/database'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildExerciseSection(
  row: ClientScheduledWorkoutWithExercises['exercises'][number],
  index: number
): string {
  const summary = formatExercisePrescriptionSummary(row)
  const badges = getExerciseOptionBadges(row)
  const setCount = parseSetCount(row.sets)
  const valueHeader =
    row.rep_mode === 'time'
      ? 'Time'
      : row.rep_mode === 'distance'
        ? 'Distance'
        : 'Reps'
  const setRows = Array.from({ length: setCount }, (_, setIndex) => {
    const setNumber = setIndex + 1
    return `
      <tr>
        <td>${setNumber}</td>
        <td></td>
        <td></td>
      </tr>
    `
  }).join('')

  const badgeHtml =
    badges.length > 0
      ? `<p class="badges">${escapeHtml(badges.join(' · '))}</p>`
      : ''
  const workoutNotes = row.workout_notes?.trim()
    ? `<p class="notes">${escapeHtml(row.workout_notes.trim())}</p>`
    : ''

  return `
    <section class="exercise">
      <div class="exercise-header">
        <span class="exercise-number">${index + 1}</span>
        <div>
          <h2>${escapeHtml(row.exercise.name)}</h2>
          <p class="prescription">${escapeHtml(summary)}</p>
          ${badgeHtml}
          ${workoutNotes}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Set</th>
            <th>Weight</th>
            <th>${valueHeader}</th>
          </tr>
        </thead>
        <tbody>
          ${setRows}
        </tbody>
      </table>
    </section>
  `
}

function buildExerciseRows(
  workout: ClientScheduledWorkoutWithExercises
): string {
  if (workout.exercises.length === 0) {
    return '<p class="empty">No exercises scheduled.</p>'
  }

  const clusters = clusterExercisesBySuperset(workout.exercises)
  let exerciseIndex = 0

  return clusters
    .map((cluster) => {
      if (cluster.type === 'single') {
        const section = buildExerciseSection(cluster.exercise, exerciseIndex)
        exerciseIndex += 1
        return section
      }

      const sections = cluster.exercises
        .map((row) => {
          const section = buildExerciseSection(row, exerciseIndex)
          exerciseIndex += 1
          return section
        })
        .join('')

      if (cluster.exercises.length <= 1) {
        return sections
      }

      return `
        <div class="superset">
          <p class="superset-label">Superset ${escapeHtml(cluster.group)}</p>
          ${sections}
        </div>
      `
    })
    .join('')
}

function buildPrintHtml(
  workout: ClientScheduledWorkoutWithExercises,
  selectedDate: string,
  subtitle?: string
): string {
  const dateLabel = formatDayHeader(selectedDate)
  const workoutNotes = workout.notes?.trim()
    ? `<p class="workout-notes">${escapeHtml(workout.notes.trim())}</p>`
    : ''
  const subtitleHtml = subtitle
    ? `<p class="subtitle">${escapeHtml(subtitle)}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(workout.name)} — ${escapeHtml(dateLabel)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #111;
        margin: 0;
        padding: 24px;
        line-height: 1.4;
      }
      h1 {
        margin: 0 0 4px;
        font-size: 24px;
      }
      .meta, .subtitle, .prescription, .badges, .notes, .workout-notes, .empty {
        margin: 0;
        color: #444;
      }
      .meta { font-size: 14px; margin-bottom: 8px; }
      .subtitle { font-size: 13px; margin-bottom: 12px; }
      .workout-notes {
        margin: 0 0 20px;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background: #fafafa;
        white-space: pre-wrap;
      }
      .exercise {
        break-inside: avoid;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #ddd;
      }
      .exercise:last-child { border-bottom: 0; }
      .superset {
        margin-bottom: 24px;
        padding: 12px;
        border: 1px solid #ccc;
        border-radius: 8px;
      }
      .superset-label {
        margin: 0 0 12px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #333;
      }
      .superset .exercise:last-child {
        border-bottom: 0;
        margin-bottom: 0;
        padding-bottom: 0;
      }
      .exercise-header {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        margin-bottom: 10px;
      }
      .exercise-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: #eee;
        font-weight: 700;
        font-size: 13px;
        flex-shrink: 0;
      }
      h2 {
        margin: 0 0 4px;
        font-size: 18px;
      }
      .prescription { font-size: 14px; margin-bottom: 4px; }
      .badges, .notes { font-size: 13px; margin-top: 4px; }
      .notes { white-space: pre-wrap; }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      th, td {
        border: 1px solid #ccc;
        padding: 8px 10px;
        text-align: left;
      }
      th {
        background: #f5f5f5;
        font-weight: 600;
      }
      td:first-child { width: 56px; }
      @media print {
        body { padding: 0; }
      }
    </style>
  </head>
  <body>
    <header>
      <p class="meta">${escapeHtml(dateLabel)}</p>
      <h1>${escapeHtml(workout.name)}</h1>
      ${subtitleHtml}
      ${workoutNotes}
    </header>
    ${buildExerciseRows(workout)}
  </body>
</html>`
}

export function printScheduledWorkout(
  workout: ClientScheduledWorkoutWithExercises,
  selectedDate: string,
  subtitle?: string
): boolean {
  const html = buildPrintHtml(workout, selectedDate, subtitle)

  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'Print workout')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const frameWindow = iframe.contentWindow
  const doc = frameWindow?.document

  if (!doc || !frameWindow) {
    iframe.remove()
    return false
  }

  doc.open()
  doc.write(html)
  doc.close()

  const cleanup = () => {
    iframe.remove()
  }

  frameWindow.addEventListener('afterprint', cleanup, { once: true })

  window.setTimeout(() => {
    frameWindow.focus()
    frameWindow.print()
    window.setTimeout(cleanup, 2000)
  }, 150)

  return true
}
