const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Conversation = require('../models/Conversation');

const PUBLIC_FIELDS = 'name photo bio interests';

function pairKey(a, b) {
  return [String(a), String(b)].sort().join(':');
}

async function ensureConversation(a, b) {
  const key = pairKey(a, b);
  let conversation = await Conversation.findOne({ pairKey: key });
  if (!conversation) {
    try {
      conversation = await Conversation.create({ participants: [a, b], pairKey: key });
    } catch (err) {
      if (err.code === 11000) {
        conversation = await Conversation.findOne({ pairKey: key });
      } else {
        throw err;
      }
    }
  }
  return conversation;
}

// P0 override: connection requests are auto-accepted.
router.post('/request/:userId', auth, async (req, res) => {
  const { userId } = req.params;

  if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: 'invalid user id' });
  }
  if (userId === req.userId) {
    return res.status(400).json({ error: 'cannot connect with yourself' });
  }

  const target = await User.findById(userId).select('_id');
  if (!target) {
    return res.status(404).json({ error: 'user not found' });
  }

  let connection = await Connection.findOne({
    $or: [
      { requester: req.userId, recipient: userId },
      { requester: userId, recipient: req.userId },
    ],
  });

  if (!connection) {
    connection = await Connection.create({
      requester: req.userId,
      recipient: userId,
      status: 'accepted',
    });
  } else {
    connection.status = 'accepted';
    await connection.save();
  }

  const conversation = await ensureConversation(req.userId, userId);

  return res.status(201).json({
    connection: {
      id: connection._id,
      requester: connection.requester,
      recipient: connection.recipient,
      status: connection.status,
    },
    conversationId: conversation._id,
  });
});

router.post('/:id/accept', auth, async (req, res) => {
  const connection = await Connection.findById(req.params.id);
  if (!connection) {
    return res.status(404).json({ error: 'connection not found' });
  }
  if (String(connection.recipient) !== req.userId) {
    return res.status(403).json({ error: 'only the recipient can accept' });
  }

  connection.status = 'accepted';
  await connection.save();

  const conversation = await ensureConversation(
    connection.requester,
    connection.recipient
  );

  return res.json({
    connection: {
      id: connection._id,
      requester: connection.requester,
      recipient: connection.recipient,
      status: connection.status,
    },
    conversationId: conversation._id,
  });
});

router.get('/', auth, async (req, res) => {
  const connections = await Connection.find({
    status: 'accepted',
    $or: [{ requester: req.userId }, { recipient: req.userId }],
  })
    .populate('requester', PUBLIC_FIELDS)
    .populate('recipient', PUBLIC_FIELDS);

  return res.json({
    connections: connections.map((c) => {
      const other =
        String(c.requester._id) === req.userId ? c.recipient : c.requester;
      return {
        id: c._id,
        status: c.status,
        connectedAt: c.updatedAt,
        user: {
          id: other._id,
          name: other.name,
          photo: other.photo,
          bio: other.bio,
          interests: other.interests,
        },
      };
    }),
  });
});

module.exports = router;
