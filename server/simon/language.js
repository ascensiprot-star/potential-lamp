/**
 * Language Support for Simon Intelligence System
 * Language-agnostic approach - models handle natural language processing
 * Simon processes queries in any language the AI model supports
 */

/**
 * Normalize query for consistent processing
 * Language-agnostic - relies on AI model's multilingual capabilities
 */
export function normalizeQuery(input) {
  if (!input || typeof input !== 'string') return '';
  
  // Basic normalization - trim and normalize whitespace
  let normalized = input.trim();
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
}

/**
 * Detect language from input (basic detection)
 * In production, this could use proper language detection libraries
 * For now, we rely on the AI model's inherent language understanding
 */
export function detectLanguage(input) {
  if (!input || typeof input !== 'string') return 'unknown';
  
  // Check for non-Latin scripts (basic detection)
  const nonLatinPattern = /[^\x00-\x7F]/; // Non-ASCII characters
  if (nonLatinPattern.test(input)) {
    return 'non_latin';
  }
  
  return 'latin'; // Default to Latin script
}

/**
 * Extract service category from query
 * Language-agnostic - relies on AI model's understanding
 */
export function extractServiceCategory(input) {
  // Return null to let AI model handle category extraction
  return null;
}

/**
 * Extract urgency from query
 * Language-agnostic - relies on AI model's understanding
 */
export function extractUrgency(input) {
  // Return null to let AI model handle urgency detection
  return null;
}

/**
 * Get language instructions for AI prompts
 * Updated to be language-agnostic
 */
export function getLanguageInstructions() {
  return `
LANGUAGE HANDLING:
- Input may be in any language supported by modern AI models
- Process queries naturally without language-specific preprocessing
- Detect and handle multilingual input seamlessly
- Respond in the same language as the input when possible and appropriate
- Never assume language - let the model handle natural language processing
- Leverage the AI model's inherent multilingual capabilities
`;
}

export default {
  normalizeQuery,
  detectLanguage,
  extractServiceCategory,
  extractUrgency,
  getLanguageInstructions
};