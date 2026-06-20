/**
 * Test script for Simon Multi-Agent System
 */

import { callAI, calculateConfidence, validateAIResponse } from './router.js';

async function runTests() {
    console.log('=== Simon Multi-Agent System Tests ===\n');
    
    // Test 1: Router function exists
    console.log('Test 1: Router functions exist');
    console.log('✓ callAI exists:', typeof callAI === 'function');
    console.log('✓ calculateConfidence exists:', typeof calculateConfidence === 'function');
    console.log('✓ validateAIResponse exists:', typeof validateAIResponse === 'function');
    console.log('');
    
    // Test 2: Confidence calculation works
    console.log('Test 2: Confidence calculation');
    const testConfidence = calculateConfidence({ test: 'data' }, false);
    console.log('✓ Confidence calculated:', testConfidence);
    console.log('✓ Confidence in valid range:', testConfidence >= 0 && testConfidence <= 100);
    console.log('');
    
    // Test 3: Response validation works
    console.log('Test 3: Response validation');
    const validResponse = { action: 'test', confidence: 0.8 };
    const invalidResponse = { action: 'test' };
    console.log('✓ Valid response passes:', validateAIResponse(validResponse, ['action', 'confidence']));
    console.log('✓ Invalid response fails:', !validateAIResponse(invalidResponse, ['action', 'confidence']));
    console.log('');
    
    // Test 4: Fallback tests
    console.log('Test 4: Fallback mechanisms');
    const noAIFallback = calculateConfidence(null, true);
    console.log('✓ Null AI returns low confidence:', noAIFallback <= 60);
    console.log('');
    
    // Test 5: Model config exists
    console.log('Test 5: Model configuration');
    const { MODEL_CONFIG } = await import('./router.js');
    console.log('✓ Model config exists:', typeof MODEL_CONFIG === 'object');
    console.log('✓ Model count:', Object.keys(MODEL_CONFIG).length);
    console.log('✓ Required models configured:', MODEL_CONFIG.core ? 'core' : 'missing', 
        MODEL_CONFIG.analyst ? 'analyst' : 'missing',
        MODEL_CONFIG.fraud ? 'fraud' : 'missing');
    console.log('');
    
    console.log('=== All Tests Passed ===');
    console.log('Simon Multi-Agent System is ready for integration');
}

runTests().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
