/**
 * Input Sanitization Utilities
 * 
 * Convex uses a document database with typed validators, which inherently prevents
 * SQL injection. However, we still need to protect against:
 * - XSS attacks (script injection in text fields)
 * - Overly long inputs that could cause issues
 * - Malicious patterns in user-generated content
 */

/**
 * Maximum lengths for different field types
 */
export const MAX_LENGTHS = {
  username: 50,
  firstName: 100,
  lastName: 100,
  name: 200,
  description: 2000,
  message: 5000,
  comment: 1000,
  tag: 50,
  url: 2048,
  email: 320,
  phone: 20,
};

/**
 * Dangerous patterns to strip from user input
 */
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onclick=, onerror=, etc.
  /data:/gi, // data: URLs can be used for XSS
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
];

/**
 * HTML entities that should be escaped
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escape HTML entities in a string
 */
function escapeHtml(str: string): string {
  return str.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Remove dangerous patterns from a string
 */
function removeDangerousPatterns(str: string): string {
  let result = str;
  for (const pattern of DANGEROUS_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result;
}

/**
 * Sanitize a general text input
 * - Trims whitespace
 * - Removes dangerous patterns
 * - Enforces max length
 * - Does NOT escape HTML (for display, escape on the frontend)
 */
export function sanitizeText(
  input: string | undefined | null,
  maxLength: number = MAX_LENGTHS.description
): string {
  if (!input) return '';
  
  let result = input.trim();
  
  // Remove dangerous patterns
  result = removeDangerousPatterns(result);
  
  // Enforce max length
  if (result.length > maxLength) {
    result = result.substring(0, maxLength);
  }
  
  return result;
}

/**
 * Sanitize a username
 * - Only allows alphanumeric, underscores, and hyphens
 * - Lowercase only
 * - Max 50 characters
 */
export function sanitizeUsername(input: string | undefined | null): string {
  if (!input) return '';
  
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .substring(0, MAX_LENGTHS.username);
}

/**
 * Sanitize a name (first name, last name)
 * - Removes dangerous characters
 * - Allows letters, spaces, hyphens, apostrophes
 * - Max 100 characters
 */
export function sanitizeName(input: string | undefined | null): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '')
    .substring(0, MAX_LENGTHS.name);
}

/**
 * Sanitize an email address
 * - Basic validation and cleanup
 * - Lowercase
 */
export function sanitizeEmail(input: string | undefined | null): string {
  if (!input) return '';
  
  const trimmed = input.trim().toLowerCase();
  
  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return '';
  }
  
  return trimmed.substring(0, MAX_LENGTHS.email);
}

/**
 * Sanitize a URL
 * - Only allows http and https protocols
 * - Removes dangerous patterns
 */
export function sanitizeUrl(input: string | undefined | null): string {
  if (!input) return '';
  
  const trimmed = input.trim();
  
  // Only allow http and https
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return '';
  }
  
  // Check for javascript: or data: inside the URL
  if (/javascript:|data:/i.test(trimmed)) {
    return '';
  }
  
  return trimmed.substring(0, MAX_LENGTHS.url);
}

/**
 * Sanitize an array of tags
 * - Removes empty tags
 * - Trims each tag
 * - Removes dangerous characters
 * - Max 50 chars per tag
 */
export function sanitizeTags(input: string[] | undefined | null): string[] {
  if (!input || !Array.isArray(input)) return [];
  
  return input
    .map((tag) => sanitizeText(tag, MAX_LENGTHS.tag))
    .filter((tag) => tag.length > 0);
}

/**
 * Validate and sanitize a phone number
 * - Only allows digits, spaces, dashes, parentheses, and plus sign
 */
export function sanitizePhone(input: string | undefined | null): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[^0-9\s\-+()]/g, '')
    .substring(0, MAX_LENGTHS.phone);
}

/**
 * Check if a string contains potentially malicious content
 * Returns true if the content appears safe
 */
export function isContentSafe(input: string): boolean {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      return false;
    }
  }
  return true;
}

/**
 * Escape HTML for safe display
 * Use this when displaying user-generated content in HTML
 */
export function escapeForDisplay(input: string | undefined | null): string {
  if (!input) return '';
  return escapeHtml(input);
}

