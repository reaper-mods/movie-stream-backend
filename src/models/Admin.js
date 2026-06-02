const prisma = require('../config/database');
const Encryption = require('../utils/encryption');
const JWTHelper = require('../utils/jwtHelper');

class AdminModel {
  // Find admin by username
  static async findByUsername(username) {
    return prisma.admin.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true,
        lastLogin: true,
        createdAt: true,
      }
    });
  }

  // Find admin by ID
  static async findById(id) {
    return prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      }
    });
  }

  // Find admin by email
  static async findByEmail(email) {
    return prisma.admin.findUnique({
      where: { email: email.toLowerCase() }
    });
  }

  // Create new admin
  static async create(data) {
    const hashedPassword = await Encryption.hashPassword(data.password);
    
    return prisma.admin.create({
      data: {
        username: data.username,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: data.role || 'admin',
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });
  }

  // Update admin
  static async update(id, data) {
    const updateData = { ...data };
    
    if (updateData.password) {
      updateData.password = await Encryption.hashPassword(updateData.password);
    }
    
    return prisma.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        updatedAt: true,
      }
    });
  }

  // Delete admin
  static async delete(id) {
    // Check if admin has added movies
    const movieCount = await prisma.movie.count({
      where: { addedById: id }
    });

    if (movieCount > 0) {
      // Reassign movies to super admin
      const superAdmin = await prisma.admin.findFirst({
        where: { role: 'superadmin' }
      });

      if (superAdmin) {
        await prisma.movie.updateMany({
          where: { addedById: id },
          data: { addedById: superAdmin.id }
        });
      }
    }

    return prisma.admin.delete({
      where: { id }
    });
  }

  // Get all admins with pagination
  static async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [admins, total] = await Promise.all([
      prisma.admin.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          lastLogin: true,
          createdAt: true,
          _count: {
            select: { movies: true }
          }
        }
      }),
      prisma.admin.count(),
    ]);

    return {
      admins,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalAdmins: total,
      }
    };
  }

  // Update last login
  static async updateLastLogin(id) {
    return prisma.admin.update({
      where: { id },
      data: { lastLogin: new Date() }
    });
  }

  // Change password
  static async changePassword(id, newPassword) {
    const hashedPassword = await Encryption.hashPassword(newPassword);
    
    return prisma.admin.update({
      where: { id },
      data: { password: hashedPassword }
    });
  }

  // Verify admin credentials
  static async verifyCredentials(username, password) {
    const admin = await this.findByUsername(username);
    
    if (!admin) {
      throw new Error('Invalid credentials');
    }

    const isValid = await Encryption.comparePassword(password, admin.password);
    
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Remove password from response
    const { password: _, ...adminWithoutPassword } = admin;
    return adminWithoutPassword;
  }

  // Get admin statistics
  static async getStats(adminId) {
    const [
      totalMoviesAdded,
      totalViews,
      recentlyAdded,
      lastLogin,
    ] = await Promise.all([
      prisma.movie.count({
        where: { addedById: adminId }
      }),
      prisma.movie.aggregate({
        where: { addedById: adminId },
        _sum: { viewCount: true }
      }),
      prisma.movie.findMany({
        where: { addedById: adminId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          viewCount: true,
          createdAt: true,
        }
      }),
      prisma.admin.findUnique({
        where: { id: adminId },
        select: { lastLogin: true }
      })
    ]);

    return {
      totalMoviesAdded,
      totalViews: totalViews._sum.viewCount || 0,
      recentlyAdded,
      lastLogin: lastLogin?.lastLogin,
    };
  }

  // Check if super admin exists
  static async superAdminExists() {
    const superAdmin = await prisma.admin.findFirst({
      where: { role: 'superadmin' }
    });
    return !!superAdmin;
  }

  // Get admin permissions
  static getPermissions(role) {
    const permissions = {
      superadmin: [
        'manage_admins',
        'manage_movies',
        'manage_users',
        'view_analytics',
        'manage_settings',
        'delete_content',
        'manage_api_keys',
      ],
      admin: [
        'manage_movies',
        'manage_users',
        'view_analytics',
        'delete_content',
      ],
      moderator: [
        'manage_movies',
        'view_analytics',
      ],
    };

    return permissions[role] || [];
  }

  // Check if admin has permission
  static hasPermission(admin, permission) {
    const permissions = this.getPermissions(admin.role);
    return permissions.includes(permission);
  }

  // Log admin activity
  static async logActivity(adminId, action, details = {}) {
    // In production, you might want to create an ActivityLog model
    console.log(`[ADMIN ACTIVITY] Admin ${adminId} - ${action}`, {
      timestamp: new Date().toISOString(),
      details,
    });
  }
}

module.exports = AdminModel;