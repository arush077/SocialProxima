const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

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

router.put('/me/location', auth, async (req, res) => {
  const { longitude, latitude, discoveryEnabled } = req.body || {};
  const lng = Number(longitude);
  const lat = Number(latitude);

  if (!isValidCoord(lng, lat)) {
    return res.status(400).json({ error: 'valid longitude and latitude are required' });
  }

  const update = {
    location: { type: 'Point', coordinates: [lng, lat] },
    lastActive: new Date(),
  };
  if (typeof discoveryEnabled === 'boolean') {
    update.discoveryEnabled = discoveryEnabled;
  }

  const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  return res.json({
    id: user._id,
    location: user.location,
    discoveryEnabled: user.discoveryEnabled,
    lastActive: user.lastActive,
  });
});

router.patch('/me', auth, async (req, res) => {
  const { name, bio, interests, photo, discoveryEnabled } = req.body || {};
  const update = {};
  if (name !== undefined) update.name = name;
  if (bio !== undefined) update.bio = bio;
  if (photo !== undefined) update.photo = photo;
  if (interests !== undefined) update.interests = interests;
  if (typeof discoveryEnabled === 'boolean') update.discoveryEnabled = discoveryEnabled;

  const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  return res.json({
    id: user._id,
    name: user.name,
    photo: user.photo,
    bio: user.bio,
    interests: user.interests,
    discoveryEnabled: user.discoveryEnabled,
  });
});

module.exports = router;
