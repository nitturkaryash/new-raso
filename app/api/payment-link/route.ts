import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getTransaction } from '@/lib/supabase';

// Define a type for Razorpay error
interface RazorpayError {
  statusCode?: number;
  error?: string;
  description?: string;
  message?: string;
  name?: string;
}

export async function POST(request: Request) {
  console.log("Payment link API route called");
  
  try {
    const body = await request.json();
    console.log("Request body:", body);
    
    const { transactionId, amount, customerName, customerEmail, description } = body;
    
    if (!transactionId && !amount) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters',
        details: 'Either a transaction ID or amount is required' 
      }, { status: 400 });
    }
    
    // Check for Razorpay credentials
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    console.log('Checking Razorpay credentials:', {
      key_id_exists: !!key_id,
      key_secret_exists: !!key_secret,
      key_id_prefix: key_id?.substring(0, 8)
    });

    if (!key_id || !key_secret) {
      console.error('Missing Razorpay credentials');
      return NextResponse.json({ 
        success: false, 
        error: 'Razorpay configuration is incomplete',
        details: 'Missing API keys'
      }, { status: 500 });
    }
    
    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: key_id,
      key_secret: key_secret
    });
    
    // Case 1: Use transaction from database if available
    if (transactionId) {
      console.log("Creating payment link for transaction:", transactionId);
      
      // Fetch the actual transaction data from the database
      let transaction;
      try {
        transaction = await getTransaction(transactionId);
        console.log("Retrieved transaction data:", transaction ? "Found" : "Not found");
        
        if (transaction) {
          // Convert amount to paise (Razorpay expects amount in paise)
          const amountInPaise = Math.round(transaction.total_amount * 100);
          
          console.log('Creating payment link with transaction data:', {
            amount: amountInPaise,
            currency: "INR",
            description: `Payment for Invoice #${transaction.invoice_number}`,
            customer_details: {
              name: transaction.customer_name,
              email: transaction.customer_email
            }
          });

          // Create the payment link with transaction data
          const paymentLink = await razorpay.paymentLink.create({
            amount: amountInPaise,
            currency: "INR",
            accept_partial: false,
            description: `Payment for Invoice #${transaction.invoice_number}`,
            customer: {
              name: transaction.customer_name,
              email: transaction.customer_email,
              // Don't use a hardcoded phone number
              // Only add contact if we have a real phone number in the future
            },
            notify: {
              email: true,
              sms: false // Set to false since we don't have a phone number
            },
            reminder_enable: true,
            notes: {
              transaction_id: transaction.id,
              invoice_number: transaction.invoice_number
            },
            callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/transactions/${transaction.id}/invoice`,
            callback_method: "get",
            expire_by: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // Link expires in 7 days
            reference_id: transaction.invoice_number
          });

          console.log('Payment link created successfully from transaction:', {
            short_url: paymentLink.short_url,
            id: paymentLink.id,
            status: paymentLink.status
          });

          return NextResponse.json({
            success: true,
            paymentLink: paymentLink.short_url,
            paymentLinkId: paymentLink.id,
            amount: transaction.total_amount
          });
        }
        
        // If transaction not found but amount is provided, fall through to Case 2
        // Otherwise return an error but with a 200 status to allow the client to handle it differently
        if (!amount) {
          console.log(`Transaction with ID ${transactionId} not found and no amount provided`);
          return NextResponse.json({ 
            success: false, 
            error: 'Transaction not found',
            message: `Transaction with ID ${transactionId} not found`,
            details: `The transaction does not exist, but you can create a payment link with direct parameters.`
          }, { status: 200 });
        }
        
        console.log(`Transaction with ID ${transactionId} not found, falling back to direct parameters`);
      } catch (error) {
        // If transaction fetch fails but amount is provided, fall through to Case 2
        if (!amount) {
          console.error("Error fetching transaction:", error);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to retrieve transaction data',
            details: error instanceof Error ? error.message : String(error)
          }, { status: 500 });
        }
        
        console.log(`Error fetching transaction, falling back to direct parameters:`, error);
      }
    }
    
    // Case 2: Use direct parameters
    if (amount) {
      // Make sure we have a name for the customer
      const name = customerName || 'Customer';
      const email = customerEmail || '';
      const desc = description || `Payment - ₹${parseFloat(amount.toString()).toFixed(2)}`;
      const reference = `direct-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Convert amount to paise
      let amountInPaise: number;
      try {
        amountInPaise = Math.round(parseFloat(amount.toString()) * 100);
        if (isNaN(amountInPaise) || amountInPaise <= 0) {
          throw new Error('Invalid amount');
        }
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid amount', details: 'Amount must be a positive number' },
          { status: 400 }
        );
      }
      
      console.log('Creating payment link with direct parameters:', {
        amount: amountInPaise,
        name,
        email,
        description: desc
      });

      try {
        const paymentLink = await razorpay.paymentLink.create({
          amount: amountInPaise,
          currency: "INR",
          accept_partial: false,
          description: desc,
          customer: {
            name: name,
            email: email
          },
          notify: {
            email: !!email,
            sms: false
          },
          reminder_enable: true,
          notes: {
            source: 'direct-payment',
            transaction_id: transactionId || 'none'
          },
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success`,
          callback_method: "get",
          expire_by: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // Link expires in 7 days
          reference_id: reference
        });

        console.log('Payment link created successfully from direct parameters:', {
          short_url: paymentLink.short_url,
          id: paymentLink.id,
          status: paymentLink.status
        });

        return NextResponse.json({
          success: true,
          paymentLink: paymentLink.short_url,
          paymentLinkId: paymentLink.id,
          amount: parseFloat(amount.toString())
        });
      } catch (error) {
        console.error("Error creating payment link with direct parameters:", error);
        
        // Safe error handling without type assumptions
        let statusCode = 500;
        let errorMessage = 'Failed to create payment link';
        let errorDetails = 'Unknown error occurred';
        
        // Safely check for 401 status
        if (error && typeof error === 'object') {
          const err = error as any;
          if (err.statusCode === 401) {
            statusCode = 401;
            errorMessage = 'Razorpay authentication failed';
            errorDetails = 'Invalid API keys. Please check your Razorpay dashboard for the correct credentials.';
          } else if (err.message) {
            errorDetails = err.message;
          }
        }
        
        return NextResponse.json({ 
          success: false, 
          error: errorMessage, 
          details: errorDetails,
          debug: {
            key_id_prefix: key_id?.substring(0, 8)
          }
        }, { status: statusCode });
      }
    }
    
    // If we reach here, both transaction lookup and direct parameters failed
    return NextResponse.json({ 
      success: false, 
      error: 'Missing payment details', 
      details: 'Either a valid transaction ID or payment amount is required' 
    }, { status: 400 });

  } catch (error) {
    console.error('Error in payment link API route:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 