import { NextRequest, NextResponse } from 'next/server';
import { updateTransactionPayment } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  console.log("Payment callback API called");
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const razorpay_payment_id = searchParams.get('razorpay_payment_id');
    const razorpay_order_id = searchParams.get('razorpay_order_id');
    const razorpay_signature = searchParams.get('razorpay_signature');
    const transactionId = searchParams.get('transaction_id');
    
    console.log("Payment callback params:", {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      transactionId
    });
    
    // If we have a payment ID and transaction ID, update the transaction
    if (razorpay_payment_id && transactionId) {
      try {
        await updateTransactionPayment(transactionId, razorpay_payment_id);
        console.log(`Successfully updated transaction ${transactionId} with payment ${razorpay_payment_id}`);
      } catch (error) {
        console.error(`Error updating transaction ${transactionId}:`, error);
      }
    }
    
    // Redirect to payment success page
    const redirectUrl = new URL('/payment-success', request.nextUrl.origin);
    
    if (razorpay_payment_id) {
      redirectUrl.searchParams.set('paymentId', razorpay_payment_id);
    }
    
    if (transactionId) {
      redirectUrl.searchParams.set('transaction_id', transactionId);
      
      // Add fallback URL to return to the invoice
      const fallbackUrl = `/public/invoice/${transactionId}`;
      redirectUrl.searchParams.set('fallbackUrl', fallbackUrl);
    }
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in payment callback:", error);
    
    // Redirect to payment success page with error
    const redirectUrl = new URL('/payment-success', request.nextUrl.origin);
    redirectUrl.searchParams.set('error', 'Failed to process payment callback');
    
    return NextResponse.redirect(redirectUrl);
  }
} 