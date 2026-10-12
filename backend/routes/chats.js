const router = require('express').Router();
const auth = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const PUBLIC_FIELDS = 'name photo bio interests';

async function loadConversation(id, userId) {
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return { error: 400, message: 'invalid conversation id' };
  }
  const conversation = await Conversation.findById(id);
  if (!conversation) {
    return { error: 404, message: 'conversation not found' };
  }
  const isParticipant = conversation.participants.some(
    (p) => String(p) === userId
  );
  if (!isParticipant) {
    return { error: 403, message: 'you are not a participant in this conversation' };
  }
  return { conversation };
}

function serializeMessage(message) {
  return {
    id: message._id,
    conversationId: message.conversation,
    sender: message.sender,
    text: message.text,
    createdAt: message.createdAt,
  };
}

// Conversation list for the current user.
router.get('/', auth, async (req, res) => {
  const conversations = await Conversation.find({ participants: req.userId })
    .sort({ updatedAt: -1 })
    .populate('participants', PUBLIC_FIELDS);

  const withLastMessage = await Promise.all(
    conversations.map(async (c) => {
      const last = await Message.findOne({ conversation: c._id }).sort({
        createdAt: -1,
      });
      const other =
        c.participants.find((p) => String(p._id) !== req.userId) ||
        c.participants[0];
      return {
        id: c._id,
        updatedAt: c.updatedAt,
        user: {
          id: other._id,
          name: other.name,
          photo: other.photo,
          bio: other.bio,
          interests: other.interests,
        },
        lastMessage: last ? serializeMessage(last) : null,
      };
    })
  );

  return res.json({ conversations: withLastMessage });
});

// Chat history.
router.get('/:id/messages', auth, async (req, res) => {
  const { conversation, error, message } = await loadConversation(
    req.params.id,
    req.userId
  );
  if (error) {
    return res.status(error).json({ error: message });
  }

  const messages = await Message.find({ conversation: conversation._id })
    .sort({ createdAt: 1 })
    .limit(500);

  return res.json({
    conversationId: conversation._id,
    messages: messages.map(serializeMessage),
  });
});

// Send a message (REST) and push it over Socket.IO.
router.post('/:id/messages', auth, async (req, res) => {
  const { conversation, error, message } = await loadConversation(
    req.params.id,
    req.userId
  );
  if (error) {
    return res.status(error).json({ error: message });
  }

  const text = String(req.body?.text || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'message text is required' });
  }
  if (text.length > 2000) {
    return res.status(400).json({ error: 'message text is too long' });
  }

  const created = await Message.create({
    conversation: conversation._id,
    sender: req.userId,
    text,
  });

  conversation.updatedAt = new Date();
  await conversation.save();

  const payload = serializeMessage(created);

  const io = req.app.get('io');
  if (io) {
    conversation.participants.forEach((participant) => {
      io.to(`user:${participant}`).emit('message:new', payload);
    });
  }

  return res.status(201).json({ message: payload });
});

module.exports = router;
