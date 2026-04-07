let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// ── Home screen music (MP3) ──

const MUSIC_URL = 'https://assets.mixkit.co/active_storage/sfx/1561/1561-preview.mp3'
const MUSIC_VOLUME = 0.4
const FADE_MS = 800

let musicEl: HTMLAudioElement | null = null
let fadeTimer: number | null = null

export function startMusic() {
  if (musicEl) return
  const audio = new Audio(MUSIC_URL)
  audio.loop = true
  audio.volume = 0
  musicEl = audio
  audio.play().catch(() => { /* autoplay blocked until interaction */ })
  let vol = 0
  const step = MUSIC_VOLUME / (FADE_MS / 16)
  fadeTimer = window.setInterval(() => {
    vol = Math.min(vol + step, MUSIC_VOLUME)
    audio.volume = vol
    if (vol >= MUSIC_VOLUME && fadeTimer !== null) {
      window.clearInterval(fadeTimer)
      fadeTimer = null
    }
  }, 16)
}

export function isMusicPlaying(): boolean {
  return musicEl !== null && !musicEl.paused
}

export function stopMusic() {
  if (!musicEl) return
  const audio = musicEl
  if (fadeTimer !== null) {
    window.clearInterval(fadeTimer)
    fadeTimer = null
  }
  let vol = audio.volume
  const step = vol / (FADE_MS / 16)
  const id = window.setInterval(() => {
    vol = Math.max(vol - step, 0)
    audio.volume = vol
    if (vol <= 0) {
      window.clearInterval(id)
      audio.pause()
      audio.src = ''
      musicEl = null
    }
  }, 16)
}

// ── Engine sound ──

export class EngineSound {
  private ac: AudioContext
  private masterGain: GainNode
  private oscs: OscillatorNode[] = []
  private oscGains: GainNode[] = []
  private running = false

  constructor() {
    this.ac = getCtx()
    this.masterGain = this.ac.createGain()
    this.masterGain.gain.value = 0
    this.masterGain.connect(this.ac.destination)
  }

  start() {
    if (this.running) return
    this.running = true
    if (this.ac.state === 'suspended') this.ac.resume()

    const baseFreq = 75

    const types: OscillatorType[] = ['sawtooth', 'square', 'triangle']
    const gains = [0.12, 0.06, 0.04]
    const multipliers = [1, 2, 3]

    for (let i = 0; i < types.length; i++) {
      const osc = this.ac.createOscillator()
      osc.type = types[i]
      osc.frequency.value = baseFreq * multipliers[i]

      const gain = this.ac.createGain()
      gain.gain.value = gains[i]

      const filter = this.ac.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 800
      filter.Q.value = 1.5

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.masterGain)
      osc.start()

      this.oscs.push(osc)
      this.oscGains.push(gain)
    }

    this.masterGain.gain.linearRampToValueAtTime(0.15, this.ac.currentTime + 0.3)
  }

  update(speedMps: number) {
    if (!this.running) return
    const absSpeed = Math.abs(speedMps)
    const speedRatio = Math.min(absSpeed / 34, 1)

    const baseFreq = 75 + speedRatio * 120
    const multipliers = [1, 2, 3]
    for (let i = 0; i < this.oscs.length; i++) {
      this.oscs[i].frequency.linearRampToValueAtTime(
        baseFreq * multipliers[i],
        this.ac.currentTime + 0.05,
      )
    }

    const vol = 0.08 + speedRatio * 0.18
    this.masterGain.gain.linearRampToValueAtTime(vol, this.ac.currentTime + 0.05)
  }

  setRevving(on: boolean) {
    if (!this.running) return
    if (on) {
      const now = this.ac.currentTime
      const base = 75
      for (let i = 0; i < this.oscs.length; i++) {
        const m = [1, 2, 3][i]
        this.oscs[i].frequency.setValueAtTime(base * m, now)
        this.oscs[i].frequency.linearRampToValueAtTime(base * m * 1.3, now + 0.3)
        this.oscs[i].frequency.linearRampToValueAtTime(base * m, now + 0.6)
      }
      this.masterGain.gain.linearRampToValueAtTime(0.12, now + 0.2)
    }
  }

  isRunning() {
    return this.running
  }

  stop() {
    if (!this.running) return
    this.running = false
    this.masterGain.gain.linearRampToValueAtTime(0, this.ac.currentTime + 0.3)
    setTimeout(() => {
      for (const osc of this.oscs) {
        try { osc.stop() } catch { /* already stopped */ }
      }
      this.oscs = []
      this.oscGains = []
    }, 400)
  }
}
