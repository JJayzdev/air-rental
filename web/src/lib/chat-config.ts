import 'server-only'

/** Return only feature flags; never expose configured secret values. */
export function getChatConfiguration() {
  const quotaConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    (process.env.CHAT_RATE_LIMIT_SECRET?.length ?? 0) >= 32,
  )
  return {
    offlineFaq: !quotaConfigured,
    llmEnabled:
      quotaConfigured &&
      process.env.AIR_ENABLE_CHAT_LLM === 'true' &&
      Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL),
  }
}
