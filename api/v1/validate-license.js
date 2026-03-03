import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, gpt_id } = req.body;

  if (!token) {
    return res.status(400).json({ valid: false, error: 'Token required' });
  }

  const { data: license, error } = await supabase
    .from('licenses')
    .select('id, status, expires_at, product_id, products(slug, delivery_type)')
    .eq('token', token)
    .eq('status', 'active')
    .single();

  if (error || !license) {
    return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
  }

  if (license.expires_at && new Date(license.expires_at) < new Date()) {
    await supabase.from('licenses').update({ status: 'expired' }).eq('id', license.id);
    return res.status(401).json({ valid: false, error: 'Token expired' });
  }

  // Log usage
  await supabase.from('usage_logs').insert({
    license_id: license.id,
    gpt_id: gpt_id || null,
    action_type: 'validate',
    ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
    response_status: 200
  });

  return res.status(200).json({
    valid: true,
    product: license.products?.slug,
    delivery_type: license.products?.delivery_type
  });
}
