// Script to create a test transaction in the database with a specific amount
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

// Parse command line arguments
const command = process.argv[2] || 'create';
const param1 = process.argv[3]; // id or amount depending on command
const param2 = process.argv[4]; // amount when creating

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Generate a random UUID for the transaction
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Main function to process commands
async function main() {
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
    
    console.log('Signed in with user ID:', userId);
    
    // Process the command
    switch (command) {
      case 'create':
        // Create a new transaction with specified ID and amount
        await createTestTransaction(param1 || generateUUID(), param2 ? parseFloat(param2) : 100, userId);
        break;
        
      case 'check':
        // Check an existing transaction
        await checkTransaction(param1);
        break;
        
      case 'fix':
        // Fix an existing transaction amount
        if (!param1 || !param2) {
          console.error('Error: Both transaction ID and new amount are required for fix command');
          console.log('Usage: node test-create-transaction.js fix [transaction_id] [new_amount]');
          return;
        }
        await fixTransactionAmount(param1, parseFloat(param2));
        break;
        
      default:
        console.log('Unknown command:', command);
        console.log('Available commands:');
        console.log('- create [id] [amount]: Create a new test transaction');
        console.log('- check [id]: Check an existing transaction');
        console.log('- fix [id] [amount]: Fix the amount of an existing transaction');
    }
  } catch (e) {
    console.error('Exception in main function:', e);
  }
}

// Function to check an existing transaction
async function checkTransaction(id) {
  if (!id) {
    console.error('Error: Transaction ID is required');
    return;
  }
  
  console.log(`Checking transaction with ID: ${id}`);
  
  // Get transaction
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();
  
  if (transactionError) {
    console.error('Error retrieving transaction:', transactionError);
    return;
  }
  
  if (!transaction) {
    console.error('Transaction not found');
    return;
  }
  
  // Get transaction items
  const { data: items, error: itemsError } = await supabase
    .from('transaction_items')
    .select('*')
    .eq('transaction_id', id);
  
  if (itemsError) {
    console.error('Error retrieving transaction items:', itemsError);
  }
  
  // Print transaction details
  console.log('\n===== TRANSACTION DETAILS =====');
  console.log(`ID: ${transaction.id}`);
  console.log(`Invoice Number: ${transaction.invoice_number}`);
  console.log(`Customer: ${transaction.customer_name} (${transaction.customer_email})`);
  console.log(`Status: ${transaction.payment_status}`);
  
  // Print amount details
  console.log('\n----- Amount Information -----');
  console.log(`Subtotal: ₹${transaction.subtotal}`);
  console.log(`Discount: ₹${transaction.discount_amount} (${transaction.discount_value}%)`);
  console.log(`Taxable Amount: ₹${transaction.taxable_amount}`);
  console.log(`CGST: ₹${transaction.cgst_amount}`);
  console.log(`SGST: ₹${transaction.sgst_amount}`);
  console.log(`Total Amount: ₹${transaction.total_amount}`);
  console.log(`Total Amount Type: ${typeof transaction.total_amount}`);
  
  // Print item details
  if (items && items.length > 0) {
    console.log('\n----- Items -----');
    items.forEach((item, index) => {
      console.log(`Item ${index + 1}: ${item.service_name} - ₹${item.price} x ${item.quantity}`);
    });
  }
  
  console.log('\nAccess the invoice at: /invoice/' + transaction.id);
  console.log('===============================');
}

