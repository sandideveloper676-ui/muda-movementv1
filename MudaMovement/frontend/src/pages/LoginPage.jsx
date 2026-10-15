import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../auth/useAuth'
import { buildPasswordHelpEmail, fetchAdminSetupStatus } from '../services/auth'
import PasswordInput from '../components/ui/PasswordInput'
import './LoginPage.css'

const benefits = [
  'Terhubung dengan ekosistem pemuda Indonesia',
  'Ruang belajar dan pengembangan diri',
  'Kolaborasi untuk menciptakan dampak',
]

export default function LoginPage() {
  const { user, loading, login, register } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loginRole, setLoginRole] = useState('user')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [adminSetupAvailable, setAdminSetupAvailable] = useState(false)
  const isRegistering = mode === 'register'
  const isForgotPassword = mode === 'forgot'

  useEffect(() => {
    let active = true
    fetchAdminSetupStatus()
      .then(({ available }) => {
        if (active) setAdminSetupAvailable(available)
      })
      .catch(() => {
        if (active) setAdminSetupAvailable(false)
      })
    return () => { active = false }
  }, [])

  if (loading) return <main className="auth-state" role="status">Memeriksa sesi Anda...</main>
  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    if (isForgotPassword) {
      window.location.assign(buildPasswordHelpEmail(email, phone))
      return
    }
    setError('')
    setSubmitting(true)
    try {
      if (isRegistering) {
        await register(name.trim(), email.trim(), phone.trim(), password)
      } else {
        await login(email.trim(), password, loginRole)
      }
      navigate(destination, { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const destination = location.state?.from?.pathname === '/dashboard'
    ? location.state.from.pathname
    : '/dashboard'

  return (
    <main className="login-page">
      <section className="login-intro" aria-label="Tentang MUDA Movement">
        <Link to="/" className="login-brand">MUDA <span>Movement</span></Link>
        <div className="login-intro__content">
          <p className="login-eyebrow">Learning · Developing · Empowering</p>
          <blockquote>
            Muda Movement membantu anak muda menemukan versi terbaiknya melalui ruang belajar,
            pengembangan diri, dan kolaborasi yang berdampak.
          </blockquote>
          <ul>
            {benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
          </ul>
        </div>
        <span className="login-intro__ring" aria-hidden="true" />
      </section>

      <section className="login-panel">
        <Link to="/" className="login-back">← Kembali ke beranda</Link>
        <div className="login-form-wrap">
          <p className="login-eyebrow login-eyebrow--blue">
            {loginRole === 'admin' && !isRegistering && !isForgotPassword ? 'Dashboard admin' : 'Dashboard member'}
          </p>
          <h1>
            {isForgotPassword
              ? 'Lupa Password?'
              : isRegistering ? 'Daftar Akun Baru' : 'Selamat Datang Kembali'}
          </h1>
          <p className="login-subtitle">
            {isForgotPassword
              ? 'Isi email dan nomor WhatsApp yang terdaftar. Email bantuan akan disiapkan untuk dikirim ke admin.'
              : isRegistering
                ? 'Buat akun member MUDA Movement dan langsung masuk ke dashboard.'
                : 'Masuk untuk mengelola akun Anda di Muda Movement.'}
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            {isRegistering && (
              <>
                <label htmlFor="register-name">Nama lengkap</label>
                <input
                  id="register-name"
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Nama lengkap"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                  required
                />
              </>
            )}
            {isRegistering && (
              <>
                <label htmlFor="register-phone">Nomor telepon/WhatsApp</label>
                <input
                  id="register-phone"
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  placeholder="Contoh: +6281234567890"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  maxLength={24}
                  required
                />
              </>
            )}
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
            />

            {isForgotPassword && (
              <>
                <label htmlFor="forgot-phone">Nomor telepon/WhatsApp akun</label>
                <input
                  id="forgot-phone"
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  placeholder="Nomor yang digunakan saat mendaftar"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  maxLength={24}
                  required
                />
              </>
            )}

            {!isRegistering && !isForgotPassword && (
              <fieldset className="login-role-choice">
                <legend>Masuk sebagai</legend>
                <label>
                  <input
                    type="radio"
                    name="login-role"
                    value="user"
                    checked={loginRole === 'user'}
                    onChange={() => setLoginRole('user')}
                  />
                  User
                </label>
                <label>
                  <input
                    type="radio"
                    name="login-role"
                    value="admin"
                    checked={loginRole === 'admin'}
                    onChange={() => setLoginRole('admin')}
                  />
                  Admin
                </label>
              </fieldset>
            )}

            {!isForgotPassword && (
              <>
                <label htmlFor="login-password">Password</label>
                <PasswordInput
                  id="login-password"
                  name="password"
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  placeholder={isRegistering ? 'Minimal 8 karakter' : 'Masukkan password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={isRegistering ? 8 : undefined}
                  maxLength={72}
                  required
                />
              </>
            )}

            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={submitting}>
              {submitting ? 'Memproses...' : isForgotPassword
                ? 'Buat email ke admin'
                : isRegistering ? 'Daftar dan masuk' : 'Masuk ke dashboard'}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="login-help">
            {isForgotPassword ? (
              <>
                Ingat password?{' '}
                <button
                  className="login-mode-toggle"
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError('')
                  }}
                >
                  Kembali ke login
                </button>
              </>
            ) : isRegistering ? (
              <>
                Sudah punya akun?{' '}
                <button
                  className="login-mode-toggle"
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError('')
                  }}
                >
                  Masuk di sini
                </button>
              </>
            ) : (
              <>
                <button
                  className="login-mode-toggle"
                  type="button"
                  onClick={() => {
                    setMode('forgot')
                    setError('')
                  }}
                >
                  Lupa password?
                </button>
                <span aria-hidden="true"> · </span>
                Belum punya akun?{' '}
                <button
                  className="login-mode-toggle"
                  type="button"
                  onClick={() => {
                    setMode('register')
                    setError('')
                  }}
                >
                  Daftar di sini
                </button>
              </>
            )}
          </p>
          {adminSetupAvailable && (
            <p className="login-help">
              Pertama kali menggunakan dashboard admin?{' '}
              <Link className="login-mode-toggle" to="/admin-setup">Siapkan dua admin</Link>
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
