const prisma = require('../config/database');
const Encryption = require('../utils/encryption');
const JWTHelper = require('../utils/jwtHelper');

class AdminController {
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      const admin = await prisma.admin.findUnique({
        where: { username }
      });

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const isValidPassword = await Encryption.comparePassword(password, admin.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      await prisma.admin.update({
        where: { id: admin.id },
        data: { lastLogin: new Date() }
      });

      const token = JWTHelper.generateToken({ 
        adminId: admin.id,
        role: admin.role 
      });

      return res.json({
        success: true,
        data: {
          admin: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            role: admin.role,
          },
          token,
        }
      });

    } catch (error) {
      console.error('Admin login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }

  static async getDashboard(req, res) {
    try {
      const [
        totalMovies,
        totalUsers,
        activeUsers,
        totalViews,
        recentMovies,
      ] = await Promise.all([
        prisma.movie.count(),
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.movie.aggregate({ _sum: { viewCount: true } }),
        prisma.movie.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            viewCount: true,
            createdAt: true,
          }
        }),
      ]);

      return res.json({
        success: true,
        data: {
          stats: {
            totalMovies,
            totalUsers,
            activeUsers,
            totalViews: totalViews._sum.viewCount || 0,
          },
          recentMovies,
        }
      });

    } catch (error) {
      console.error('Dashboard error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data'
      });
    }
  }

  static async getMovies(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [movies, total] = await Promise.all([
        prisma.movie.findMany({
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.movie.count(),
      ]);

      return res.json({
        success: true,
        data: {
          movies,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalMovies: total,
          }
        }
      });

    } catch (error) {
      console.error('Get movies error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch movies'
      });
    }
  }

  static async addMovie(req, res) {
    try {
      const {
        title,
        description,
        thumbnailUrl,
        videoUrl,
        duration,
        releaseYear,
        genre,
        rating,
        featured,
      } = req.body;

      if (!title || !description || !thumbnailUrl || !videoUrl) {
        return res.status(400).json({
          success: false,
          message: 'Title, description, thumbnail URL, and video URL are required'
        });
      }

      const movie = await prisma.movie.create({
        data: {
          title,
          description,
          thumbnailUrl,
          videoUrl,
          duration: parseInt(duration) || null,
          releaseYear: parseInt(releaseYear) || null,
          genre: Array.isArray(genre) ? genre : genre ? [genre] : [],
          rating: parseFloat(rating) || null,
          featured: featured === 'true' || featured === true,
          addedById: req.admin.id,
        }
      });

      return res.status(201).json({
        success: true,
        data: movie,
        message: 'Movie added successfully'
      });

    } catch (error) {
      console.error('Add movie error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add movie'
      });
    }
  }

  static async updateMovie(req, res) {
    try {
      const { id } = req.params;
      const movie = await prisma.movie.update({
        where: { id },
        data: req.body,
      });

      return res.json({
        success: true,
        data: movie,
        message: 'Movie updated successfully'
      });

    } catch (error) {
      console.error('Update movie error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update movie'
      });
    }
  }

  static async deleteMovie(req, res) {
    try {
      const { id } = req.params;

      await prisma.movie.delete({
        where: { id }
      });

      return res.json({
        success: true,
        message: 'Movie deleted successfully'
      });

    } catch (error) {
      console.error('Delete movie error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete movie'
      });
    }
  }

  static async getUsers(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            createdAt: true,
            lastLogin: true,
            _count: {
              select: { watchHistory: true }
            }
          }
        }),
        prisma.user.count(),
      ]);

      return res.json({
        success: true,
        data: {
          users,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            totalUsers: total,
          }
        }
      });

    } catch (error) {
      console.error('Get users error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
  }
}

module.exports = AdminController;
