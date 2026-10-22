const malutiFormatter = new Intl.NumberFormat('en-LS', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Africa/Maseru',
})

export function formatCurrency(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value)) {
    throw new TypeError('Currency amount must be a finite number.')
  }
  return `M ${malutiFormatter.format(value)}`
}

export function formatDate(value) {
  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00+02:00`)
      : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new TypeError('Date value must be valid.')
  }
  return dateFormatter.format(date)
}
