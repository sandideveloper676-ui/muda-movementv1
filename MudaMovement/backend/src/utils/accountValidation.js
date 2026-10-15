const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+?\d{8,16}$/

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export function isValidEmail(email) {
  return typeof email === 'string'
    && email.trim().length <= 254
    && emailPattern.test(normalizeEmail(email))
}

export function normalizePhone(phone) {
  return typeof phone === 'string' ? phone.trim().replace(/[\s().-]/g, '') : ''
}

export function isValidPhone(phone) {
  return phonePattern.test(normalizePhone(phone))
}
