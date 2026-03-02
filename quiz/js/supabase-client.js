/**
 * MyBrandPersona — Supabase Client
 * Gerencia leads e resultados de quiz.
 *
 * Configuração: definir SUPABASE_URL e SUPABASE_ANON_KEY
 * como variáveis de ambiente no Vercel, ou inline para dev.
 */

// Supabase SDK via ESM CDN
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Config — em produção, usar variáveis do Vercel
const SUPABASE_URL = window.__SUPABASE_URL__ || '';
const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || '';

let supabase = null;

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase not configured — running in offline mode');
    return null;
  }
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

function generateShareToken() {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

/**
 * Salva lead no Supabase.
 * Upsert por email (se já existe, atualiza).
 * @returns {string|null} lead ID
 */
async function saveLead({ name, email, whatsapp, source, utm, consented_at }) {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('leads')
    .upsert(
      { name, email, whatsapp, source, utm_source: utm?.utm_source || null, utm_medium: utm?.utm_medium || null, utm_campaign: utm?.utm_campaign || null, consented_at },
      { onConflict: 'email' }
    )
    .select('id')
    .single();

  if (error) {
    console.error('saveLead error:', error);
    return null;
  }
  return data?.id || null;
}

/**
 * Salva resultado do quiz no Supabase.
 * @returns {string|null} share_token
 */
async function saveQuizResult({ lead_id, answers, results, mbti, archetype }) {
  const client = getClient();
  if (!client) return null;

  const share_token = generateShareToken();

  const { error } = await client
    .from('quiz_results')
    .insert({
      lead_id,
      answers,
      results,
      mbti,
      archetype,
      share_token
    });

  if (error) {
    console.error('saveQuizResult error:', error);
    return null;
  }
  return share_token;
}

// Expose globally for inline script usage
window.MBP_Supabase = { saveLead, saveQuizResult, getClient };
