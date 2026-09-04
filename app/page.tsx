'use client'

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

const sample = 'Pega tu guion aquí y pulsa Iniciar.\n\nGC Teleprompter mantiene tu lectura clara, fluida y bajo control.'
const MIN_SPEED = 0.5
const MAX_SPEED = 8

export default function Home() {
  const [script, setScript] = useState('')
  const [size, setSize] = useState(42)
  const [speed, setSpeed] = useState(3)
  const [playing, setPlaying] = useState(false)
  const [offset, setOffset] = useState(0)
  const [maxOffset, setMaxOffset] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const last = useRef<number | null>(null)
  const playbackPosition = useRef(0)
  const indicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readerRef = useRef<HTMLDivElement>(null)
  const markerRefs = useRef<Array<HTMLParagraphElement | null>>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null)
  const pointerMoved = useRef(false)
  const pointerWasPlaying = useRef(false)
  const pointerOnScrollbar = useRef(false)
  const debugFrames = useRef(0)
  const debugLastEvent = useRef('none')
  const debugLastFrameTime = useRef(0)
  const [debugEnabled, setDebugEnabled] = useState(false)
  const [debugInfo, setDebugInfo] = useState({ frames: 0, lastEvent: 'none', lastFrameTime: 0, top: 0, scrollHeight: 0, clientHeight: 0, maxScroll: 0, currentPlaying: false })

  const toggle = useCallback(() => {
    debugLastEvent.current = playing ? 'toggle-pause' : 'toggle-start'
    if (playing) {
      setPlaying(false)
      return
    }

    if (!script.trim()) setScript(sample)
    setPlaying(false)
    window.setTimeout(() => {
      const reader = readerRef.current
      if (!reader) return
      const maximum = Math.max(0, reader.scrollHeight - reader.clientHeight)
      setMaxOffset(maximum)
      setOffset(reader.scrollTop)
      playbackPosition.current = reader.scrollTop
      last.current = null
      setPlaying(maximum > 0)
    }, 32)
  }, [playing, script])

  const sections = useMemo(() => {
    const blocks = script.trim().split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)
    return blocks.length ? blocks : [script.trim()]
  }, [script])

  const syncPosition = (value: number) => {
    const reader = readerRef.current
    if (!reader) return
    const next = Math.max(0, Math.min(value, Math.max(0, reader.scrollHeight - reader.clientHeight)))
    reader.scrollTop = next
    playbackPosition.current = next
    setOffset(next)
  }

  const scheduleIndicator = () => {
    debugLastEvent.current = 'scroll'
    if (indicatorTimer.current) return
    indicatorTimer.current = setTimeout(() => {
      indicatorTimer.current = null
      if (readerRef.current) {
        setOffset(readerRef.current.scrollTop)
        if (!playing) playbackPosition.current = readerRef.current.scrollTop
        setMaxOffset(Math.max(0, readerRef.current.scrollHeight - readerRef.current.clientHeight))
      }
    }, 80)
  }

  useEffect(() => {
    setDebugEnabled(new URLSearchParams(window.location.search).get('debug') === '1')
  }, [])

  useEffect(() => {
    if (!debugEnabled) return
    const timer = window.setInterval(() => {
      const reader = readerRef.current
      setDebugInfo({
        frames: debugFrames.current,
        lastEvent: debugLastEvent.current,
        lastFrameTime: debugLastFrameTime.current,
        top: reader?.scrollTop ?? 0,
        scrollHeight: reader?.scrollHeight ?? 0,
        clientHeight: reader?.clientHeight ?? 0,
        maxScroll: reader ? Math.max(0, reader.scrollHeight - reader.clientHeight) : 0,
        currentPlaying: playing,
      })
    }, 250)
    return () => window.clearInterval(timer)
  }, [debugEnabled, playing])

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current)
      if (indicatorTimer.current) clearTimeout(indicatorTimer.current)
    }
  }, [])

  useEffect(() => {
    const reader = readerRef.current
    if (reader) {
      reader.scrollTop = 0
      playbackPosition.current = 0
      setOffset(0)
      setMaxOffset(Math.max(0, reader.scrollHeight - reader.clientHeight))
    }
  }, [script, size])

  useEffect(() => {
    const reader = readerRef.current
    if (!reader || typeof ResizeObserver === 'undefined') return
    const resizeObserver = new ResizeObserver(() => {
      setMaxOffset(Math.max(0, reader.scrollHeight - reader.clientHeight))
      setOffset(reader.scrollTop)
    })
    resizeObserver.observe(reader)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    if (!playing) {
      last.current = null
      if (timer.current) clearInterval(timer.current)
      timer.current = null
      return
    }

    const tick = (time: number) => {
      debugFrames.current += 1
      debugLastFrameTime.current = time
      const reader = readerRef.current
      const previous = last.current
      if (!reader) {
        setPlaying(false)
        return
      }
      if (previous !== null) {
        const maximum = Math.max(0, reader.scrollHeight - reader.clientHeight)
        if (maximum === 0) {
          setOffset(0)
          setPlaying(false)
          return
        }
        const next = Math.min(maximum, playbackPosition.current + ((time - previous) / 1000) * speed * 18)
        playbackPosition.current = next
        reader.scrollTop = next
        if (next >= maximum - 1) {
          setOffset(maximum)
          setPlaying(false)
          return
        }
      }
      last.current = time
    }

    timer.current = setInterval(() => tick(performance.now()), 16)
    return () => {
      if (timer.current) clearInterval(timer.current)
      timer.current = null
    }
  }, [playing, speed])

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.code === 'Space' && !['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName)) {
        event.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  const loadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('El archivo debe pesar menos de 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setPlaying(false)
      setScript(String(reader.result ?? ''))
    }
    reader.readAsText(file)
  }

  const reset = () => {
    setPlaying(false)
    syncPosition(0)
  }

  const moveBy = (amount: number) => {
    setPlaying(false)
    syncPosition((readerRef.current?.scrollTop ?? 0) + amount)
  }

  const jumpToSection = (index: number) => {
    setPlaying(false)
    const marker = markerRefs.current[index]
    if (marker && readerRef.current) {
      syncPosition(marker.offsetTop - readerRef.current.clientHeight * 0.35)
    }
  }

  const startReaderPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const reader = readerRef.current
    if (!reader) return
    debugLastEvent.current = 'pointerdown'
    pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    pointerMoved.current = false
    pointerWasPlaying.current = playing
    pointerOnScrollbar.current = event.clientX - reader.getBoundingClientRect().left >= reader.clientWidth
  }

  const moveReaderPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current
    if (!start || start.id !== event.pointerId) return
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y)
    if (distance > 8 && !pointerMoved.current) {
      pointerMoved.current = true
      debugLastEvent.current = 'pointermove'
      setPlaying(false)
    }
  }

  const endReaderPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current
    if (!start || start.id !== event.pointerId) return
    const shouldToggle = !pointerMoved.current && !pointerOnScrollbar.current
    pointerStart.current = null
    if (shouldToggle) setPlaying(!pointerWasPlaying.current)
  }

  const cancelReaderPointer = () => {
    pointerStart.current = null
    pointerMoved.current = false
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--yellow)] font-black text-black">UN</div>
            <div><p className="m-0 text-sm font-bold tracking-[.18em]">UN STUDIOS</p><p className="m-0 text-xs uppercase tracking-[.22em] text-[var(--muted)]">App Suite</p></div>
          </div>
        </header>

        {debugEnabled && <aside className="mb-6 rounded-xl border border-[var(--yellow)]/50 bg-[var(--surface)] p-4 font-mono text-xs text-[var(--muted)]" data-testid="debug-panel"><p className="mb-2 font-bold text-[var(--yellow)]">Diagnóstico táctil</p><div className="grid gap-1 sm:grid-cols-2"><span>playing: {String(debugInfo.currentPlaying)}</span><span>último evento: {debugInfo.lastEvent}</span><span>frames: {debugInfo.frames}</span><span>último frame: {Math.round(debugInfo.lastFrameTime)}</span><span>scrollTop: {Math.round(debugInfo.top)}</span><span>scrollHeight: {Math.round(debugInfo.scrollHeight)}</span><span>clientHeight: {Math.round(debugInfo.clientHeight)}</span><span>maxScroll: {Math.round(debugInfo.maxScroll)}</span></div></aside>}

        <section className="workspace mb-7">
          <div className="hero-block">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.25em] text-[var(--yellow)]">Listo para salir al aire</p>
            <h1 className="mb-3 text-4xl font-black tracking-tight sm:text-6xl">Tu guion.<br /><span className="text-[var(--yellow)]">Tu ritmo.</span></h1>
            <p className="max-w-md text-base leading-7 text-[var(--muted)]">Un telepromter practico y util para tus grabaciones. Creado por UN STUDIOS</p>
          </div>

          <section className="reader-panel overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]" aria-label="Área del teleprompter">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-5 py-3 text-xs text-[var(--muted)]"><span className="flex items-center gap-2"><i className={`h-2 w-2 rounded-full ${playing ? 'bg-[var(--yellow)]' : 'bg-slate-500'}`} />{playing ? 'EN MARCHA' : 'EN PAUSA'}</span><span>{Math.round(offset)} / {Math.round(maxOffset)} px</span></div>
            <div ref={readerRef} onPointerDown={startReaderPointer} onPointerMove={moveReaderPointer} onPointerUp={endReaderPointer} onPointerCancel={cancelReaderPointer} onWheel={() => setPlaying(false)} onScroll={scheduleIndicator} className="reader-scroll relative h-[46vh] min-h-[330px] overflow-y-auto overflow-x-hidden bg-black" tabIndex={0} aria-label="Texto desplazable del teleprompter">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-black to-transparent" /><div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-black to-transparent" /><div className="pointer-events-none absolute left-0 right-0 top-1/2 border-t border-dashed border-[var(--yellow)]/40" />
              <div className="px-6 pb-24 pt-[45%] text-center font-semibold leading-[1.35]" style={{ fontSize: `${size}px` }}>{sections.map((section, index) => <p key={`${index}-${section.slice(0, 12)}`} ref={(element) => { markerRefs.current[index] = element }} className="mb-12 whitespace-pre-wrap last:mb-0">{section}</p>)}</div>
            </div>
            <div className="border-t border-[var(--line)] px-4 py-3"><input aria-label="Posición del teleprompter" className="range w-full" type="range" min="0" max={maxOffset} value={Math.min(offset, maxOffset)} onChange={(event) => { setPlaying(false); syncPosition(Number(event.target.value)) }} /></div>
          </section>

          {sections.length > 1 && <section className="marker-panel rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4" aria-label="Marcadores del guion"><p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-[var(--muted)]">Marcadores del guion</p><div className="marker-list grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{sections.map((section, index) => <button key={`marker-${index}`} onClick={() => jumpToSection(index)} className="min-w-0 rounded-lg border border-[var(--line)] px-3 py-2 text-left text-xs hover:border-[var(--yellow)] hover:text-[var(--yellow)]">Parte {index + 1}: {section.slice(0, 48)}{section.length > 48 ? '…' : ''}</button>)}</div></section>}

          <div className="editor-panel rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between"><label htmlFor="script" className="text-sm font-semibold">Guion</label><button onClick={() => fileRef.current?.click()} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold hover:border-[var(--yellow)] hover:text-[var(--yellow)]">Cargar .TXT</button><input ref={fileRef} type="file" accept=".txt,text/plain" onChange={loadFile} className="hidden" /></div>
            <textarea id="script" value={script} onChange={(event) => { setPlaying(false); setScript(event.target.value) }} placeholder="Pega aquí el texto de tu presentación..." className="min-h-44 w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--black)] p-4 text-sm leading-6 text-[var(--white)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--yellow)]" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs text-[var(--muted)]">Tamaño <strong className="ml-2 text-[var(--white)]">{size}px</strong><input aria-label="Tamaño del texto" className="range mt-2 w-full" type="range" min="24" max="72" value={size} onChange={(event) => setSize(Number(event.target.value))} /></label><label className="text-xs text-[var(--muted)]">Velocidad <strong className="ml-2 text-[var(--white)]">{speed.toFixed(1)}x</strong><input aria-label="Velocidad del teleprompter" className="range mt-2 w-full" type="range" min={MIN_SPEED} max={MAX_SPEED} step="0.5" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label></div>
            <div className="mt-4 flex flex-wrap gap-3"><button onClick={toggle} className="rounded-xl bg-[var(--yellow)] px-5 py-3 font-bold text-black hover:bg-[var(--yellow2)]">{playing ? '■ Pausar' : '▶ Iniciar'}</button><button onClick={reset} className="rounded-xl border border-[var(--line)] px-5 py-3 text-sm font-semibold hover:border-[var(--yellow)]">Reiniciar</button><button onClick={() => moveBy(-120)} className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold hover:border-[var(--yellow)]">−10 s</button><button onClick={() => moveBy(120)} className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold hover:border-[var(--yellow)]">+10 s</button></div>
            <p className="mt-3 text-xs text-[var(--muted)]">Barra espaciadora: {playing ? 'pausar' : 'iniciar'}. En pantalla táctil, toca el lector para pausar o reanudar; desliza para buscar una posición.</p>
          </div>
        </section>

        <footer className="mt-8 flex flex-col gap-2 border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between"><span>Creador por <strong className="text-[var(--white)]">UN Studios App Suite</strong></span><a href="https://www.instagram.com/unstudiosve" target="_blank" rel="noreferrer" className="hover:text-[var(--yellow)]">Instagram @unstudiosve ↗</a></footer>
      </div>
    </main>
  )
}
