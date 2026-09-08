import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(status: number, data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * The cycle is anchored to a credit-card closing date in Argentina, so "today" must be the
 * calendar day in Buenos Aires — not the server's UTC day. Between 21:00 and midnight local
 * time the UTC date is already tomorrow, which would file an expense under the wrong day and
 * corrupt both the daily feed and the pace badge.
 */
const CYCLE_TIME_ZONE = 'America/Argentina/Buenos_Aires'

function todayInCycleTimeZone(): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the shape Postgres `date` expects.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CYCLE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Apple Shortcuts sends dictionary values as text by default, so a perfectly valid
 * `"4500"` would otherwise be rejected. Accept both, reject everything else.
 */
function coerceAmount(raw: unknown): number | null {
  let value: number
  if (typeof raw === 'number') {
    value = raw
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim().replace(',', '.')
    if (trimmed === '') return null
    value = Number(trimmed)
  } else {
    return null
  }

  if (!Number.isFinite(value) || value <= 0 || value > 100000000) return null
  return value
}

function parseYmdToUtcTimestamp(dateStr: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr)
  if (match) {
    const year = Number(match[1])
    const monthIndex = Number(match[2]) - 1
    const day = Number(match[3])
    return Date.UTC(year, monthIndex, day)
  }
  const d = new Date(dateStr)
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
}

