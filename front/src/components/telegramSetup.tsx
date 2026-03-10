import { useState, useEffect } from 'react';
import { TELEGRAM_USERNAME_KEY, TELEGRAM_BOT_NAME } from '../globals';

export function TelegramSetupComponent() {
  const [username, setUsername] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedUsername = localStorage.getItem(TELEGRAM_USERNAME_KEY);
    if (savedUsername) {
      setUsername(savedUsername);
      setSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (!username.trim()) {
      return;
    }

    const formattedUsername = username.startsWith('@') ? username : `@${username}`;
    localStorage.setItem(TELEGRAM_USERNAME_KEY, formattedUsername);
    setUsername(formattedUsername);
    setSaved(true);
  };

  const handleClear = () => {
    localStorage.removeItem(TELEGRAM_USERNAME_KEY);
    setUsername('');
    setSaved(false);
  };

  if (saved) {
    return (
      <div className="bg-(--rcolor-highlight) p-3 space-y-2">
        <div className="text-sm text-gray-300">Telegram Setup Complete</div>
        <div className="text-xs text-gray-400">Username: {username}</div>
        <button
          onClick={handleClear}
          className="bg-gray-700 text-white px-3 py-2 text-xs font-bold hover:bg-gray-600"
        >
          Change Username
        </button>
      </div>
    );
  }

  return (
    <div className="bg-(--rcolor-highlight) p-3 space-y-2">
      <div className="text-sm text-gray-300">Set up Telegram Notifications</div>
      <div className="text-xs text-gray-400 space-y-1">
        <div>1. Message {TELEGRAM_BOT_NAME} on Telegram</div>
        <div>2. Send /start to register</div>
        <div>3. Enter your username below:</div>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@username"
          className="flex-1 bg-(--rcolor-8) text-white px-3 py-2 focus:outline-none focus:ring-0"
        />
        <button
          onClick={handleSave}
          disabled={!username.trim()}
          className="bg-gray-700 text-white px-4 py-2 font-bold hover:bg-gray-600 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
