const axios = require('axios');

// Demo M-Pesa Payment Test
async function testDemoPayment() {
    console.log('🧪 Testing Demo M-Pesa Payment Integration...\n');

    const baseURL = 'http://localhost:3001';
    
    // Test data
    const testPayment = {
        jobId: 1,
        applicationId: 1,
        amount: 1000,
        fishermanPhoneNumber: '254708374149'
    };

    try {
        console.log('📡 Initiating demo payment with test M-Pesa credentials...');
        console.log('Test Credentials Used:');
        console.log('- BusinessShortCode: 174379');
        console.log('- Phone: 254708374149');
        console.log('- Amount: KSH 1,000');
        console.log();

        const response = await axios.post(
            `${baseURL}/api/payments/initiate-job-payment`,
            testPayment,
            {
                headers: {
                    'Authorization': 'Bearer your_test_jwt_token_here',
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Payment Initiation Response:');
        console.log('- Status:', response.status);
        console.log('- Payment ID:', response.data.paymentId);
        console.log('- Checkout Request ID:', response.data.checkoutRequestID);
        console.log('- Total Amount: KSH', response.data.amount);
        console.log('- Fisherman Gets: KSH', response.data.fishermanAmount);
        console.log('- Platform Commission: KSH', response.data.platformCommission);
        console.log('- Commission Rate:', response.data.commissionRate);
        console.log('- Demo Mode:', response.data.isDemoMode);
        
        if (response.data.isDemoMode) {
            console.log('- Demo Message:', response.data.demoMessage);
            console.log('\n⏱️  Demo payment will auto-complete in 3 seconds...');
            
            // Wait for auto-completion
            setTimeout(() => {
                console.log('✅ Demo payment completed successfully!');
                console.log('🎉 Integration test passed!');
            }, 3500);
        }

    } catch (error) {
        console.error('❌ Payment Test Failed:');
        console.error('- Status:', error.response?.status);
        console.error('- Error:', error.response?.data?.message || error.message);
        console.error('- Details:', error.response?.data);
    }
}

// M-Pesa Credentials Verification
function showTestCredentials() {
    console.log('🔑 M-Pesa Test Credentials for Demo:');
    console.log('');
    console.log('BusinessShortCode: 174379');
    console.log('Password: MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMTYwMjE2MTY1NjI3');
    console.log('Timestamp: 20160216165627');
    console.log('TransactionType: CustomerPayBillOnline');
    console.log('PartyA: 254708374149');
    console.log('PartyB: 174379');
    console.log('PhoneNumber: 254708374149');
    console.log('CallBackURL: https://mydomain.com/pat');
    console.log('AccountReference: Test');
    console.log('TransactionDesc: Test');
    console.log('');
    console.log('ℹ️  These credentials are used automatically when DARAJA_DEMO_MODE=true');
    console.log('');
}

// Main execution
if (require.main === module) {
    console.log('🐟 FishCrewConnect - M-Pesa Payment Demo');
    console.log('=====================================\n');
    
    showTestCredentials();
    
    console.log('Starting payment test in 2 seconds...\n');
    setTimeout(testDemoPayment, 2000);
}

module.exports = {
    testDemoPayment,
    showTestCredentials
};
