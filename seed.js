require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('Starting seed...\n');

    // Create super admin
    const adminPassword = await bcrypt.hash('Admin@123!', 12);
    
    const admin = await prisma.admin.upsert({
      where: { username: 'superadmin' },
      update: {},
      create: {
        username: 'superadmin',
        email: 'admin@moviestream.com',
        password: adminPassword,
        role: 'superadmin',
      },
    });

    console.log('Super admin created:', admin.username);

    // Create sample movies
    const sampleMovies = [
      {
        title: "The Digital Frontier",
        description: "An epic journey through the digital world of tomorrow. Experience cutting-edge technology and human emotion in this groundbreaking film.",
        thumbnailUrl: "https://raw.githubusercontent.com/niket/movie-thumbnails/main/digital-frontier.jpg",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        duration: 120,
        releaseYear: 2024,
        genre: ["sci-fi", "adventure"],
        rating: 8.5,
        featured: true,
      },
      {
        title: "Midnight Mystery",
        description: "A detective's quest to solve the unsolvable crime. Dark secrets unravel in this gripping thriller that will keep you on the edge of your seat.",
        thumbnailUrl: "https://raw.githubusercontent.com/niket/movie-thumbnails/main/midnight-mystery.jpg",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        duration: 95,
        releaseYear: 2024,
        genre: ["mystery", "thriller"],
        rating: 7.8,
        featured: true,
      },
      {
        title: "Comedy Nights",
        description: "Laugh your heart out with this hilarious comedy about three friends who stumble into the adventure of a lifetime.",
        thumbnailUrl: "https://raw.githubusercontent.com/niket/movie-thumbnails/main/comedy-nights.jpg",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        duration: 88,
        releaseYear: 2023,
        genre: ["comedy"],
        rating: 7.2,
        featured: false,
      },
      {
        title: "The Last Horizon",
        description: "A breathtaking space odyssey that explores the boundaries of human exploration and the mysteries of the cosmos.",
        thumbnailUrl: "https://raw.githubusercontent.com/niket/movie-thumbnails/main/last-horizon.jpg",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        duration: 145,
        releaseYear: 2024,
        genre: ["sci-fi", "drama"],
        rating: 9.1,
        featured: true,
      },
      {
        title: "Shadow Protocol",
        description: "An elite spy must choose between duty and morality in this high-octane action thriller.",
        thumbnailUrl: "https://raw.githubusercontent.com/niket/movie-thumbnails/main/shadow-protocol.jpg",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        duration: 110,
        releaseYear: 2024,
        genre: ["action", "thriller"],
        rating: 8.0,
        featured: false,
      }
    ];

    for (const movie of sampleMovies) {
      await prisma.movie.create({
        data: {
          ...movie,
          addedById: admin.id,
        }
      });
    }

    console.log('Sample movies created:', sampleMovies.length);

    // Create API key for frontend
    const apiKey = crypto.randomBytes(32).toString('hex');
    await prisma.apiKey.create({
      data: {
        key: apiKey,
        name: 'Frontend API Key',
      }
    });

    console.log('\n=================================');
    console.log(' DATABASE SEEDED SUCCESSFULLY!');
    console.log('=================================');
    console.log('\nAdmin Credentials:');
    console.log('  Username: superadmin');
    console.log('  Password: Admin@123!');
    console.log('\nAPI Key:', apiKey);
    console.log('\nTest Movies Created:', sampleMovies.length);
    console.log('=================================\n');
    
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();