"use client"

import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Printer, CreditCard, Calendar, User, Mail, FileText } from "lucide-react"
import { getTransaction, type Transaction } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import dynamic from 'next/dynamic'

// Define Razorpay type to avoid hydration errors
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  receipt?: string;
  notes?: Record<string, string>;
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

// Dynamically import RazorpayPayment component with no SSR
const RazorpayPayment = dynamic(
  () => import('@/components/RazorpayPayment').then(mod => ({
    default: mod.default,
    __esModule: true,
  })),
  { 
    ssr: false,
    loading: () => (
      <Button disabled>
        <CreditCard className="h-4 w-4 mr-2" />
        Loading Payment...
      </Button>
    )
  }
)

// Loading component
function LoadingState() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading invoice...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Error component
function ErrorState({ message }: { message: string }) {
  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Invoice Error</h2>
            <p className="mt-2 text-muted-foreground">{message}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PublicInvoicePage({ params }: { params: { id: string } }) {
  const { toast } = useToast()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [orderData, setOrderData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTransaction()
  }, [params.id]) // Add params.id as dependency

  async function loadTransaction() {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getTransaction(params.id)
      if (!data) {
        throw new Error('Invoice not found')
      }
      setTransaction(data)
    } catch (error) {
      console.error('Error loading invoice:', error)
      setError(error instanceof Error ? error.message : 'Failed to load invoice')
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handlePayment = async () => {
    if (!transaction) return

    // Check if the amount is too small for Razorpay (minimum 1 INR)
    if (transaction.total_amount < 1) {
      toast({
        title: "Amount Too Small",
        description: "The invoice amount is too small for online payment (minimum ₹1). Please contact the merchant for alternative payment methods.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true)
    console.log("Payment process started")

    try {
      console.log("Creating order via API")
      // Create order via API
      const orderResponse = await fetch('/api/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transactionId: transaction.id,
          // Always include the amount to ensure the API works even if transaction isn't found
          amount: transaction.total_amount,
          description: `Payment for Invoice #${transaction.invoice_number}`
        }),
      });
      
      const responseText = await orderResponse.text();
      console.log("Raw API response:", responseText);
      
      let orderResult;
      try {
        orderResult = JSON.parse(responseText);
        console.log("Parsed order data:", orderResult);
      } catch (parseError) {
        console.error("Failed to parse API response:", parseError);
        toast({
          title: "Payment Initialization Failed",
          description: "Invalid response from server. Please try again later.",
          variant: "destructive",
        });
        setIsProcessingPayment(false);
        return;
      }
      
      if (!orderResponse.ok) {
        console.error("Order creation failed:", orderResponse.status, orderResult);
        
        // Special handling for amount too small error
        if (orderResult.error === 'Amount too small') {
          toast({
            title: "Amount Too Small for Direct Payment",
            description: orderResult.details || "The amount is too small for direct payment. Please contact the merchant for alternative payment methods.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Payment Initialization Failed",
            description: orderResult.error || "Could not initialize payment. Please try again later.",
            variant: "destructive",
          });
        }
        
        setIsProcessingPayment(false);
        return;
      }
      
      setOrderData(orderResult);
      
    } catch (error) {
      console.error("Error in payment process:", error)
      toast({
        title: "Payment Error",
        description: "An error occurred while processing your payment. Please try again later.",
        variant: "destructive",
      })
      setIsProcessingPayment(false)
    }
  }

  const handlePaymentSuccess = async (response: any) => {
    console.log("Payment successful:", response);
    
    try {
      // Update transaction payment status first
      const updateResponse = await fetch('/api/transactions/update-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: transaction?.id,
          paymentId: response.razorpay_payment_id
        }),
      });
      
      const updateData = await updateResponse.json();
      
      if (!updateResponse.ok) {
        console.error("Error updating payment status:", updateData);
      } else {
        console.log("Payment status updated successfully");
      }
      
      // Redirect to success page
      window.location.href = `/payment-success?paymentId=${response.razorpay_payment_id}&amount=${transaction?.total_amount}&fallbackUrl=${encodeURIComponent(`/public/invoice/${transaction?.id}`)}&transaction_id=${transaction?.id}`;
    } catch (error) {
      console.error("Error handling payment success:", error);
      toast({
        title: "Error",
        description: "Payment was successful, but we couldn't process the completion. Please contact the merchant.",
        variant: "destructive",
      });
    }
  };
  
  const handlePaymentCanceled = () => {
    console.log("Payment modal dismissed");
    setOrderData(null);
    setIsProcessingPayment(false);
  };

  if (isLoading) {
    return <LoadingState />
  }

  if (error || !transaction) {
    return <ErrorState message={error || 'Invoice not found'} />
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl print:p-0">
      <Suspense fallback={<LoadingState />}>
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="print:pb-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:flex-row">
              <div>
                <CardTitle className="text-2xl">Invoice #{transaction.invoice_number}</CardTitle>
                <CardDescription>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(transaction.invoice_date).toLocaleDateString()}
                  </div>
                </CardDescription>
              </div>
              <div className="flex flex-col items-end">
                <Badge 
                  variant={
                    transaction.payment_status === "paid" || 
                    transaction.payment_status === "successful" ? 
                    "success" : "outline"
                  }
                  className="mb-2"
                >
                  {transaction.payment_status === "paid" || 
                   transaction.payment_status === "successful" ? 
                   "Paid" : 
                   transaction.payment_status === "waiting" ? 
                   "Processing" : "Pending"}
                </Badge>
                <div className="text-sm text-muted-foreground print:hidden">
                  <Button variant="outline" size="sm" onClick={handlePrint} className="mr-2">
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  {(transaction.payment_status === "pending") && (
                    orderData ? (
                      <RazorpayPayment
                        orderData={orderData}
                        transaction={transaction}
                        onSuccess={handlePaymentSuccess}
                        onCancel={handlePaymentCanceled}
                      />
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={handlePayment}
                        disabled={isProcessingPayment}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {isProcessingPayment ? "Processing..." : "Pay Now"}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">From</h3>
                <div className="text-lg font-semibold">Your Company Name</div>
                <div className="text-sm">
                  <p>123 Business Street</p>
                  <p>City, State 12345</p>
                  <p>contact@yourcompany.com</p>
                  <p>GSTIN: 12ABCDE1234F1Z5</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">Bill To</h3>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1 text-muted-foreground" />
                  <div className="text-lg font-semibold">{transaction.customer_name}</div>
                </div>
                <div className="flex items-center mt-1">
                  <Mail className="h-4 w-4 mr-1 text-muted-foreground" />
                  <div>{transaction.customer_email}</div>
                </div>
                {transaction.customer_gstin && (
                  <div className="mt-1">
                    <span className="text-muted-foreground">GSTIN:</span> {transaction.customer_gstin}
                  </div>
                )}
                {transaction.customer_address && (
                  <div className="mt-1">
                    <span className="text-muted-foreground">Address:</span> {transaction.customer_address}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>HSN/SAC</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transaction.items.map((item, index) => {
                    const itemTotal = item.price * item.quantity;
                    const gstAmount = (itemTotal * item.gst_rate) / 100;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.service_name}</TableCell>
                        <TableCell>{item.service_description}</TableCell>
                        <TableCell>{item.hsn_code}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.gst_rate}%</TableCell>
                        <TableCell className="text-right">₹{(itemTotal + gstAmount).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col items-end space-y-2">
              <div className="flex justify-between w-full md:w-1/2">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>₹{transaction.subtotal.toFixed(2)}</span>
              </div>
              {transaction.discount_amount > 0 && (
                <div className="flex justify-between w-full md:w-1/2">
                  <span className="text-muted-foreground">
                    Discount ({transaction.discount_type === "percentage" ? `${transaction.discount_value}%` : "Fixed"}):
                  </span>
                  <span>-₹{transaction.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between w-full md:w-1/2">
                <span className="text-muted-foreground">Taxable Amount:</span>
                <span>₹{transaction.taxable_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-full md:w-1/2">
                <span className="text-muted-foreground">CGST:</span>
                <span>₹{transaction.cgst_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-full md:w-1/2">
                <span className="text-muted-foreground">SGST:</span>
                <span>₹{transaction.sgst_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-full md:w-1/2 font-semibold text-lg pt-2 border-t">
                <span>Total:</span>
                <span>₹{transaction.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Terms & Conditions</h3>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Payment is due within 30 days</li>
                <li>This is a computer generated invoice and does not require a signature</li>
                <li>Please include the invoice number in your payment reference</li>
                <li>For any queries regarding this invoice, please contact our support team</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6 print:hidden">
            <div className="text-sm text-muted-foreground">
              Thank you for your business!
            </div>
            {(transaction.payment_status === "pending") && !orderData && (
              <Button 
                onClick={handlePayment}
                disabled={isProcessingPayment}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {isProcessingPayment ? "Processing..." : "Pay Now"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </Suspense>
    </div>
  )
} 