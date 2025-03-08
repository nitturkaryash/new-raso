"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Check, ArrowLeft, Printer, Download, Share } from 'lucide-react'

// Client component that uses the search params
function PaymentDetails() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [amount, setAmount] = useState<string | null>(null)
  const [date, setDate] = useState<string>('')
  
  useEffect(() => {
    // Get the payment ID and amount from the URL
    const id = searchParams.get('paymentId')
    const amtParam = searchParams.get('amount')
    setPaymentId(id)
    
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
  }, [searchParams])
  
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
  
  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-center text-green-500 mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <Check size={48} />
            </div>
          </div>
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
                <Check className="mr-1 h-4 w-4" /> Completed
              </p>
            </div>
          </div>
          
          <div className="text-center space-y-2 p-4 border rounded-md bg-primary/5">
            <p>Thank you for your payment. A confirmation email with your receipt has been sent to your email address.</p>
            <p>You can print this page as a receipt or download a PDF copy using the buttons below.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 pt-2">
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
          <Button 
            variant="outline" 
            onClick={() => router.push('/')}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Home
          </Button>
          
          <Button 
            onClick={() => router.push('/transactions')}
          >
            View All Transactions
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// Loading fallback component
function PaymentDetailsLoading() {
  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gray-100 p-3 rounded-full animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-200"></div>
            </div>
          </div>
          <CardTitle className="text-center text-2xl">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto animate-pulse"></div>
          </CardTitle>
          <CardDescription className="text-center">
            <div className="h-4 bg-gray-200 rounded w-2/4 mx-auto mt-2 animate-pulse"></div>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-md animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-full"></div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-full"></div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
          
          <div className="text-center space-y-2 p-4 border rounded-md bg-gray-50">
            <div className="h-4 bg-gray-200 rounded w-full mx-auto animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto animate-pulse"></div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <div className="h-10 bg-gray-200 rounded w-36 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-36 animate-pulse"></div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-wrap justify-center gap-4 pt-6 border-t">
          <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentDetailsLoading />}>
      <PaymentDetails />
    </Suspense>
  )
} 