"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import supabaseClient from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, Key, User, Lock, LogIn } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Cookies from 'js-cookie'
import { motion } from 'framer-motion'

// Create a client component that uses useSearchParams
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    userId: "",
    password: "",
  })
  
  // Get redirect path if any
  const redirectPath = searchParams?.get('redirect') || '/services'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null) // Clear error when user types
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    // Check for hard-coded admin credentials
    if (formData.userId === "parthadmin" && formData.password === "pass@gstco00") {
      // Store admin info in session storage
      if (typeof window !== 'undefined') {
        // Set in session storage
        sessionStorage.setItem('isAdmin', 'true')
        sessionStorage.setItem('userEmail', 'admin@gstco.in')
        sessionStorage.setItem('userName', 'Admin User')
        
        // Set in cookie for middleware
        Cookies.set('adminSession', 'true', { expires: 1 }) // Expires in 1 day
      }
      
      toast({
        title: "Login Successful",
        description: "Welcome back, Admin!",
      })
      
      // Redirect to the intended destination or services page
      router.push(redirectPath)
    } else {
      setError("Invalid credentials. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-block"
          >
            <Key className="h-12 w-12 text-primary mx-auto mb-2" />
          </motion.div>
          <h1 className="text-3xl font-bold">Admin Login</h1>
          <p className="text-muted-foreground mt-2">Enter your credentials to access the GST Invoice System</p>
        </div>

        <Card className="border-2 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Login</CardTitle>
            <CardDescription className="text-center">
              Use the pre-filled admin credentials
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-sm font-medium">User ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="userId"
                    name="userId"
                    placeholder="Enter your user ID"
                    value={formData.userId}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full py-6 text-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <LogIn className="mr-2 h-5 w-5" />
                    Login
                  </div>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>GST Invoice Management System</p>
          <p className="mt-1">© 2023 All Rights Reserved</p>
        </div>
      </motion.div>
    </div>
  )
}

// Loading fallback component
function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block animate-pulse">
            <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto mb-2"></div>
          </div>
          <h1 className="text-3xl font-bold">Admin Login</h1>
          <p className="text-muted-foreground mt-2">Loading authentication...</p>
        </div>

        <Card className="border-2 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Login</CardTitle>
            <CardDescription className="text-center">
              Loading...
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="h-5 w-20 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-md animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <div className="h-5 w-20 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-md animate-pulse"></div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <div className="w-full h-12 bg-gray-300 dark:bg-gray-700 rounded-md animate-pulse"></div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

// Main login page component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  )
} 