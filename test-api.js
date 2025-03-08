// Test script for API
const fetch = require('node-fetch');

async function testRazorpayApi() {
  console.log('Testing Razorpay API with non-existent transaction ID...');
  
  try {
    const response = await fetch('http://localhost:3000/api/razorpay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionId: 'non-existent-id',
        amount: 10.50, // Valid amount
        currency: 'INR'
      })
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    // Test without amount - should fail
    console.log('\nTesting without amount - should fail:');
    const response2 = await fetch('http://localhost:3000/api/razorpay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionId: 'non-existent-id'
        // No amount provided - should trigger error
      })
    });
    
    const data2 = await response2.json();
    console.log('Response status:', response2.status);
    console.log('Response data:', JSON.stringify(data2, null, 2));
    
    // Test with a valid transaction ID
    console.log('\nTesting with valid transaction ID:');
    const response3 = await fetch('http://localhost:3000/api/razorpay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionId: 'e062aecf-cd65-4a0a-9146-ff4bebecc134'
        // No amount needed for valid transaction
      })
    });
    
    const data3 = await response3.json();
    console.log('Response status:', response3.status);
    console.log('Response data:', JSON.stringify(data3, null, 2));
    
  } catch (error) {
    console.error('Error during API test:', error);
  }
}

testRazorpayApi(); 