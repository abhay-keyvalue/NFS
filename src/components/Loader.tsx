import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'

export function Loader() {
  const { active, progress } = useProgress()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!active && progress === 100) {
      const timer = setTimeout(() => setVisible(false), 600)
      return () => clearTimeout(timer)
    }
  }, [active, progress])

  if (!visible) return null

  const done = !active && progress === 100

  return (
    <div className={`loader-overlay ${done ? 'loader-fade-out' : ''}`}>
      <div className="loader-content">
        <div className="loader-car-icon">🏎</div>
        <h2 className="loader-title">Loading Race</h2>
        <div className="loader-bar-track">
          <div className="loader-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="loader-pct">{progress.toFixed(0)}%</p>
      </div>
    </div>
  )
}
