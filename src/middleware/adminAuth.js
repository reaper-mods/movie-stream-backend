const JWTHelper = require('../utils/jwtHelper');
const prisma = require('../config/database');

const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin authentication required' 
      });
    }

    const decoded = JWTHelper.verifyToken(token);
    if (!decoded || !decoded.adminId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
    });

    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Admin not found' 
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

module.exports = { authenticateAdmin };
