import assert from 'node:assert/strict'
import test from 'node:test'

import { getAppBaseUrl } from './config'

test('getAppBaseUrl strips accidental APP_URL= prefix from env value', () => {
  const previous = process.env.APP_URL
  process.env.APP_URL = 'APP_URL=https://swiftcoach.vercel.app'

  try {
    assert.equal(getAppBaseUrl(), 'https://swiftcoach.vercel.app')
  } finally {
    if (previous === undefined) {
      delete process.env.APP_URL
    } else {
      process.env.APP_URL = previous
    }
  }
})

test('getAppBaseUrl trims trailing slash from configured URL', () => {
  const previous = process.env.APP_URL
  process.env.APP_URL = 'https://swiftcoach.vercel.app/'

  try {
    assert.equal(getAppBaseUrl(), 'https://swiftcoach.vercel.app')
  } finally {
    if (previous === undefined) {
      delete process.env.APP_URL
    } else {
      process.env.APP_URL = previous
    }
  }
})
