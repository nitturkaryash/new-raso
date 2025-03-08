// Test with no amount but invalid transaction ID (should fail)
async function testApiNoAmount() {
  try {
    console.log('Testing with invalid transaction ID and NO amount (should fail):');
    const response = await fetch('http://localhost:3000/api/razorpay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionId: 'non-existent-id'
        // No amount provided - should trigger error
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testApiNoAmount(); 