import { ORDER_STATUSES } from '../constants'

const statusTones = Object.freeze({
  [ORDER_STATUSES.PENDING]: 'warning',
  [ORDER_STATUSES.CONFIRMED]: 'success',
  [ORDER_STATUSES.PROCESSING]: 'warning',
  [ORDER_STATUSES.READY_FOR_COLLECTION]: 'success',
  [ORDER_STATUSES.COMPLETED]: 'success',
  [ORDER_STATUSES.CANCELLED]: 'danger',
  Active: 'success',
  Inactive: 'neutral',
})

export function StatusBadge({ status }) {
  const tone = statusTones[status] ?? 'neutral'
  return <span className={`status-badge status-badge--${tone}`}>{status}</span>
}
