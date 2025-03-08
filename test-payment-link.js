// Test script for payment link API
async function testPaymentLinkApi() {
  try {
    console.log('Testing payment link API with direct parameters...');
    
    const response = await fetch('http://localhost:3000/api/payment-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: 'non-existent-id',
        amount: 100,
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        description: 'Test payment'
      })
    });
    
    console.log('Status:', response.status);
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Parsed response:', data);
      
      if (data.success) {
        console.log('✅ Payment link created successfully!');
        console.log('Payment link URL:', data.paymentLink);
      } else {
        console.log('❌ Failed to create payment link:', data.error || 'Unknown error');
      }
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testPaymentLinkApi(); 