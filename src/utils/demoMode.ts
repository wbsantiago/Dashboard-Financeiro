// Shared by the UI and Firebase bootstrap so examples never connect to a real account.
export const demoMode = import.meta.env.DEV
  && new URLSearchParams(window.location.search).get('demo') === '2026';
