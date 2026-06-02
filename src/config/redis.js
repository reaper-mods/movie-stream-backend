// For Vercel deployment, we'll use in-memory cache with fallback
// In production, you can replace this with Redis or Vercel KV

class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 300; // 5 minutes in seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Clean every minute
  }

  // Set cache with TTL
  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expiry });
    
    // If cache gets too large, remove oldest entries
    if (this.cache.size > 10000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  // Get cache value
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  // Delete cache
  delete(key) {
    return this.cache.delete(key);
  }

  // Check if key exists
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // Get TTL of key
  ttl(key) {
    const item = this.cache.get(key);
    if (!item) return -1;
    
    const ttl = Math.ceil((item.expiry - Date.now()) / 1000);
    return ttl > 0 ? ttl : -1;
  }

  // Clear pattern matching keys
  clearPattern(pattern) {
    const regex = new RegExp(pattern);
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }

  // Get all keys
  keys() {
    return Array.from(this.cache.keys());
  }

  // Get cache size
  size() {
    return this.cache.size;
  }

  // Clear all cache
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  // Get stats
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Destroy cache service
  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;