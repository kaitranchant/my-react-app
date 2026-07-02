function normalizeFoodName(name: string) {
  return name.trim().toLowerCase()
}

function roundQuantity(value: number) {
  return Math.round(value * 10) / 10
}

function formatWholeUnits(
  quantityG: number,
  gramsPerUnit: number,
  singular: string,
  plural: string
) {
  const count = Math.max(1, Math.ceil(quantityG / gramsPerUnit))
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`
}

function formatSpoonMeasure(quantityG: number, gramsPerSpoon: number, spoon: string) {
  const spoons = quantityG / gramsPerSpoon

  if (spoons < 0.35) {
    return `~1/4 ${spoon}`
  }

  if (spoons < 0.75) {
    return `~1/2 ${spoon}`
  }

  if (spoons < 1.25) {
    return `~1 ${spoon}`
  }

  const rounded = Math.ceil(spoons)
  return `~${rounded} ${spoon}${rounded === 1 ? '' : 's'}`
}

function formatFractionalCups(cups: number, suffix: string) {
  if (cups < 0.3) {
    return `~1/4 cup ${suffix}`
  }

  if (cups < 0.6) {
    return `~1/2 cup ${suffix}`
  }

  if (cups < 0.85) {
    return `~3/4 cup ${suffix}`
  }

  if (cups < 1.2) {
    return `~1 cup ${suffix}`
  }

  const rounded = Math.ceil(cups * 2) / 2
  return `~${rounded} cups ${suffix}`
}

function estimateCookedRicePurchase(quantityG: number) {
  const dryG = quantityG / 3
  const cupsDry = dryG / 185
  return formatFractionalCups(cupsDry, 'dry rice')
}

function estimateBerriesPurchase(name: string, quantityG: number) {
  if (/freeze/i.test(name)) {
    return formatWholeUnits(quantityG, 340, 'bag', 'bags')
  }

  if (quantityG <= 200) {
    return formatWholeUnits(quantityG, 170, 'container', 'containers')
  }

  return formatWholeUnits(quantityG, 340, 'pint', 'pints')
}

export function estimateShoppingPurchase(
  foodName: string,
  quantityG: number
): string | null {
  if (!Number.isFinite(quantityG) || quantityG <= 0) {
    return null
  }

  const name = normalizeFoodName(foodName)

  if (/yogurt|yoghurt/.test(name)) {
    const gramsPerTub = /greek/.test(name) ? 227 : 170
    return formatWholeUnits(quantityG, gramsPerTub, 'tub', 'tubs')
  }

  if (/\begg\b|\beggs\b/.test(name) && !/eggplant/.test(name)) {
    return formatWholeUnits(quantityG, 50, 'egg', 'eggs')
  }

  if (/apple/.test(name) && !/pineapple/.test(name)) {
    return formatWholeUnits(quantityG, 182, 'apple', 'apples')
  }

  if (/banana/.test(name)) {
    return formatWholeUnits(quantityG, 118, 'banana', 'bananas')
  }

  if (/avocado/.test(name)) {
    return formatWholeUnits(quantityG, 150, 'avocado', 'avocados')
  }

  if (/sweet potato/.test(name)) {
    return formatWholeUnits(quantityG, 130, 'medium sweet potato', 'medium sweet potatoes')
  }

  if (/potato/.test(name) && !/sweet potato/.test(name)) {
    return formatWholeUnits(quantityG, 170, 'medium potato', 'medium potatoes')
  }

  if (/chicken/.test(name) && /breast/.test(name)) {
    return formatWholeUnits(quantityG, 170, 'breast', 'breasts')
  }

  if (/chicken/.test(name) && /thigh/.test(name)) {
    return formatWholeUnits(quantityG, 130, 'thigh', 'thighs')
  }

  if (/chicken/.test(name) && /drumstick/.test(name)) {
    return formatWholeUnits(quantityG, 95, 'drumstick', 'drumsticks')
  }

  if (
    /beef|steak|sirloin|ribeye|strip|flank|tenderloin/.test(name) &&
    !/broth|stock|jerky/.test(name)
  ) {
    return formatWholeUnits(quantityG, 170, 'steak', 'steaks')
  }

  if (/salmon|cod|tilapia|tuna|fish/.test(name) && !/oil/.test(name)) {
    return formatWholeUnits(quantityG, 150, 'fillet', 'fillets')
  }

  if (/shrimp|prawn/.test(name)) {
    return formatWholeUnits(quantityG, 140, 'pack', 'packs')
  }

  if (/cottage cheese/.test(name)) {
    return formatWholeUnits(quantityG, 226, 'container', 'containers')
  }

  if (/blueberr|strawberr|raspberr|blackberr|berr/.test(name)) {
    return estimateBerriesPurchase(name, quantityG)
  }

  if (/spinach/.test(name)) {
    if (quantityG <= 120) {
      return formatWholeUnits(quantityG, 85, 'cup', 'cups')
    }

    return formatWholeUnits(quantityG, 142, 'bag', 'bags')
  }

  if (/asparagus/.test(name)) {
    return formatWholeUnits(quantityG, 200, 'bunch', 'bunches')
  }

  if (/broccoli/.test(name)) {
    return formatWholeUnits(quantityG, 150, 'crown', 'crowns')
  }

  if (/carrot/.test(name)) {
    return formatWholeUnits(quantityG, 60, 'medium carrot', 'medium carrots')
  }

  if (/bell pepper|sweet pepper/.test(name)) {
    return formatWholeUnits(quantityG, 120, 'pepper', 'peppers')
  }

  if (/cucumber/.test(name)) {
    return formatWholeUnits(quantityG, 300, 'cucumber', 'cucumbers')
  }

  if (/tomato/.test(name) && !/sauce|paste|ketchup/.test(name)) {
    return formatWholeUnits(quantityG, 120, 'tomato', 'tomatoes')
  }

  if (/onion/.test(name) && !/powder/.test(name)) {
    return formatWholeUnits(quantityG, 150, 'onion', 'onions')
  }

  if (/garlic/.test(name) && !/powder/.test(name)) {
    return formatWholeUnits(quantityG, 3, 'clove', 'cloves')
  }

  if (/rice/.test(name) && /cooked/.test(name)) {
    return estimateCookedRicePurchase(quantityG)
  }

  if (/rice/.test(name) && !/cooked/.test(name)) {
    if (quantityG <= 100) {
      return estimateCookedRicePurchase(quantityG * 3)
    }

    return formatWholeUnits(quantityG, 900, 'bag', 'bags')
  }

  if (/oat/.test(name)) {
    if (quantityG <= 120) {
      const cupsDry = quantityG / 80
      return formatFractionalCups(cupsDry, 'dry oats')
    }

    return formatWholeUnits(quantityG, 450, 'canister', 'canisters')
  }

  if (/pasta|spaghetti|penne|macaroni|noodle/.test(name) && !/cooked/.test(name)) {
    if (quantityG <= 120) {
      const cupsDry = quantityG / 56
      return formatFractionalCups(cupsDry, 'dry pasta')
    }

    return formatWholeUnits(quantityG, 450, 'box', 'boxes')
  }

  if (/pasta|spaghetti|penne|macaroni|noodle/.test(name) && /cooked/.test(name)) {
    const dryG = quantityG / 2.25
    const cupsDry = dryG / 56
    return formatFractionalCups(cupsDry, 'dry pasta')
  }

  if (/bread/.test(name) && !/crumb/.test(name)) {
    if (quantityG <= 60) {
      return formatWholeUnits(quantityG, 30, 'slice', 'slices')
    }

    return formatWholeUnits(quantityG, 680, 'loaf', 'loaves')
  }

  if (/tortilla|wrap/.test(name)) {
    return formatWholeUnits(quantityG, 45, 'tortilla', 'tortillas')
  }

  if (/milk/.test(name) && !/powder|chocolate/.test(name)) {
    if (quantityG <= 300) {
      return formatWholeUnits(quantityG, 244, 'cup', 'cups')
    }

    return formatWholeUnits(quantityG, 3780, 'gallon', 'gallons')
  }

  if (/cheese/.test(name) && !/cottage/.test(name)) {
    if (quantityG <= 40) {
      return formatSpoonMeasure(quantityG, 7, 'tbsp')
    }

    return formatWholeUnits(quantityG, 226, 'block', 'blocks')
  }

  if (/butter/.test(name)) {
    if (quantityG <= 20) {
      return formatSpoonMeasure(quantityG, 14, 'tbsp')
    }

    return formatWholeUnits(quantityG, 113, 'stick', 'sticks')
  }

  if (/honey|maple syrup|syrup/.test(name)) {
    if (quantityG <= 60) {
      return formatSpoonMeasure(quantityG, 21, 'tbsp')
    }

    return formatWholeUnits(quantityG, 340, 'jar', 'jars')
  }

  if (/oil|olive|canola|avocado oil/.test(name) && !/coconut/.test(name)) {
    if (quantityG <= 60) {
      return formatSpoonMeasure(quantityG, 14, 'tbsp')
    }

    return formatWholeUnits(quantityG, 500, 'bottle', 'bottles')
  }

  if (/almond|peanut|nut butter/.test(name)) {
    if (quantityG <= 40) {
      return formatSpoonMeasure(quantityG, 16, 'tbsp')
    }

    return formatWholeUnits(quantityG, 454, 'jar', 'jars')
  }

  if (/bean|lentil|chickpea/.test(name) && !/green bean/.test(name)) {
    if (/cooked|canned/.test(name)) {
      return formatWholeUnits(quantityG, 240, 'can', 'cans')
    }

    if (quantityG <= 120) {
      const cupsDry = quantityG / 48
      return formatFractionalCups(cupsDry, 'dry legumes')
    }

    return formatWholeUnits(quantityG, 450, 'bag', 'bags')
  }

  if (/protein powder|whey/.test(name)) {
    return formatWholeUnits(quantityG, 30, 'scoop', 'scoops')
  }

  return null
}

export function formatShoppingListGrams(quantityG: number): string {
  if (quantityG >= 1000) {
    const kg = roundQuantity(quantityG / 1000)
    return `${kg} kg`
  }

  return `${roundQuantity(quantityG)} g`
}

export function formatShoppingListItemLabel(
  foodName: string,
  quantityG: number
): { purchase: string | null; grams: string; label: string } {
  const grams = formatShoppingListGrams(quantityG)
  const purchase = estimateShoppingPurchase(foodName, quantityG)

  return {
    purchase,
    grams,
    label: purchase ? `${purchase} (${grams})` : grams,
  }
}
