function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  // Public (browser-safe)
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),

  // Server-only
  supabaseServiceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),
  openaiApiKey: () => required('OPENAI_API_KEY'),
  anthropicApiKey: () => required('ANTHROPIC_API_KEY'),
  pdfGeneratorToken: () => required('PDF_GENERATOR_TOKEN'),
};
