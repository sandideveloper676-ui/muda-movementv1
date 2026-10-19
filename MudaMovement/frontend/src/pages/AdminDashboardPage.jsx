import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useAuth from '../auth/useAuth'
import ThemeToggle from '../components/layout/ThemeToggle'
import { createAccountWorkbook, formatAccountDate } from '../services/accountWorkbook'
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminSettings,
  fetchAdminUsers,
  updateAdminPassword,
  updateAdminUser,
  updateAdminWhatsAppGroup,
} from '../services/auth'
import './AdminDashboardPage.css'
import './DashboardPage.css'

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'user',
}

export default function AdminDashboardPage() {
  const { user, token, logout, setCurrentUser } = useAuth()
  const [users, setUsers] = useState(null)
  const [search, setSearch] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [listError, setListError] = useState('')
  const [exportError, setExportError] = useState('')
  const [formError, setFormError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [saving, setSaving] = useState(false)
  const [whatsappUrl, setWhatsappUrl] = useState('')
  const [settingsError, setSettingsError] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  function refreshUsers() {
    setUsers(null)
    setListError('')
    setExportError('')
    setRefresh((value) => value + 1)
  }

  useEffect(() => {
    let active = true
    fetchAdminSettings(token)
      .then(({ whatsappGroupUrl: savedUrl }) => {
        if (active) setWhatsappUrl(savedUrl || '')
      })
      .catch((error) => {
        if (active) setSettingsError(error.message)
      })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    let active = true
    fetchAdminUsers(token, search)
      .then(({ users: fetchedUsers }) => {
        if (active) {
          setUsers(fetchedUsers)
          setListError('')
        }
      })
      .catch((error) => {
        if (active) {
          setUsers([])
          setListError(error.message)
        }
      })
    return () => { active = false }
  }, [token, search, refresh])

  function startEditing(account) {
    setEditingId(account.id)
    setForm({
      name: account.name,
      email: account.email,
      phone: account.phone,
      password: '',
      role: account.role,
    })
    setFormError('')
    setMessage('')
    document.getElementById('admin-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId('')
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    setMessage('')
    try {
      if (editingId) {
        const account = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
        }
        const result = await updateAdminUser(token, editingId, account)
        if (editingId === user.id) setCurrentUser(result.user)
        setMessage('Perubahan akun berhasil disimpan.')
        if (editingId === user.id && account.role !== 'admin') {
          logout()
          window.location.replace('/login')
          return
        }
      } else {
        await createAdminUser(token, form)
        setMessage('Akun baru berhasil ditambahkan.')
      }
      resetForm()
      refreshUsers()
    } catch (error) {
      setFormError(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(account) {
    if (!window.confirm(`Hapus akun ${account.name} (${account.email}) secara permanen?`)) return
    setListError('')
    setMessage('')
    try {
      const result = await deleteAdminUser(token, account.id)
      if (account.id === user.id) {
        window.alert(result.message)
        logout()
        window.location.replace('/')
        return
      }
      setMessage(result.message)
      refreshUsers()
    } catch (error) {
      setListError(error.message)
    }
  }

  function handleExport(scope) {
    setExportError('')
    try {
      const exportAccounts = scope === 'users'
        ? accountList.filter((account) => account.role === 'user')
        : [
          ...accountList.filter((account) => account.role === 'admin'),
          ...accountList.filter((account) => account.role !== 'admin'),
        ]
      if (exportAccounts.length === 0) {
        setExportError('Tidak ada akun yang dapat diekspor untuk pilihan ini.')
        return
      }

      const workbook = createAccountWorkbook(exportAccounts)
      const url = URL.createObjectURL(new Blob([workbook], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }))
      const link = document.createElement('a')
      link.href = url
      link.download = `direktori-${scope === 'users' ? 'user' : 'semua-akun'}-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Kesalahan tidak diketahui.'
      setExportError(`File Excel gagal dibuat: ${details}`)
    }
  }

  async function handleWhatsAppSubmit(event) {
    event.preventDefault()
    setSavingSettings(true)
    setSettingsError('')
    setSettingsMessage('')
    try {
      const result = await updateAdminWhatsAppGroup(token, whatsappUrl)
      setWhatsappUrl(result.whatsappGroupUrl)
      setSettingsMessage(result.whatsappGroupUrl
        ? 'Link grup WhatsApp berhasil diperbarui.'
        : 'Link grup WhatsApp dinonaktifkan dari dashboard user.')
    } catch (error) {
      setSettingsError(error.message)
    } finally {
      setSavingSettings(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setSavingPassword(true)
    setPasswordError('')
    try {
      const result = await updateAdminPassword(token, newPassword, passwordConfirmation)
      window.alert(result.message)
      logout()
      window.location.replace('/login')
    } catch (error) {
      setPasswordError(error.message)
      setSavingPassword(false)
    }
  }

  const accountList = users || []
  const adminCount = accountList.filter((account) => account.role === 'admin').length
  const joinedAt = user.createdAt
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(user.createdAt))
    : '—'

  return (
    <main className="member-dashboard">
      <aside className="member-sidebar">
        <Link to="/" className="member-brand" aria-label="MUDA Movement, beranda">
          <span className="member-brand__mark">M</span>
          <span>MUDA<br />Movement</span>
        </Link>
        <div className="member-menu">
          <p className="member-menu__label">Administrasi</p>
          <a className="member-menu__item" href="#account">◉ <span>Info akun</span></a>
          <a className="member-menu__item" href="#whatsapp">↗ <span>Grup WhatsApp</span></a>
          <a className="member-menu__item is-active" href="#users">◉ <span>Kelola akun</span></a>
          <p className="member-menu__label member-menu__label--home">Beranda</p>
          <Link className="member-menu__item" to="/">↗ <span>Landing Page</span></Link>
        </div>
        <div className="member-sidebar__bottom">
          <div className="member-mini-profile">
            <span className="member-avatar">{user.name?.trim().charAt(0).toUpperCase() || 'A'}</span>
            <span className="member-mini-profile__identity" title={user.name}>
              <strong>{user.name}</strong><small>Admin</small>
            </span>
          </div>
          <button type="button" className="member-logout" onClick={logout}>↪ <span>Keluar</span></button>
        </div>
      </aside>

      <section className="member-main">
        <header className="member-topbar">
          <strong>Dashboard Admin</strong>
          <ThemeToggle />
        </header>

        <div className="member-content admin-content">
          <p className="member-eyebrow">Administrasi MUDA Movement</p>
          <h1>Kelola akun</h1>
          <p className="member-lead">Cari, tambah, edit, hapus akun, dan atur peran user maupun admin.</p>

          <div className="admin-summary" aria-live="polite">
            <strong>{accountList.length}</strong><span>{search ? 'akun ditemukan' : 'akun terdaftar'}</span>
            <strong>{adminCount}</strong><span>admin{search ? ' ditemukan' : ' aktif'}</span>
          </div>

          <section className="admin-card" id="account" aria-labelledby="admin-account-title">
            <p className="member-eyebrow">Akun yang sedang digunakan</p>
            <h2 id="admin-account-title">Info akun admin</h2>
            <dl className="admin-account-details">
              <div><dt>Nama lengkap</dt><dd>{user.name}</dd></div>
              <div><dt>Email</dt><dd>{user.email}</dd></div>
              <div><dt>Telepon/WhatsApp</dt><dd>{user.phone || '—'}</dd></div>
              <div><dt>Admin sejak</dt><dd>{joinedAt}</dd></div>
            </dl>
            <div className="admin-password-section">
              <p className="member-eyebrow">Keamanan akun</p>
              <h3>Ubah password</h3>
              <p className="admin-admin-note">
                Setelah password diperbarui, Anda akan keluar dan perlu masuk kembali menggunakan password baru.
              </p>
              <form className="admin-form" onSubmit={handlePasswordSubmit}>
                <label htmlFor="admin-new-password">Password baru</label>
                <input
                  id="admin-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  maxLength={72}
                  required
                />
                <label htmlFor="admin-password-confirmation">Ketik “ubah password” untuk mengonfirmasi</label>
                <input
                  id="admin-password-confirmation"
                  type="text"
                  autoComplete="off"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  required
                />
                {passwordError && <p className="member-form-message is-error" role="alert">{passwordError}</p>}
                <button className="member-action-button" type="submit" disabled={savingPassword}>
                  {savingPassword ? 'Memperbarui...' : 'Ubah password'}
                </button>
              </form>
            </div>
          </section>

          <section className="admin-card" id="whatsapp" aria-labelledby="admin-whatsapp-title">
            <p className="member-eyebrow">Komunitas MUDA Movement</p>
            <h2 id="admin-whatsapp-title">Link grup WhatsApp</h2>
            <p className="admin-admin-note">
              Link ini ditampilkan sebagai tombol gabung grup di dashboard user. Kosongkan untuk menyembunyikan tombol tersebut.
            </p>
            <form className="admin-form" onSubmit={handleWhatsAppSubmit}>
              <label htmlFor="admin-whatsapp-url">Link undangan grup</label>
              <input
                id="admin-whatsapp-url"
                type="url"
                inputMode="url"
                autoComplete="url"
                maxLength={2048}
                value={whatsappUrl}
                onChange={(event) => setWhatsappUrl(event.target.value)}
                placeholder="https://chat.whatsapp.com/..."
              />
              {settingsError && <p className="member-form-message is-error" role="alert">{settingsError}</p>}
              {settingsMessage && <p className="member-form-message is-success" role="status">{settingsMessage}</p>}
              <div className="admin-form__actions">
                <button className="member-action-button" type="submit" disabled={savingSettings}>
                  {savingSettings ? 'Menyimpan...' : 'Simpan link grup'}
                </button>
              </div>
            </form>
          </section>

          <section className="admin-card admin-editor" id="admin-editor" aria-labelledby="admin-editor-title">
            <div>
              <p className="member-eyebrow">{editingId ? 'Perbarui informasi' : 'Akun baru'}</p>
              <h2 id="admin-editor-title">{editingId ? 'Edit akun' : 'Tambah akun'}</h2>
            </div>
            <form className="admin-form" onSubmit={handleSubmit}>
              <label htmlFor="admin-name">Nama lengkap</label>
              <input
                id="admin-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                maxLength={120}
                required
              />
              <label htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                maxLength={254}
                required
              />
              <label htmlFor="admin-phone">Nomor telepon/WhatsApp</label>
              <input
                id="admin-phone"
                type="tel"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                maxLength={24}
                required
              />
              {!editingId && (
                <>
                  <label htmlFor="admin-password">Password sementara</label>
                  <input
                    id="admin-password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    minLength={8}
                    maxLength={72}
                    required
                  />
                </>
              )}
              <label htmlFor="admin-role">Peran</label>
              <select
                id="admin-role"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              {formError && <p className="member-form-message is-error" role="alert">{formError}</p>}
              {message && <p className="member-form-message is-success" role="status">{message}</p>}
              <div className="admin-form__actions">
                <button className="member-action-button" type="submit" disabled={saving}>
                  {saving ? 'Menyimpan...' : editingId ? 'Simpan perubahan' : 'Buat akun'}
                </button>
                {editingId && (
                  <button className="admin-secondary-button" type="button" onClick={resetForm}>
                    Batal
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="admin-card admin-users" id="users" aria-labelledby="admin-users-title">
            <div className="admin-users__heading">
              <div>
                <p className="member-eyebrow">Direktori akun</p>
                <h2 id="admin-users-title">User terbaru</h2>
              </div>
              <div className="admin-users__controls">
                <label className="admin-search">
                  <span>Cari nama, email, atau nomor telepon</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setUsers(null)
                      setListError('')
                      setExportError('')
                      setSearch(event.target.value)
                    }}
                    placeholder="Ketik kata kunci..."
                  />
                </label>
                <div className="admin-export-actions">
                  <button
                    className="admin-secondary-button admin-export-button"
                    type="button"
                    onClick={() => handleExport('all')}
                    disabled={users === null || Boolean(listError) || accountList.length === 0}
                  >
                    Unduh semua (admin di atas)
                  </button>
                  <button
                    className="admin-secondary-button admin-export-button"
                    type="button"
                    onClick={() => handleExport('users')}
                    disabled={users === null || Boolean(listError) || !accountList.some((account) => account.role === 'user')}
                  >
                    Unduh user saja
                  </button>
                </div>
              </div>
            </div>
            {listError && <p className="member-form-message is-error" role="alert">{listError}</p>}
            {exportError && <p className="member-form-message is-error" role="alert">{exportError}</p>}
            {users === null ? (
              <p className="admin-list-status" role="status">Memuat daftar akun...</p>
            ) : accountList.length === 0 ? (
              <p className="admin-list-status">Tidak ada akun yang cocok dengan pencarian.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Email</th>
                      <th>Telepon/WA</th>
                      <th>Peran</th>
                      <th>Tanggal daftar</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountList.map((account) => (
                      <tr key={account.id}>
                        <td data-label="Nama">{account.name}</td>
                        <td data-label="Email">{account.email}</td>
                        <td data-label="Telepon/WA">{account.phone}</td>
                        <td data-label="Peran"><span className={`admin-role admin-role--${account.role}`}>{account.role}</span></td>
                        <td data-label="Tanggal daftar">{formatAccountDate(account.createdAt)}</td>
                        <td data-label="Aksi">
                          <div className="admin-row-actions">
                            <button type="button" onClick={() => startEditing(account)}>Edit</button>
                            <button type="button" className="is-danger" onClick={() => handleDelete(account)}>Hapus</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="admin-admin-note">
              Dua admin terakhir tidak bisa dihapus atau diubah menjadi user. Akun terbaru ditampilkan paling atas.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}
