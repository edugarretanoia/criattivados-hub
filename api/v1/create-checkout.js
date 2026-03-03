import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { product_slug, customer_email } = req.body;

    if (!product_slug) {
      return res.status(400).json({ error: 'product_slug required' });
    }

    const { data: product, error: prodError } = await supabase
      .from('products')
      .select('*')
      .eq('slug', product_slug)
      .eq('is_active', true)
      .single();

    if (prodError || !product) {
      return res.status(404).json({ error: 'Product not found', detail: prodError?.message });
    }

    if (customer_email) {
      const { data: existing } = await supabase
        .from('customers')
        .select('id, licenses(id, status, product_id)')
        .eq('email', customer_email)
        .single();

      if (existing?.licenses?.some(l => l.product_id === product.id && l.status === 'active')) {
        return res.status(409).json({ error: 'Already purchased', message: 'You already own this product' });
      }
    }

    const baseUrl = 'https://criattivados.com.br';

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [{
        price: product.stripe_price_id,
        quantity: 1
      }],
      mode: product.billing_type === 'recurring' ? 'subscription' : 'payment',
      success_url: `${baseUrl}/store/obrigado/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/store/${product.slug}/`,
      metadata: {
        product_id: product.id,
        product_slug: product.slug,
        delivery_type: product.delivery_type
      }
    };

    if (customer_email) {
      sessionParams.customer_email = customer_email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ checkout_url: session.url });
  } catch (err) {
    console.error('create-checkout error:', err);
    return res.status(500).json({ error: 'Internal error', message: err.message });
  }
}
