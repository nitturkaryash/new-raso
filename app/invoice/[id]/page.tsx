"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, ArrowRight, Calendar, User, Mail, FileText, AlertTriangle, Check } from "lucide-react"
import { getTransaction } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

declare global {
  interface Window {
    Razorpay: any
  }
}

// Component to display when transaction is not found
function TransactionNotFound() {
  const router = useRouter()
  
  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-center text-orange-500 mb-4">
            <AlertTriangle size={48} />
          </div>
          <CardTitle className="text-center text-2xl">Transaction Not Found</CardTitle>
          <CardDescription className="text-center">
            The requested invoice does not exist or has been deleted.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6">
            Please check the invoice ID or contact support if you believe this is an error.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => router.push('/')}>
            Go to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function InvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [transaction, setTransaction] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [showCustomAmountForm, setShowCustomAmountForm] = useState(false)

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

    // Immediately set a default value based on the transaction ID
    // This is to make the form show something immediately if needed
    setCustomAmount('0')
    setShowCustomAmountForm(true)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  async function loadTransaction() {
    try {
      setIsLoading(true)
      
      console.log(`Attempting to load transaction with ID: ${params.id}`)
      
      // First attempt
      let data = await getTransaction(params.id)
      
      // If the first attempt fails, try one more time with a delay
      // This helps with race conditions in authentication
      if (!data) {
        console.log("First attempt to load transaction failed, retrying...")
        
        // Wait a bit for any auth processes to complete
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Try again
        data = await getTransaction(params.id)
      }
      
      if (!data) {
        console.log(`Transaction not found after retry: ${params.id}`)
        toast({
          title: "Invoice not found",
          description: `The invoice with ID ${params.id} does not exist or has been deleted.`,
          variant: "destructive",
        })
        // Add a NotFound component to display and prompt for custom amount
        setTransaction(null)
        // Set a reasonable default amount for the custom amount field
        setCustomAmount('0')
        setShowCustomAmountForm(true)
        return
      }
      
      // Log the transaction data for debugging
      console.log("Transaction loaded successfully:", {
        id: data.id,
        invoice_number: data.invoice_number,
        total_amount: data.total_amount,
        type: typeof data.total_amount
      });
      
      // Set the transaction data
      setTransaction(data)
      
      // When a transaction is found, update the custom amount field to match its total
      // This ensures that if the user switches to manual entry, they see the correct amount
      if (data.total_amount) {
        setCustomAmount(data.total_amount.toString());
      }
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

  // Handle custom amount change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numeric input
    if (/^\d*\.?\d*$/.test(value)) {
      setCustomAmount(value);
    }
  };

  const handlePayment = async () => {
    if (!transaction) {
      // If no transaction exists, show the custom amount form
      setShowCustomAmountForm(true);
      return;
    }
    
    // Log the exact transaction amount that will be used
    console.log("Using exact invoice amount for payment:", transaction.total_amount);
    
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
      console.log("Invoice amount:", transaction.total_amount, "Type:", typeof transaction.total_amount);
      
      // Create order via API - explicitly include amount to ensure it's used even if transaction isn't found
      const orderResponse = await fetch('/api/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transactionId: transaction.id,
          amount: transaction.total_amount, // Always include the amount
          description: `Payment for Invoice ${transaction.invoice_number}`
        }),
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
      console.log("Payment amount in paise:", orderData.amount);
      
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
        description: `Payment for Invoice ${transaction.invoice_number} - ₹${(orderData.amount/100).toFixed(2)}`,
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
            description: `Payment ID: ${response.razorpay_payment_id}`,
          });
          
          // Redirect to success page with amount
          router.push(`/payment-success?paymentId=${response.razorpay_payment_id}&amount=${transaction.total_amount}`);
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

  const handleDirectPayment = async () => {
    if (isProcessingPayment) return;
    
    // Validate amount
    const parsedAmount = parseFloat(customAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount greater than zero.",
        variant: "destructive",
      });
      return;
    }
    
    // Log the exact amount we're going to use for payment
    console.log("Using custom amount for direct payment:", parsedAmount);
    
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
      // Use custom amount for direct payment
      const amount = parsedAmount;
      
      // Always include GST in the UI calculation
      const gstRate = 18; // 18% GST
      const gstAmount = (amount * gstRate / 100);
      const totalWithGST = Math.round((amount + gstAmount) * 100) / 100;
      
      console.log(`Creating direct payment order with amount: ${amount} (with GST: ${totalWithGST})`);
      
      // Create order via API with direct amount including GST
      const orderResponse = await fetch('/api/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          // If the transaction wasn't found, still include the ID for logging purposes
          transactionId: params.id,
          amount: totalWithGST, // Always include the amount for direct payments
          currency: 'INR',
          description: `Custom payment of ₹${totalWithGST.toFixed(2)} (includes ${gstRate}% GST)`,
          notes: {
            invoiceId: params.id,
            source: 'custom-payment',
            baseAmount: amount.toString(),
            gstRate: `${gstRate}%`,
            totalWithGST: totalWithGST.toString()
          }
        }),
      });
      
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        console.error("Order creation failed:", orderResponse.status, errorData);
        throw new Error(`Failed to create order: ${errorData.error || 'Unknown error'}`);
      }
      
      const orderData = await orderResponse.json();
      
      if (!orderData.success || !orderData.orderId) {
        console.error("Invalid order data received:", orderData);
        throw new Error("Invalid order data received from server");
      }
      
      console.log("Order created successfully:", orderData);
      
      // Configure Razorpay payment options
      const options = {
        key: razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Your Business Name",
        description: "Custom Amount Payment",
        order_id: orderData.orderId,
        handler: function(response: any) {
          console.log("Payment successful:", response);
          toast({
            title: "Payment Successful",
            description: `Payment ID: ${response.razorpay_payment_id}`,
          });
          
          // Redirect to a success page with the total amount including GST
          router.push(`/payment-success?paymentId=${response.razorpay_payment_id}&amount=${totalWithGST}`);
        },
        prefill: {
          name: "Customer Name",
          email: "customer@example.com",
        },
        theme: {
          color: "#4338CA",
        },
        modal: {
          ondismiss: function() {
            console.log("Payment modal dismissed");
            setIsProcessingPayment(false);
          }
        }
      };
      
      // Open Razorpay payment form
      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
      
    } catch (error) {
      console.error("Error in handleDirectPayment:", error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to initialize payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleViewFullInvoice = () => {
    router.push(`/transactions/${params.id}/invoice`);
  };

  if (isLoading) {
    return <div className="container mx-auto py-10 px-4 text-center">Loading invoice details...</div>;
  }

  if (!transaction && !isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-center text-orange-500 mb-4">
              <AlertTriangle size={48} />
            </div>
            <CardTitle className="text-center text-2xl">Invoice Not Found</CardTitle>
            <CardDescription className="text-center">
              The requested invoice with ID {params.id} does not exist or has been deleted.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {showCustomAmountForm ? (
              <div className="space-y-4 border rounded-lg p-6 bg-muted/20 max-w-md mx-auto">
                <h3 className="font-semibold text-lg">Enter Payment Amount</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Since the invoice doesn't exist, you can enter a custom amount to pay.
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-medium">₹</span>
                  <input 
                    type="text"
                    value={customAmount}
                    onChange={handleAmountChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter amount"
                    autoFocus
                  />
                </div>
                
                <div className="text-sm text-muted-foreground mt-2 text-left">
                  <p>Amount breakdown:</p>
                  <div className="border-t mt-2 pt-2">
                    {parseFloat(customAmount) > 0 ? (
                      <>
                        <p className="flex justify-between"><span>Base Amount:</span> <span>₹{parseFloat(customAmount).toFixed(2)}</span></p>
                        <p className="flex justify-between"><span>GST (18%):</span> <span>₹{(parseFloat(customAmount) * 0.18).toFixed(2)}</span></p>
                        <p className="flex justify-between font-semibold border-t mt-1 pt-1">
                          <span>Total:</span> 
                          <span>₹{(parseFloat(customAmount) * 1.18).toFixed(2)}</span>
                        </p>
                      </>
                    ) : (
                      <p className="text-center text-muted-foreground italic">Enter an amount to see the breakdown</p>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={handleDirectPayment}
                  disabled={isProcessingPayment || !customAmount || parseFloat(customAmount) <= 0}
                  className="w-full mt-4"
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  {isProcessingPayment ? "Processing..." : parseFloat(customAmount) > 0 
                    ? `Pay Now (₹${(parseFloat(customAmount) * 1.18).toFixed(2)} with GST)`
                    : "Pay Now"
                  }
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCustomAmountForm(false)}
                  className="w-full mt-2"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <p className="mb-6">
                  Please check the invoice ID or contact support if you believe this is an error.
                </p>
                <div className="flex justify-center gap-4">
                  <Button onClick={() => router.push('/')} variant="outline">
                    Go Home
                  </Button>
                  <Button onClick={() => setShowCustomAmountForm(true)}>
                    Make Payment Anyway
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
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
              {isProcessingPayment ? "Processing Payment..." : `Pay Now (₹${transaction.total_amount.toFixed(2)})`}
            </Button>
          ) : (
            <div className="w-full bg-green-100 text-green-800 rounded-md p-4 text-center flex items-center justify-center">
              <Check className="mr-2 h-5 w-5" />
              <span>Payment Completed</span>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleViewFullInvoice}>
              <FileText className="mr-2 h-4 w-4" />
              View Full Invoice
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 