"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { checkAuth } from "@/lib/supabase"
import supabaseClient from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import Cookies from 'js-cookie'

export function SiteHeader() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function checkAuthStatus() {
      // Check for admin login in session storage
      if (typeof window !== 'undefined') {
        const isAdmin = sessionStorage.getItem('isAdmin')
        const storedEmail = sessionStorage.getItem('userEmail')
        
        if (isAdmin === 'true') {
          setIsAuthenticated(true)
          setUserEmail(storedEmail || 'admin@gstco.in')
          return
        }
      }
      
      // If no admin session, set as not authenticated
      setIsAuthenticated(false)
      setUserEmail(null)
    }

    checkAuthStatus()
  }, [])

  const handleLogout = async () => {
    try {
      // Clear admin session if exists
      if (typeof window !== 'undefined') {
        // Clear session storage
        sessionStorage.removeItem('isAdmin')
        sessionStorage.removeItem('userEmail')
        sessionStorage.removeItem('userName')
        
        // Clear the admin cookie
        Cookies.remove('adminSession')
      }
      
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      })
      
      // Redirect to login page
      router.push("/login")
    } catch (error) {
      console.error("Error during logout:", error)
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">GST Invoice System</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
              Home
            </Link>
            {isAuthenticated && (
              <>
                <Link href="/services" className="text-sm font-medium transition-colors hover:text-primary">
                  Items
                </Link>
                <Link href="/invoices" className="text-sm font-medium transition-colors hover:text-primary">
                  Invoices
                </Link>
              </>
            )}
          </nav>
        </div>
        
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground hidden md:inline-block">
                {userEmail}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">
                Login
              </Button>
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
} 