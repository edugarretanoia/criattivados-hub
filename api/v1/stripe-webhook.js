import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Vercel needs raw body for Stripe signature verification
export const config = {
  api: { bodyParser: false }
};

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function generateToken(prefix) {
  return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

async function handleCheckoutCompleted(session) {
  const { product_id, product_slug, delivery_type } = session.metadata;
  const email = session.customer_details?.email || session.customer_email;

  if (!email || !product_id) return;

  // Upsert customer
  const { data: customer } = await supabase
    .from('customers')
    .upsert({ email, stripe_customer_id: session.customer }, { onConflict: 'email' })
    .select('id')
    .single();

  // Generate token
  const prefix = (product_slug || 'CRT').substring(0, 3).toUpperCase();
  const token = generateToken(prefix);

  // Create license
  await supabase.from('licenses').insert({
    customer_id: customer.id,
    product_id: product_id,
    token: token,
    status: 'active',
    stripe_session_id: session.id
  });

  // Route delivery by type
  await routeDelivery(delivery_type, { email, token, product_slug, product_id });
}

async function routeDelivery(deliveryType, context) {
  // For now, all delivery types generate a token
  // Brevo email integration will be added in P1
  // The token is stored in the license and will be sent via email

  switch (deliveryType) {
    case 'gpt_action':
      // Token-based: user pastes token in GPT chat
      console.log(`[delivery:gpt_action] Token ${context.token} for ${context.email}`);
      break;
    case 'gpt_link':
      // Send GPT link via email
      console.log(`[delivery:gpt_link] Link for ${context.email}`);
      break;
    case 'download':
      // Generate signed URL and send via email
      console.log(`[delivery:download] File for ${context.email}`);
      break;
    case 'access_token':
      // Token for app/quiz access
      console.log(`[delivery:access_token] Token ${context.token} for ${context.email}`);
      break;
    case 'subscription':
      // Recurring access
      console.log(`[delivery:subscription] Sub for ${context.email}`);
      break;
    case 'external_url':
      // Redirect URL via email
      console.log(`[delivery:external_url] URL for ${context.email}`);
      break;
    default:
      console.log(`[delivery:unknown] Type ${deliveryType} for ${context.email}`);
  }

  // TODO P1: Brevo API integration for email delivery
}

async function handleChargeRefunded(charge) {
  const sessionId = charge.payment_intent;
  if (!sessionId) return;

  // Revoke all licenses from this payment
  const { data: licenses } = await supabase
    .from('licenses')
    .select('id')
    .eq('stripe_session_id', sessionId);

  if (licenses?.length) {
    await supabase
      .from('licenses')
      .update({ status: 'revoked' })
      .in('id', licenses.map(l => l.id));
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object);
      break;
    case 'customer.subscription.deleted':
      // Handle subscription cancellation
      break;
    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  return res.status(200).json({ received: true });
}
