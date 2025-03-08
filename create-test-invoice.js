// Script to create a test invoice with a specific amount
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

// Generate a UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get amount from command line or use default
const amount = process.argv[2] ? parseFloat(process.argv[2]) : 7.08;

async function createTestInvoice() {
  try {
    // Sign in anonymously to get a user ID
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
    
    // Generate a new transaction ID
    const transactionId = generateUUID();
    
    console.log('Signed in with user ID:', userId);
    console.log(`Creating test invoice with ID: ${transactionId}`);
    console.log(`Using amount: ₹${amount.toFixed(2)}`);
    
    // Calculate GST amounts
    const gstRate = 18;
    const baseAmount = Math.round(amount * 100) / 100;
    const discountPercent = 10;
    const discountAmount = Math.round(baseAmount * discountPercent) / 100;
    const taxableAmount = baseAmount - discountAmount;
    const cgstAmount = Math.round(taxableAmount * (gstRate / 2)) / 100;
    const sgstAmount = Math.round(taxableAmount * (gstRate / 2)) / 100;
    const totalAmount = Math.round((taxableAmount + cgstAmount + sgstAmount) * 100) / 100;
    
    console.log('Amount breakdown:');
    console.log(`Base Amount: ₹${baseAmount.toFixed(2)}`);
    console.log(`Discount (${discountPercent}%): ₹${discountAmount.toFixed(2)}`);
    console.log(`Taxable Amount: ₹${taxableAmount.toFixed(2)}`);
    console.log(`CGST (${gstRate/2}%): ₹${cgstAmount.toFixed(2)}`);
    console.log(`SGST (${gstRate/2}%): ₹${sgstAmount.toFixed(2)}`);
    console.log(`Total: ₹${totalAmount.toFixed(2)}`);
    
    // Create a test service
    const serviceId = generateUUID();
    const service = {
      id: serviceId,
      name: 'Test Service',
      description: 'This is a test service for the invoice',
      price: baseAmount,
      hsn_code: '998313',
      gst_rate: gstRate,
      active: true,
      user_id: userId,
      created_at: new Date().toISOString()
    };
    
    console.log('Creating test service...');
    const { error: serviceError } = await supabase
      .from('services')
      .insert(service);
    
    if (serviceError) {
      console.error('Error creating service:', serviceError);
      return;
    }
    
    // Create transaction
    const invoiceNumber = `INV-TEST-${Math.floor(Math.random() * 10000)}`;
    const transaction = {
      id: transactionId,
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_gstin: 'TEST1234567890',
      customer_address: '123 Test Street, Test City, 123456',
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      subtotal: baseAmount,
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
    
    console.log('Creating transaction...');
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert(transaction);
    
    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      return;
    }
    
    // Create transaction item
    const item = {
      transaction_id: transactionId,
      service_id: serviceId,
      service_name: 'Test Service',
      service_description: 'This is a test service for the invoice',
      hsn_code: '998313',
      price: baseAmount,
      gst_rate: gstRate,
      quantity: 1
    };
    
    console.log('Creating transaction item...');
    const { error: itemError } = await supabase
      .from('transaction_items')
      .insert(item);
    
    if (itemError) {
      console.error('Error creating transaction item:', itemError);
      return;
    }
    
    console.log('\n===== TEST INVOICE CREATED SUCCESSFULLY =====');
    console.log(`Invoice ID: ${transactionId}`);
    console.log(`Invoice Number: ${invoiceNumber}`);
    console.log(`Total Amount: ₹${totalAmount.toFixed(2)}`);
    console.log('\nYou can view and pay this invoice at:');
    console.log(`/invoice/${transactionId}`);
    console.log('==========================================');
    
  } catch (e) {
    console.error('Exception in createTestInvoice:', e);
  }
}

createTestInvoice(); 