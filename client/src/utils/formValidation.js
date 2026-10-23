export function validateEmail(email) {
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateTelephone(telephone) {
  return !telephone || (/^[+()\d\s.-]{5,40}$/.test(telephone) && /\d/.test(telephone))
}

export function validatePositiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0
}

export function validatePositiveInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0
}
