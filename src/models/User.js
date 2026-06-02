const prisma = require('../config/database');
const Encryption = require('../utils/encryption');

class UserModel {
  static async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
  }

  static async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
      }
    });
  }

  static async create(data) {
    const hashedPassword = await Encryption.hashPassword(data.password);
    
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashedPassword,
        name: data.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      }
    });
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await Encryption.hashPassword(newPassword);
    
    return prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
  }

  static async incrementLoginAttempts(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const attempts = user.loginAttempts + 1;
    const updateData = { loginAttempts: attempts };

    if (attempts >= 5) {
      updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      updateData.loginAttempts = 0;
    }

    return prisma.user.update({
      where: { id: userId },
      data: updateData
    });
  }

  static async resetLoginAttempts(userId) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      }
    });
  }
}

module.exports = UserModel;