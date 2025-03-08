import { NextResponse } from 'next/server';
import { updateTransactionPayment } from '@/lib/supabase';

export async function POST(request: Request) {
  console.log("Update payment status API route called");
  
  try {
    const body = await request.json();
    const { transactionId, paymentId, orderId, signature } = body;
    
    if (!transactionId || !paymentId) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID and Payment ID are required' },
        { status: 400 }
      );
    }
    
    console.log(`Updating payment status for transaction ${transactionId} with payment ID ${paymentId}`);
    
    try {
      // Update the transaction payment status
      await updateTransactionPayment(transactionId, paymentId);
      
      return NextResponse.json({
        success: true,
        message: 'Payment status updated successfully'
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update payment status', 
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in update payment API route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 