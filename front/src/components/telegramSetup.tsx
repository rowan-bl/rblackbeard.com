import { useState, useEffect } from 'react';
import { TELEGRAM_USERNAME_KEY, TELEGRAM_BOT_NAME } from '../globals';
import { API_ENDPOINTS } from '../config/api';
import { TournamentsComponent } from './tournaments';
import Box from './ui/box';
import InputButton from './ui/inputButton';
import Button from './ui/button';

type BotStatus = 'unknown' | 'checking' | 'started' | 'not_started';

const RECHECK_COOLDOWN_KEY = 'itf_recheck_cooldown';
const RECHECK_COOLDOWN_MS = 1_000;

export function TelegramSetupComponent() {
  const [username, setUsername] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [botStatus, setBotStatus] = useState<BotStatus>('unknown');
  const [recheckCooldown, setRecheckCooldown] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(TELEGRAM_USERNAME_KEY);
    if (saved) {
      setUsername(saved);
    }
    const lastRecheck = localStorage.getItem(RECHECK_COOLDOWN_KEY);
    if (lastRecheck) {
      const remaining = Math.ceil((RECHECK_COOLDOWN_MS - (Date.now() - parseInt(lastRecheck))) / 1000);
      if (remaining > 0) setRecheckCooldown(remaining);
    }
  }, []);

  useEffect(() => {
    if (username) checkBotStatus(username);
  }, [username]);

  useEffect(() => {
    if (recheckCooldown <= 0) return;
    const timer = setInterval(() => {
      setRecheckCooldown(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [recheckCooldown]);

  const checkBotStatus = async (user: string) => {
    setBotStatus('checking');
    try {
      const response = await fetch(API_ENDPOINTS.userCheck(user));
      if (response.status === 429) return;
      const data = await response.json();
      setBotStatus(data.started ? 'started' : 'not_started');
    } catch {
      setBotStatus('not_started');
    }
  };

  const handleSaveUsername = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const formatted = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
    localStorage.setItem(TELEGRAM_USERNAME_KEY, formatted);
    setUsername(formatted);
  };

  const handleRecheck = () => {
    if (recheckCooldown > 0) return;
    localStorage.setItem(RECHECK_COOLDOWN_KEY, Date.now().toString());
    setRecheckCooldown(RECHECK_COOLDOWN_MS / 1000);
    checkBotStatus(username);
  };

  const handleChangeUsername = () => {
    localStorage.removeItem(TELEGRAM_USERNAME_KEY);
    setUsername('');
    setInputValue('');
    setBotStatus('unknown');
  };

  if (!username) {
    return (
      <div className="max-w-md mx-auto p-4 flex flex-col space-y-4">
        <div className="text-lg font-bold">ITF Tournaments</div>
        <Box>
          <p>Enter your Telegram username to get started</p>
          <InputButton
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSaveUsername}
            placeholder="@username"
            disabled={!inputValue.trim()}
            buttonLabel="Continue"
          />
        </Box>
      </div>
    );
  }

  if (botStatus === 'checking' || botStatus === 'unknown') {
    return (
      <div className="max-w-md mx-auto p-4 flex flex-col space-y-4">
        <div className="text-lg font-bold">ITF Tournaments</div>
        <div className="text-sm text-gray-400 py-3">Checking bot status...</div>
      </div>
    );
  }

  if (botStatus === 'not_started') {
    return (
      <div className="max-w-md mx-auto p-4 flex flex-col space-y-4">
        <div className="text-lg font-bold">ITF Tournaments</div>
        <Box className="space-y-3">
          <div className="text-sm text-(--rcolor-9) font-bold">Telegram bot not started</div>
          <div className="text-xs text-gray-400">
            To receive notifications, message {TELEGRAM_BOT_NAME} on Telegram and send:
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-(--rcolor-8) px-3 py-2 text-sm select-all flex-1 text-(--rcolor-12)">
              /start
            </div>
            <Button
              onClick={() => { navigator.clipboard.writeText('/start'); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleRecheck} disabled={recheckCooldown > 0}>
              {recheckCooldown > 0 ? `Recheck (${recheckCooldown}s)` : 'Recheck'}
            </Button>
            <Button onClick={handleChangeUsername}>
              Change username
            </Button>
          </div>
        </Box>
      </div>
    );
  }

  return <TournamentsComponent username={username} onChangeUsername={handleChangeUsername} />;
}
