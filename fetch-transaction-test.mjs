// Test script to verify getTransaction functionality
import { getTransaction } from './lib/supabase.js';

async function testFetchTransaction() {
  try {
    console.log('Testing direct transaction fetch with getTransaction function');
    
    // First test with the test transaction ID we created
    const transactionId = 'e7eb2579-bd19-4369-bd4c-18a631e0c50d';
    console.log(`Fetching transaction with ID: ${transactionId}`);
    
    const transaction = await getTransaction(transactionId);
    
    if (transaction) {
      console.log('Transaction found!');
      console.log('Transaction data:', {
        id: transaction.id,
        invoice_number: transaction.invoice_number,
        customer_name: transaction.customer_name,
        total_amount: transaction.total_amount,
        type: typeof transaction.total_amount,
        items: transaction.items?.length || 0
      });
    } else {
      console.log('Transaction not found!');
    }
    
    // Also try with the test invoice ID
    const invoiceId = 'e062aecf-cd65-4a0a-9146-ff4bebecc134';
    console.log(`\nFetching transaction with ID: ${invoiceId}`);
    
    const invoice = await getTransaction(invoiceId);
    
    if (invoice) {
      console.log('Invoice found!');
      console.log('Invoice data:', {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customer_name,
        total_amount: invoice.total_amount,
        type: typeof invoice.total_amount,
        items: invoice.items?.length || 0
      });
    } else {
      console.log('Invoice not found!');
    }
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testFetchTransaction(); 