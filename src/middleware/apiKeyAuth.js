const prisma = require('../config/database');

const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key is required'
      });
    }

    // Check if API key exists and is active
    const validKey = await prisma.apiKey.findFirst({
      where: {
        key: apiKey,
        isActive: true,
      },
    });

    if (!validKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive API key'
      });
    }

    req.apiKey = validKey;
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'API key validation failed'
    });
  }
};

module.exports = { validateApiKey };