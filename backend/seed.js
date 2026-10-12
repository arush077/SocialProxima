require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const User = require('./models/User');

const CENTER = { lng: -122.4194, lat: 37.7749 }; // San Francisco
const PASSWORD = 'password123';

// offset is [lng, lat] delta from CENTER so distances are realistic.
const people = [
  {
    name: 'Ava Chen',
    email: 'ava@example.com',
    bio: 'Coffee, code and long walks.',
    interests: ['coffee', 'tech', 'hiking'],
    offset: [0.004, 0.003],
  },
  {
    name: 'Marcus Reid',
    email: 'marcus@example.com',
    bio: 'Street photographer chasing golden hour.',
    interests: ['photography', 'art', 'cycling'],
    offset: [-0.006, 0.002],
  },
  {
    name: 'Priya Nair',
    email: 'priya@example.com',
    bio: 'Foodie and amateur chef. Ask me about biryani.',
    interests: ['food', 'travel', 'cooking'],
    offset: [0.008, -0.005],
  },
  {
    name: 'Diego Alvarez',
    email: 'diego@example.com',
    bio: 'Runner, climber, part-time gamer.',
    interests: ['running', 'climbing', 'gaming'],
    offset: [-0.003, -0.007],
  },
  {
    name: 'Sofia Rossi',
    email: 'sofia@example.com',
    bio: 'Bookworm and jazz vinyl collector.',
    interests: ['books', 'music', 'jazz'],
    offset: [0.012, 0.009],
  },
  {
    name: 'Liam Okafor',
    email: 'liam@example.com',
    bio: 'Building things on weekends.',
    interests: ['startups', 'tech', 'basketball'],
    offset: [-0.011, 0.010],
  },
  {
    name: 'Hana Kim',
    email: 'hana@example.com',
    bio: 'Yoga instructor and tea enthusiast.',
    interests: ['yoga', 'wellness', 'tea'],
    offset: [0.002, -0.012],
  },
  {
    name: 'Noah Bennett',
    email: 'noah@example.com',
    bio: 'Surfer, dog dad, mediocre guitarist.',
    interests: ['surfing', 'dogs', 'music'],
    offset: [-0.014, -0.003],
  },
];

async function run() {
  await connectDB();
  await User.syncIndexes();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();

  for (const person of people) {
    const [dLng, dLat] = person.offset;
    await User.updateOne(
      { email: person.email },
      {
        $set: {
          name: person.name,
          email: person.email,
          passwordHash,
          bio: person.bio,
          interests: person.interests,
          photo: '',
          discoveryEnabled: true,
          lastActive: now,
          location: {
            type: 'Point',
            coordinates: [CENTER.lng + dLng, CENTER.lat + dLat],
          },
        },
      },
      { upsert: true }
    );
  }

  console.log(`Seeded ${people.length} users around ${CENTER.lng},${CENTER.lat}`);
  console.log(`Login with any: ava@example.com / ${PASSWORD}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
