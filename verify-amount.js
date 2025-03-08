// Script to verify the payment amount calculations
// This must be run while the application is running

// Get transaction ID from command line or use default
const transactionId = process.argv[2] || '5d0e7b35-1816-4d14-a1fa-f8c94b8c319a';
const appUrl = 'http://localhost:3000';

// Run this in your browser's console on the invoice page:
console.log(`
// Copy and paste this in your browser console on the invoice page
fetch("/api/razorpay", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ transactionId: "${transactionId}" })
})
.then(res => res.json())
.then(data => {
  console.log("=== Payment Amount Verification ===");
  console.log("Order ID:", data.orderId);
  
  if (data.invoice) {
    console.log("\\nInvoice Details:");
    console.log("Invoice Number:", data.invoice.number);
    console.log("Customer:", data.invoice.customer);
    console.log("Invoice Amount: ₹" + data.invoice.amount);
  }
  
  const amountInRupees = (data.amount / 100).toFixed(2);
  console.log("\\nAmount in API Response: ₹" + amountInRupees + " (" + data.amount + " paise)");
  
  if (data.invoice && data.invoice.amount !== parseFloat(amountInRupees)) {
    console.error("\\n⚠️ AMOUNT MISMATCH DETECTED:");
    console.error("Invoice amount (₹" + data.invoice.amount + ") doesn't match payment amount (₹" + amountInRupees + ")");
  } else {
    console.log("\\n✅ Amounts match correctly!");
  }
})
.catch(error => console.error("Error:", error));
`);

console.log(`
Visit the invoice page at: ${appUrl}/invoice/${transactionId}
Then open your browser's developer tools (F12) and paste the above code in the console.
This will test if the payment amount matches the invoice amount.
`); 