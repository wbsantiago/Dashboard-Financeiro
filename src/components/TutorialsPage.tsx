import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChartNoAxesCombined, Check, ChevronRight, Clapperboard, Cloud, CreditCard, FileText, Play, Search, X } from 'lucide-react';
import { tutorials, tutorialTopics, tutorialFaqs, type Tutorial, type TutorialTopic } from '../content/tutorials';
import { filterTutorials, youtubeEmbedUrl, youtubeVideoId } from '../utils/tutorials';
import './TutorialsPage.css';

const topicIcons = { inicio: BookOpen, lancamentos: CreditCard, planejamento: ChartNoAxesCombined, dados: Cloud };

function TutorialVideo({ guide }: { guide: Tutorial }) {
  const [loaded, setLoaded] = useState(false);
  const id = youtubeVideoId(guide.videoUrl);
  return <section className="tutorial-video" aria-label={`Vídeo: ${guide.title}`}>
    {loaded && id ? <>
      <iframe src={youtubeEmbedUrl(id)} title={`Tutorial em vídeo: ${guide.title}`} loading="lazy"
        allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      <div className="tutorial-video-actions"><button type="button" onClick={() => setLoaded(false)}>Fechar vídeo</button><a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noreferrer">Abrir no YouTube</a></div>
    </> : <div className="tutorial-video-placeholder">
      <span className="tutorial-video-icon" aria-hidden="true">{id ? <Play size={28} /> : <Clapperboard size={28} />}</span>
      <h2>{id ? 'Assista ao passo a passo' : 'Este guia também vai ter vídeo'}</h2>
      <p>{id ? 'O player do YouTube será carregado quando você escolher assistir. Você também pode seguir o guia em texto abaixo.' : 'Estamos preparando o tutorial para o YouTube. Enquanto isso, você já pode seguir o passo a passo abaixo.'}</p>
      {id ? <button type="button" className="sereno-primary" onClick={() => setLoaded(true)}><Play size={16} />Carregar vídeo do YouTube</button> : <span className="tutorial-video-status">Vídeo em breve</span>}
    </div>}
  </section>;
}

