import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  const { data: license, error } = await supabase
    .from('licenses')
    .select('id, status, activated_at')
    .eq('token', token)
    .eq('status', 'active')
    .single();

  if (error || !license) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (license.activated_at) {
    return res.status(200).json({ activated: true, message: 'Already activated' });
  }

  await supabase
    .from('licenses')
    .update({ activated_at: new Date().toISOString() })
    .eq('id', license.id);

  return res.status(200).json({ activated: true, message: 'License activated' });
}
