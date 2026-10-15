import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useAuth from '../auth/useAuth'
import ThemeToggle from '../components/layout/ThemeToggle'
import {
  buildGmailWebLink,
  buildPasswordHelpEmail,
  deleteAccount as deleteAccountRequest,
  fetchPublicConfig,
  updateProfile as updateProfileRequest,
} from '../services/auth'
import AdminDashboardPage from './AdminDashboardPage'
import './DashboardPage.css'

export default function DashboardPage() {
  const { user } = useAuth()
  return user.role === 'admin' ? <AdminDashboardPage /> : <MemberDashboardPage />
}

function MemberDashboardPage() {
  const { user, token, logout, setCurrentUser } = useAuth()
  const [whatsappUrl, setWhatsappUrl] = useState('')
  const [configError, setConfigError] = useState('')
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [phone, setPhone] = useState(user.phone || '')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    let active = true
    fetchPublicConfig()
      .then((config) => {
        if (active) setWhatsappUrl(config.whatsappGroupUrl || 'https://chat.whatsapp.com/LVdBfFZW3l24FqJSHHOtzb')
      })
      .catch((error) => {
        if (active) setConfigError(error.message)
      })
    return () => { active = false }
  }, [])

  const joinedAt = user.createdAt
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(user.createdAt))
    : '—'
  const initial = user.name?.trim().charAt(0).toUpperCase() || 'M'

  function handleEmailClick(event) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (!isMobile) {
      event.preventDefault()
      const webUrl = buildGmailWebLink(user.email, user.phone)
      window.open(webUrl, '_blank', 'noopener,noreferrer')
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setProfileError('')
    setProfileMessage('')
    setSavingProfile(true)
    try {
      const result = await updateProfileRequest(token, name.trim(), email.trim(), phone.trim())
      setCurrentUser(result.user)
      setName(result.user.name)
      setEmail(result.user.email)
      setPhone(result.user.phone)
      setProfileMessage('Profil berhasil diperbarui.')
    } catch (error) {
      setProfileError(error.message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleDeleteSubmit(event) {
    event.preventDefault()
    setDeleteError('')
    setDeletingAccount(true)
    try {
      const result = await deleteAccountRequest(token, deleteConfirmation)
      window.alert(result.message)
      logout()
      window.location.replace('/')
    } catch (error) {
      setDeleteError(error.message)
      setDeletingAccount(false)
    }
  }

  return (
    <main className="member-dashboard">
      <aside className="member-sidebar">
        <Link to="/" className="member-brand" aria-label="MUDA Movement, beranda">
          <span className="member-brand__mark">M</span>
          <span>MUDA<br />Movement</span>
        </Link>

        <div className="member-menu">
          <p className="member-menu__label">Menu</p>
          <a className="member-menu__item is-active" href="#profile">◉ <span>Profil Saya</span></a>
          <p className="member-menu__label member-menu__label--home">Beranda</p>
          <Link className="member-menu__item" to="/">↗ <span>Landing Page</span></Link>
        </div>

        <div className="member-sidebar__bottom">
          <div className="member-mini-profile">
            <span className="member-avatar">{initial}</span>
            <span className="member-mini-profile__identity" title={user.name}>
              <strong>{user.name}</strong><small>Member</small>
            </span>
          </div>
          <button type="button" className="member-logout" onClick={logout}>↪ <span>Keluar</span></button>
        </div>
      </aside>

      <section className="member-main">
        <header className="member-topbar">
          <strong>Dashboard</strong>
          <ThemeToggle />
        </header>

        <div className="member-content">
          <p className="member-eyebrow">Dashboard</p>
          <h1>Profil Saya</h1>
          <p className="member-lead">Selamat datang di ruang member MUDA Movement.</p>

          <div className="member-cards" id="profile">
            <section className="member-card member-card--profile">
              <div className="member-card__heading">
                <span className="member-avatar member-avatar--large">{initial}</span>
                <div className="member-card__identity">
                  <p className="member-eyebrow">Informasi akun</p>
                  <h2 title={user.name}>{user.name}</h2>
                </div>
              </div>
              <p className="member-joined">Member sejak {joinedAt}</p>
              <form className="member-form" onSubmit={handleProfileSubmit}>
                <label htmlFor="profile-name">Nama lengkap</label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                  required
                />
                <label htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  required
                />
                <label htmlFor="profile-phone">Nomor telepon/WhatsApp</label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  maxLength={24}
                  required
                />
                {profileError && <p className="member-form-message is-error" role="alert">{profileError}</p>}
                {profileMessage && <p className="member-form-message is-success" role="status">{profileMessage}</p>}
                <button className="member-action-button" type="submit" disabled={savingProfile}>
                  {savingProfile ? 'Menyimpan...' : 'Simpan profil'}
                </button>
              </form>
            </section>

            <section className="member-card member-card--password">
              <p className="member-eyebrow">Keamanan</p>
              <h2>Lupa password?</h2>
              <p className="member-security-help">
                Hubungi admin untuk meminta bantuan pemulihan akun. Email dan nomor WhatsApp akun Anda akan otomatis disertakan.
              </p>
              <a
                className="member-action-button member-mail-link"
                href={buildPasswordHelpEmail(user.email, user.phone)}
                onClick={handleEmailClick}
              >
                Buat email ke admin
              </a>
            </section>

            <section className="member-card member-card--about">
              <p className="member-eyebrow">Learning · Developing · Empowering</p>
              <h2>Bertumbuh dan berdampak bersama.</h2>
              <p>
                MUDA Movement adalah ruang bagi anak muda untuk belajar, mengembangkan potensi,
                dan berkolaborasi menciptakan dampak positif.
              </p>
              <Link className="member-text-link" to="/">Kenali program kami <span aria-hidden="true">→</span></Link>
            </section>

            <section className="member-card member-card--about">
              <p className="member-eyebrow">Tentang Kami</p>
              <h2>Mengenal Muda Movement lebih dekat</h2>
              <p>
                Muda Movement adalah platform inovasi pemuda Indonesia yang membantu anak muda menemukan versi terbaik dirinya.
              </p>
              <Link className="member-text-link" to="/">Kenali lebih dalam <span aria-hidden="true">→</span></Link>
            </section>

            <section className="member-card member-card--whatsapp">
              <div>
                <p className="member-eyebrow">Terhubung dengan komunitas</p>
                <h2>Gabung grup WhatsApp</h2>
                <p>Dapatkan kabar program, kesempatan belajar, dan informasi komunitas MUDA Movement.</p>
              </div>
              {whatsappUrl
                ? <a className="member-whatsapp-button" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Join WhatsApp Group <span aria-hidden="true">↗</span></a>
                : <p className="member-config-message">{configError || 'Tautan grup belum tersedia. Silakan hubungi admin MUDA Movement.'}</p>}
            </section>

            <section className="member-card member-card--danger">
              <div>
                <p className="member-eyebrow">Zona berbahaya</p>
                <h2>Hapus akun</h2>
                <p>Penghapusan akun bersifat permanen dan Anda akan keluar dari dashboard.</p>
              </div>
              <form className="member-form" onSubmit={handleDeleteSubmit}>
                <label htmlFor="delete-confirmation">Ketik “hapus akun” untuk mengonfirmasi</label>
                <input
                  id="delete-confirmation"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  autoComplete="off"
                  required
                />
                {deleteError && <p className="member-form-message is-error" role="alert">{deleteError}</p>}
                <button className="member-delete-button" type="submit" disabled={deletingAccount}>
                  {deletingAccount ? 'Menghapus akun...' : 'Hapus akun saya'}
                </button>
              </form>
            </section>
          </div>
        </div>
      </section>
    </main>
  )
}