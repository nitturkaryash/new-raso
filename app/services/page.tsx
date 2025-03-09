"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import { getServices, checkAuth } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import supabaseClient from "@/lib/supabase"

interface Service {
  id: string
  name: string
  description: string
  price: number
  active: boolean
  hsn_code: string
  gst_rate: number
  created_at: string
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [authStatus, setAuthStatus] = useState<string>("Checking...")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    async function checkAuthentication() {
      // Check for admin login in session storage
      if (typeof window !== 'undefined') {
        const isAdmin = sessionStorage.getItem('isAdmin')
        
        if (isAdmin === 'true') {
          setAuthStatus("Authenticated as Admin");
          fetchServices();
          return;
        }
      }
      
      // Fallback to Supabase auth check
      const { data, error } = await checkAuth();
      if (error || !data || !data.session) {
        setAuthStatus("Not authenticated");
        toast({
          title: "Authentication Required",
          description: "Please log in to manage services",
          variant: "destructive",
        });
        router.push("/login");
      } else {
        setAuthStatus("Authenticated as " + (data.session?.user?.email || "unknown"));
        fetchServices();
      }
    }
    
    checkAuthentication();
  }, [toast, router]);

  const fetchServices = async () => {
    setLoading(true)
    try {
      const data = await getServices()
      if (data) {
        setServices(data as Service[])
      }
    } catch (error) {
      console.error("Error fetching services:", error)
      toast({
        title: "Error",
        description: "Failed to load items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      // Clear admin session if exists
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('isAdmin')
        sessionStorage.removeItem('userEmail')
        sessionStorage.removeItem('userName')
      }
      
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        toast({
          title: "Logout Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Logged Out",
          description: "You have been logged out successfully",
        });
        router.push("/login");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Filter services based on search term
  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.hsn_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Items</CardTitle>
              <CardDescription>
                Manage your products and services
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search items..."
                  className="pl-8 w-[200px] md:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Link href="/services/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No items found. Add your first item to get started.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>HSN/SAC</TableHead>
                    <TableHead>GST Rate</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>{service.hsn_code}</TableCell>
                      <TableCell>{service.gst_rate}%</TableCell>
                      <TableCell className="text-right">₹{service.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={service.active ? "default" : "secondary"}>
                          {service.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/services/${service.id}/edit`}>
                            <Button variant="outline" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/services/${service.id}/delete`}>
                            <Button variant="outline" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {filteredServices.length} items • {authStatus}
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

