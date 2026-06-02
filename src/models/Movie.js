const prisma = require('../config/database');
const cacheService = require('../config/redis');

class MovieModel {
  static async findAll(filters = {}) {
    const { page = 1, limit = 20, genre, search, featured } = filters;
    const skip = (page - 1) * limit;
    
    const where = { isActive: true };
    
    if (genre) where.genre = { has: genre };
    if (featured !== undefined) where.featured = featured;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          duration: true,
          releaseYear: true,
          genre: true,
          rating: true,
          viewCount: true,
          featured: true,
          createdAt: true,
        }
      }),
      prisma.movie.count({ where }),
    ]);

    return {
      movies,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMovies: total,
        hasMore: skip + movies.length < total,
      }
    };
  }

  static async findById(id) {
    return prisma.movie.findUnique({
      where: { id, isActive: true },
    });
  }

  static async incrementViews(id) {
    return prisma.movie.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });
  }

  static async getFeatured() {
    const cacheKey = 'featured_movies';
    const cached = cacheService.get(cacheKey);
    
    if (cached) return cached;

    const movies = await prisma.movie.findMany({
      where: { featured: true, isActive: true },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    cacheService.set(cacheKey, movies, 300); // Cache for 5 minutes
    return movies;
  }

  static async getPopular(limit = 10) {
    const cacheKey = `popular_movies_${limit}`;
    const cached = cacheService.get(cacheKey);
    
    if (cached) return cached;

    const movies = await prisma.movie.findMany({
      where: { isActive: true },
      take: limit,
      orderBy: { viewCount: 'desc' },
    });

    cacheService.set(cacheKey, movies, 600); // Cache for 10 minutes
    return movies;
  }
}

module.exports = MovieModel;