import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import type { LeaderboardEntry } from '../services/api'
import { formatTime } from '../utils/game'

type Props = {
  onBack: () => void
}

const MODES = [
  { value: 'solo', label: 'Solo' },
  { value: 'ai', label: 'vs AI' },
] as const

const DIFFICULTIES = [
  { value: '', label: 'All' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
] as const

export function LeaderboardPage({ onBack }: Props) {
  const [mode, setMode] = useState('solo')
  const [difficulty, setDifficulty] = useState('')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: { mode: string; difficulty?: string } = { mode }
      if (difficulty) params.difficulty = difficulty
      const { leaderboard } = await api.games.leaderboard(params)
      setEntries(leaderboard)
    } catch {
      setError('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }, [mode, difficulty])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  return (
    <div className="page-screen">
      <div className="page-bg-grid" />
      <div className="page-container">
        <div className="page-top-bar">
          <button className="page-back-btn" onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="page-title">Leaderboard</h1>
        </div>

        <div className="lb-filters">
          <div className="lb-filter-group">
            <span className="lb-filter-label">Mode</span>
            <div className="lb-filter-options">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  className={`lb-filter-btn ${mode === m.value ? 'active' : ''}`}
                  onClick={() => setMode(m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="lb-filter-group">
            <span className="lb-filter-label">Difficulty</span>
            <div className="lb-filter-options">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  className={`lb-filter-btn ${difficulty === d.value ? 'active' : ''}`}
                  onClick={() => setDifficulty(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && <div className="page-loading">Loading...</div>}
        {error && <div className="page-error">{error}</div>}

        {!loading && !error && entries.length === 0 && (
          <div className="page-empty">No records yet. Be the first to set a time!</div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="lb-table-wrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Time</th>
                  <th>Hits</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className={entry.rank <= 3 ? `lb-rank-${entry.rank}` : ''}>
                    <td className="lb-rank">{entry.rank}</td>
                    <td className="lb-player">
                      {entry.avatarUrl && (
                        <img src={entry.avatarUrl} alt="" className="lb-avatar" referrerPolicy="no-referrer" />
                      )}
                      <span>{entry.displayName}</span>
                    </td>
                    <td className="lb-time">{formatTime(entry.elapsedMs)}</td>
                    <td>{entry.collisions}</td>
                    <td className="lb-date">{new Date(entry.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
