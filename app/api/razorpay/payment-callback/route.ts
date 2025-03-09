import { NextRequest, NextResponse } from 'next/server';
import { updateTransactionPayment, getTransaction } from '@/lib/supabase';

// Mark this route as dynamic to prevent static generation errors
export const dynamic = 'force-dynamic';

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
        const transaction = await getTransaction(transactionId);
        await updateTransactionPayment(transactionId, razorpay_payment_id);
        console.log(`Successfully updated transaction ${transactionId} with payment ${razorpay_payment_id}`);
        
        // Redirect to payment success page with all relevant details
        const redirectUrl = new URL('/payment-success', request.nextUrl.origin);
        
        if (razorpay_payment_id) {
          redirectUrl.searchParams.set('paymentId', razorpay_payment_id);
        }
        
        if (transactionId) {
          redirectUrl.searchParams.set('transaction_id', transactionId);
          
          // Add fallback URL to return to the invoice
          const fallbackUrl = `/public/invoice/${transactionId}`;
          redirectUrl.searchParams.set('fallbackUrl', fallbackUrl);
          
          // Add invoice details if transaction was found
          if (transaction) {
            redirectUrl.searchParams.set('invoice_number', transaction.invoice_number || '');
            redirectUrl.searchParams.set('customer_name', transaction.customer_name || '');
            redirectUrl.searchParams.set('amount', transaction.total_amount?.toString() || '');
          }
        }
        
        return NextResponse.redirect(redirectUrl);
      } catch (error) {
        console.error(`Error updating transaction ${transactionId}:`, error);
        // Still redirect to success page but without transaction details
        const redirectUrl = new URL('/payment-success', request.nextUrl.origin);
        if (razorpay_payment_id) {
          redirectUrl.searchParams.set('paymentId', razorpay_payment_id);
        }
        return NextResponse.redirect(redirectUrl);
      }
    }
    
    // Fallback redirect if no transaction ID
    const redirectUrl = new URL('/payment-success', request.nextUrl.origin);
    if (razorpay_payment_id) {
      redirectUrl.searchParams.set('paymentId', razorpay_payment_id);
    }
    return NextResponse.redirect(redirectUrl);
    
  } catch (error) {
    console.error('Error in payment callback:', error);
    // Redirect to error page or home page
    return NextResponse.redirect(new URL('/', request.nextUrl.origin));
  }
} 