// Test script to check transaction data in Supabase
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

// Transaction ID to check
const transactionId = process.argv[2] || '80fefe2f-e2bb-4498-89de-94094e5af5ff';

async function main() {
  try {
    console.log(`Checking for transaction with ID: ${transactionId}`);
    
    // Check transactions table
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId);
    
    if (transactionError) {
      console.error('Error fetching transaction:', transactionError);
      return;
    }
    
    // Check all transactions
    const { data: allTransactions, error: allTransError } = await supabase
      .from('transactions')
      .select('id, invoice_number, customer_name, total_amount, created_at')
      .order('created_at', { ascending: false });
      
    console.log('All transactions count:', allTransactions ? allTransactions.length : 0);
    if (allTransError) {
      console.error('Error fetching all transactions:', allTransError);
    } else if (!allTransactions || allTransactions.length === 0) {
      console.log('No transactions found in the database.');
      
      // Check if the table exists
      const { data: tables, error: tablesError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
      
      if (tablesError) {
        console.error('Error checking database tables:', tablesError);
      } else {
        console.log('Available tables:', tables);
      }
    } else {
      console.log('All transactions:');
      console.table(allTransactions);
    }
    
    if (!transaction || transaction.length === 0) {
      console.log('No transaction found with this ID. Here are the most recent transactions:');
      
      // Get most recent transactions
      const { data: recentTransactions, error: recentError } = await supabase
        .from('transactions')
        .select('id, invoice_number, customer_name, total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (recentError) {
        console.error('Error fetching recent transactions:', recentError);
      } else {
        console.log('Recent transactions:');
        console.table(recentTransactions);
      }
    } else {
      console.log('Transaction found:');
      console.log(JSON.stringify(transaction[0], null, 2));
      
      // Check transaction items
      const { data: items, error: itemsError } = await supabase
        .from('transaction_items')
        .select('*')
        .eq('transaction_id', transactionId);
      
      if (itemsError) {
        console.error('Error fetching transaction items:', itemsError);
      } else {
        console.log('Transaction items:');
        console.table(items);
      }
    }
  } catch (e) {
    console.error('Exception in main function:', e);
  }
}

main(); 