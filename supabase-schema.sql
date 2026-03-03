-- criattivados Store — Schema
-- Executar no Supabase SQL Editor (projeto criattivados, ref zhdzqzmnwmvvryezyujt)

-- 1. Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_cents INTEGER NOT NULL,
  billing_type TEXT NOT NULL DEFAULT 'one_time' CHECK (billing_type IN ('one_time', 'recurring')),
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('gpt_action', 'gpt_link', 'download', 'access_token', 'subscription', 'external_url')),
  delivery_payload JSONB DEFAULT '{}',
  stripe_price_id TEXT,
  thumbnail_url TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Licenses
CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Usage Logs
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID REFERENCES public.licenses(id),
  gpt_id TEXT,
  action_type TEXT NOT NULL,
  ip_address TEXT,
  request_payload JSONB DEFAULT '{}',
  response_status INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_licenses_token ON public.licenses(token);
CREATE INDEX IF NOT EXISTS idx_licenses_customer ON public.licenses(customer_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_usage_logs_license ON public.usage_logs(license_id);

-- RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Products: anyone can read active products
CREATE POLICY "Public read active products" ON public.products
  FOR SELECT USING (is_active = true);

-- Service role can do everything (Edge Functions use service key)
CREATE POLICY "Service full access products" ON public.products
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access customers" ON public.customers
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access licenses" ON public.licenses
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service full access usage_logs" ON public.usage_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Seed: storYOURtelling 2026
INSERT INTO public.products (name, slug, description, price_cents, billing_type, delivery_type, delivery_payload, stripe_price_id, category, is_active, is_featured)
VALUES (
  'storYOURtelling 2026',
  'storytelling',
  'GPT especialista em narrativa pessoal e storytelling estrategico. Acesso vitalicio.',
  4990,
  'one_time',
  'gpt_action',
  '{"gpt_url": "https://chatgpt.com/g/g-694b3b84690081919e0ab6ff9c9ff7bd-storyourtelling-2026"}',
  'price_1T6u23RuLCYSVR6GVBCYhm19',
  'gpts',
  true,
  true
)
ON CONFLICT (slug) DO NOTHING;
