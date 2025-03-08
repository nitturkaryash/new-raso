import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"

export default function PublicPage() {
  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <FileText size={48} className="text-primary" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Public Invoice Access</CardTitle>
          <CardDescription className="text-center">
            This area provides secure access to view and pay invoices without requiring an account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p>
            To view an invoice, you need a direct link from the invoice issuer.
            The link will take you directly to your specific invoice.
          </p>
          <p>
            If you received an invoice link but are seeing this page,
            please contact the sender for the correct link.
          </p>
          <p className="text-sm text-muted-foreground mt-8">
            This is a secure area. Only authorized recipients can access their specific invoices.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 