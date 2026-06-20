/**
 * Streaming Response Wrapper for Simon Intelligence System
 * Provides token-by-token streaming for instant user feedback
 * Every response the user sees must stream to feel instant
 */

import { MODEL_TIERS, MAX_TOKENS, TEMPERATURES } from './router.js';

/**
 * Stream Simon response to client via Server-Sent Events
 * @param {object} res - Express response object
 * @param {string} tier - Model tier to use
 * @param {string} systemPrompt - System prompt for the AI
 * @param {string} userPrompt - User prompt for the AI
 * @param {object} options - Additional options
 */
export async function streamSimonResponse(res, tier, systemPrompt, userPrompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.write(`data: ${JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' })}\n\n`);
    res.end();
    return;
  }

  const model = MODEL_TIERS[tier] || MODEL_TIERS.fast;
  const maxTokens = options.maxTokens || MAX_TOKENS[tier];
  const temperature = options.temperature || TEMPERATURES[tier];

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://truvornex.com',
        'X-Title': 'Truvornex-Simon'
      },
      body: JSON.stringify({
        model: model,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.write(`data: ${JSON.stringify({ error: `API error: ${response.status} - ${errorText}` })}\n\n`);
      res.end();
      return;
    }

    // Stream tokens to client
    for await (const chunk of response.body) {
      const lines = chunk.toString().split('\n').filter(l => l.startsWith('data: '));
      
      for (const line of lines) {
        const data = line.replace('data: ', '');
        
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
        
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          
          if (token) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch (parseError) {
          // Skip invalid JSON chunks
          continue;
        }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
    
  } catch (error) {
    console.error('[Simon Streaming] Error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}

/**
 * Stream JSON response with structured data
 * Useful for responses that need to maintain structure while streaming
 */
export async function streamSimonJSON(res, tier, systemPrompt, userPrompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.write(`data: ${JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' })}\n\n`);
    res.end();
    return;
  }

  const model = MODEL_TIERS[tier] || MODEL_TIERS.fast;
  const maxTokens = options.maxTokens || MAX_TOKENS[tier];
  const temperature = options.temperature || TEMPERATURES[tier];

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://truvornex.com',
        'X-Title': 'Truvornex-Simon'
      },
      body: JSON.stringify({
        model: model,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.write(`data: ${JSON.stringify({ error: `API error: ${response.status} - ${errorText}` })}\n\n`);
      res.end();
      return;
    }

    let fullContent = '';
    
    for await (const chunk of response.body) {
      const lines = chunk.toString().split('\n').filter(l => l.startsWith('data: '));
      
      for (const line of lines) {
        const data = line.replace('data: ', '');
        
        if (data === '[DONE]') {
          // Validate and send final JSON
          try {
            const parsed = JSON.parse(fullContent);
            res.write(`data: ${JSON.stringify({ complete: true, data: parsed })}\n\n`);
          } catch (e) {
            res.write(`data: ${JSON.stringify({ error: 'Invalid JSON response' })}\n\n`);
          }
          res.end();
          return;
        }
        
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          
          if (token) {
            fullContent += token;
            res.write(`data: ${JSON.stringify({ token, partial: fullContent })}\n\n`);
          }
        } catch (parseError) {
          continue;
        }
      }
    }

  } catch (error) {
    console.error('[Simon Streaming JSON] Error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}

/**
 * Create a middleware wrapper for streaming responses
 */
export function withStreaming(tier, systemPrompt, userPrompt) {
  return async (req, res) => {
    await streamSimonResponse(res, tier, systemPrompt, userPrompt);
  };
}