const prisma = require('../config/database');
const NodeCache = require('node-cache');

// Cache for 5 minutes
const movieCache = new NodeCache({ stdTTL: 300 });

class MovieController {
  static async getMovies(req, res) {
    try {
      const { page = 1, limit = 20, genre, search, featured } = req.query;
      const cacheKey = `movies_${page}_${limit}_${genre}_${search}_${featured}`;

      // Check cache
      const cachedData = movieCache.get(cacheKey);
      if (cachedData) {
        return res.json({
          success: true,
          data: cachedData,
          cached: true,
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Build where clause
      const where = { isActive: true };
      if (genre) {
        where.genre = { has: genre };
      }
      if (featured === 'true') {
        where.featured = true;
      }
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get movies with pagination
      const [movies, total] = await Promise.all([
        prisma.movie.findMany({
          where,
          skip,
          take: parseInt(limit),
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

      const result = {
        movies,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalMovies: total,
          hasMore: skip + movies.length < total,
        }
      };

      // Cache the result
      movieCache.set(cacheKey, result);

      return res.json({
        success: true,
        data: result,
      });

    } catch (error) {
      console.error('Get movies error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch movies'
      });
    }
  }

  static async getMovieById(req, res) {
    try {
      const { id } = req.params;

      // Only authenticated users can access full movie details
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to view movie details'
        });
      }

      const movie = await prisma.movie.findUnique({
        where: { id, isActive: true },
      });

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: 'Movie not found'
        });
      }

      // Update view count
      await prisma.movie.update({
        where: { id },
        data: { viewCount: { increment: 1 } }
      });

      // Track watch history
      await prisma.watchHistory.upsert({
        where: {
          userId_movieId: {
            userId: req.user.id,
            movieId: movie.id,
          }
        },
        update: {
          watchedAt: new Date(),
        },
        create: {
          userId: req.user.id,
          movieId: movie.id,
        }
      });

      return res.json({
        success: true,
        data: movie,
      });

    } catch (error) {
      console.error('Get movie error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch movie'
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
}

module.exports = MovieController;