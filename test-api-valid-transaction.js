// Test with a valid transaction ID
async function testApiValidTransaction() {
  try {
    console.log('Testing with valid transaction ID:');
    const response = await fetch('http://localhost:3000/api/razorpay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionId: 'e7eb2579-bd19-4369-bd4c-18a631e0c50d' // Using the other transaction ID we created
        // No amount needed when transaction is valid
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testApiValidTransaction(); 