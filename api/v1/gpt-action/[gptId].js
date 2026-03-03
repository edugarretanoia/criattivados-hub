import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { gptId } = req.query;
  const { token, action, payload } = req.body;

  if (!token) {
    return res.status(401).json({ authorized: false, error: 'Token required. Purchase at criattivados.com.br/store' });
  }

  // Validate license
  const { data: license, error } = await supabase
    .from('licenses')
    .select('id, status, expires_at, product_id, products(slug, delivery_type)')
    .eq('token', token)
    .eq('status', 'active')
    .single();

  if (error || !license) {
    return res.status(401).json({ authorized: false, error: 'Invalid or expired token' });
  }

  if (license.expires_at && new Date(license.expires_at) < new Date()) {
    await supabase.from('licenses').update({ status: 'expired' }).eq('id', license.id);
    return res.status(401).json({ authorized: false, error: 'Token expired' });
  }

  // Verify product matches GPT
  if (license.products?.slug !== gptId) {
    return res.status(403).json({ authorized: false, error: 'Token not valid for this GPT' });
  }

  // Log usage
  await supabase.from('usage_logs').insert({
    license_id: license.id,
    gpt_id: gptId,
    action_type: action || 'gpt_request',
    ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
    request_payload: payload || {},
    response_status: 200
  });

  return res.status(200).json({
    authorized: true,
    product: license.products?.slug,
    message: 'Access granted'
  });
}
