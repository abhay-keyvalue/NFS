import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import type { GameRecordData, UserProfile } from '../services/api'
import { formatTime } from '../utils/game'

type Props = {
  onBack: () => void
}

export function ProfilePage({ onBack }: Props) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [history, setHistory] = useState<GameRecordData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [profileRes, historyRes] = await Promise.all([
          api.users.profile(),
          api.games.history(50),
        ])
        setProfile(profileRes.profile)
        setHistory(historyRes.history)
      } catch {
        setError('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (!user) {
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
          </div>
          <div className="page-empty">Please log in to view your profile.</div>
        </div>
      </div>
    )
  }

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
          <h1 className="page-title">My Profile</h1>
        </div>

        {loading && <div className="page-loading">Loading...</div>}
        {error && <div className="page-error">{error}</div>}

        {!loading && !error && profile && (
          <>
            <div className="profile-header">
              {profile.avatarUrl && (
                <img src={profile.avatarUrl} alt="" className="profile-avatar" referrerPolicy="no-referrer" />
              )}
              <div className="profile-info">
                <h2 className="profile-name">{profile.displayName}</h2>
                <span className="profile-email">{profile.email}</span>
              </div>
            </div>

            <div className="profile-stats-grid">
              <div className="profile-stat-card">
                <span className="profile-stat-value">{profile.totalRaces}</span>
                <span className="profile-stat-label">Total Races</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-value">
                  {profile.bestTimes.solo != null ? formatTime(profile.bestTimes.solo) : '--'}
                </span>
                <span className="profile-stat-label">Best Solo Time</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-value">
                  {profile.bestTimes.ai != null ? formatTime(profile.bestTimes.ai) : '--'}
                </span>
                <span className="profile-stat-label">Best AI Time</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-value">{profile.avgCollisions}</span>
                <span className="profile-stat-label">Avg Hits / Race</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-value">
                  {profile.winRate != null ? `${profile.winRate}%` : '--'}
                </span>
                <span className="profile-stat-label">Win Rate</span>
              </div>
            </div>

            <h3 className="profile-section-title">Race History</h3>
            {history.length === 0 ? (
              <div className="page-empty">No races recorded yet. Go race!</div>
            ) : (
              <div className="lb-table-wrap">
                <table className="lb-table">
                  <thead>
                    <tr>
                      <th>Mode</th>
                      <th>Difficulty</th>
                      <th>Time</th>
                      <th>Hits</th>
                      <th>Result</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((r) => (
                      <tr key={r.id}>
                        <td className="profile-mode-cell">{r.gameMode}</td>
                        <td>{r.difficulty || '--'}</td>
                        <td className="lb-time">{formatTime(r.elapsedMs)}</td>
                        <td>{r.collisions}</td>
                        <td>
                          {r.won === null
                            ? '--'
                            : r.won
                              ? <span className="profile-win">Win</span>
                              : <span className="profile-loss">Loss</span>}
                        </td>
                        <td className="lb-date">{new Date(r.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
