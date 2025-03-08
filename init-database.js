// Script to initialize database tables
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`Supabase URL: ${supabaseUrl ? 'Available' : 'Missing'}`);
console.log(`Supabase Anon Key: ${supabaseAnonKey ? 'Available' : 'Missing'}`);

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials are missing. Please check your .env.local file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // Create services table
    console.log('Creating services table...');
    const { error: servicesError } = await supabase.rpc('create_services_table');
    
    if (servicesError) {
      console.error('Error creating services table:', servicesError);
      
      // Try alternative method if RPC fails
      console.log('Trying alternative method for creating services table...');
      const { error: servicesCreateError } = await supabase.from('services').select('count').limit(1);
      
      if (servicesCreateError && servicesCreateError.code === '42P01') {
        // Table doesn't exist
        console.log('Services table does not exist. Creating...');
        // SQL command to create the table would go here, but we'll need to use the Supabase dashboard for this
        console.log('Please create the services table using the Supabase dashboard SQL editor with the following SQL:');
        console.log(`
          CREATE TABLE services (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            description TEXT,
            price DECIMAL(10, 2) NOT NULL,
            active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            hsn_code TEXT,
            gst_rate DECIMAL(5, 2) DEFAULT 18.00
          );
        `);
      }
    } else {
      console.log('Services table created or already exists.');
    }
    
    // Create transactions table
    console.log('Creating transactions table...');
    const { error: transactionsError } = await supabase.rpc('create_transactions_table');
    
    if (transactionsError) {
      console.error('Error creating transactions table:', transactionsError);
      
      // Try alternative method if RPC fails
      console.log('Trying alternative method for creating transactions table...');
      const { error: transactionsCreateError } = await supabase.from('transactions').select('count').limit(1);
      
      if (transactionsCreateError && transactionsCreateError.code === '42P01') {
        // Table doesn't exist
        console.log('Transactions table does not exist. Creating...');
        console.log('Please create the transactions table using the Supabase dashboard SQL editor with the following SQL:');
        console.log(`
          CREATE TABLE transactions (
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
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);
      }
    } else {
      console.log('Transactions table created or already exists.');
    }
    
    // Create transaction_items table
    console.log('Creating transaction_items table...');
    const { error: itemsError } = await supabase.rpc('create_transaction_items_table');
    
    if (itemsError) {
      console.error('Error creating transaction_items table:', itemsError);
      
      // Try alternative method if RPC fails
      console.log('Trying alternative method for creating transaction_items table...');
      const { error: itemsCreateError } = await supabase.from('transaction_items').select('count').limit(1);
      
      if (itemsCreateError && itemsCreateError.code === '42P01') {
        // Table doesn't exist
        console.log('Transaction_items table does not exist. Creating...');
        console.log('Please create the transaction_items table using the Supabase dashboard SQL editor with the following SQL:');
        console.log(`
          CREATE TABLE transaction_items (
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
        `);
      }
    } else {
      console.log('Transaction_items table created or already exists.');
    }
    
    console.log('Database initialization complete!');
    
  } catch (e) {
    console.error('Exception in initDatabase:', e);
  }
}

initDatabase(); 