import fs from 'fs';
import FormData from 'form-data';
import WebSocket from 'ws';

const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

// Test user ID (from migration)
const TEST_USER_ID = 'test_user_1';

async function testBackend() {
    console.log('🧪 Testing WhereMyMoneyGoes Backend\n');
    
    // 1. Test health endpoint
    console.log('1. Testing health endpoint...');
    try {
        const healthResponse = await fetch(`${API_URL}/health`);
        const health = await healthResponse.json();
        console.log('✅ Health check:', health);
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return;
    }
    
    // 2. Test WebSocket connection
    console.log('\n2. Testing WebSocket connection...');
    const ws = new WebSocket(`${WS_URL}?userId=${TEST_USER_ID}`);
    
    ws.on('open', () => {
        console.log('✅ WebSocket connected');
    });
    
    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log('📨 WebSocket message:', message);
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
    
    // 3. Test file upload
    console.log('\n3. Testing file upload...');
    const csvPath = '/Users/alice/Downloads/ListaMovimentiCsv08_09_2025_08_59_35.csv';
    
    if (fs.existsSync(csvPath)) {
        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(csvPath));
            form.append('userId', TEST_USER_ID);
            
            const uploadResponse = await fetch(`${API_URL}/api/uploads`, {
                method: 'POST',
                body: form,
                headers: form.getHeaders()
            });
            
            const uploadResult = await uploadResponse.json();
            console.log('✅ Upload result:', uploadResult);
            
            if (uploadResult.success) {
                const uploadId = uploadResult.data.uploadId;
                
                // Wait for processing to complete
                console.log('\n⏳ Waiting for processing to complete...');
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
                
                // 4. Test getting transactions
                console.log('\n4. Testing transaction retrieval...');
                const txResponse = await fetch(`${API_URL}/api/transactions/${TEST_USER_ID}?limit=5`);
                const transactions = await txResponse.json();
                console.log(`✅ Retrieved ${transactions.data?.length || 0} transactions`);
                
                // 5. Test analytics
                console.log('\n5. Testing analytics...');
                const summaryResponse = await fetch(`${API_URL}/api/analytics/${TEST_USER_ID}/summary`);
                const summary = await summaryResponse.json();
                console.log('✅ Summary:', summary.data);
                
                const categoriesResponse = await fetch(`${API_URL}/api/analytics/${TEST_USER_ID}/categories`);
                const categories = await categoriesResponse.json();
                console.log(`✅ Found ${categories.data?.categories?.length || 0} expense categories`);
            }
        } catch (error) {
            console.error('❌ Upload test failed:', error);
        }
    } else {
        console.log('⚠️  Test CSV file not found at:', csvPath);
        console.log('   Please update the path or create a test CSV file');
    }
    
    // Close WebSocket
    setTimeout(() => {
        ws.close();
        console.log('\n✅ All tests completed!');
        process.exit(0);
    }, 15000);
}

// Run tests
console.log('Starting backend tests...');
console.log('Make sure the server is running: npm run dev\n');

testBackend().catch(console.error);
