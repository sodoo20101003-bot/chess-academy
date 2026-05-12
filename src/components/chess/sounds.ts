'use client'

/**
 * Сонорь эффектүүд — Web Audio API ашиглан шууд үүсгэдэг (assets шаардлагагүй).
 * Browser autoplay policy-г хүндэтгэн first user interaction-аас өмнө дуу гаргахгүй.
 */

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    } catch {
      return null
    }
  }
  return audioCtx
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  const ctx = getCtx()
  if (!ctx || ctx.state === 'closed') return

  // Resume if suspended (Safari)
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime)

  // Quick attack/decay envelope to avoid clicks
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

export const sounds = {
  /** Энгийн нүүдэл — wood-on-wood click feel */
  move: () => {
    tone(420, 0.05, 'triangle', 0.12)
    setTimeout(() => tone(380, 0.08, 'sine', 0.08), 15)
  },

  /** Ялагсан хүү — illatay тhud */
  capture: () => {
    tone(180, 0.12, 'sawtooth', 0.18)
    setTimeout(() => tone(120, 0.08, 'triangle', 0.1), 30)
  },

  /** Шах — өндөр анхааруулга */
  check: () => {
    tone(880, 0.1, 'square', 0.1)
    setTimeout(() => tone(1100, 0.12, 'square', 0.1), 80)
  },

  /** Замбагт — mat */
  checkmate: () => {
    tone(440, 0.15, 'square', 0.15)
    setTimeout(() => tone(330, 0.15, 'square', 0.15), 120)
    setTimeout(() => tone(220, 0.3, 'square', 0.18), 240)
  },

  /** Цохсон — амжилт */
  success: () => {
    tone(523.25, 0.1, 'sine', 0.12) // C5
    setTimeout(() => tone(659.25, 0.1, 'sine', 0.12), 80) // E5
    setTimeout(() => tone(783.99, 0.18, 'sine', 0.15), 160) // G5
  },

  /** Буруу нүүдэл */
  error: () => {
    tone(150, 0.18, 'sawtooth', 0.12)
  },
}

let muted = false
if (typeof window !== 'undefined') {
  muted = localStorage.getItem('chess-muted') === '1'
}

export function isMuted() { return muted }

export function setMuted(value: boolean) {
  muted = value
  if (typeof window !== 'undefined') {
    localStorage.setItem('chess-muted', value ? '1' : '0')
  }
}

/** Wrapper that respects the mute setting */
export function play(sound: keyof typeof sounds) {
  if (muted) return
  sounds[sound]()
}
