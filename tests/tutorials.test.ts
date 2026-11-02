import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tutorials } from '../src/content/tutorials';
import { filterTutorials, parseTutorialRoute, youtubeEmbedUrl, youtubeVideoId } from '../src/utils/tutorials';

test('tutorial links support direct navigation, reload and malformed hashes without throwing', () => {
  assert.deepEqual(parseTutorialRoute('#/tutoriais'), { page: 'tutorials', guideId: null });
  assert.deepEqual(parseTutorialRoute('#/tutoriais/'), { page: 'tutorials', guideId: null });
  assert.deepEqual(parseTutorialRoute('#/tutoriais/conta-backups'), { page: 'tutorials', guideId: 'conta-backups' });
  assert.equal(parseTutorialRoute('#/tutoriais/%E0%A4%A').page, 'tutorials');
  assert.deepEqual(parseTutorialRoute(''), { page: 'dashboard' });
  assert.deepEqual(parseTutorialRoute('#'), { page: 'dashboard' });
  assert.deepEqual(parseTutorialRoute('#/outra-pagina'), { page: 'dashboard' });
});

test('search handles accents, extra spaces and combined terms while respecting the selected topic', () => {
  assert.ok(filterTutorials(tutorials, 'CARTAO', 'todos').some(g => g.id === 'cartoes-faturas'));
  assert.ok(filterTutorials(tutorials, '  CONTA   BACKUP ', 'dados').some(g => g.id === 'conta-backups'));
  assert.deepEqual(filterTutorials(tutorials, 'backup', 'planejamento'), []);
  assert.deepEqual(filterTutorials(tutorials, 'inexistente-xyz', 'todos'), []);
  assert.equal(filterTutorials(tutorials, '  ', 'todos').length, tutorials.length);
});

test('only HTTPS YouTube video links can become embeds, including sharing and Shorts links', () => {
  const id = 'AbCdEf12_-3';
  for (const url of [
    `https://www.youtube.com/watch?v=${id}&t=15s`, `https://youtu.be/${id}?si=share`,
    `https://youtube.com/shorts/${id}`, `https://m.youtube.com/watch?v=${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`, `https://www.youtube.com/live/${id}`,
  ]) assert.equal(youtubeVideoId(url), id);
  for (const url of [null, '', 'javascript:alert(1)', `http://youtube.com/watch?v=${id}`,
    `https://youtube.com.evil.example/watch?v=${id}`, `https://youtube.com@evil.example/watch?v=${id}`,
    `https://user:secret@www.youtube.com/watch?v=${id}`, `https://www.youtube.com:8443/watch?v=${id}`,
    'https://www.youtube.com/watch?v=<script>', `https://youtu.be/${id}/extra`, 'not-a-url']) assert.equal(youtubeVideoId(url), null);
});

test('embed URLs use the privacy-enhanced host without autoplay and cannot receive arbitrary URLs', () => {
  const url = new URL(youtubeEmbedUrl('AbCdEf12_-3'));
  assert.equal(url.origin, 'https://www.youtube-nocookie.com');
  assert.equal(url.searchParams.has('autoplay'), false);
  assert.equal(url.searchParams.get('playsinline'), '1');
  assert.throws(() => youtubeEmbedUrl('https://example.com'));
});
