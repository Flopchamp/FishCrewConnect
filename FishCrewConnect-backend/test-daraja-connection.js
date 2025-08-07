const darajaService = require('./services/darajaService');

async function testDarajaConnection() {
    console.log('🧪 Testing Daraja API Connection...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Demo Mode:', process.env.DARAJA_DEMO_MODE);
    console.log('Base URL:', process.env.NODE_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke');
    
    try {
        console.log('\n📡 Testing access token...');
        const token = await darajaService.getAccessToken();
        console.log('✅ Access token obtained:', token ? 'SUCCESS' : 'FAILED');
        
        console.log('\n📱 Testing STK Push...');
        const stkResult = await darajaService.initiateSTKPush(
            '254769719322', // Your phone number
            1, // Amount
            'TEST123',
            'Test payment',
            'http://test.com/callback'
        );
        console.log('✅ STK Push initiated:', stkResult);
        
        console.log('\n🎉 All tests passed! Check your phone for STK Push notification.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

testDarajaConnection();
