'use client'

import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'

const sample = 'Pega tu guion aquí y pulsa Iniciar.\n\nGC Teleprompter mantiene tu lectura clara, fluida y bajo control.'

export default function Home() {
  const [script, setScript] = useState('')
  const [size, setSize] = useState(42)
  const [speed, setSpeed] = useState(3)
  const [playing, setPlaying] = useState(false)
  const [offset, setOffset] = useState(0)
  const frame = useRef<number | null>(null)
  const last = useRef<number | null>(null)
  const readerRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { return () => { if (frame.current) cancelAnimationFrame(frame.current) } }, [])
  useEffect(() => {
    if (!playing) { last.current = null; return }
    const tick = (time: number) => { const previous = last.current; if (previous !== null && readerRef.current) { readerRef.current.scrollTop += ((time - previous) / 1000) * speed * 18; setOffset(readerRef.current.scrollTop) } last.current = time; frame.current = requestAnimationFrame(tick) }
    frame.current = requestAnimationFrame(tick)
    return () => { if (frame.current) cancelAnimationFrame(frame.current) }
  }, [playing, speed])
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => { const target = event.target as HTMLElement; if (event.code === 'Space' && !['INPUT','TEXTAREA','BUTTON','SELECT'].includes(target.tagName)) { event.preventDefault(); setPlaying((value) => !value) } }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [])
  const loadFile = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { alert('El archivo debe pesar menos de 2 MB.'); return } const reader = new FileReader(); reader.onload = () => { readerRef.current && (readerRef.current.scrollTop = 0); setScript(String(reader.result ?? '')); setOffset(0); setPlaying(false) }; reader.readAsText(file) }
  const toggle = () => { if (!script.trim()) setScript(sample); setPlaying((value) => !value) }
  const reset = () => { setPlaying(false); if (readerRef.current) readerRef.current.scrollTop = 0; setOffset(0) }
  return <main className="min-h-screen px-4 py-5 sm:px-8 sm:py-8">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex items-center"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--yellow)] font-black text-black">UN</div><div><p className="m-0 text-sm font-bold tracking-[.18em]">UN STUDIOS</p><p className="m-0 text-xs uppercase tracking-[.22em] text-[var(--muted)]">App Suite</p></div></div></header>
      <section className="mb-7 grid gap-5 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="mb-3 text-xs font-bold uppercase tracking-[.25em] text-[var(--yellow)]">Listo para salir al aire</p><h1 className="mb-3 text-4xl font-black tracking-tight sm:text-6xl">Tu guion.<br /><span className="text-[var(--yellow)]">Tu ritmo.</span></h1><p className="max-w-md text-base leading-7 text-[var(--muted)]">Un teleprompter limpio y veloz para presentar con confianza desde iPhone, iPad o laptop.</p></div><div className="mobile-teleprompter-preview rounded-2xl border border-[var(--line)] bg-black p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between text-xs text-[var(--muted)]"><span>Vista rápida</span><button onClick={toggle} className="rounded-lg bg-[var(--yellow)] px-3 py-2 font-bold text-black">{playing ? 'Pausa' : 'Play'}</button></div><div className="relative h-40 overflow-hidden rounded-xl border border-[var(--line)]"><div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-[var(--yellow)]/40" /><div className="whitespace-pre-wrap px-4 pt-14 text-center font-semibold leading-[1.35]" style={{ fontSize: `${Math.min(size, 32)}px` }}>{script || 'Tu texto aparecerá aquí'}</div></div></div><div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-2xl"><div className="mb-4 flex items-center justify-between"><label htmlFor="script" className="text-sm font-semibold">Guion</label><button onClick={() => fileRef.current?.click()} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:border-[var(--yellow)] hover:text-[var(--yellow)]">Cargar .TXT</button><input ref={fileRef} type="file" accept=".txt,text/plain" onChange={loadFile} className="hidden" /></div><textarea id="script" value={script} onChange={(e) => { setScript(e.target.value); if (readerRef.current) readerRef.current.scrollTop = 0; setOffset(0) }} placeholder="Pega aquí el texto de tu presentación..." className="min-h-44 w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--black)] p-4 text-sm leading-6 text-[var(--white)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--yellow)]" /><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs text-[var(--muted)]">Tamaño <strong className="ml-2 text-[var(--white)]">{size}px</strong><input aria-label="Tamaño del texto" className="range mt-2 w-full" type="range" min="24" max="72" value={size} onChange={(e) => setSize(Number(e.target.value))} /></label><label className="text-xs text-[var(--muted)]">Velocidad <strong className="ml-2 text-[var(--white)]">{speed.toFixed(1)}x</strong><input aria-label="Velocidad del teleprompter" className="range mt-2 w-full" type="range" min="0.5" max="8" step="0.5" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /></label></div><div className="mt-4 flex flex-wrap gap-3"><button onClick={toggle} className="rounded-xl bg-[var(--yellow)] px-5 py-3 font-bold text-black hover:bg-[var(--yellow2)]">{playing ? '■ Detener' : '▶ Iniciar'}</button><button onClick={reset} className="rounded-xl border border-[var(--line)] px-5 py-3 text-sm font-semibold hover:border-[var(--yellow)]">Reiniciar</button><span className="self-center text-xs text-[var(--muted)]">Barra espaciadora: {playing ? 'detener' : 'iniciar'}</span></div></div></section>
      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]"><div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3 text-xs text-[var(--muted)]"><span className="flex items-center gap-2"><i className={`h-2 w-2 rounded-full ${playing ? 'bg-[var(--yellow)]' : 'bg-slate-500'}`} />{playing ? 'EN MARCHA' : 'EN PAUSA'}</span><span>{Math.round(offset)} px</span></div><div ref={readerRef} onScroll={(event) => setOffset(event.currentTarget.scrollTop)} className="reader-scroll relative h-[46vh] min-h-[330px] overflow-y-auto overflow-x-hidden bg-black sm:h-[52vh]"><div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-black to-transparent" /><div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-black to-transparent" /><div className="pointer-events-none absolute left-0 right-0 top-1/2 border-t border-dashed border-[var(--yellow)]/40" /><div className="whitespace-pre-wrap px-6 pb-24 pt-[45%] text-center font-semibold leading-[1.35]" style={{ fontSize: `${size}px` }}>{script || 'Tu texto aparecerá aquí'}</div></div></section>
      <footer className="mt-8 flex flex-col gap-2 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between"><span>Creador por <strong className="text-[var(--white)]">UN Studios App Suite</strong></span><a href="https://www.instagram.com/unstudiosve" target="_blank" rel="noreferrer" className="hover:text-[var(--yellow)]">Instagram @unstudiosve ↗</a></footer>
    </div>
  </main>
}
