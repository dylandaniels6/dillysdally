export const sanitizeError = (error: any): string => {
  // Never expose sensitive information in error messages
  const sensitivePatterns = [
    /Bearer\s+[A-Za-z0-9\-_]+/gi,  // JWT tokens
    /sk-[A-Za-z0-9]+/gi,           // OpenAI API keys
    /postgresql:\/\/[^@]+@/gi,      // Database URLs with credentials
    /password[=:]\s*[^\s]+/gi,      // Passwords
    /token[=:]\s*[^\s]+/gi,         // Any tokens
    /key[=:]\s*[^\s]+/gi,           // API keys
  ];

  let message = error?.message || 'An error occurred';
  
  // Remove sensitive patterns
  sensitivePatterns.forEach(pattern => {
    message = message.replace(pattern, '[REDACTED]');
  });

  // Common safe error mappings
  const safeErrors: Record<string, string> = {
    'JWT expired': 'Session expired. Please sign in again.',
    'Invalid JWT': 'Invalid session. Please sign in again.',
    'No authorization token': 'Authentication required.',
    'Authentication required': 'Please sign in to continue.',
    'Rate limit exceeded': 'Too many requests. Please wait and try again.',
    'Network request failed': 'Connection error. Please check your internet.',
  };

  // Return safe error or sanitized message
  return safeErrors[message] || message.substring(0, 100); // Limit length
};

export const logSecurely = (message: string, data?: any) => {
  // Only log in development
  if (Deno.env.get('ENVIRONMENT') === 'development') {
    if (data) {
      // Remove sensitive fields before logging
      const sanitizedData = sanitizeLogData(data);
      console.log(message, sanitizedData);
    } else {
      console.log(message);
    }
  }
};

const sanitizeLogData = (data: any): any => {
  if (typeof data === 'string') {
    return data.includes('Bearer') || data.includes('sk-') ? '[REDACTED_TOKEN]' : data;
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('token') || lowerKey.includes('key') || lowerKey.includes('password')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    return sanitized;
  }
  
  return data;
};

// Rate limiting helper
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (
  userId: string, 
  endpoint: string, 
  config: RateLimitConfig
): { allowed: boolean; resetTime?: number } => {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  // Clean expired entries
  if (existing && now > existing.resetTime) {
    rateLimitStore.delete(key);
  }

  const current = rateLimitStore.get(key) || { count: 0, resetTime: now + config.windowMs };

  if (current.count >= config.maxRequests) {
    return { allowed: false, resetTime: current.resetTime };
  }

  // Increment counter
  current.count++;
  rateLimitStore.set(key, current);

  return { allowed: true };
};