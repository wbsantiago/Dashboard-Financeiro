import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, X } from 'lucide-react';
import { dashboardTourSteps, readTourChoice, saveTourChoice, tourStorageKey, type TourChoice } from '../utils/onboarding';
import './DashboardTour.css';

interface Props { userId: string | null; ready: boolean; demoMode: boolean; replayRequest: number; }

function TourWelcome({ onStart, onDismiss }: { onStart: () => void; onDismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    heading.current?.focus({ preventScroll: true });
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous !== document.body && previous.isConnected) previous.focus({ preventScroll: true });
      else document.getElementById('dashboard-title')?.focus({ preventScroll: true });
    };
  }, []);

  return <dialog ref={dialog} className="tour-welcome" aria-labelledby="tour-welcome-title" aria-describedby="tour-welcome-description"
    onCancel={event => { event.preventDefault(); onDismiss(); }}>
    <span className="tour-welcome-icon" aria-hidden="true"><BookOpen size={26} /></span>
    <h2 id="tour-welcome-title" ref={heading} tabIndex={-1}>Conheça seu painel</h2>
    <p id="tour-welcome-description">Veja onde escolher o mês, registrar entradas e despesas e acompanhar seus gastos em um passeio rápido.</p>
    <div className="tour-welcome-actions"><button type="button" className="sereno-primary" onClick={onStart}>Fazer passeio rápido<ArrowRight size={15} /></button><button type="button" className="tour-later" onClick={onDismiss}>Agora não</button></div>
  </dialog>;
}

function TourDialog({ step, onStep, onFinish }: { step: number; onStep: (step: number) => void; onFinish: (choice: TourChoice) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [geometry, setGeometry] = useState<{ x: number; y: number; width: number; height: number; cardX: number; cardY: number; cardMaxHeight: number } | null>(null);
  const current = dashboardTourSteps[step];
  const last = step === dashboardTourSteps.length - 1;

  useLayoutEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close(); document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous !== document.body && previous.isConnected) previous.focus({ preventScroll: true });
      else document.getElementById('dashboard-title')?.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    let frame = 0;
    const target = document.getElementById(current.target);
    if (!target) return;
    const positionTarget = () => {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      window.scrollBy({ top: -20, behavior: 'instant' });
    };
    positionTarget();
    heading.current?.focus({ preventScroll: true });
    const measure = () => {
      const rect = target.getBoundingClientRect();
      const width = Math.min(rect.width + 12, innerWidth - 12);
      const x = Math.max(6, Math.min(rect.left - 6, innerWidth - width - 6));
      const y = Math.max(6, rect.top - 6);
      const height = Math.min(rect.height + 12, innerHeight - y - 6);
      const cardWidth = card.current?.getBoundingClientRect().width || Math.min(360, innerWidth - 24);
      const cardHeight = Math.min((card.current?.scrollHeight || 278) + 2, innerHeight - 24);
      const below = y + height + 18;
      const above = y - cardHeight - 18;
      const cardY = below + cardHeight <= innerHeight - 12 ? below : above >= 12 ? above : Math.min(below, Math.max(12, innerHeight - 132));
      setGeometry({ x, y, width, height, cardX: Math.max(12, Math.min(x, innerWidth - cardWidth - 12)), cardY, cardMaxHeight: innerHeight - cardY - 12 });
    };
    const update = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const resize = () => { positionTarget(); update(); };
    measure();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', update, true);
    const observer = new ResizeObserver(update);
    observer.observe(target); if (card.current) observer.observe(card.current);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', resize); window.removeEventListener('scroll', update, true); };
  }, [step]);

  return <dialog ref={dialog} className="dashboard-tour" aria-labelledby="tour-title" aria-describedby="tour-description"
    onCancel={event => { event.preventDefault(); onFinish('dismissed'); }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = [...(card.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') || [])];
      const first = controls[0], lastControl = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) { event.preventDefault(); lastControl?.focus(); }
      else if (!event.shiftKey && document.activeElement === lastControl) { event.preventDefault(); first?.focus(); }
    }}>
    {geometry && <div className="tour-spotlight" aria-hidden="true" style={{ left: geometry.x, top: geometry.y, width: geometry.width, height: Math.max(0, geometry.height) }} />}
    <div ref={card} className="tour-card" style={geometry ? { left: geometry.cardX, top: geometry.cardY, maxHeight: geometry.cardMaxHeight } : { left: 12, top: 12 }}>
      <div className="tour-card-top"><p>Conheça seu painel <span>{step + 1} de {dashboardTourSteps.length}</span></p><button type="button" aria-label="Fechar passeio" onClick={() => onFinish('dismissed')}><X size={18} /></button></div>
      <h2 id="tour-title" ref={heading} tabIndex={-1}>{current.title}</h2>
      <p id="tour-description">{current.description}</p>
      <div className="tour-card-actions"><button type="button" className="sereno-secondary" disabled={step === 0} onClick={() => onStep(step - 1)}><ArrowLeft size={15} />Anterior</button><button type="button" className="sereno-primary" onClick={() => last ? onFinish('completed') : onStep(step + 1)}>{last ? 'Concluir' : 'Próximo'}{last ? <Check size={16} /> : <ArrowRight size={16} />}</button></div>
      {last && <a className="tour-more" href="#/tutoriais" onClick={() => onFinish('completed')}>Explorar todos os tutoriais</a>}
    </div>
  </dialog>;
}

export function DashboardTour({ userId, ready, demoMode, replayRequest }: Props) {
  const key = tourStorageKey(userId);
  const session = useRef(new Map<string, TourChoice>());
  const [choice, setChoice] = useState<{ key: string; value: TourChoice | null }>(() => ({ key, value: readTourChoice(key, demoMode ? null : undefined) }));
  const [step, setStep] = useState<number | null>(null);
  const consumedReplay = useRef(0);
  useEffect(() => {
    setStep(null);
    setChoice({ key, value: session.current.get(key) ?? readTourChoice(key, demoMode ? null : undefined) });
    const changed = (event: StorageEvent) => {
      if (event.key === key || event.key === null) setChoice({ key, value: readTourChoice(key, demoMode ? null : undefined) });
    };
    if (!demoMode) window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [key, demoMode]);
  useEffect(() => {
    if (!ready) { setStep(null); return; }
    if (replayRequest && replayRequest !== consumedReplay.current) { consumedReplay.current = replayRequest; setStep(0); }
  }, [ready, replayRequest]);
  function finish(value: TourChoice) {
    session.current.set(key, value); setChoice({ key, value }); setStep(null);
    if (!demoMode) saveTourChoice(key, value);
  }
  if (!ready || choice.key !== key) return null;
  return <>
    {step === null && !choice.value && <TourWelcome onStart={() => setStep(0)} onDismiss={() => finish('dismissed')} />}
    {step !== null && <TourDialog step={step} onStep={setStep} onFinish={finish} />}
  </>;
}
