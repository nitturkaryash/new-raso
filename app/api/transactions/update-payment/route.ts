import { NextResponse } from 'next/server';
import { getTransaction, updateTransactionPayment } from '@/lib/supabase';

export async function POST(request: Request) {
  console.log("Update payment status API route called");
  
  try {
    const body = await request.json();
    const { transactionId, paymentId, orderId, signature } = body;
    
    console.log("Request body:", { transactionId, paymentId, orderId, signature });
    
    if (!transactionId || !paymentId) {
      console.error("Missing required parameters: transactionId or paymentId");
      return NextResponse.json(
        { success: false, error: 'Transaction ID and Payment ID are required' },
        { status: 400 }
      );
    }
    
    console.log(`Updating payment status for transaction ${transactionId} with payment ID ${paymentId}`);
    
    try {
      // Get the current transaction first for debugging
      const currentTransaction = await getTransaction(transactionId);
      
      if (!currentTransaction) {
        console.error(`Transaction ${transactionId} not found`);
        return NextResponse.json(
          { success: false, error: `Transaction ${transactionId} not found` },
          { status: 404 }
        );
      }
      
      console.log("Current transaction state:", {
        id: currentTransaction.id,
        payment_status: currentTransaction.payment_status,
        payment_id: currentTransaction.payment_id
      });
      
      // If already successful, just return success
      if (currentTransaction.payment_status === 'successful' || 
          currentTransaction.payment_status === 'paid') {
        console.log(`Transaction ${transactionId} already marked as ${currentTransaction.payment_status}`);
        return NextResponse.json({
          success: true,
          message: `Payment status already marked as ${currentTransaction.payment_status}`,
          transaction: currentTransaction
        });
      }
      
      // Update the transaction payment status
      const updatedTransaction = await updateTransactionPayment(transactionId, paymentId);
      
      console.log("Transaction payment status updated successfully:", {
        id: updatedTransaction.id,
        payment_status: updatedTransaction.payment_status,
        payment_id: updatedTransaction.payment_id
      });
      
      return NextResponse.json({
        success: true,
        message: 'Payment status updated successfully',
        transaction: {
          id: updatedTransaction.id,
          payment_status: updatedTransaction.payment_status
        }
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
      
      // Get the specific error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update payment status', 
          details: errorMessage,
          transactionId: transactionId,
          paymentId: paymentId
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