import assert from 'node:assert/strict'
import test from 'node:test'

import {
  estimateShoppingPurchase,
  formatShoppingListItemLabel,
} from './shopping-purchase-estimates'

test('estimateShoppingPurchase maps greek yogurt to tubs', () => {
  assert.equal(
    estimateShoppingPurchase('Yogurt, Greek, nonfat, plain, CHOBANI', 227),
    '1 tub'
  )
  assert.equal(
    estimateShoppingPurchase('Yogurt, Greek, nonfat, plain, CHOBANI', 300),
    '2 tubs'
  )
})

test('estimateShoppingPurchase maps produce and proteins to counts', () => {
  assert.equal(
    estimateShoppingPurchase('Apples, fuji, with skin, raw', 182),
    '1 apple'
  )
  assert.equal(
    estimateShoppingPurchase(
      'Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, grilled',
      170
    ),
    '1 breast'
  )
  assert.equal(
    estimateShoppingPurchase(
      'Beef, loin, top sirloin cap steak, boneless, separable lean only, trimmed to 1/8" fat, choice, cooked, grilled',
      140
    ),
    '1 steak'
  )
})

test('estimateShoppingPurchase maps pantry items to cooking measures', () => {
  assert.equal(
    estimateShoppingPurchase('Honey', 10),
    '~1/2 tbsp'
  )
  assert.equal(
    estimateShoppingPurchase('Oil, olive, salad or cooking', 7),
    '~1/2 tbsp'
  )
  assert.equal(
    estimateShoppingPurchase('Oats, whole grain, rolled, old fashioned', 40),
    '~1/2 cup dry oats'
  )
})

test('estimateShoppingPurchase converts cooked rice to dry cups', () => {
  assert.equal(
    estimateShoppingPurchase(
      'Rice, brown, long-grain, cooked (Includes foods for USDA Food Distribution Program)',
      150
    ),
    '~1/4 cup dry rice'
  )
})

test('formatShoppingListItemLabel keeps grams alongside purchase estimate', () => {
  assert.deepEqual(
    formatShoppingListItemLabel('Yogurt, Greek, nonfat, plain, CHOBANI', 227),
    {
      purchase: '1 tub',
      grams: '227 g',
      label: '1 tub (227 g)',
    }
  )
})