function computeDaysRemaining(today: Date | string, endDate: string): number {
  const todayMs = typeof today === 'string'
    ? parseYmdToUtcTimestamp(today)
    : Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const endMs = parseYmdToUtcTimestamp(endDate)
  const diffDays = Math.round((endMs - todayMs) / (1000 * 60 * 60 * 24)) + 1
  return diffDays <= 0 ? 0 : diffDays
}

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight OPTIONS; reject non-POST methods with 405
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, {
      error: 'method_not_allowed',
      message: 'Only POST method is allowed',
    })
  }

  try {
    // 2. Authentication: Authorization header with 'Bearer ' prefix
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(401, {
        error: 'invalid_token',
        message: 'Missing or invalid Authorization header',
      })
    }

    const rawToken = authHeader.slice(7).trim()
    if (!rawToken) {
      return jsonResponse(401, {
        error: 'invalid_token',
        message: 'Invalid bearer token',
      })
    }

    const tokenHash = await sha256Hex(rawToken)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing backend environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return jsonResponse(500, {
        error: 'internal_error',
        message: 'Internal server error',
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { data: tokenRow, error: tokenError } = await supabase
      .from('api_tokens')
      .select('id, user_id, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (tokenError || !tokenRow) {
      return jsonResponse(401, {
        error: 'invalid_token',
        message: 'Invalid bearer token',
      })
    }

    if (tokenRow.revoked_at !== null && tokenRow.revoked_at !== undefined) {
      return jsonResponse(403, {
        error: 'token_revoked',
        message: 'Token has been revoked',
      })
    }

    const userId = tokenRow.user_id

    // 3. Parse JSON body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return jsonResponse(400, {
        error: 'invalid_payload',
        message: 'Request body must be valid JSON',
      })
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse(400, {
        error: 'invalid_payload',
        message: 'Request body must be a JSON object',
      })
    }

    const payload = body as Record<string, unknown>
    const amount = coerceAmount(payload.amount)

    if (amount === null) {
      return jsonResponse(400, {
        error: 'invalid_payload',
        message: 'amount must be a number greater than 0 and at most 100,000,000',
      })
    }

    let concept: string | null = null
    if (payload.concept !== undefined && payload.concept !== null) {
      if (typeof payload.concept !== 'string') {
        return jsonResponse(400, {
          error: 'invalid_payload',
          message: 'concept must be a string if provided',
        })
      }
      if (payload.concept.length > 200) {
        return jsonResponse(400, {
          error: 'invalid_payload',
          message: 'concept must not exceed 200 characters',
        })
      }
      concept = payload.concept.trim() || null
    }

    let category = 'varios'
    if (payload.category !== undefined && payload.category !== null) {
      if (typeof payload.category !== 'string') {
        return jsonResponse(400, {
          error: 'invalid_payload',
          message: 'category must be a string if provided',
        })
      }
      const trimmedCategory = payload.category.trim()
      if (trimmedCategory.length > 0) {
        category = trimmedCategory
      }
    }

    const amountCents = Math.round(amount * 100)
    const amountPesosFromCents = amountCents / 100

    // 4. Resolve active cycle for user
    const { data: cycleRow, error: cycleError } = await supabase
      .from('cycles')
      .select('id, total_budget, start_date, end_date, calc_mode, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    if (cycleError || !cycleRow) {
      return jsonResponse(404, {
        error: 'no_active_cycle',
        message: 'No active cycle found. Please open the app and configure a cycle.',
      })
    }

    const cycleId = cycleRow.id

    // 5. Insert expense and update token last_used_at
    const now = new Date()
    const todayStr = todayInCycleTimeZone()

    const { data: newExpense, error: insertError } = await supabase
      .from('expenses')
      .insert({
        cycle_id: cycleId,
        user_id: userId,
        amount: amountPesosFromCents,
        concept: concept,
        category: category,
        expense_date: todayStr,
      })
      .select('id')
      .single()

    if (insertError || !newExpense) {
      console.error('Error inserting expense:', insertError?.message)
      return jsonResponse(500, {
        error: 'internal_error',
        message: 'Failed to record expense',
      })
    }

    // Update last_used_at on token row
    await supabase
      .from('api_tokens')
      .update({ last_used_at: now.toISOString() })
      .eq('id', tokenRow.id)

    // 6. Recompute metrics and return 200
    const { data: cycleExpenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('user_id', userId)
      .eq('cycle_id', cycleId)

    if (expensesError) {
      console.error('Error querying cycle expenses:', expensesError.message)
      return jsonResponse(500, {
        error: 'internal_error',
        message: 'Failed to calculate updated allowance',
      })
    }

    const totalBudgetCents = Math.round(Number(cycleRow.total_budget) * 100)

    let cycleSpentCents = 0
    let todaySpentCents = 0

    for (const exp of cycleExpenses || []) {
      const expCents = Math.round(Number(exp.amount) * 100)
      cycleSpentCents += expCents
      if (exp.expense_date === todayStr) {
        todaySpentCents += expCents
      }
    }

    const daysLeft = computeDaysRemaining(todayStr, cycleRow.end_date)

    let dailyAllowanceCents = 0
    if (cycleRow.calc_mode === 'fixed') {
      const cycleStartMs = parseYmdToUtcTimestamp(cycleRow.start_date || todayStr)
      const cycleEndMs = parseYmdToUtcTimestamp(cycleRow.end_date)
      const computedCycleDays = Math.round((cycleEndMs - cycleStartMs) / (1000 * 60 * 60 * 24)) + 1
      const totalCycleDays = computedCycleDays > 0 ? computedCycleDays : 30
      const fixedDaily = Math.floor(totalBudgetCents / totalCycleDays)
      const remainingBudget = Math.max(0, totalBudgetCents - cycleSpentCents)
      dailyAllowanceCents = Math.min(fixedDaily, remainingBudget)
    } else {
      // Dynamic mode
      if (daysLeft > 0) {
        const remainingBudget = totalBudgetCents - cycleSpentCents
        if (remainingBudget > 0) {
          dailyAllowanceCents = Math.floor(remainingBudget / daysLeft)
        }
      }
    }

    const remainingTodayCents = dailyAllowanceCents - todaySpentCents

    // Convert integer cents to pesos numbers for response
    const dailyAllowancePesos = dailyAllowanceCents / 100
    const remainingTodayPesos = remainingTodayCents / 100

    return jsonResponse(200, {
      ok: true,
      expenseId: newExpense.id,
      dailyAllowance: dailyAllowancePesos,
      remainingToday: remainingTodayPesos,
      daysRemaining: daysLeft,
    })
  } catch (err: unknown) {
    console.error('Unhandled error in register-expense handler:', err)
    return jsonResponse(500, {
      error: 'internal_error',
      message: 'Internal server error',
    })
  }
})
