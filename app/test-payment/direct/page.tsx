"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

export default function DirectPaymentTestPage() {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [paymentLink, setPaymentLink] = useState("")
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  
  const [formData, setFormData] = useState({
    amount: "5000",
    currency: "INR",
    description: "Test Payment",
    customerName: "Test Customer",
    customerEmail: "test@example.com"
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  // Create a direct payment link using Razorpay API
  const generatePaymentLink = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }
    
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: formData.amount,
          currency: formData.currency,
          description: formData.description,
          notes: {
            customerName: formData.customerName,
            customerEmail: formData.customerEmail,
            source: 'direct-payment-test'
          }
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("Payment API error:", response.status, errorText)
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || "Failed to create payment")
      }
      
      console.log("Payment order created:", data)
      
      // For direct payment testing, we'll provide the instructions to integrate with Razorpay
      setPaymentLink(JSON.stringify({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        name: "Your Company Name",
        description: formData.description,
        prefill: {
          name: formData.customerName,
          email: formData.customerEmail
        }
      }, null, 2))
      
      setShowLinkDialog(true)
      
      toast({
        title: "Success",
        description: "Payment order created successfully",
      })
    } catch (error) {
      console.error("Error creating payment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create payment link",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink)
      toast({
        title: "Copied!",
        description: "Payment details copied to clipboard",
      })
    } catch (error) {
      console.error("Error copying to clipboard:", error)
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Direct Payment Test</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Create Direct Payment</CardTitle>
          <CardDescription>
            Test creating a payment order directly without a transaction ID
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="Enter amount"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                placeholder="Enter currency"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter description"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                placeholder="Enter customer name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Customer Email</Label>
              <Input
                id="customerEmail"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleInputChange}
                placeholder="Enter customer email"
              />
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            onClick={generatePaymentLink} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? "Generating..." : "Generate Payment Order"}
          </Button>
        </CardFooter>
      </Card>
      
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Order Created</DialogTitle>
            <DialogDescription>
              Use this information to complete the payment using Razorpay checkout:
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
              {paymentLink}
            </pre>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="secondary" onClick={() => setShowLinkDialog(false)}>
              Close
            </Button>
            <Button onClick={copyToClipboard}>
              Copy to Clipboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 