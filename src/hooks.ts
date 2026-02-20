import { useState, useEffect } from 'react';
import { User, Language } from './types';
import { supabase } from './lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id as any,
          name: session.user.user_metadata.full_name || 'Farmer',
          email: session.user.email || ''
        });
      }
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id as any,
          name: session.user.user_metadata.full_name || 'Farmer',
          email: session.user.email || ''
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return { user, logout, loading };
}

export function useLanguage() {
  const [language, setLanguage] = useState<Language>((localStorage.getItem('language') as Language) || 'en');

  const changeLanguage = (lang: Language) => {
    localStorage.setItem('language', lang);
    setLanguage(lang);
  };

  return { language, changeLanguage };
}
