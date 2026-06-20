export function isConfigured() {
    return true;
}

export async function chatOpenRouter({ messages, systemPrompt, onChunk, temperature = 0.7, maxTokens = 2000 }) {
    const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, systemPrompt, temperature, maxTokens }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `AI API error ${response.status}`);
    }

    const data = await response.json();
    const content = data.content || '';

    if (typeof onChunk === 'function') {
        onChunk(content, content);
    }

    return content;
}

export async function quickInsight(prompt, context = '') {
    return chatOpenRouter({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt: `You are Simon, the AI intelligence engine for Truvornex — a premium neighborhood services platform. Be concise, data-driven, and actionable. Use markdown. ${context}`,
        temperature: 0.6,
        maxTokens: 800,
    });
}
