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

      // Update last login
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
        popularMovies,
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
        prisma.movie.findMany({
          take: 5,
          orderBy: { viewCount: 'desc' },
          select: {
            id: true,
            title: true,
            viewCount: true,
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
          popularMovies,
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

      // Validate required fields
      if (!title || !description || !thumbnailUrl || !videoUrl) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Validate URLs
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(thumbnailUrl) || !urlPattern.test(videoUrl)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid URL format'
        });
      }

      const movie = await prisma.movie.create({
        data: {
          title: Encryption.sanitizeInput(title),
          description: Encryption.sanitizeInput(description),
          thumbnailUrl,
          videoUrl,
          duration: parseInt(duration) || null,
          releaseYear: parseInt(releaseYear) || null,
          genre: Array.isArray(genre) ? genre : [genre],
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
      const updateData = req.body;

      // Sanitize text fields
      if (updateData.title) updateData.title = Encryption.sanitizeInput(updateData.title);
      if (updateData.description) updateData.description = Encryption.sanitizeInput(updateData.description);

      const movie = await prisma.movie.update({
        where: { id },
        data: updateData,
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

      // Soft delete - just deactivate
      await prisma.movie.update({
        where: { id },
        data: { isActive: false }
      });

      return res.json({
        success: true,
        message: 'Movie deactivated successfully'
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
      const { page = 1, limit = 20, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {};
      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
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
        prisma.user.count({ where }),
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

  static async createAdmin(req, res) {
    try {
      const { username, email, password } = req.body;

      // Check if admin exists
      const existingAdmin = await prisma.admin.findFirst({
        where: {
          OR: [
            { username },
            { email: email.toLowerCase() }
          ]
        }
      });

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Admin with this username or email already exists'
        });
      }

      const hashedPassword = await Encryption.hashPassword(password);

      const admin = await prisma.admin.create({
        data: {
          username,
          email: email.toLowerCase(),
          password: hashedPassword,
        }
      });

      return res.status(201).json({
        success: true,
        data: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
        },
        message: 'Admin created successfully'
      });

    } catch (error) {
      console.error('Create admin error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create admin'
      });
    }
  }
}

module.exports = AdminController;