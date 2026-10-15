import bcrypt from 'bcrypt'
import { timingSafeEqual } from 'node:crypto'
import pool from '../config/database.js'
import {
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
} from '../utils/accountValidation.js'

function validAccount({ name, email, phone }) {
  return typeof name === 'string'
    && name.trim().length > 0
    && name.trim().length <= 120
    && isValidEmail(email)
    && isValidPhone(phone)
}

function publicUser(row) {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    createdAt: row.created_at,
  }
}

function duplicateEmail(error, res) {
  if (error.code !== 'ER_DUP_ENTRY') return false
  res.status(409).json({ error: 'Email sudah digunakan akun lain.' })
  return true
}

export async function getSetupStatus(_req, res) {
  const [[state]] = await pool.execute(
    'SELECT setup_complete FROM admin_setup_state WHERE id = 1',
  )
  const [[adminCount]] = await pool.execute(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'admin'",
  )
  return res.json({
    available: Boolean(process.env.ADMIN_SETUP_KEY)
      && Boolean(state)
      && !Boolean(state.setup_complete)
      && Number(adminCount.total) === 0,
  })
}

export async function setupInitialAdmins(req, res) {
  const configuredKey = process.env.ADMIN_SETUP_KEY
  const providedKey = req.body?.setupKey
  if (!configuredKey || configuredKey.length < 32 || typeof providedKey !== 'string') {
    return res.status(503).json({ error: 'Setup admin awal belum dikonfigurasi di server.' })
  }
  const expected = Buffer.from(configuredKey)
  const received = Buffer.from(providedKey)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return res.status(401).json({ error: 'Kunci setup tidak valid.' })
  }

  const admins = req.body?.admins
  if (!Array.isArray(admins) || admins.length !== 2) {
    return res.status(400).json({ error: 'Isi data untuk tepat dua admin awal.' })
  }
  for (const admin of admins) {
    if (!validAccount(admin)) {
      return res.status(400).json({ error: 'Nama, email, atau nomor telepon/WhatsApp admin tidak valid.' })
    }
    if (
      typeof admin.password !== 'string'
      || admin.password.length < 8
      || Buffer.byteLength(admin.password, 'utf8') > 72
    ) {
      return res.status(400).json({ error: 'Password admin harus minimal 8 karakter dan maksimal 72 byte.' })
    }
  }
  if (normalizeEmail(admins[0].email) === normalizeEmail(admins[1].email)) {
    return res.status(400).json({ error: 'Kedua admin harus menggunakan email yang berbeda.' })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [stateRows] = await connection.execute(
      'SELECT setup_complete FROM admin_setup_state WHERE id = 1 FOR UPDATE',
    )
    const [adminRows] = await connection.execute(
      "SELECT id FROM users WHERE role = 'admin' FOR UPDATE",
    )
    if (!stateRows[0] || stateRows[0].setup_complete || adminRows.length > 0) {
      await connection.rollback()
      return res.status(409).json({ error: 'Setup admin awal sudah pernah dilakukan atau tidak lagi tersedia.' })
    }

    for (const admin of admins) {
      const normalizedEmail = normalizeEmail(admin.email)
      const [existingRows] = await connection.execute(
        'SELECT id, password_hash FROM users WHERE email = ? FOR UPDATE',
        [normalizedEmail],
      )
      if (existingRows[0]) {
        const passwordMatches = await bcrypt.compare(admin.password, existingRows[0].password_hash)
        if (!passwordMatches) {
          await connection.rollback()
          return res.status(401).json({
            error: `Password akun ${normalizedEmail} tidak cocok. Masukkan password yang saat ini digunakan akun tersebut.`,
          })
        }
        await connection.execute(
          "UPDATE users SET role = 'admin', session_version = session_version + 1 WHERE id = ?",
          [existingRows[0].id],
        )
      } else {
        const passwordHash = await bcrypt.hash(admin.password, 12)
        await connection.execute(
          `INSERT INTO users (name, email, phone, password_hash, role)
           VALUES (?, ?, ?, ?, 'admin')`,
          [
            admin.name.trim(),
            normalizedEmail,
            normalizePhone(admin.phone),
            passwordHash,
          ],
        )
      }
    }
    await connection.execute(
      'UPDATE admin_setup_state SET setup_complete = TRUE WHERE id = 1',
    )
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    if (duplicateEmail(error, res)) return undefined
    throw error
  } finally {
    connection.release()
  }

  return res.status(201).json({
    message: 'Dua akun admin awal berhasil dibuat. Silakan masuk melalui halaman login.',
  })
}

