const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (response.status === 204) return null

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error('Server mengirim respons yang tidak dapat dibaca.')
  }

  if (!response.ok) {
    const error = new Error(payload.error || 'Permintaan tidak dapat diproses.')
    error.status = response.status
    throw error
  }

  return payload
}

export function login(email, password, expectedRole) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, expectedRole }),
  })
}

export function register(name, email, phone, password) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, phone, password }),
  })
}

export function fetchCurrentUser(token) {
  return request('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function updateProfile(token, name, email, phone) {
  return request('/api/auth/me', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, email, phone }),
  })
}

export function updatePassword(token, currentPassword, newPassword) {
  return request('/api/auth/me/password', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export function deleteAccount(token, confirmation) {
  return request('/api/auth/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ confirmation }),
  })
}

export function buildPasswordHelpEmail(email, phone) {
  const subject = 'Bantuan lupa password akun MUDA Movement'
  const body = [
    'Halo Admin MUDA Movement, saya lupa password akun saya.',
    '',
    'Mohon bantuan untuk pemulihan akses akun. Berikut data akun saya:',
    `Email: ${email.trim()}`,
    `Nomor telepon/WhatsApp: ${phone.trim()}`,
    '',
    'Terima kasih.',
  ].join('\n')
  const params = new URLSearchParams({ subject, body })
  return `mailto:mudamovement.id@gmail.com?${params.toString()}`
}

export function fetchAdminUsers(token, search = '') {
  const query = new URLSearchParams()
  if (search.trim()) query.set('search', search.trim())
  const queryString = query.toString()
  return request(`/api/admin/users${queryString ? `?${queryString}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function createAdminUser(token, user) {
  return request('/api/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(user),
  })
}

export function updateAdminUser(token, id, user) {
  return request(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(user),
  })
}

export function deleteAdminUser(token, id) {
  return request(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function fetchAdminSetupStatus() {
  return request('/api/admin/setup/status')
}

export function setupInitialAdmin(setupKey, admin) {
  return request('/api/admin/setup', {
    method: 'POST',
    body: JSON.stringify({ setupKey, admin }),
  })
}

export function fetchPublicConfig() {
  return request('/api/config')
}
