"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, ArrowRight, Calendar, User, Mail, FileText } from "lucide-react"
import { getTransaction } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function InvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [transaction, setTransaction] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)

  useEffect(() => {
    // Declare Razorpay type for TypeScript
    if (typeof window !== 'undefined') {
      window.Razorpay = window.Razorpay || {};
    }
    
    loadTransaction()

    // Load Razorpay script
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => {
      console.log("Razorpay script loaded successfully")
      setRazorpayLoaded(true)
    }
    script.onerror = (error) => {
      console.error("Failed to load Razorpay script:", error)
    }
    document.body.appendChild(script)

    // Debug: Check if Razorpay key is available
    console.log("Razorpay key in environment:", process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? "Available" : "Not available")

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  async function loadTransaction() {
    try {
      setIsLoading(true)
      const data = await getTransaction(params.id)
      if (!data) {
        throw new Error('Transaction not found')
      }
      setTransaction(data)
    } catch (error) {
      console.error("Error loading transaction:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice details. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!transaction) {
      toast({
        title: "Error",
        description: "Transaction data is missing. Reload the page and try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (isProcessingPayment) return;
    
    setIsProcessingPayment(true);
    
    if (!razorpayLoaded) {
      toast({
        title: "Payment System Loading",
        description: "Please wait while we initialize the payment system...",
      });
      
      // Wait a bit for Razorpay to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!razorpayLoaded) {
        toast({
          title: "Payment Error",
          description: "Payment system could not be loaded. Please refresh the page and try again.",
          variant: "destructive",
        });
        setIsProcessingPayment(false);
        return;
      }
    }
    
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    
    if (!razorpayKeyId) {
      console.error("Razorpay Key ID is not configured in environment variables");
      toast({
        title: "Configuration Error",
        description: "Payment system is not properly configured. Please contact support.",
        variant: "destructive",
      });
      setIsProcessingPayment(false);
      return;
    }

    try {
      console.log("Creating order via API for transaction ID:", transaction.id);
      // Create order via API
      const orderResponse = await fetch('/api/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: transaction.id }),
      });
      
      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error("Order creation failed:", orderResponse.status, errorText);
        
        toast({
          title: "Payment Failed",
          description: "Could not initialize payment. Please try again later.",
          variant: "destructive",
        });
        
        setIsProcessingPayment(false);
        return;
      }
      
      const orderData = await orderResponse.json();
      
      if (!orderData.success) {
        console.error("Invalid order data received:", orderData);
        
        toast({
          title: "Payment Initialization Failed",
          description: orderData.error || "Invalid order data received. Please try again later.",
          variant: "destructive",
        });
        
        setIsProcessingPayment(false);
        return;
      }
      
      console.log("Order created successfully:", orderData);
      
      // Add a small delay to ensure Razorpay is fully loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Double check Razorpay is available
      if (typeof window.Razorpay !== 'function') {
        console.error("Razorpay is not available as a function after delay");
        console.log("Type of window.Razorpay:", typeof window.Razorpay);
        
        toast({
          title: "Payment Error",
          description: "Payment gateway not available. Please try again or contact support.",
          variant: "destructive",
        });
        setIsProcessingPayment(false);
        return;
      }
      
      const options = {
        key: razorpayKeyId,
        amount: orderData.amount, // Amount is already in paise
        currency: orderData.currency || "INR",
        order_id: orderData.orderId,
        name: "Your Company Name",
        description: `Payment for Invoice ${transaction.invoice_number}`,
        image: "https://your-logo-url.com/logo.png", // Replace with your logo
        handler: async function(response: any) {
          console.log("Payment successful:", response);
          
          try {
            // Update the transaction payment status in your database
            const updateResponse = await fetch('/api/transactions/update-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transactionId: transaction.id,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature
              }),
            });
            
            if (!updateResponse.ok) {
              console.error("Failed to update payment status:", await updateResponse.text());
              toast({
                title: "Warning",
                description: "Payment was successful, but we couldn't update the status. Please contact support.",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error("Error updating payment status:", error);
            toast({
              title: "Warning",
              description: "Payment was successful, but we couldn't update the status. Please contact support.",
              variant: "destructive",
            });
          }
          
          // Show success message
          toast({
            title: "Payment Successful",
            description: "Your payment has been processed successfully",
          });
          
          // Reload transaction to update UI
          loadTransaction();
          setIsProcessingPayment(false);
        },
        prefill: {
          name: transaction.customer_name || "",
          email: transaction.customer_email || "",
        },
        theme: {
          color: "#3B82F6", // Blue color
        },
        modal: {
          ondismiss: function() {
            console.log("Payment modal dismissed");
            setIsProcessingPayment(false);
          }
        }
      };

      // Create a new instance of Razorpay
      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', function(response: any) {
        console.error("Payment failed:", response.error);
        toast({
          title: "Payment Failed",
          description: response.error.description || "Your payment attempt failed. Please try again.",
          variant: "destructive",
        });
        setIsProcessingPayment(false);
      });
      
      // Open Razorpay payment form
      razorpay.open();
      
    } catch (error) {
      console.error("Error initializing Razorpay:", error);
      toast({
        title: "Error",
        description: "Failed to initialize payment gateway. Please try again later.",
        variant: "destructive",
      });
      setIsProcessingPayment(false);
    }
  };

  const handleViewFullInvoice = () => {
    router.push(`/transactions/${params.id}/invoice`);
  };

  if (isLoading) {
    return <div className="container mx-auto py-10 px-4 text-center">Loading invoice details...</div>;
  }

  if (!transaction) {
    return <div className="container mx-auto py-10 px-4 text-center">Invoice not found</div>;
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl">
      <Card className="shadow-lg">
        <CardHeader className="bg-primary/5 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Invoice #{transaction.invoice_number}</CardTitle>
              <CardDescription className="mt-2">
                Thank you for your business
              </CardDescription>
            </div>
            <Badge variant={transaction.payment_status === "paid" ? "success" : "outline"} className="text-base py-1 px-3">
              {transaction.payment_status === "paid" ? "Paid" : "Payment Pending"}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="grid gap-6">
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Date:</span> 
                <span>{new Date(transaction.invoice_date).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Customer:</span> 
                <span>{transaction.customer_name}</span>
              </div>
              
              {transaction.customer_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Email:</span> 
                  <span>{transaction.customer_email}</span>
                </div>
              )}
            </div>
            
            <div className="border rounded-md p-4 bg-muted/30">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5" /> Invoice Summary
              </h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{transaction.subtotal.toFixed(2)}</span>
                </div>
                
                {transaction.discount_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount:</span>
                    <span>-₹{transaction.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-muted-foreground">
                  <span>CGST:</span>
                  <span>₹{transaction.cgst_amount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-muted-foreground">
                  <span>SGST:</span>
                  <span>₹{transaction.sgst_amount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>₹{transaction.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3 border-t pt-6 bg-primary/5">
          {transaction.payment_status === "pending" ? (
            <Button 
              size="lg" 
              className="w-full text-lg py-6" 
              onClick={handlePayment}
              disabled={isProcessingPayment}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              {isProcessingPayment ? "Processing Payment..." : "Pay Now"}
            </Button>
          ) : (
            <div className="bg-green-50 text-green-700 p-4 rounded-md w-full text-center">
              <h3 className="font-bold text-lg">Payment Completed</h3>
              <p className="text-sm mt-1">Thank you for your payment!</p>
              {transaction.payment_id && (
                <p className="text-xs mt-2">Payment ID: {transaction.payment_id}</p>
              )}
            </div>
          )}
          
          <Button variant="outline" onClick={handleViewFullInvoice} className="w-full">
            View Full Invoice <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 