export async function listUsers(req, res) {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const [rows] = search
    ? await pool.execute(
      `SELECT id, name, email, phone, role, created_at
       FROM users
       WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
       ORDER BY created_at DESC, id DESC`,
      [`%${search}%`, `%${search}%`, `%${search}%`],
    )
    : await pool.execute(
      `SELECT id, name, email, phone, role, created_at
       FROM users
       ORDER BY created_at DESC, id DESC`,
    )

  return res.json({ users: rows.map(publicUser) })
}

export async function createUser(req, res) {
  const { name, email, phone, password, role = 'user' } = req.body ?? {}
  if (!validAccount({ name, email, phone })) {
    return res.status(400).json({ error: 'Nama, email, atau nomor telepon/WhatsApp tidak valid.' })
  }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'Password harus minimal 8 karakter dan maksimal 72 byte.' })
  }
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Peran akun tidak valid.' })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), normalizeEmail(email), normalizePhone(phone), passwordHash, role],
    )
    const [rows] = await pool.execute(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
      [result.insertId],
    )
    return res.status(201).json({ user: publicUser(rows[0]) })
  } catch (error) {
    if (duplicateEmail(error, res)) return undefined
    throw error
  }
}

export async function updateUser(req, res) {
  const { name, email, phone, role } = req.body ?? {}
  const userId = req.params.id
  if (!/^\d+$/.test(userId)) return res.status(400).json({ error: 'ID akun tidak valid.' })
  if (!validAccount({ name, email, phone })) {
    return res.status(400).json({ error: 'Nama, email, atau nomor telepon/WhatsApp tidak valid.' })
  }
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Peran akun tidak valid.' })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [admins] = await connection.execute(
      "SELECT id FROM users WHERE role = 'admin' ORDER BY id FOR UPDATE",
    )
    const [rows] = await connection.execute(
      'SELECT id, role FROM users WHERE id = ? FOR UPDATE',
      [userId],
    )
    if (!rows[0]) {
      await connection.rollback()
      return res.status(404).json({ error: 'Akun tidak ditemukan.' })
    }
    if (rows[0].role === 'admin' && role === 'user' && admins.length <= 2) {
      await connection.rollback()
      return res.status(409).json({ error: 'Dua admin terakhir tidak dapat diubah menjadi user.' })
    }
    await connection.execute(
      `UPDATE users
       SET name = ?, email = ?, phone = ?,
           session_version = session_version + IF(role <> ?, 1, 0),
           role = ?
       WHERE id = ?`,
      [name.trim(), normalizeEmail(email), normalizePhone(phone), role, role, userId],
    )
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    if (duplicateEmail(error, res)) return undefined
    throw error
  } finally {
    connection.release()
  }

  const [updatedRows] = await pool.execute(
    'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
    [userId],
  )
  return res.json({ user: publicUser(updatedRows[0]) })
}

export async function deleteUser(req, res) {
  const userId = req.params.id
  if (!/^\d+$/.test(userId)) return res.status(400).json({ error: 'ID akun tidak valid.' })

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [admins] = await connection.execute(
      "SELECT id FROM users WHERE role = 'admin' ORDER BY id FOR UPDATE",
    )
    const [rows] = await connection.execute(
      'SELECT id, name, role FROM users WHERE id = ? FOR UPDATE',
      [userId],
    )
    if (!rows[0]) {
      await connection.rollback()
      return res.status(404).json({ error: 'Akun tidak ditemukan.' })
    }
    if (rows[0].role === 'admin' && admins.length <= 2) {
      await connection.rollback()
      return res.status(409).json({ error: 'Dua admin terakhir tidak dapat dihapus.' })
    }
    await connection.execute('DELETE FROM users WHERE id = ?', [userId])
    await connection.commit()
    return res.json({ message: `Akun ${rows[0].name} berhasil dihapus.` })
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
