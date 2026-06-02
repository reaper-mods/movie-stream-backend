const prisma = require('../config/database');
const Encryption = require('../utils/encryption');
const Sanitizer = require('../utils/sanitizer');

class UserController {
  static async getProfile(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
          _count: {
            select: {
              watchHistory: true,
            }
          }
        }
      });

      return res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch profile'
      });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { name, email } = req.body;
      const updateData = {};

      if (name) {
        updateData.name = Sanitizer.sanitizeValue(name);
      }

      if (email) {
        // Check if email is already taken
        const existingUser = await prisma.user.findFirst({
          where: {
            email: email.toLowerCase(),
            NOT: { id: req.user.id }
          }
        });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use'
          });
        }

        updateData.email = email.toLowerCase();
      }

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          updatedAt: true,
        }
      });

      return res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      // Get current user with password
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      // Verify current password
      const isValid = await Encryption.comparePassword(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await Encryption.hashPassword(newPassword);

      // Update password and invalidate all sessions
      await Promise.all([
        prisma.user.update({
          where: { id: req.user.id },
          data: { password: hashedPassword }
        }),
        prisma.userSession.deleteMany({
          where: { userId: req.user.id }
        }),
      ]);

      return res.json({
        success: true,
        message: 'Password changed successfully. Please login again.'
      });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }

  static async getWatchHistory(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [history, total] = await Promise.all([
        prisma.watchHistory.findMany({
          where: { userId: req.user.id },
          skip,
          take: parseInt(limit),
          orderBy: { watchedAt: 'desc' },
          include: {
            movie: {
              select: {
                id: true,
                title: true,
                thumbnailUrl: true,
                duration: true,
                genre: true,
              }
            }
          }
        }),
        prisma.watchHistory.count({ where: { userId: req.user.id } }),
      ]);

      return res.json({
        success: true,
        data: {
          history,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalItems: total,
          }
        }
      });
    } catch (error) {
      console.error('Get watch history error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch watch history'
      });
    }
  }

  static async updateWatchProgress(req, res) {
    try {
      const { movieId } = req.params;
      const { progress, completed } = req.body;

      // Check if movie exists
      const movie = await prisma.movie.findUnique({
        where: { id: movieId, isActive: true }
      });

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

      // Update or create watch history
      const watchHistory = await prisma.watchHistory.upsert({
        where: {
          userId_movieId: {
            userId: req.user.id,
            movieId: movieId,
          }
        },
        update: {
          progress,
          completed: completed || progress >= 90,
          watchedAt: new Date(),
        },
        create: {
          userId: req.user.id,
          movieId: movieId,
          progress,
          completed: completed || progress >= 90,
        }
      });

      return res.json({
        success: true,
        data: watchHistory,
        message: 'Progress updated'
      });
    } catch (error) {
      console.error('Update watch progress error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update progress'
      });
    }
  }

  static async deleteAccount(req, res) {
    try {
      // Delete all user data
      await Promise.all([
        prisma.watchHistory.deleteMany({ where: { userId: req.user.id } }),
        prisma.userSession.deleteMany({ where: { userId: req.user.id } }),
      ]);

      // Delete user
      await prisma.user.delete({ where: { id: req.user.id } });

      return res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Delete account error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete account'
      });
    }
  }
}

module.exports = UserController;