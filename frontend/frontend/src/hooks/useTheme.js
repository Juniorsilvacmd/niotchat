import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      // Verificar se o elemento html tem a classe 'dark' (sistema NioChat)
      const htmlElement = document.documentElement;
      const hasDarkClass = htmlElement.classList.contains('dark');
      
      // Verificar preferência do sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Verificar localStorage do NioChat
      const storedTheme = localStorage.getItem('theme');
      const isStoredDark = storedTheme === 'dark';
      
      setIsDarkTheme(hasDarkClass || isStoredDark || prefersDark);
    };

    checkTheme();
    
    // Observar mudanças na classe 'dark' do html
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    // Observar mudanças na preferência do sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);
    
    // Observar mudanças no localStorage
    const handleStorageChange = () => checkTheme();
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return isDarkTheme;
}; 