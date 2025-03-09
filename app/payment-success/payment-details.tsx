"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Check, ArrowLeft, Printer, Share, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function PaymentDetails() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [amount, setAmount] = useState<string | null>(null)
  const [date, setDate] = useState<string>('')
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [isUpdatingPayment, setIsUpdatingPayment] = useState<boolean>(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState<string | null>(null)
  
  useEffect(() => {
    // Get the payment ID, amount, and fallback URL from the URL
    const id = searchParams?.get('paymentId')
    const amtParam = searchParams?.get('amount')
    const fbUrl = searchParams?.get('fallbackUrl')
    const txnId = searchParams?.get('transaction_id') || extractTransactionIdFromUrl(fbUrl)
    const invNum = searchParams?.get('invoice_number')
    const custName = searchParams?.get('customer_name')
    
    setPaymentId(id)
    setFallbackUrl(fbUrl)
    setTransactionId(txnId)
    setInvoiceNumber(invNum)
    setCustomerName(custName)
    
    // Parse amount correctly - ensure it's a number with 2 decimal places
    if (amtParam) {
      try {
        const parsedAmount = parseFloat(amtParam);
        if (!isNaN(parsedAmount)) {
          setAmount(parsedAmount.toFixed(2));
        } else {
          setAmount('0.00');
        }
      } catch (error) {
        console.error('Error parsing amount:', error);
        setAmount('0.00');
      }
    } else {
      setAmount('0.00');
    }
    
    // Set current date/time
    const now = new Date()
    setDate(now.toLocaleString())
    
    // Update payment status if we have both transaction ID and payment ID
    if (id && txnId) {
      updatePaymentStatus(txnId, id);
    }
  }, [searchParams])
  
  // Helper function to extract transaction ID from fallback URL
  const extractTransactionIdFromUrl = (url: string | null): string | null => {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const transactionsIndex = pathParts.findIndex(part => part === 'transactions');
      
      if (transactionsIndex !== -1 && transactionsIndex < pathParts.length - 1) {
        return pathParts[transactionsIndex + 1];
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting transaction ID from URL:', error);
      return null;
    }
  }
  
  // Function to update payment status
  const updatePaymentStatus = async (txnId: string, pymtId: string) => {
    setIsUpdatingPayment(true);
    setUpdateError(null);
    
    console.log(`Attempting to update payment status for transaction ${txnId} with payment ID ${pymtId}`);
    
    try {
      // Add a delay to ensure the previous payment callbacks have completed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch('/api/transactions/update-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: txnId,
          paymentId: pymtId
        }),
      });
      
      const data = await response.json();
      console.log('Update payment status response:', data);
      
      if (!response.ok || !data.success) {
        console.error('Error in update payment response:', data);
        throw new Error(data.error || 'Failed to update payment status');
      }
      
      console.log('Payment status updated successfully to "successful"');
      
      // Do a second update attempt after a short delay to ensure it's saved
      setTimeout(async () => {
        try {
          const secondResponse = await fetch('/api/transactions/update-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactionId: txnId,
              paymentId: pymtId
            }),
          });
          
          console.log('Second update attempt result:', await secondResponse.json());
        } catch (error) {
          console.error('Error in second update attempt:', error);
        }
      }, 3000);
    } catch (error) {
      console.error('Error updating payment status:', error);
      setUpdateError(error instanceof Error ? error.message : 'Failed to update payment status');
    } finally {
      setIsUpdatingPayment(false);
    }
  };
  
  const handlePrint = () => {
    window.print()
  }
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Receipt',
          text: `Payment of ₹${amount} completed successfully. Reference ID: ${paymentId}`,
          url: window.location.href
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback for browsers that don't support sharing
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }
  
  // Function to navigate back to transactions with refresh flag
  const handleReturnToTransactions = () => {
    // Set a flag in sessionStorage to indicate that transactions should be refreshed
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('refreshTransactions', 'true');
      router.push('/transactions');
    }
  }
  
  // Determine if the user is an admin or customer based on the URL
  const isAdminView = () => {
    if (typeof window === 'undefined') return false;
    
    // If the fallback URL contains '/public/' it's a customer view
    return !fallbackUrl || !fallbackUrl.includes('/public/');
  }
  
  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <AnimatePresence>
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="flex items-center justify-center text-green-500 mb-4"
            >
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, times: [0, 0.5, 1] }}
                className="bg-green-100 p-3 rounded-full"
              >
                <Check size={48} />
              </motion.div>
            </motion.div>
          </AnimatePresence>
          <CardTitle className="text-center text-2xl">Payment Successful!</CardTitle>
          <CardDescription className="text-center">
            Your payment has been processed successfully.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentId && (
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-500 text-sm mb-1">Payment Reference ID</p>
                <p className="font-mono font-medium">{paymentId}</p>
              </div>
            )}
            
            {amount && (
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-500 text-sm mb-1">Amount Paid</p>
                <p className="font-medium text-lg">₹{parseFloat(amount).toFixed(2)}</p>
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-gray-500 text-sm mb-1">Payment Date & Time</p>
              <p className="font-medium">{date}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-gray-500 text-sm mb-1">Payment Status</p>
              <p className="font-medium text-green-600 flex items-center">
                <Check className="mr-1 h-4 w-4" /> 
                {isUpdatingPayment ? 'Updating...' : updateError ? 'Completed (Update Failed)' : 'Successful'}
              </p>
            </div>
          </div>
          
          {/* Invoice Details Section */}
          {(invoiceNumber || customerName) && (
            <div className="border rounded-md p-4 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Invoice Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invoiceNumber && (
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Invoice Number</p>
                    <p className="font-medium">{invoiceNumber}</p>
                  </div>
                )}
                {customerName && (
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Customer Name</p>
                    <p className="font-medium">{customerName}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {updateError && (
            <div className="text-center p-4 border rounded-md bg-red-50 text-red-600">
              <p>There was an issue updating the transaction status: {updateError}</p>
              <p className="text-sm mt-1">Your payment was successful, but the transaction record may need to be updated manually.</p>
            </div>
          )}
          
          <div className="text-center space-y-2 p-4 border rounded-md bg-primary/5">
            <p>Thank you for your payment. A confirmation email with your receipt has been sent to your email address.</p>
            <p>You can print this page as a receipt or download a PDF copy using the buttons below.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            {fallbackUrl && (
              <Button variant="outline" onClick={() => window.location.href = fallbackUrl} className="flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                View Invoice
              </Button>
            )}
            
            <Button variant="outline" onClick={handlePrint} className="flex items-center">
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
            
            <Button variant="outline" onClick={handleShare} className="flex items-center">
              <Share className="mr-2 h-4 w-4" />
              Share Receipt
            </Button>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-wrap justify-center gap-4 pt-6 border-t">
          {fallbackUrl ? (
            <Button 
              variant="outline" 
              onClick={() => window.location.href = fallbackUrl}
              className="flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Merchant
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
              className="flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
          )}
          
          {isAdminView() && (
            <Button 
              onClick={handleReturnToTransactions}
            >
              View All Transactions
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
} 