// Script to create the specific transaction that's being requested but doesn't exist
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials are missing. Please check your .env.local file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// The specific transaction ID that's failing
const TRANSACTION_ID = 'be198694-5867-47d4-ad1b-0192606cc843';
const AMOUNT = 7.08; // The amount to use for this transaction

// Generate a proper UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function createSpecificTransaction() {
  try {
    // First, sign in anonymously to get a user ID
    console.log('Signing in anonymously to get a user ID...');
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    
    if (authError) {
      console.error('Error signing in anonymously:', authError);
      return;
    }
    
    const userId = authData?.user?.id;
    if (!userId) {
      console.error('Failed to get user ID from anonymous sign-in');
      return;
    }
    
    console.log('Signed in with user ID:', userId);
    console.log(`Creating transaction with specific ID: ${TRANSACTION_ID}`);
    console.log(`Using amount: ₹${AMOUNT.toFixed(2)}`);
    
    // Calculate GST amounts
    const gstRate = 18;
    
    // Ensure the amount is properly rounded to 2 decimal places
    const subtotalAmount = Math.round(AMOUNT * 100) / 100;
    
    // Calculate discount (10%)
    const discountPercent = 10;
    const discountAmount = Math.round(subtotalAmount * discountPercent) / 100;
    
    // Calculate taxable amount after discount
    const taxableAmount = subtotalAmount - discountAmount;
    
    // Calculate GST amounts
    const gstPercent = gstRate;
    const cgstAmount = Math.round(taxableAmount * (gstPercent / 2)) / 100;
    const sgstAmount = Math.round(taxableAmount * (gstPercent / 2)) / 100;
    
    // Calculate total with tax
    const totalAmount = Math.round((taxableAmount + cgstAmount + sgstAmount) * 100) / 100;
    
    console.log('Amount breakdown:');
    console.log(`Subtotal: ₹${subtotalAmount.toFixed(2)}`);
    console.log(`Discount (${discountPercent}%): ₹${discountAmount.toFixed(2)}`);
    console.log(`Taxable Amount: ₹${taxableAmount.toFixed(2)}`);
    console.log(`CGST (${gstPercent/2}%): ₹${cgstAmount.toFixed(2)}`);
    console.log(`SGST (${gstPercent/2}%): ₹${sgstAmount.toFixed(2)}`);
    console.log(`Total: ₹${totalAmount.toFixed(2)}`);
    
    // Create a test service first
    const testService = {
      id: generateUUID(),
      name: 'Test Service for Missing Transaction',
      description: 'This is a test service created for the missing transaction',
      price: subtotalAmount,
      hsn_code: '998313',
      gst_rate: gstRate,
      active: true,
      user_id: userId,
      created_at: new Date().toISOString()
    };
    
    console.log('Creating test service...');
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .insert(testService)
      .select();
    
    if (serviceError) {
      console.error('Error creating test service:', serviceError);
      return;
    }
    
    console.log('Test service created with ID:', service[0].id);
    
    // Create invoice with specified ID and amount
    const invoice = {
      id: TRANSACTION_ID,
      customer_name: 'Fixed Transaction',
      customer_email: 'fixed@example.com',
      customer_gstin: 'TEST1234567890',
      customer_address: '123 Test Street, Test City, 123456',
      invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
      invoice_date: new Date().toISOString().split('T')[0],
      subtotal: subtotalAmount,
      discount_type: 'percentage',
      discount_value: discountPercent,
      discount_amount: discountAmount,
      taxable_amount: taxableAmount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      total_amount: totalAmount,
      payment_status: 'pending',
      user_id: userId,
      created_at: new Date().toISOString()
    };
    
    // Sample invoice items
    const invoiceItems = [
      {
        transaction_id: TRANSACTION_ID,
        service_id: service[0].id,
        service_name: 'Test Service for Missing Transaction',
        service_description: 'This is a test service created for the missing transaction',
        hsn_code: '998313',
        price: subtotalAmount,
        gst_rate: gstRate,
        quantity: 1
      }
    ];
    
    console.log('Creating transaction in database...');
    
    // Insert transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert(invoice)
      .select();
    
    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      return;
    }
    
    console.log('Transaction created successfully');
    
    // Insert transaction items
    const { data: items, error: itemsError } = await supabase
      .from('transaction_items')
      .insert(invoiceItems)
      .select();
    
    if (itemsError) {
      console.error('Error creating transaction items:', itemsError);
      return;
    }
    
    console.log('Transaction items created successfully');
    
    console.log('\n===== TRANSACTION CREATED SUCCESSFULLY =====');
    console.log(`Transaction ID: ${TRANSACTION_ID}`);
    console.log(`Invoice Number: ${invoice.invoice_number}`);
    console.log(`Subtotal: ₹${subtotalAmount.toFixed(2)}`);
    console.log(`Discount: ₹${discountAmount.toFixed(2)} (${discountPercent}%)`);
    console.log(`GST (${gstRate}%): ₹${(cgstAmount + sgstAmount).toFixed(2)}`);
    console.log(`Total Amount: ₹${totalAmount.toFixed(2)}`);
    console.log(`\nAccess the invoice at: /invoice/${TRANSACTION_ID}`);
    console.log('==========================================');
    
  } catch (e) {
    console.error('Exception in createSpecificTransaction:', e);
  }
}

createSpecificTransaction(); 