// Simpler test script using global fetch
async function testApi() {
  try {
    console.log('Testing with valid amount but invalid transaction ID:');
    const response = await fetch('http://localhost:3000/api/razorpay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionId: 'non-existent-id',
        amount: 10.50
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testApi(); 