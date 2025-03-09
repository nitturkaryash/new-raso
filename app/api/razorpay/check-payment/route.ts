import { NextRequest, NextResponse } from 'next/server';
import { getTransaction } from '@/lib/supabase';
import Razorpay from 'razorpay';

// Mark this route as dynamic to prevent static generation errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log("Payment status check API called");
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      console.error("Missing order ID parameter");
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Checking payment status for order ${orderId}`);
    
    // Initialize Razorpay config
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("Missing Razorpay credentials");
      return NextResponse.json(
        { success: false, error: 'Razorpay configuration is incomplete' },
        { status: 500 }
      );
    }
    
    // Fetch order status from Razorpay
    try {
      const response = await fetch(`https://api.razorpay.com/v1/orders/${orderId}/payments`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch order payments (${response.status}):`, errorText);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch payment status from Razorpay' },
          { status: response.status }
        );
      }
      
      const paymentsData = await response.json();
      console.log("Razorpay payments data:", paymentsData);
      
      // Check if there's any captured/authorized payment
      if (paymentsData.items && paymentsData.items.length > 0) {
        // Usually the first item is the most recent payment
        const payment = paymentsData.items[0];
        
        if (payment.status === 'captured' || payment.status === 'authorized') {
          console.log(`Found successful payment for order ${orderId}:`, payment);
          
          // If payment is successful but there are notes with transaction_id
          // we can update the transaction status
          if (payment.notes && payment.notes.transactionId) {
            try {
              // Get the transaction to check current status
              const transaction = await getTransaction(payment.notes.transactionId);
              
              if (transaction && transaction.payment_status !== 'successful' && transaction.payment_status !== 'paid') {
                // Update the transaction status (this will be done by the client)
                console.log(`Transaction ${payment.notes.transactionId} found and needs update`);
                
                return NextResponse.json({
                  success: true,
                  payment_status: 'paid',
                  payment_id: payment.id,
                  order_id: orderId,
                  transaction_id: payment.notes.transactionId
                });
              } else if (transaction) {
                console.log(`Transaction ${payment.notes.transactionId} already has status: ${transaction.payment_status}`);
                
                // Already successful, just return the current status
                return NextResponse.json({
                  success: true,
                  payment_status: transaction.payment_status,
                  payment_id: transaction.payment_id || payment.id,
                  order_id: orderId,
                  transaction_id: payment.notes.transactionId
                });
              }
            } catch (error) {
              console.error("Error fetching transaction:", error);
            }
          }
          
          // Generic success response if we couldn't find a transaction
          return NextResponse.json({
            success: true,
            payment_status: 'paid',
            payment_id: payment.id,
            order_id: orderId
          });
        }
      }
      
      // If no successful payment found
      return NextResponse.json({
        success: true,
        payment_status: 'pending',
        order_id: orderId
      });
      
    } catch (error) {
      console.error("Error checking payment status:", error);
      return NextResponse.json(
        { success: false, error: 'Failed to check payment status' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unhandled error in check-payment API:", error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 