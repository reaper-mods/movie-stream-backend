const prisma = require('../config/database');

class WatchHistoryModel {
  // Add or update watch history
  static async upsert(userId, movieId, data = {}) {
    return prisma.watchHistory.upsert({
      where: {
        userId_movieId: {
          userId,
          movieId,
        }
      },
      update: {
        progress: data.progress || 0,
        completed: data.completed || false,
        watchedAt: new Date(),
      },
      create: {
        userId,
        movieId,
        progress: data.progress || 0,
        completed: data.completed || false,
      },
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
    });
  }

  // Get user's watch history with pagination
  static async getUserHistory(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      completed,
      sortBy = 'watchedAt',
      sortOrder = 'desc',
    } = options;

    const skip = (page - 1) * limit;
    
    const where = { userId };
    
    if (completed !== undefined) {
      where.completed = completed;
    }

    const [history, total] = await Promise.all([
      prisma.watchHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              description: true,
              thumbnailUrl: true,
              duration: true,
              releaseYear: true,
              genre: true,
              rating: true,
            }
          }
        }
      }),
      prisma.watchHistory.count({ where }),
    ]);

    return {
      history,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasMore: skip + history.length < total,
      }
    };
  }

  // Get specific movie watch history for user
  static async getUserMovieHistory(userId, movieId) {
    return prisma.watchHistory.findUnique({
      where: {
        userId_movieId: {
          userId,
          movieId,
        }
      },
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
    });
  }

  // Get recently watched movies
  static async getRecentlyWatched(userId, limit = 10) {
    return prisma.watchHistory.findMany({
      where: { userId },
      take: limit,
      orderBy: { watchedAt: 'desc' },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            duration: true,
            genre: true,
            rating: true,
          }
        }
      }
    });
  }

  // Get continue watching (incomplete movies)
  static async getContinueWatching(userId, limit = 10) {
    return prisma.watchHistory.findMany({
      where: {
        userId,
        completed: false,
        progress: { gt: 0 },
      },
      take: limit,
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
    });
  }

  // Get completed movies
  static async getCompletedMovies(userId, page = 1, limit = 20) {
    return this.getUserHistory(userId, {
      page,
      limit,
      completed: true,
      sortBy: 'watchedAt',
      sortOrder: 'desc',
    });
  }

  // Delete watch history entry
  static async delete(userId, movieId) {
    return prisma.watchHistory.delete({
      where: {
        userId_movieId: {
          userId,
          movieId,
        }
      }
    });
  }

  // Clear all watch history for user
  static async clearAll(userId) {
    return prisma.watchHistory.deleteMany({
      where: { userId }
    });
  }

  // Get watch time statistics for user
  static async getWatchStats(userId) {
    const [
      totalWatched,
      totalCompleted,
      totalTimeSpent,
      recentlyWatched,
      favoriteGenre,
    ] = await Promise.all([
      // Total movies watched
      prisma.watchHistory.count({
        where: { userId }
      }),
      
      // Total completed movies
      prisma.watchHistory.count({
        where: { 
          userId,
          completed: true 
        }
      }),
      
      // Total time spent (sum of movie durations for completed movies)
      prisma.watchHistory.findMany({
        where: { 
          userId,
          completed: true 
        },
        include: {
          movie: {
            select: { duration: true }
          }
        }
      }),
      
      // Recently watched this week
      prisma.watchHistory.count({
        where: {
          userId,
          watchedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Most watched genre
      prisma.watchHistory.findMany({
        where: { userId },
        include: {
          movie: {
            select: { genre: true }
          }
        }
      }),
    ]);

    // Calculate total time spent
    const totalMinutes = totalTimeSpent.reduce((sum, item) => {
      return sum + (item.movie.duration || 0);
    }, 0);

    // Find favorite genre
    const genreCount = {};
    favoriteGenre.forEach(item => {
      item.movie.genre.forEach(g => {
        genreCount[g] = (genreCount[g] || 0) + 1;
      });
    });

    const topGenre = Object.entries(genreCount)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      totalMoviesWatched: totalWatched,
      totalMoviesCompleted: totalCompleted,
      completionRate: totalWatched > 0 ? (totalCompleted / totalWatched * 100).toFixed(2) : 0,
      totalWatchTime: {
        minutes: totalMinutes,
        hours: (totalMinutes / 60).toFixed(2),
        days: (totalMinutes / 1440).toFixed(2),
      },
      recentlyWatchedThisWeek: recentlyWatched,
      favoriteGenre: topGenre ? {
        genre: topGenre[0],
        count: topGenre[1],
      } : null,
      watchHistory: {
        total: totalWatched,
        completed: totalCompleted,
        inProgress: totalWatched - totalCompleted,
      }
    };
  }

  // Get movie watch statistics (for admin)
  static async getMovieStats(movieId) {
    const [
      totalViews,
      completedViews,
      averageProgress,
      uniqueViewers,
    ] = await Promise.all([
      // Total views
      prisma.watchHistory.count({
        where: { movieId }
      }),
      
      // Completed views
      prisma.watchHistory.count({
        where: { 
          movieId,
          completed: true 
        }
      }),
      
      // Average progress
      prisma.watchHistory.aggregate({
        where: { movieId },
        _avg: { progress: true }
      }),
      
      // Unique viewers
      prisma.watchHistory.groupBy({
        by: ['userId'],
        where: { movieId },
      }),
    ]);

    return {
      totalViews,
      completedViews,
      completionRate: totalViews > 0 ? (completedViews / totalViews * 100).toFixed(2) : 0,
      averageProgress: averageProgress._avg.progress?.toFixed(2) || 0,
      uniqueViewers: uniqueViewers.length,
      dropOffRate: totalViews > 0 ? 
        ((totalViews - completedViews) / totalViews * 100).toFixed(2) : 0,
    };
  }

  // Get trending movies based on watch history
  static async getTrendingMovies(limit = 10) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trending = await prisma.watchHistory.groupBy({
      by: ['movieId'],
      where: {
        watchedAt: { gte: oneWeekAgo }
      },
      _count: {
        movieId: true
      },
      orderBy: {
        _count: {
          movieId: 'desc'
        }
      },
      take: limit,
    });

    // Get movie details for trending
    const movieIds = trending.map(item => item.movieId);
    const movies = await prisma.movie.findMany({
      where: {
        id: { in: movieIds },
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        duration: true,
        genre: true,
        rating: true,
        viewCount: true,
      }
    });

    // Combine with watch count
    return movies.map(movie => {
      const trend = trending.find(t => t.movieId === movie.id);
      return {
        ...movie,
        weeklyViews: trend?._count.movieId || 0,
      };
    }).sort((a, b) => b.weeklyViews - a.weeklyViews);
  }

  // Bulk update watch history (mark multiple as completed)
  static async bulkComplete(userId, movieIds) {
    return prisma.watchHistory.updateMany({
      where: {
        userId,
        movieId: { in: movieIds }
      },
      data: {
        completed: true,
        progress: 100,
        watchedAt: new Date(),
      }
    });
  }

  // Get watch history by date range
  static async getHistoryByDateRange(userId, startDate, endDate) {
    return prisma.watchHistory.findMany({
      where: {
        userId,
        watchedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        }
      },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            duration: true,
            genre: true,
          }
        }
      },
      orderBy: { watchedAt: 'desc' }
    });
  }
}

module.exports = WatchHistoryModel;