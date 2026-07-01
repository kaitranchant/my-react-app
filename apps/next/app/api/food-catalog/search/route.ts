import { NextResponse } from 'next/server'

import {
  FoodCatalogError,
  searchFoodCatalog,
} from '@/lib/food-catalog.server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'You must be signed in.' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? ''
  const limit = Number(searchParams.get('limit') ?? 20)

  try {
    const results = searchFoodCatalog(query, Number.isFinite(limit) ? limit : 20)
    return NextResponse.json({ ok: true, results })
  } catch (error) {
    if (error instanceof FoodCatalogError) {
      return NextResponse.json({ ok: false, error: error.message })
    }
    return NextResponse.json({
      ok: false,
      error: 'Food search is temporarily unavailable.',
    })
  }
}
