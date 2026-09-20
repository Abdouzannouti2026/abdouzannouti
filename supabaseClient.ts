
import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xyictkllviwkssaljufv.supabase.co';
// Strip trailing /rest/v1 or slashes to ensure standard Supabase client URL format
const SUPABASE_URL = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5aWN0a2xsdml3a3NzYWxqdWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDg1NjMsImV4cCI6MjEwNTQ4NDU2M30.WTQ0i_ZBm79zwWfpsSYp8ewLm4BJhw_voTV3uRSGoa4';

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.log('Supabase falling back to default URL');
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

if (typeof window !== 'undefined') {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase.auth') || key.includes('sb-'))) {
        const val = localStorage.getItem(key);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (
              !parsed ||
              !parsed.refresh_token ||
              parsed.refresh_token === '' || 
              parsed.refresh_token === null || 
              (parsed.currentSession && !parsed.currentSession.refresh_token) ||
              (parsed.error && (String(parsed.error).includes('Refresh Token') || String(parsed.error).includes('not_found')))
            ) {
              localStorage.removeItem(key);
            }
          } catch (e) {
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (e) {
    console.error("Error inspecting localStorage for auth tokens:", e);
  }

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason || '';
    const reasonStr = typeof reason === 'string' ? reason : JSON.stringify(reason);
    if (
      reasonStr.includes('Refresh Token') ||
      reasonStr.includes('refresh_token_not_found') ||
      reasonStr.includes('Invalid Refresh Token') ||
      reasonStr.includes('invalid_grant') ||
      reasonStr.includes('Auth session missing')
    ) {
      console.warn('Caught unhandled rejection for Invalid Refresh Token, clearing stale session tokens.');
      event.preventDefault();
      if (event.stopImmediatePropagation) {
        event.stopImmediatePropagation();
      }
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase.auth') || key.includes('sb-') || key.includes('token'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.error("Error clearing auth storage keys:", e);
      }
    }
  });
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: (() => {
      try {
        return window.localStorage;
      } catch (e) {
        return undefined;
      }
    })()
  }
});

// Guard auth methods to prevent unhandled rejections from invalid refresh tokens
if (typeof window !== 'undefined' && supabase?.auth) {
  const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
  supabase.auth.getSession = async () => {
    try {
      const res = await originalGetSession();
      if (res.error) {
        const errMsg = (res.error.message || '').toLowerCase();
        if (
          errMsg.includes('refresh token') ||
          errMsg.includes('invalid') ||
          errMsg.includes('auth session') ||
          errMsg.includes('not found') ||
          errMsg.includes('jwt') ||
          errMsg.includes('invalid_grant')
        ) {
          console.warn("Handled getSession auth error gracefully:", res.error.message);
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          return { data: { session: null }, error: null };
        }
      }
      return res;
    } catch (err: any) {
      console.warn("Handled getSession exception gracefully:", err);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      return { data: { session: null }, error: null };
    }
  };

  const originalRefreshSession = supabase.auth.refreshSession.bind(supabase.auth);
  supabase.auth.refreshSession = async (currentSession?: any) => {
    try {
      const res = await originalRefreshSession(currentSession);
      if (res.error) {
        const errMsg = (res.error.message || '').toLowerCase();
        if (
          errMsg.includes('refresh token') ||
          errMsg.includes('invalid') ||
          errMsg.includes('not found') ||
          errMsg.includes('jwt') ||
          errMsg.includes('invalid_grant')
        ) {
          console.warn("Handled refreshSession auth error gracefully:", res.error.message);
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          return { data: { session: null, user: null }, error: null };
        }
      }
      return res;
    } catch (err: any) {
      console.warn("Handled refreshSession exception gracefully:", err);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      return { data: { session: null, user: null }, error: null };
    }
  };

  const originalSignOut = supabase.auth.signOut.bind(supabase.auth);
  supabase.auth.signOut = async (options?: { scope?: 'global' | 'local' | 'others' }) => {
    try {
      return await originalSignOut({ scope: options?.scope || 'local' });
    } catch (err) {
      console.warn("SignOut error handled locally:", err);
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase.auth') || key.includes('sb-') || key.includes('token'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (_) {}
      return { error: null };
    }
  };
}
