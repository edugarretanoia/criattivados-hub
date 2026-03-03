export default async function handler(req, res) {
  return res.status(200).json({
    has_stripe: !!process.env.STRIPE_SECRET_KEY,
    stripe_prefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10) || 'MISSING',
    has_supabase_url: !!process.env.SUPABASE_URL,
    has_supabase_key: !!process.env.SUPABASE_SERVICE_KEY,
    has_webhook_secret: !!process.env.STRIPE_WEBHOOK_SECRET,
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV
  });
}
