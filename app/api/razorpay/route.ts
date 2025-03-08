import { NextResponse } from 'next/server';
import { getTransaction } from '@/lib/supabase';
import Razorpay from 'razorpay';

export async function POST(request: Request) {
  console.log("Razorpay API route called");
  
  try {
    const body = await request.json();
    console.log("Request body:", body);
    
    // Get Razorpay credentials
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    
    console.log(`Razorpay Keys - ID: ${razorpayKeyId ? "Available" : "Missing"}, Secret: ${razorpayKeySecret ? "Available" : "Missing"}`);
    
    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("Razorpay keys are missing");
      return NextResponse.json(
        { 
          success: false, 
          error: 'Razorpay configuration is incomplete',
          debug: {
            keyIdAvailable: !!razorpayKeyId,
            keySecretAvailable: !!razorpayKeySecret
          }
        },
        { status: 500 }
      );
    }
    
    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret
    });
    
    // Case 1: Direct amount and currency provided (for direct payment links)
    if (body.amount && body.currency) {
      console.log(`Creating order with direct amount: ${body.amount} ${body.currency}`);
      
      // Ensure the amount is a valid number
      let amount;
      try {
        amount = Math.round(parseFloat(body.amount) * 100); // Convert to paise
        if (isNaN(amount) || amount <= 0) {
          throw new Error('Invalid amount');
        }
        
        // Check if amount meets Razorpay's minimum requirement (1 INR = 100 paise)
        if (amount < 100) {
          console.error('Amount too small for Razorpay:', amount, 'paise');
          return NextResponse.json(
            { 
              success: false, 
              error: 'Amount too small', 
              details: 'Razorpay requires a minimum amount of ₹1 (100 paise). The current amount is ₹' + (amount/100).toFixed(2)
            },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid amount provided', details: 'Amount must be a positive number' },
          { status: 400 }
        );
      }
      
      // Validate currency
      const currency = (typeof body.currency === 'string' && body.currency.toUpperCase()) || 'INR';
      if (!['INR', 'USD'].includes(currency)) {
        return NextResponse.json(
          { success: false, error: 'Invalid currency', details: 'Supported currencies are INR and USD' },
          { status: 400 }
        );
      }
      
      const orderOptions = {
        amount: amount,
        currency: currency,
        receipt: `receipt_${Math.random().toString(36).substring(2, 10)}`,
        notes: body.notes || {
          source: 'direct-payment',
          description: body.description || 'Payment',
        }
      };
      
      console.log("Order options:", orderOptions);
      
      try {
        const order = await razorpay.orders.create(orderOptions);
        console.log("Razorpay order created:", order);
        
        return NextResponse.json({
          success: true,
          orderId: order.id,
          amount: orderOptions.amount,
          currency: orderOptions.currency,
          receipt: orderOptions.receipt,
          notes: orderOptions.notes
        });
      } catch (razorpayError) {
        console.error("Error creating Razorpay order:", razorpayError);
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to create Razorpay order', 
            details: razorpayError instanceof Error ? razorpayError.message : String(razorpayError)
          },
          { status: 500 }
        );
      }
    }
    
    // Case 2: Transaction ID provided (for invoice payments)
    const { transactionId } = body;
    
    if (!transactionId) {
      // If no amount/currency and no transactionId, create a default direct payment
      console.log("No transaction ID or amount/currency provided. Creating a default payment.");
      
      // Use body.amount or default to 1000 if not provided
      const defaultAmount = body.amount ? parseFloat(body.amount.toString()) : 1000;
      const defaultCurrency = body.currency || 'INR';
      
      const orderOptions = {
        amount: Math.round(defaultAmount * 100), // Convert to paise
        currency: defaultCurrency,
        receipt: `receipt_default_${Math.random().toString(36).substring(2, 10)}`,
        notes: {
          source: 'default-payment',
          description: body.description || 'Default payment without transaction ID'
        }
      };
      
      try {
        console.log(`Creating default Razorpay order with amount: ${defaultAmount} ${defaultCurrency}`);
        const order = await razorpay.orders.create(orderOptions);
        console.log("Default Razorpay order created:", order);
        
        return NextResponse.json({
          success: true,
          orderId: order.id,
          amount: orderOptions.amount,
          currency: orderOptions.currency,
          receipt: orderOptions.receipt,
          notes: orderOptions.notes
        });
      } catch (razorpayError) {
        console.error("Error creating default Razorpay order:", razorpayError);
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to create default Razorpay order', 
            details: razorpayError instanceof Error ? razorpayError.message : String(razorpayError)
          },
          { status: 500 }
        );
      }
    }
    
    console.log("Attempting to fetch transaction details for ID:", transactionId);
    
    // Try to get real transaction data first
    let transaction;
    try {
      console.log(`Attempting to fetch transaction with ID: ${transactionId}`);
      transaction = await getTransaction(transactionId);
      console.log(`Transaction fetch result: ${transaction ? "Found" : "Not found"}`);
      
      if (transaction) {
        console.log(`Transaction details: Invoice #${transaction.invoice_number}, Amount: ${transaction.total_amount}`);
      } else {
        console.log(`Transaction with ID ${transactionId} not found. Looking for amount in request.`);
        
        // Check if amount is provided in the request body
        if (!body.amount) {
          console.error("No amount provided for direct payment and no transaction found");
          return NextResponse.json(
            { 
              success: false, 
              error: 'Missing payment amount', 
              details: 'An amount is required when the invoice cannot be found',
              transactionId: transactionId
            },
            { status: 400 }
          );
        }
        
        // Parse the amount from the request body
        let customAmount;
        try {
          customAmount = parseFloat(body.amount.toString());
          if (isNaN(customAmount) || customAmount <= 0) {
            throw new Error('Invalid amount');
          }
          console.log(`Valid amount found in request: ${customAmount}`);
          
          // Check if amount meets Razorpay's minimum requirement (1 INR = 100 paise)
          const amountInPaise = Math.round(customAmount * 100);
          if (amountInPaise < 100) {
            console.error('Amount too small for Razorpay:', amountInPaise, 'paise');
            return NextResponse.json(
              { 
                success: false, 
                error: 'Amount too small', 
                details: 'Razorpay requires a minimum amount of ₹1 (100 paise). The current amount is ₹' + (amountInPaise/100).toFixed(2)
              },
              { status: 400 }
            );
          }
        } catch (error) {
          console.error("Invalid amount format:", body.amount);
          return NextResponse.json(
            { 
              success: false, 
              error: 'Invalid amount', 
              details: 'The provided amount must be a positive number',
              receivedValue: body.amount
            },
            { status: 400 }
          );
        }
        
        console.log(`Using amount from request for payment: ${customAmount}`);
        
        const directCurrency = body.currency || 'INR';
        
        const orderOptions = {
          amount: Math.round(customAmount * 100), // Convert to paise
          currency: directCurrency,
          receipt: `receipt_direct_${Math.random().toString(36).substring(2, 10)}`,
          notes: {
            attempted_transaction_id: transactionId,
            source: 'direct-payment',
            description: body.description || 'Direct payment (transaction not found)',
            custom_amount: customAmount.toString()
          }
        };
        
        try {
          console.log(`Creating direct payment order with amount: ${customAmount} ${directCurrency}`);
          const order = await razorpay.orders.create(orderOptions);
          console.log("Direct payment order created:", order);
          
          return NextResponse.json({
            success: true,
            orderId: order.id,
            amount: orderOptions.amount,
            currency: orderOptions.currency,
            receipt: orderOptions.receipt,
            notes: orderOptions.notes,
            directPayment: true,
            originalTransactionId: transactionId
          });
        } catch (razorpayError) {
          console.error("Error creating direct payment order:", razorpayError);
          
          return NextResponse.json(
            { 
              success: false, 
              error: 'Failed to create direct payment order', 
              details: razorpayError instanceof Error ? razorpayError.message : String(razorpayError)
            },
            { status: 500 }
          );
        }
      }
      
      const receipt = `receipt_${transaction.invoice_number || Math.random().toString(36).substring(2, 10)}`;
      
      console.log(`Creating payment for transaction ${transactionId} with amount ${transaction.total_amount}`);
      
      try {
        console.log("Creating Razorpay order from transaction");
        
        // Ensure we're using the exact total_amount from the invoice
        // Log the raw value to check for any formatting issues
        console.log('Transaction total_amount (raw):', transaction.total_amount);
        console.log('Transaction total_amount type:', typeof transaction.total_amount);
        
        // Convert to a number if it's stored as a string
        let totalAmount;
        if (typeof transaction.total_amount === 'string') {
          totalAmount = parseFloat(transaction.total_amount);
          console.log('Converted string amount to number:', totalAmount);
        } else if (typeof transaction.total_amount === 'number') {
          totalAmount = transaction.total_amount;
        } else {
          console.error('Unexpected amount type:', typeof transaction.total_amount);
          totalAmount = 0;
        }
          
        // Check if amount is valid
        if (isNaN(totalAmount) || totalAmount <= 0) {
          console.error('Invalid amount in transaction:', totalAmount);
          return NextResponse.json(
            { 
              success: false, 
              error: 'Invalid amount in transaction', 
              details: 'The transaction contains an invalid amount'
            },
            { status: 400 }
          );
        }
        
        // Round to 2 decimal places to avoid floating point issues
        const roundedAmount = Math.round(totalAmount * 100) / 100;
        console.log('Rounded amount (₹):', roundedAmount);
        
        // Convert to paise (smallest currency unit) for Razorpay
        const amountInPaise = Math.round(roundedAmount * 100);
        console.log('Amount in paise:', amountInPaise);
        
        // Check if amount meets Razorpay's minimum requirement (1 INR = 100 paise)
        if (amountInPaise < 100) {
          console.error('Amount too small for Razorpay:', amountInPaise, 'paise');
          return NextResponse.json(
            { 
              success: false, 
              error: 'Amount too small', 
              details: 'Razorpay requires a minimum amount of ₹1 (100 paise). The current amount is ₹' + (amountInPaise/100).toFixed(2)
            },
            { status: 400 }
          );
        }
        
        console.log(`Using exact invoice amount: ₹${roundedAmount} (${amountInPaise} paise)`);
        
        const orderOptions = {
          amount: amountInPaise,
          currency: 'INR',
          receipt: receipt,
          notes: {
            transactionId: transaction.id,
            invoiceNumber: transaction.invoice_number,
            customerName: transaction.customer_name,
            customerEmail: transaction.customer_email,
            calculatedAmount: `${roundedAmount}`, // Add this for debugging
            amountInTransaction: `${transaction.total_amount}` // Original value for comparison
          }
        };
        
        console.log("Order options:", orderOptions);
        
        const order = await razorpay.orders.create(orderOptions);
        console.log("Razorpay order created:", order);
        
        return NextResponse.json({
          success: true,
          orderId: order.id,
          amount: amountInPaise,
          currency: 'INR',
          receipt: receipt,
          invoice: {
            number: transaction.invoice_number,
            amount: transaction.total_amount,
            customer: transaction.customer_name
          },
          notes: {
            transactionId: transaction.id,
            invoiceNumber: transaction.invoice_number
          }
        });
      } catch (razorpayError) {
        console.error("Error creating Razorpay order:", razorpayError);
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to create Razorpay order', 
            details: razorpayError instanceof Error ? razorpayError.message : String(razorpayError)
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error fetching transaction:", error);
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve transaction data', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in Razorpay API route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 