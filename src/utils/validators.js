class Validators {
  // Email validation
  static isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  // Password strength validation
  static isStrongPassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength &&
           hasUpperCase &&
           hasLowerCase &&
           hasNumbers &&
           hasSpecialChar;
  }

  // URL validation
  static isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // YouTube URL validation
  static isValidYouTubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return youtubeRegex.test(url);
  }

  // GitHub URL validation
  static isValidGitHubUrl(url) {
    const githubRegex = /^https?:\/\/github\.com\/.+\/.+$/;
    return githubRegex.test(url);
  }

  // UUID validation
  static isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  // ObjectId validation
  static isValidObjectId(str) {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(str);
  }

  // Date validation
  static isValidDate(date) {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
  }

  // Number range validation
  static isInRange(value, min, max) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  }

  // String length validation
  static isProperLength(str, min, max) {
    return typeof str === 'string' && 
           str.length >= min && 
           str.length <= max;
  }

  // Array validation
  static isStringArray(arr) {
    return Array.isArray(arr) && arr.every(item => typeof item === 'string');
  }

  // Genre validation
  static isValidGenre(genre) {
    const validGenres = [
      'action', 'comedy', 'drama', 'horror', 'sci-fi',
      'thriller', 'romance', 'animation', 'documentary',
      'adventure', 'fantasy', 'mystery', 'crime', 'family'
    ];
    return validGenres.includes(genre.toLowerCase());
  }

  // Rating validation
  static isValidRating(rating) {
    const num = parseFloat(rating);
    return !isNaN(num) && num >= 0 && num <= 10;
  }

  // Year validation
  static isValidYear(year) {
    const num = parseInt(year);
    const currentYear = new Date().getFullYear();
    return !isNaN(num) && num >= 1888 && num <= currentYear + 5;
  }

  // Movie data validation
  static validateMovieData(data) {
    const errors = [];

    if (!data.title || !this.isProperLength(data.title, 1, 200)) {
      errors.push('Title must be between 1-200 characters');
    }

    if (!data.description || !this.isProperLength(data.description, 10, 2000)) {
      errors.push('Description must be between 10-2000 characters');
    }

    if (!data.thumbnailUrl || !this.isValidUrl(data.thumbnailUrl)) {
      errors.push('Valid thumbnail URL is required');
    }

    if (!data.videoUrl || !this.isValidUrl(data.videoUrl)) {
      errors.push('Valid video URL is required');
    }

    if (data.genre && !this.isStringArray(data.genre)) {
      errors.push('Genre must be an array of strings');
    }

    if (data.rating && !this.isValidRating(data.rating)) {
      errors.push('Rating must be between 0 and 10');
    }

    if (data.releaseYear && !this.isValidYear(data.releaseYear)) {
      errors.push('Invalid release year');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Sanitize and validate pagination
  static validatePagination(page, limit) {
    const pagination = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    };

    if (pagination.page < 1) pagination.page = 1;
    if (pagination.limit < 1) pagination.limit = 1;
    if (pagination.limit > 100) pagination.limit = 100;

    return pagination;
  }
}

module.exports = Validators;