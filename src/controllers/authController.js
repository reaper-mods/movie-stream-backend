const prisma = require('../config/database');
const Encryption = require('../utils/encryption');
const JWTHelper = require('../utils/jwtHelper');

class AuthController {
  static async register(req, res) {
    try {
      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists'
        });
      }

      // Hash password
      const hashedPassword = await Encryption.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name: Encryption.sanitizeInput(name),
        }
      });

      // Generate tokens
      const token = JWTHelper.generateToken({ userId: user.id });
      const refreshToken = JWTHelper.generateRefreshToken({ userId: user.id });

      // Create session
      await prisma.userSession.create({
        data: {
          userId: user.id,
          token: refreshToken,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        }
      });

      return res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
          refreshToken,
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const remainingTime = Math.ceil((user.lockedUntil - new Date()) / 60000);
        return res.status(423).json({
          success: false,
          message: `Account is locked. Try again in ${remainingTime} minutes.`
        });
      }

      // Verify password
      const isValidPassword = await Encryption.comparePassword(password, user.password);

      if (!isValidPassword) {
        // Increment login attempts
        const attempts = user.loginAttempts + 1;
        const updateData = { loginAttempts: attempts };

        // Lock account after 5 failed attempts
        if (attempts >= 5) {
          updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lock
          updateData.loginAttempts = 0;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: updateData
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Reset login attempts on successful login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: 0,
          lockedUntil: null,
          lastLogin: new Date(),
        }
      });

      // Generate tokens
      const token = JWTHelper.generateToken({ userId: user.id });
      const refreshToken = JWTHelper.generateRefreshToken({ userId: user.id });

      // Create session
      await prisma.userSession.create({
        data: {
          userId: user.id,
          token: refreshToken,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
      });

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
          refreshToken,
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }

  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      const decoded = JWTHelper.verifyToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Check if session exists
      const session = await prisma.userSession.findFirst({
        where: {
          userId: decoded.userId,
          token: refreshToken,
          expiresAt: { gt: new Date() }
        }
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: 'Session expired'
        });
      }

      // Generate new tokens
      const newToken = JWTHelper.generateToken({ userId: decoded.userId });
      const newRefreshToken = JWTHelper.generateRefreshToken({ userId: decoded.userId });

      // Update session
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
      });

      return res.json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      return res.status(500).json({
        success: false,
        message: 'Token refresh failed'
      });
    }
  }

  static async logout(req, res) {
    try {
      // Clear all sessions for user
      await prisma.userSession.deleteMany({
        where: { userId: req.user.id }
      });

      return res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }
}

module.exports = AuthController;