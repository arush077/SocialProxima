import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, apiFetch, getToken } from '../api';

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Chat({ me, initialConversation }) {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(initialConversation || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const activeRef = useRef(active);
  const bottomRef = useRef(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  async function refreshConversations() {
    try {
      const data = await apiFetch('/api/chats');
      const list = data.conversations || [];
      setConversations(list);
      setActive((current) => current || list[0] || null);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch('/api/chats');
        if (cancelled) return;
        const list = data.conversations || [];
        setConversations(list);
        setActive((current) => current || list[0] || null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const socket = io(API_URL, { auth: { token: getToken() } });
    socket.on('message:new', (message) => {
      const current = activeRef.current;
      if (current && String(message.conversationId) === String(current.id)) {
        setMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, message]
        );
      }
      refreshConversations();
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const conversationId = active?.id;
    if (!conversationId) {
      return undefined;
    }
    let cancelled = false;
    apiFetch(`/api/chats/${conversationId}/messages`)
      .then((data) => {
        if (!cancelled) setMessages(data.messages || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [active?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(event) {
    event.preventDefault();
    const body = text.trim();
    if (!body || !active) return;
    setText('');
    setError('');
    try {
      const data = await apiFetch(`/api/chats/${active.id}/messages`, {
        method: 'POST',
        body: { text: body },
      });
      setMessages((prev) =>
        prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]
      );
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="chat">
      <aside className="conversations">
        <h2>Chats</h2>
        {conversations.length === 0 && (
          <p className="muted">No conversations yet. Connect with someone nearby.</p>
        )}
        <ul>
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <button
                className={
                  active?.id === conversation.id ? 'conversation active' : 'conversation'
                }
                onClick={() => setActive(conversation)}
              >
                <strong>{conversation.user.name}</strong>
                {conversation.lastMessage && (
                  <span className="preview">{conversation.lastMessage.text}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="window">
        {active ? (
          <>
            <header className="window-header">{active.user.name}</header>
            <div className="messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    String(message.sender) === String(me.id)
                      ? 'bubble mine'
                      : 'bubble theirs'
                  }
                >
                  <span>{message.text}</span>
                  <time>{formatTime(message.createdAt)}</time>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            {error && <p className="error">{error}</p>}
            <form className="composer" onSubmit={send}>
              <input
                placeholder="Type a message…"
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <button type="submit" className="primary" disabled={!text.trim()}>
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="empty">
            <p className="muted">Select a conversation.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Chat;
