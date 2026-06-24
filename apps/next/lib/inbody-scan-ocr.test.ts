import assert from 'node:assert/strict'
import test from 'node:test'

import {
  computeBmiFromUsUnits,
  computePercentBodyFatFromMass,
  correctInbodyOcrMetrics,
  correctMisreadScanYear,
  expandTwoDigitYear,
  getMissingRequiredInbodyFields,
  kgToLbs,
  normalizeOcrDate,
  normalizeOcrExtraction,
  normalizeOcrTime,
  resolveHeightInches,
} from './inbody-scan-ocr'
import { createEmptyInbodyScanValues, mergeScannedInbodyValues } from './inbody-scans'
import type { InbodyOcrExtraction } from './validations/inbody-scan-ocr'

test('kgToLbs converts kilograms to pounds', () => {
  assert.equal(kgToLbs(70), 154.3)
  assert.equal(kgToLbs(41.6), 91.7)
})

test('normalizeOcrDate parses ISO and US formats', () => {
  assert.equal(normalizeOcrDate('2024-06-15'), '2024-06-15')
  assert.equal(normalizeOcrDate('6/15/2024'), '2024-06-15')
  assert.equal(normalizeOcrDate('06/05/2024'), '2024-06-05')
  assert.equal(normalizeOcrDate(null), null)
  assert.equal(normalizeOcrDate('not a date'), null)
})

test('normalizeOcrDate parses InBody dotted format', () => {
  assert.equal(normalizeOcrDate('06. 05. 2026'), '2026-06-05')
  assert.equal(normalizeOcrDate('06.05.2026'), '2026-06-05')
  assert.equal(normalizeOcrDate('06.05.26'), '2026-06-05')
})

test('correctMisreadScanYear fixes 2026 misread as 2020', () => {
  assert.equal(correctMisreadScanYear(2020), 2026)
  assert.equal(normalizeOcrDate('2020-06-05'), '2026-06-05')
  assert.equal(normalizeOcrDate('06/05/2020'), '2026-06-05')
})

test('expandTwoDigitYear maps InBody two-digit years', () => {
  assert.equal(expandTwoDigitYear(26), 2026)
  assert.equal(expandTwoDigitYear(99), 1999)
})

test('normalizeOcrTime parses 24h and 12h formats', () => {
  assert.equal(normalizeOcrTime('14:30'), '14:30')
  assert.equal(normalizeOcrTime('9:05'), '09:05')
  assert.equal(normalizeOcrTime('2:30 PM'), '14:30')
  assert.equal(normalizeOcrTime('12:00 AM'), '00:00')
  assert.equal(normalizeOcrTime(null), null)
  assert.equal(normalizeOcrTime('invalid'), null)
})

test('normalizeOcrExtraction maps extraction to form values', () => {
  const raw: InbodyOcrExtraction = {
    scanDate: '3/10/2025',
    scanTime: '10:15 AM',
    heightFeet: null,
    heightInchesPart: null,
    heightInches: null,
    weightLbs: 178.5,
    skeletalMuscleMassLbs: 91.7,
    percentBodyFat: 11.0,
    totalBodyWaterLbs: 98.2,
    dryLeanMassLbs: null,
    bodyFatMassLbs: 19.6,
    bmi: 24.1,
    leanBodyMassLbs: 158.9,
    basalMetabolicRateKcal: 1842.7,
    skeletalMuscleIndex: 9.2,
  }

  const result = normalizeOcrExtraction(raw)

  assert.equal(result.scanDate, '2025-03-10')
  assert.equal(result.scanTime, '10:15')
  assert.equal(result.weightLbs, 178.5)
  assert.equal(result.skeletalMuscleMassLbs, 91.7)
  assert.equal(result.percentBodyFat, 11)
  assert.equal(result.totalBodyWaterLbs, 98.2)
  assert.equal(result.bodyFatMassLbs, 19.6)
  assert.equal(result.bmi, 24.1)
  assert.equal(result.leanBodyMassLbs, 158.9)
  assert.equal(result.basalMetabolicRateKcal, 1843)
  assert.equal(result.skeletalMuscleIndex, 9.2)
  assert.equal(result.dryLeanMassLbs, undefined)
})

test('correctInbodyOcrMetrics fixes PBF confused with body fat mass', () => {
  const corrected = correctInbodyOcrMetrics(
    {
      weightLbs: 177.1,
      bodyFatMassLbs: 19.5,
      percentBodyFat: 19.5,
      bmi: 24.6,
    },
    68
  )

  assert.equal(corrected.percentBodyFat, 11)
  assert.equal(corrected.bmi, 26.9)
})

test('computePercentBodyFatFromMass derives PBF from mass and weight', () => {
  assert.equal(computePercentBodyFatFromMass(19.5, 177.1), 11)
})

test('computeBmiFromUsUnits derives BMI from weight and height', () => {
  assert.equal(computeBmiFromUsUnits(177.1, 68), 26.9)
  assert.equal(computeBmiFromUsUnits(179.5, 68), 27.3)
})

test('resolveHeightInches combines feet and inches from InBody header', () => {
  assert.equal(
    resolveHeightInches({ heightFeet: 5, heightInchesPart: 8, heightInches: null }),
    68
  )
  assert.equal(
    resolveHeightInches({ heightFeet: null, heightInchesPart: null, heightInches: 68 }),
    68
  )
})

test('correctInbodyOcrMetrics always recalculates BMI when height is known', () => {
  const corrected = correctInbodyOcrMetrics(
    {
      weightLbs: 179.5,
      bodyFatMassLbs: 20.8,
      percentBodyFat: 11.6,
      bmi: 26.1,
    },
    68
  )

  assert.equal(corrected.percentBodyFat, 11.6)
  assert.equal(corrected.bmi, 27.3)
})

test('mergeScannedInbodyValues overlays scanned fields onto defaults', () => {
  const base = createEmptyInbodyScanValues()
  const merged = mergeScannedInbodyValues(base, {
    weightLbs: 180,
    skeletalMuscleMassLbs: 90,
    percentBodyFat: 12,
  })

  assert.equal(merged.weightLbs, 180)
  assert.equal(merged.skeletalMuscleMassLbs, 90)
  assert.equal(merged.percentBodyFat, 12)
  assert.equal(merged.scanDate, base.scanDate)
  assert.equal(merged.scanTime, base.scanTime)
  assert.equal(merged.totalBodyWaterLbs, null)
})

test('getMissingRequiredInbodyFields lists unfilled required metrics', () => {
  assert.deepEqual(
    getMissingRequiredInbodyFields({ weightLbs: 180 }),
    ['Skeletal muscle mass', 'Percent body fat']
  )
  assert.deepEqual(getMissingRequiredInbodyFields({}), [
    'Weight',
    'Skeletal muscle mass',
    'Percent body fat',
  ])
  assert.deepEqual(
    getMissingRequiredInbodyFields({
      weightLbs: 180,
      skeletalMuscleMassLbs: 90,
      percentBodyFat: 12,
    }),
    []
  )
})
