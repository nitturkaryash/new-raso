'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'
import { type Transaction } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

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
  const { toast } = useToast()
  const [isLoaded, setIsLoaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Handle QR code payments - we need to poll for status updates
  const [isQrPayment, setIsQrPayment] = useState(false)
  const [qrOrderId, setQrOrderId] = useState('')
  
  useEffect(() => {
    // Load Razorpay script
    if (typeof window === 'undefined') return

    const loadRazorpay = async () => {
      if (window.Razorpay) {
        setIsLoaded(true)
        return
      }
      
      try {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        
        script.onload = () => {
          console.log('Razorpay script loaded successfully')
          setIsLoaded(true)
        }
        
        script.onerror = (error) => {
          console.error('Failed to load Razorpay script:', error)
          toast({
            title: "Payment Error",
            description: "Failed to load payment gateway. Please try again later.",
            variant: "destructive",
          })
        }
        
        document.body.appendChild(script)
      } catch (error) {
        console.error('Error loading Razorpay script:', error)
        toast({
          title: "Payment Error",
          description: "Failed to initialize payment gateway. Please try again later.",
          variant: "destructive",
        })
      }
    }

    loadRazorpay()

    // Cleanup
    return () => {
      const script = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
      if (script) {
        document.body.removeChild(script)
      }
    }
  }, [])
  
  // Handle QR code polling when active
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    
    if (isQrPayment && qrOrderId) {
      console.log(`Starting polling for QR payment status for order ${qrOrderId}`);
      
      // Poll every 5 seconds
      pollInterval = setInterval(async () => {
        try {
          console.log(`Checking payment status for order ${qrOrderId}`);
          const response = await fetch(`/api/razorpay/check-payment?orderId=${qrOrderId}`);
          const data = await response.json();
          
          console.log('Order status check result:', data);
          
          if (data.success && data.payment_status === 'paid') {
            console.log('QR Payment detected as successful');
            clearInterval(pollInterval!);
            setIsQrPayment(false);
            setQrOrderId('');
            
            // Call success handler with the payment data
            onSuccess({
              razorpay_payment_id: data.payment_id,
              razorpay_order_id: qrOrderId,
              razorpay_signature: 'qr_payment'
            });
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }, 5000);
    }
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isQrPayment, qrOrderId, onSuccess]);

  const handlePayment = () => {
    if (!isLoaded || !orderData) return
    
    setIsProcessing(true)
    
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    
    if (!razorpayKeyId) {
      console.error('Razorpay key is missing')
      toast({
        title: "Payment Error",
        description: "Payment configuration is incomplete. Please contact support.",
        variant: "destructive",
      })
      setIsProcessing(false)
      return
    }
    
    try {
      const orderId = orderData.orderId || (orderData.id ? orderData.id : null)
      
      if (!orderId) {
        console.error('Order ID is missing from order data', orderData)
        toast({
          title: "Payment Error",
          description: "Invalid order details. Please try again later.",
          variant: "destructive",
        })
        setIsProcessing(false)
        return
      }
      
      console.log('Opening Razorpay with order ID:', orderId)
      
      const options = {
        key: razorpayKeyId,
        amount: orderData.amount || Math.round(transaction.total_amount * 100), // Amount in paise
        currency: orderData.currency || 'INR',
        order_id: orderId,
        name: 'Invoice Payment',
        description: `Payment for Invoice #${transaction.invoice_number}`,
        receipt: orderData.receipt,
        notes: orderData.notes || {
          transactionId: transaction.id,
          invoiceNumber: transaction.invoice_number
        },
        handler: function(response: any) {
          console.log('Payment successful, response:', response)
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
            console.log('Payment modal dismissed')
            setIsProcessing(false)
            
            // If QR payment was started, don't cancel yet - we'll poll for status
            if (isQrPayment) {
              toast({
                title: "QR Code Payment Initiated",
                description: "Please complete the payment in your UPI app. This page will update automatically when payment is detected.",
              });
            } else {
              onCancel()
            }
          }
        },
        // QR code payment detection
        callback_url: `${window.location.origin}/api/razorpay/payment-callback`,
        _: {
          integration: 'custom',
          integration_version: '1.0.0',
          integration_parent_version: '1.0.0'
        }
      }
      
      console.log('Razorpay options:', options)
      
      const razorpay = new window.Razorpay(options)
      
      // Listen for QR code scan events
      razorpay.on('payment.upi_qrcode_generated', function(response: any) {
        console.log('UPI QR code generated:', response);
        setIsQrPayment(true);
        setQrOrderId(orderId);
        
        toast({
          title: "QR Code Generated",
          description: "Please scan the QR code with your UPI app to complete payment.",
        });
      });
      
      razorpay.on('payment.failed', function(response: any) {
        console.error('Payment failed:', response.error)
        
        // Only cancel if not a QR payment - for QR we keep polling
        if (!isQrPayment) {
          setIsProcessing(false)
          
          toast({
            title: "Payment Failed",
            description: response.error.description || "Your payment attempt failed. Please try again.",
            variant: "destructive",
          });
          
          onCancel();
        }
      })
      
      razorpay.open()
    } catch (error) {
      console.error('Error initializing Razorpay:', error)
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again later.",
        variant: "destructive",
      })
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
          ? isQrPayment ? 'QR Payment Pending...' : 'Processing...' 
          : 'Pay Now'
      }
    </Button>
  )
} 