import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminSetupStatus, setupInitialAdmin } from '../services/auth'
import './LoginPage.css'

const emptyAdmin = { name: '', email: '', phone: '', password: '' }

export default function AdminSetupPage() {
  const [admin, setAdmin] = useState({ ...emptyAdmin })
  const [setupKey, setSetupKey] = useState('')
  const [available, setAvailable] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    fetchAdminSetupStatus()
      .then(({ available: isAvailable }) => {
        if (active) setAvailable(isAvailable)
      })
      .catch((statusError) => {
        if (!active) return
        setAvailable(false)
        setError(statusError.message)
      })
    return () => { active = false }
  }, [])

  function updateAdmin(field, value) {
    setAdmin((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const result = await setupInitialAdmin(setupKey, admin)
      setMessage(result.message)
      setAvailable(false)
    } catch (setupError) {
      setError(setupError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-intro" aria-label="Setup admin MUDA Movement">
        <Link to="/" className="login-brand">MUDA <span>Movement</span></Link>
        <div className="login-intro__content">
          <p className="login-eyebrow">Administrasi aman</p>
          <blockquote>
            Buat satu akun admin pertama melalui formulir ini. Setelah setup selesai,
            admin dapat menambah admin lain dari dashboard.
          </blockquote>
        </div>
        <span className="login-intro__ring" aria-hidden="true" />
      </section>

      <section className="login-panel">
        <Link to="/login" className="login-back">← Kembali ke login</Link>
        <div className="login-form-wrap">
          <p className="login-eyebrow login-eyebrow--blue">Setup awal</p>
          <h1>Siapkan admin</h1>
          <p className="login-subtitle">
            Masukkan kunci setup dari konfigurasi backend dan data akun admin pertama.
            Untuk akun yang sudah terdaftar, masukkan password akun saat ini agar akun
            tersebut diangkat menjadi admin. Akun baru akan dibuat jika email belum terdaftar.
          </p>

          {message ? (
            <div className="login-form">
              <p className="login-success" role="status">{message}</p>
              <Link className="login-submit login-submit--link" to="/login">
                Lanjut ke login <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : available === null ? (
            <p className="login-success" role="status">Memeriksa status setup...</p>
          ) : !available ? (
            <div className="login-form">
              {!error && <p className="login-success" role="status">Setup awal tidak tersedia atau sudah pernah dilakukan.</p>}
              {error && <p className="login-error" role="alert">{error}</p>}
              <Link className="login-submit login-submit--link" to="/login">
                Kembali ke login <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              <label htmlFor="admin-setup-key">Kunci setup admin</label>
              <input
                id="admin-setup-key"
                type="password"
                autoComplete="off"
                value={setupKey}
                onChange={(event) => setSetupKey(event.target.value)}
                required
              />
              <fieldset className="admin-setup-fieldset">
                <legend>Admin pertama</legend>
                <label htmlFor="admin-name">Nama lengkap</label>
                <input
                  id="admin-name"
                  autoComplete="name"
                  value={admin.name}
                  onChange={(event) => updateAdmin('name', event.target.value)}
                  maxLength={120}
                  required
                />
                <label htmlFor="admin-email">Email</label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={admin.email}
                  onChange={(event) => updateAdmin('email', event.target.value)}
                  maxLength={254}
                  required
                />
                <label htmlFor="admin-phone">Nomor telepon/WhatsApp</label>
                <input
                  id="admin-phone"
                  type="tel"
                  autoComplete="tel"
                  value={admin.phone}
                  onChange={(event) => updateAdmin('phone', event.target.value)}
                  maxLength={24}
                  required
                />
                <label htmlFor="admin-password">Password (minimal 8 karakter)</label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="new-password"
                  value={admin.password}
                  onChange={(event) => updateAdmin('password', event.target.value)}
                  minLength={8}
                  maxLength={72}
                  required
                />
              </fieldset>
              {error && <p className="login-error" role="alert">{error}</p>}
              <button className="login-submit" type="submit" disabled={submitting}>
                {submitting ? 'Membuat akun admin...' : 'Buat akun admin'}
                <span aria-hidden="true">→</span>
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
