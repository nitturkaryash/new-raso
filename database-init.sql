-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  hsn_code TEXT,
  gst_rate DECIMAL(5, 2) DEFAULT 18.00,
  active BOOLEAN DEFAULT true,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_gstin TEXT,
  customer_address TEXT,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  taxable_amount DECIMAL(10, 2) NOT NULL,
  cgst_amount DECIMAL(10, 2) DEFAULT 0,
  sgst_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid')) DEFAULT 'pending',
  payment_id TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transaction_items table
CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  service_id UUID,
  service_name TEXT NOT NULL,
  service_description TEXT,
  hsn_code TEXT,
  price DECIMAL(10, 2) NOT NULL,
  gst_rate DECIMAL(5, 2) DEFAULT 18.00,
  quantity INTEGER DEFAULT 1
);

-- Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- Create RLS policies for better security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- Create policy for services to restrict access to owner
CREATE POLICY "Services are only visible to their owner" 
ON services FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create policy for transactions to restrict access to owner
CREATE POLICY "Transactions are only visible to their owner" 
ON transactions FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create policy for transaction_items 
CREATE POLICY "Transaction items are visible to transaction owner" 
ON transaction_items FOR ALL 
USING (transaction_id IN (SELECT id FROM transactions WHERE user_id = auth.uid()))
WITH CHECK (transaction_id IN (SELECT id FROM transactions WHERE user_id = auth.uid()));

-- Insert a sample service with the authenticated user's ID
-- Note: This will only work if executed after a user authenticates
-- For manual inserts, replace auth.uid() with an actual UUID
INSERT INTO services (name, description, price, active, hsn_code, gst_rate, user_id)
VALUES ('Web Development', 'Full stack web development services', 10000.00, true, '998313', 18.00, auth.uid())
ON CONFLICT (id) DO NOTHING;

-- Insert a sample transaction with the authenticated user's ID
INSERT INTO transactions (
  id, 
  customer_name, 
  customer_email, 
  customer_gstin, 
  customer_address, 
  invoice_number, 
  invoice_date, 
  subtotal, 
  discount_type, 
  discount_value, 
  discount_amount, 
  taxable_amount, 
  cgst_amount, 
  sgst_amount, 
  total_amount, 
  payment_status,
  user_id
)
VALUES (
  '80fefe2f-e2bb-4498-89de-94094e5af5ff', -- This is the specific ID that was causing the error
  'Test Customer', 
  'test@example.com', 
  'GSTIN123456789', 
  '123 Test Street, Test City, 123456', 
  'INV-2023-001', 
  CURRENT_DATE, 
  1000.00, 
  'percentage', 
  10, 
  100.00, 
  900.00, 
  81.00, 
  81.00, 
  1062.00, 
  'pending',
  auth.uid()
)
ON CONFLICT (id) DO NOTHING;

-- Insert transaction items for the sample transaction
INSERT INTO transaction_items (
  transaction_id, 
  service_id, 
  service_name, 
  service_description, 
  hsn_code, 
  price, 
  gst_rate, 
  quantity
)
VALUES (
  '80fefe2f-e2bb-4498-89de-94094e5af5ff', 
  (SELECT id FROM services WHERE user_id = auth.uid() LIMIT 1), 
  'Web Development', 
  'Full stack web development services', 
  '998313', 
  1000.00, 
  18.00, 
  1
)
ON CONFLICT DO NOTHING; 