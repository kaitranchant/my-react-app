import assert from 'node:assert/strict'
import test from 'node:test'

import {
  coachCanAccessPortal,
  deriveAppSurfaceOptions,
  parseActiveSurface,
  resolveActiveSurface,
} from './app-surface'
import { readActiveSurfaceCookieValue } from './app-surface-server'

test('parseActiveSurface accepts coach and client values', () => {
  assert.equal(parseActiveSurface('coach'), 'coach')
  assert.equal(parseActiveSurface('client'), 'client')
  assert.equal(parseActiveSurface('invalid'), null)
})

test('resolveActiveSurface keeps clients on client surface', () => {
  assert.equal(
    resolveActiveSurface({ role: 'client', cookieValue: 'coach' }),
    'client'
  )
})

test('resolveActiveSurface defaults coaches to coach without cookie', () => {
  assert.equal(resolveActiveSurface({ role: 'coach' }), 'coach')
  assert.equal(
    resolveActiveSurface({ role: 'coach', cookieValue: 'client' }),
    'client'
  )
})

test('deriveAppSurfaceOptions enables switcher for coaches', () => {
  const options = deriveAppSurfaceOptions({
    role: 'coach',
    linkedClientId: null,
  })

  assert.equal(options.canAccessCoach, true)
  assert.equal(options.canAccessClient, true)
  assert.equal(options.showSwitcher, true)
})

test('deriveAppSurfaceOptions hides switcher for pure clients', () => {
  const options = deriveAppSurfaceOptions({
    role: 'client',
    linkedClientId: 'client-1',
  })

  assert.equal(options.canAccessCoach, false)
  assert.equal(options.canAccessClient, true)
  assert.equal(options.showSwitcher, false)
})

test('coachCanAccessPortal requires client surface cookie', () => {
  assert.equal(
    coachCanAccessPortal({ role: 'coach', activeSurface: 'client' }),
    true
  )
  assert.equal(
    coachCanAccessPortal({ role: 'coach', activeSurface: 'coach' }),
    false
  )
})

test('readActiveSurfaceCookieValue parses cookie header', () => {
  assert.equal(
    readActiveSurfaceCookieValue('foo=bar; active_surface=client; baz=1'),
    'client'
  )
  assert.equal(readActiveSurfaceCookieValue(undefined), undefined)
})