// Function to fix a transaction amount
async function fixTransactionAmount(id, newAmount) {
  if (!id || isNaN(newAmount) || newAmount <= 0) {
    console.error('Error: Valid transaction ID and amount are required');
    return;
  }
  
  console.log(`Fixing transaction ${id} with new amount: ₹${newAmount}`);
  
  // Get the current transaction
  const { data: transaction, error: getError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();
  
  if (getError) {
    console.error('Error retrieving transaction:', getError);
    return;
  }
  
  if (!transaction) {
    console.error('Transaction not found');
    return;
  }
  
  // Calculate the tax breakdown
  const subtotal = newAmount;
  const discountPercent = 10;
  const discountAmount = Math.round(subtotal * discountPercent) / 100;
  const taxableAmount = subtotal - discountAmount;
  const gstRate = 18;
  const cgstAmount = Math.round(taxableAmount * (gstRate / 2)) / 100;
  const sgstAmount = Math.round(taxableAmount * (gstRate / 2)) / 100;
  const totalAmount = Math.round((taxableAmount + cgstAmount + sgstAmount) * 100) / 100;
  
  // Update the transaction
  const { data: updatedTransaction, error: updateError } = await supabase
    .from('transactions')
    .update({
      subtotal: subtotal,
      discount_amount: discountAmount,
      taxable_amount: taxableAmount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      total_amount: totalAmount
    })
    .eq('id', id)
    .select();
  
  if (updateError) {
    console.error('Error updating transaction:', updateError);
    return;
  }
  
  console.log('Transaction updated successfully!');
  console.log(`New amount breakdown:`);
  console.log(`Subtotal: ₹${subtotal}`);
  console.log(`Discount (${discountPercent}%): ₹${discountAmount}`);
  console.log(`Taxable Amount: ₹${taxableAmount}`);
  console.log(`GST (${gstRate}%): ₹${cgstAmount + sgstAmount}`);
  console.log(`Total Amount: ₹${totalAmount}`);
  
  console.log('\nAccess the updated invoice at: /invoice/' + id);
}

// The original function to create a test transaction
async function createTestTransaction(specificId, customAmount, userId) {
  try {
    console.log('Creating invoice with ID: ' + specificId);
    console.log('Using amount: ₹' + customAmount.toFixed(2));
    
    // Calculate GST amounts
    const gstRate = 18;
    
    // Ensure the amount is properly rounded to 2 decimal places
    const subtotalAmount = Math.round(customAmount * 100) / 100;
    
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
    console.log('Subtotal: ₹' + subtotalAmount.toFixed(2));
    console.log('Discount (' + discountPercent + '%): ₹' + discountAmount.toFixed(2));
    console.log('Taxable Amount: ₹' + taxableAmount.toFixed(2));
    console.log('CGST (' + gstPercent/2 + '%): ₹' + cgstAmount.toFixed(2));
    console.log('SGST (' + gstPercent/2 + '%): ₹' + sgstAmount.toFixed(2));
    console.log('Total: ₹' + totalAmount.toFixed(2));
    
    // Create a test service first
    const testService = {
      id: generateUUID(),
      name: 'Test Service',
      description: 'This is a test service for invoice creation',
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
      id: specificId,
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_gstin: 'TEST1234567890',
      customer_address: '123 Test Street, Test City, 123456',
      invoice_number: 'INV-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 1000),
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
        transaction_id: specificId,
        service_id: service[0].id,
        service_name: 'Test Service',
        service_description: 'This is a test service for invoice creation',
        hsn_code: '998313',
        price: subtotalAmount,
        gst_rate: gstRate,
        quantity: 1
      }
    ];
    
    console.log('Creating invoice in database...');
    
    // Insert transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert(invoice)
      .select();
    
    if (transactionError) {
      console.error('Error creating invoice:', transactionError);
      return;
    }
    
    console.log('Invoice created successfully');
    
    // Insert transaction items
    const { data: items, error: itemsError } = await supabase
      .from('transaction_items')
      .insert(invoiceItems)
      .select();
    
    if (itemsError) {
      console.error('Error creating invoice items:', itemsError);
      return;
    }
    
    console.log('Invoice items created successfully');
    
    console.log('\n===== INVOICE CREATED SUCCESSFULLY =====');
    console.log('Invoice ID: ' + specificId);
    console.log('Invoice Number: ' + invoice.invoice_number);
    console.log('Subtotal: ₹' + subtotalAmount.toFixed(2));
    console.log('Discount: ₹' + discountAmount.toFixed(2) + ' (' + discountPercent + '%)');
    console.log('GST (' + gstRate + '%): ₹' + (cgstAmount + sgstAmount).toFixed(2));
    console.log('Total Amount: ₹' + totalAmount.toFixed(2));
    console.log('\nAccess the invoice at: /invoice/' + specificId);
    console.log('==========================================');
    
  } catch (e) {
    console.error('Exception in createTestTransaction:', e);
  }
}

// Execute the main function
main(); 