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
      
      const orderOptions = {
        amount: Math.round(parseFloat(body.amount) * 100), // Convert to paise
        currency: body.currency,
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
      console.error("Neither transactionId nor amount/currency were provided");
      return NextResponse.json(
        { success: false, error: 'Either transactionId or amount/currency is required' },
        { status: 400 }
      );
    }
    
    console.log("Fetching transaction details for ID:", transactionId);
    
    // Try to get real transaction data first
    let transaction;
    try {
      transaction = await getTransaction(transactionId);
      console.log("Retrieved transaction data:", transaction);
      
      if (!transaction) {
        console.error(`Transaction with ID ${transactionId} not found`);
        return NextResponse.json(
          { success: false, error: 'Transaction not found' },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error("Error fetching transaction:", error);
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve transaction data', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
    
    const receipt = `receipt_${transaction.invoice_number || Math.random().toString(36).substring(2, 10)}`;
    
    console.log(`Creating payment for transaction ${transactionId} with amount ${transaction.total_amount}`);
    
    try {
      console.log("Creating Razorpay order from transaction");
      const amount = Math.round(transaction.total_amount * 100); // amount in smallest currency unit (paise)
      
      const orderOptions = {
        amount: amount,
        currency: 'INR',
        receipt: receipt,
        notes: {
          transactionId: transaction.id,
          invoiceNumber: transaction.invoice_number
        }
      };
      
      console.log("Order options:", orderOptions);
      
      const order = await razorpay.orders.create(orderOptions);
      console.log("Razorpay order created:", order);
      
      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount: amount,
        currency: 'INR',
        receipt: receipt,
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
    console.error('Error in Razorpay API route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 