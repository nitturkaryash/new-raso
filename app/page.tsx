"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, FileText, Package, Settings } from "lucide-react"

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    // Check if user is authenticated
    const isAdmin = typeof window !== 'undefined' ? sessionStorage.getItem('isAdmin') === 'true' : false
    
    // If not authenticated, redirect to login
    if (!isAdmin) {
      router.push('/login')
    }
  }, [router])
  
  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-2">GST Invoice Management System</h1>
      <p className="text-muted-foreground mb-8">Manage services, create transactions, and generate GST invoices</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <Settings className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Service Management</CardTitle>
            <CardDescription>Create and manage GST services with HSN codes and rates</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Add, edit, and delete services with their respective GST rates and HSN codes.</p>
          </CardContent>
          <CardFooter>
            <Link href="/services" className="w-full">
              <Button className="w-full">
                Manage Services
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <Package className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Create Transaction</CardTitle>
            <CardDescription>Create new transactions with multiple services</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Select services, add customer details, apply discounts, and generate invoices.</p>
          </CardContent>
          <CardFooter>
            <Link href="/transactions/new" className="w-full">
              <Button className="w-full">
                New Transaction
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <FileText className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>View and manage all transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Access transaction history, view invoices, and check payment status.</p>
          </CardContent>
          <CardFooter>
            <Link href="/transactions" className="w-full">
              <Button className="w-full">
                View Transactions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-12 p-6 border rounded-lg bg-muted/10">
        <h2 className="text-xl font-semibold mb-4">Payment Integration</h2>
        <p className="mb-4">To process payments:</p>
        <ol className="list-decimal list-inside space-y-2 mb-4">
          <li>Create a transaction with customer details and services</li>
          <li>Navigate to the invoice page</li>
          <li>Click the "Pay Now" button to process payment via Razorpay</li>
        </ol>
        <p className="text-sm text-muted-foreground">For test payments, use card number 4111 1111 1111 1111, any future date, any CVV, and OTP 1234.</p>
      </div>
    </div>
  )
}

