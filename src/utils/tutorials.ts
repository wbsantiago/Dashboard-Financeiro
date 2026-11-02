import type { Tutorial, TutorialTopic } from '../content/tutorials';

export type TutorialRoute = { page: 'dashboard' } | { page: 'tutorials'; guideId: string | null };
export function parseTutorialRoute(hash: string): TutorialRoute {
  if (hash === '#/tutoriais' || hash === '#/tutoriais/') return { page: 'tutorials', guideId: null };
  if (!hash.startsWith('#/tutoriais/')) return { page: 'dashboard' };
  try { return { page: 'tutorials', guideId: decodeURIComponent(hash.slice('#/tutoriais/'.length)) }; }
  catch { return { page: 'tutorials', guideId: 'guia-invalido' }; }
}

function normalize(text: string) { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR'); }
export function filterTutorials(guides: Tutorial[], search: string, topic: TutorialTopic | 'todos') {
  const terms = normalize(search).trim().split(/\s+/).filter(Boolean);
  return guides.filter(guide => {
    if (topic !== 'todos' && guide.topic !== topic) return false;
    const text = normalize([guide.title, guide.description, ...guide.keywords].join(' '));
    return terms.every(term => text.includes(term));
  });
}

// Convert only supported YouTube URLs into a validated video ID, never arbitrary iframe URLs.
export function youtubeVideoId(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    let id: string | null = null;
    if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else if (/^\/(embed|shorts|live)\/[^/]+\/?$/.test(url.pathname)) id = url.pathname.split('/')[2];
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function youtubeEmbedUrl(videoId: string): string {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) throw new Error('Identificador de vídeo inválido');
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`;
}
