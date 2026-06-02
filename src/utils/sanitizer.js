const crypto = require('crypto');

class Sanitizer {
  // Deep sanitize object
  static sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized = {};
    for (let [key, value] of Object.entries(obj)) {
      // Sanitize key
      const cleanKey = this.sanitizeKey(key);
      // Recursively sanitize value
      sanitized[cleanKey] = this.sanitizeObject(value);
    }
    return sanitized;
  }

  // Sanitize individual value
  static sanitizeValue(value) {
    if (typeof value !== 'string') return value;

    // Remove HTML tags
    let clean = value.replace(/<[^>]*>/g, '');
    
    // Remove script tags and JavaScript events
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/on\w+="[^"]*"/gi, '');
    clean = clean.replace(/on\w+='[^']*'/gi, '');
    clean = clean.replace(/on\w+=\w+/gi, '');
    
    // Remove CSS expressions
    clean = clean.replace(/expression\s*\(/gi, '');
    
    // Remove JavaScript URLs
    clean = clean.replace(/javascript\s*:/gi, '');
    clean = clean.replace(/vbscript\s*:/gi, '');
    
    // Remove data URIs (potential XSS)
    clean = clean.replace(/data\s*:[^;]*;base64/gi, '');
    
    // Normalize whitespace
    clean = clean.replace(/\s+/g, ' ').trim();
    
    // Limit length
    if (clean.length > 10000) {
      clean = clean.substring(0, 10000);
    }
    
    return clean;
  }

  // Sanitize object keys
  static sanitizeKey(key) {
    // Remove special characters except underscore and hyphen
    let clean = key.replace(/[^a-zA-Z0-9_-]/g, '');
    
    // Ensure it doesn't start with a number
    if (/^\d/.test(clean)) {
      clean = '_' + clean;
    }
    
    return clean || 'invalid_key';
  }

  // Sanitize file paths
  static sanitizePath(path) {
    // Remove path traversal attempts
    let clean = path.replace(/\.\./g, '');
    clean = clean.replace(/[<>:"|?*]/g, '');
    clean = clean.replace(/^\/+/, '');
    
    return clean;
  }

  // Sanitize email
  static sanitizeEmail(email) {
    if (typeof email !== 'string') return '';
    
    // Remove all characters except valid email characters
    let clean = email.replace(/[^a-zA-Z0-9@._+\-]/g, '');
    
    // Ensure only one @ symbol
    const parts = clean.split('@');
    if (parts.length > 2) {
      clean = parts[0] + '@' + parts.slice(1).join('');
    }
    
    return clean.toLowerCase();
  }

  // Sanitize URL
  static sanitizeUrl(url) {
    if (typeof url !== 'string') return '';
    
    // Basic URL sanitization
    let clean = url.trim();
    
    // Only allow http and https protocols
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'https://' + clean.replace(/^\/+/, '');
    }
    
    // Remove potential XSS
    clean = clean.replace(/[<>"]/g, '');
    clean = clean.replace(/javascript:/gi, '');
    clean = clean.replace(/data:/gi, '');
    
    return clean;
  }

  // Generate safe filename
  static generateSafeFilename(originalName) {
    const ext = originalName.split('.').pop().toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm'];
    
    if (!allowedExts.includes(ext)) {
      throw new Error('Invalid file type');
    }
    
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${random}.${ext}`;
  }

  // SQL Injection prevention - escape special characters
  static escapeSQL(value) {
    if (typeof value !== 'string') return value;
    
    // Note: With Prisma/parameterized queries, this is extra protection
    return value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\0/g, '\\0')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x1a/g, '\\Z');
  }

  // Remove all null bytes
  static removeNullBytes(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/\0/g, '');
  }

  // Comprehensive sanitize for user input
  static deepClean(input) {
    // Remove null bytes
    let clean = this.removeNullBytes(input);
    
    // Basic sanitization
    clean = this.sanitizeValue(clean);
    
    // Additional cleaning
    clean = clean.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, ''); // Remove non-printable chars
    
    return clean;
  }
}

module.exports = Sanitizer;