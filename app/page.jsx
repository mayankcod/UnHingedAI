'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();

  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [guestMode, setGuestMode] = useState(false);

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isLoading]);

  const fetchChatList = useCallback(async () => {
    if (!session) return;
    setLoadingChats(true);
    try {
      const res = await fetch('/api/history');
      if (!res.ok) throw new Error('Could not load your saved chats.');
      const data = await res.json();
      if (Array.isArray(data)) setChatList(data);
    } catch (error) {
      setHistoryError(error.message);
    } finally {
      setLoadingChats(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) fetchChatList();
  }, [session, fetchChatList]);

  const loadChat = async (chatId) => {
    if (isLoading || chatId === currentChatId) return;
    setHistoryError('');
    try {
      const res = await fetch('/api/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chatId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not open that chat.');
      setHistory(data.messages || []);
      setCurrentChatId(chatId);
    } catch (error) {
      setHistoryError(error.message);
    }
  };

  const deleteChat = async (event, chatId) => {
    event.stopPropagation();
    if (!window.confirm('Delete this catastrophe forever?')) return;
    setHistoryError('');
    try {
      const res = await fetch('/api/history', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: chatId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not delete that chat.');
      setChatList((chats) => chats.filter((chat) => chat.id !== chatId));
      if (currentChatId === chatId) startNewChat();
    } catch (error) {
      setHistoryError(error.message);
    }
  };

  const startNewChat = () => {
    setHistory([]);
    setCurrentChatId(null);
    textareaRef.current?.focus();
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 130)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newHistory = [...history, { role: 'user', content: trimmed }];
    setHistory(newHistory);
    setInput('');
    setIsLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    let savedChatId = currentChatId;

    try {
      if (session) {
        const title = trimmed.slice(0, 60);
        const saveResponse = await fetch('/api/history', {
          method: savedChatId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savedChatId ? { id: savedChatId, messages: newHistory } : { title, messages: newHistory }),
        });
        const savedChat = await saveResponse.json();
        if (!saveResponse.ok) throw new Error(savedChat.error || 'Could not save this chat.');
        savedChatId = savedChat.id;
        setCurrentChatId(savedChatId);
        await fetchChatList();
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const finalHistory = [...newHistory, { role: 'assistant', content: data.message }];
      setHistory(finalHistory);

      if (session) {
        const saveResponse = await fetch('/api/history', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: savedChatId, messages: finalHistory }),
        });
        if (!saveResponse.ok) throw new Error('The reply arrived, but could not be saved.');
        await fetchChatList();
      }
    } catch (error) {
      const erroredHistory = [
        ...newHistory,
        { role: 'assistant', content: `Tiny chaos event: ${error.message || 'something went sideways.'}` },
      ];
      setHistory(erroredHistory);
      if (session && savedChatId) {
        fetch('/api/history', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: savedChatId, messages: erroredHistory }) }).then(fetchChatList);
      }
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  // ─── Login Screen ────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <main className="login-screen">
        <div className="login-card">
          <div className="mascot">
            <div className="eye left"></div>
            <div className="eye right"></div>
            <div className="mouth">⌣</div>
            <span>✦</span>
          </div>
          <p className="eyebrow">LOADING CHAOS…</p>
        </div>
      </main>
    );
  }

  if (status === 'unauthenticated' && !guestMode) {
    return (
      <main className="login-screen">
        <div className="login-card">
          <div className="mascot">
            <div className="eye left"></div>
            <div className="eye right"></div>
            <div className="mouth">⌣</div>
            <span>✦</span>
          </div>
          <p className="eyebrow">UNSUPERVISED INTELLIGENCE</p>
          <h1 className="login-title">
            Hi, I'm Unhinged.<br />
            <em>Who are you?</em>
          </h1>
          <p className="intro">Sign in to unlock your full chaos potential — and keep your chat history.</p>
          <button className="google-btn" onClick={() => signIn('google')}>
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
          <button className="guest-btn" onClick={() => setGuestMode(true)}>
            Skip login for now →
          </button>
          <p className="guest-note">Guest chats work normally, but they are not saved.</p>
        </div>
      </main>
    );
  }

  // ─── Main Chat UI ─────────────────────────────────────────────────────────────
  return (
    <main className="shell">
      <aside className="side">
        <a className="brand" href="/">
          <span className="spark">𖦹</span>
          <span>unhinged<br /><i>ai</i></span>
        </a>

        <button className="new-chat" onClick={startNewChat}>
          <span>＋</span> New catastrophe
        </button>

        {/* Chat History */}
        <div className="chat-history">
          <p className="history-label">Recent chats</p>
          {loadingChats ? (
            <p className="history-empty">Loading…</p>
          ) : chatList.length === 0 ? (
            <p className="history-empty">{guestMode ? 'Sign in to save your chats.' : 'No chats yet. Start one!'}</p>
          ) : (
            <ul className="history-list">
              {chatList.map((chat) => (
                <li key={chat.id}>
                  <button
                    className={`history-item ${chat.id === currentChatId ? 'active' : ''}`}
                    onClick={() => loadChat(chat.id)} disabled={isLoading}
                    title={chat.title}
                  >
                    <span className="history-icon">💬</span>
                    <span className="history-title">{chat.title}</span>
                  </button>
                  <button className="delete-chat" onClick={(event) => deleteChat(event, chat.id)} disabled={isLoading} aria-label={`Delete ${chat.title}`} title="Delete chat">×</button>
                </li>
              ))}
            </ul>
          )}
          {historyError && <p className="history-error">{historyError}</p>}
        </div>

        <div className="side-bottom">


          {/* User info + Logout */}
          <div className="user-info">
            {session?.user?.image && (
              <img src={session.user.image} alt={session.user.name} className="user-avatar" referrerPolicy="no-referrer" />
            )}
            <div className="user-details">
              <span className="user-name">{session?.user?.name || 'Guest mode'}</span>
              {session ? (
                <button className="logout-btn" onClick={() => signOut()}>Sign out</button>
              ) : (
                <button className="logout-btn" onClick={() => setGuestMode(false)}>Sign in to save chats</button>
              )}
            </div>
          </div>
        </div>

        <footer>be kind. be weird. <span>✷</span></footer>
      </aside>

      <section className="chat-area">
        <header>
          <div className="status"><span></span> existentially online</div>
          <button className="clear" onClick={startNewChat}>Clear chat</button>
        </header>

        <div className="messages" id="messages">
          {history.length === 0 ? (
            <article className="welcome">
              <div className="mascot">
                <div className="eye left"></div>
                <div className="eye right"></div>
                <div className="mouth">⌣</div>
                <span>𖦹</span>
              </div>
              <p className="eyebrow">UNSUPERVISED INTELLIGENCE</p>
              <h1>Hi, I'm Unhinged.<br /><em>What's the vibe?</em></h1>
              <p className="intro">I have answers, anecdotes, and an emotionally unnecessary amount of glitter. Ask me anything.</p>
              <div className="suggestions">
                <button onClick={() => sendMessage("Explain black holes like I'm a golden retriever")}>🐕 Explain black holes like I'm a dog</button>
                <button onClick={() => sendMessage("Give me a wildly dramatic pep talk for today")}>🎭 Give me a dramatic pep talk</button>
                <button onClick={() => sendMessage("Help me plan the most delightful lazy Sunday")}>☁️ Plan my lazy Sunday</button>

              </div>
            </article>
          ) : (
            <>
              {history.map((msg, idx) => (
                <article key={idx} className={`message ${msg.role === 'user' ? 'user' : 'bot'}`}>
                  <div className="label">
                    {msg.role === 'user'
                      ? (session?.user?.image
                        ? <img src={session.user.image} alt="U" className="label-avatar" referrerPolicy="no-referrer" />
                        : 'U')
                      : '𖦹'}
                  </div>
                  <div className="bubble">{msg.content}</div>
                </article>
              ))}
              {isLoading && (
                <article className="message bot">
                  <div className="label">𖦹</div>
                  <div className="bubble typing">...</div>
                </article>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <form className="composer" onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}>
          <textarea
            ref={textareaRef}
            id="prompt"
            rows="1"
            placeholder="Say something unreasonably interesting..."
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button className="send" aria-label="Send message" type="submit" disabled={isLoading}>↑</button>
          <span className="hint">Enter to send · Shift + Enter for new line</span>
        </form>
      </section>
    </main>
  );
}
