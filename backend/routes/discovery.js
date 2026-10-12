const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');

const ACTIVE_WINDOW_MS = Number(process.env.ACTIVE_WINDOW_MS || 24 * 60 * 60 * 1000);

function isValidCoord(lng, lat) {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

router.post('/nearby', auth, async (req, res) => {
  const { longitude, latitude, radius = 5000, limit = 50 } = req.body || {};
  const lng = Number(longitude);
  const lat = Number(latitude);

  if (!isValidCoord(lng, lat)) {
    return res.status(400).json({ error: 'valid longitude and latitude are required' });
  }

  const safeRadius = Math.min(Math.max(Number(radius) || 5000, 1), 100000);
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

  const me = await User.findById(req.userId).select('blockedUsers');
  const blocked = me ? me.blockedUsers : [];

  const results = await User.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distance',
        maxDistance: safeRadius,
        spherical: true,
        query: {
          _id: {
            $ne: new mongoose.Types.ObjectId(req.userId),
            $nin: blocked,
          },
          discoveryEnabled: true,
          'location.coordinates': { $exists: true },
          lastActive: { $gte: new Date(Date.now() - ACTIVE_WINDOW_MS) },
        },
      },
    },
    { $limit: safeLimit },
    {
      $project: {
        name: 1,
        photo: 1,
        bio: 1,
        interests: 1,
        distance: 1,
      },
    },
  ]);

  return res.json({
    count: results.length,
    radiusMeters: safeRadius,
    users: results.map((u) => ({
      id: u._id,
      name: u.name,
      photo: u.photo,
      bio: u.bio,
      interests: u.interests,
      distanceMeters: Math.round(u.distance / 10) * 10,
    })),
  });
});

module.exports = router;
