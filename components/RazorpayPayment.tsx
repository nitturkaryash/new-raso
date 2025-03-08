'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'
import { type Transaction } from '@/lib/supabase'

interface RazorpayPaymentProps {
  orderData: any
  transaction: Transaction
  onSuccess: (response: any) => void
  onCancel: () => void
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function RazorpayPayment({ 
  orderData, 
  transaction,
  onSuccess,
  onCancel
}: RazorpayPaymentProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Load Razorpay script
    if (typeof window !== 'undefined') {
      if (window.Razorpay) {
        setIsLoaded(true)
        return
      }
      
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => {
        console.log('Razorpay script loaded successfully')
        setIsLoaded(true)
      }
      script.onerror = (error) => {
        console.error('Failed to load Razorpay script:', error)
      }
      document.body.appendChild(script)
    }
  }, [])

  const handlePayment = () => {
    if (!isLoaded || !orderData) return
    
    setIsProcessing(true)
    
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    
    if (!razorpayKeyId) {
      console.error('Razorpay key is missing')
      setIsProcessing(false)
      return
    }
    
    try {
      const options = {
        key: razorpayKeyId,
        amount: orderData.amount || Math.round(transaction.total_amount * 100), // Amount in paise
        currency: orderData.currency || 'INR',
        order_id: orderData.orderId,
        name: 'Invoice Payment',
        description: `Payment for Invoice #${transaction.invoice_number}`,
        receipt: orderData.receipt,
        notes: orderData.notes || {
          transactionId: transaction.id,
          invoiceNumber: transaction.invoice_number
        },
        handler: function(response: any) {
          setIsProcessing(false)
          onSuccess(response)
        },
        prefill: {
          name: transaction.customer_name,
          email: transaction.customer_email,
        },
        theme: {
          color: '#10b981',
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false)
            onCancel()
          }
        }
      }
      
      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', function(response: any) {
        console.error('Payment failed:', response.error)
        setIsProcessing(false)
      })
      
      razorpay.open()
    } catch (error) {
      console.error('Error initializing Razorpay:', error)
      setIsProcessing(false)
    }
  }

  return (
    <Button 
      size="sm"
      onClick={handlePayment}
      disabled={!isLoaded || isProcessing}
    >
      <CreditCard className="h-4 w-4 mr-2" />
      {!isLoaded 
        ? 'Loading Payment...' 
        : isProcessing 
          ? 'Processing...' 
          : 'Pay Now'
      }
    </Button>
  )
} 