export default function TutorialsPage({ guideId }: { guideId: string | null }) {
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState<TutorialTopic | 'todos'>('todos');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const originalTitle = useRef(document.title);
  const guide = tutorials.find(tutorial => tutorial.id === guideId);
  const visible = filterTutorials(tutorials, search, topic);
  useEffect(() => {
    document.title = `${guide ? guide.title : 'Tutoriais'} | Finanças10`;
    window.scrollTo({ top: 0, behavior: 'instant' });
    titleRef.current?.focus({ preventScroll: true });
  }, [guideId]);
  useEffect(() => () => { document.title = originalTitle.current; }, []);

  return <main className="tutorials-page" id="tutorials-page">
    <nav className="tutorial-breadcrumb" aria-label="Navegação dos tutoriais">
      <a href="#"><ArrowLeft size={15} />Voltar ao painel</a>
      {guideId && <><ChevronRight size={14} aria-hidden="true" /><a href="#/tutoriais">Todos os tutoriais</a></>}
    </nav>
    {guideId ? guide ? <>
      <div className="tutorial-reader-heading"><p>{tutorialTopics.find(t => t.id === guide.topic)?.label}</p><h1 ref={titleRef} tabIndex={-1}>{guide.title}</h1><p>{guide.description}</p></div>
      <div className="tutorial-reader-layout">
        <article className="tutorial-article">
          <div key={guide.id}><TutorialVideo guide={guide} /></div>
          {guide.sections.map(section => <section className="tutorial-section" key={section.id} id={`guide-${section.id}`} aria-labelledby={`title-${section.id}`}>
            <h2 id={`title-${section.id}`}>{section.title}</h2>
            {section.text && <p>{section.text}</p>}
            <ol>{section.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
            {section.note && <p className="tutorial-note">{section.note}</p>}
          </section>)}
          <div className="tutorial-finish"><span aria-hidden="true"><Check size={20} /></span><div><h2>Pronto para colocar em prática?</h2><p>Volte ao painel e siga os passos no seu próprio planejamento.</p></div><a href="#" className="sereno-secondary">Ir para o painel<ArrowRight size={16} /></a></div>
        </article>
        <aside className="tutorial-reader-aside" aria-label="Conteúdo e outros guias">
          <nav aria-label="Neste guia"><h2>Neste guia</h2><ol>{guide.sections.map((section, index) => <li key={section.id}><button type="button" onClick={() => {
            const target = document.getElementById(`title-${section.id}`);
            target?.setAttribute('tabindex', '-1'); target?.focus({ preventScroll: true });
            target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
          }}><span>{index + 1}</span>{section.title}</button></li>)}</ol></nav>
          <div className="tutorial-related"><h2>Continue aprendendo</h2>{tutorials.filter(t => t.id !== guide.id).sort((a, b) => Number(b.topic === guide.topic) - Number(a.topic === guide.topic)).slice(0, 3).map(t => <a key={t.id} href={`#/tutoriais/${t.id}`}>{t.title}<ChevronRight size={16} /></a>)}</div>
        </aside>
      </div>
    </> : <section className="tutorial-not-found"><BookOpen size={32} /><h1 ref={titleRef} tabIndex={-1}>Guia não encontrado</h1><p>Escolha um assunto na central para continuar.</p><a className="sereno-primary" href="#/tutoriais">Ver todos os tutoriais</a></section> : <>
      <div className="tutorials-heading"><div><h1 ref={titleRef} tabIndex={-1}>Tutoriais</h1><p>Aprenda a organizar seu planejamento, um passo de cada vez.</p></div><span className="tutorials-format"><FileText size={16} />Guias para consultar no seu ritmo</span></div>
      <section className="tutorial-start" aria-labelledby="tutorial-start-title">
        <div className="tutorial-start-intro"><span className="tutorial-start-icon" aria-hidden="true"><BookOpen size={26} /></span><h2 id="tutorial-start-title">Seu primeiro mês<br />mais organizado.</h2><p>Comece pelo essencial. Em um só guia, você prepara o mês e entende como acompanhar seus registros.</p><a href="#/tutoriais/primeiros-passos" className="sereno-primary">Começar pelo básico<ArrowRight size={16} /></a></div>
        <ol className="tutorial-start-steps">
          <li><span>1</span><div><h3>Prepare seu planejamento</h3><p>Escolha o mês, a renda prevista e sua meta para guardar.</p></div></li>
          <li><span>2</span><div><h3>Faça o primeiro lançamento</h3><p>Registre uma entrada ou despesa e escolha a categoria.</p></div></li>
          <li><span>3</span><div><h3>Acompanhe e salve uma cópia</h3><p>Confira o resumo do mês e aprenda a exportar seu backup.</p></div></li>
        </ol>
      </section>
      <section className="tutorial-library" aria-labelledby="tutorial-library-title">
        <div className="tutorial-library-heading"><h2 id="tutorial-library-title">O que você quer aprender?</h2><label className="tutorial-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label="Buscar tutoriais" placeholder="Busque por cartão, backup, parcelas…" value={search} onChange={event => setSearch(event.target.value)} />{search && <button type="button" aria-label="Limpar busca" onClick={() => setSearch('')}><X size={16} /></button>}</label></div>
        <div className="tutorial-topic-filters" role="group" aria-label="Filtrar tutoriais por assunto">
          {[{ id: 'todos', label: 'Todos' }, ...tutorialTopics].map(item => <button type="button" key={item.id} aria-pressed={topic === item.id} onClick={() => setTopic(item.id as typeof topic)}>{item.label}</button>)}
        </div>
        <p className="tutorial-search-count" role="status" aria-live="polite">{visible.length} {visible.length === 1 ? 'guia disponível' : 'guias disponíveis'}{search ? ` para “${search}”` : ''}</p>
        <div className="tutorial-grid">{visible.map(tutorial => {
          const Icon = topicIcons[tutorial.topic];
          return <a className="tutorial-card" key={tutorial.id} href={`#/tutoriais/${tutorial.id}`}>
            <span className="tutorial-topic-icon" aria-hidden="true"><Icon size={21} /></span><div><p className="tutorial-card-topic">{tutorialTopics.find(t => t.id === tutorial.topic)?.label}</p><h3>{tutorial.title}</h3><p>{tutorial.description}</p><span className="tutorial-card-format"><FileText size={13} />Guia em texto<span aria-hidden="true">·</span>{youtubeVideoId(tutorial.videoUrl) ? 'Vídeo disponível' : 'Vídeo em breve'}</span></div><ChevronRight className="tutorial-card-arrow" size={18} aria-hidden="true" />
          </a>;
        })}</div>
        {!visible.length && <div className="tutorial-empty"><Search size={26} aria-hidden="true" /><h3>Nenhum guia encontrado</h3><p>Tente outro termo ou veja todos os assuntos.</p><button type="button" className="sereno-secondary" onClick={() => { setSearch(''); setTopic('todos'); }}>Mostrar todos os guias</button></div>}
      </section>
      <section className="tutorial-faq" aria-labelledby="tutorial-faq-title"><div><h2 id="tutorial-faq-title">Dúvidas que aparecem no começo</h2><p>Respostas rápidas para seguir com o planejamento.</p></div><div>{tutorialFaqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>
    </>}
  </main>;
}
