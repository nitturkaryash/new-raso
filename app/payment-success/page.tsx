"use client"

import { Suspense } from 'react'
import { Card } from "@/components/ui/card"
import dynamic from 'next/dynamic'

// Dynamically import the client component with useSearchParams
const PaymentDetails = dynamic(() => import('./payment-details'), {
  ssr: false, // Disable SSR for this component to avoid hydration issues
  loading: () => <PaymentDetailsLoading />
})

// Loading fallback component
function PaymentDetailsLoading() {
  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-3xl mx-auto">
        <div className="p-8 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto animate-pulse mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/4 mx-auto animate-pulse mb-8"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-6">
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
          
          <div className="text-center space-y-2 p-4 border rounded-md bg-gray-50 w-full mb-6">
            <div className="h-4 bg-gray-200 rounded w-full mx-auto animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto animate-pulse"></div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 w-full">
            <div className="h-10 bg-gray-200 rounded w-36 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-36 animate-pulse"></div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return <PaymentDetails />
} 