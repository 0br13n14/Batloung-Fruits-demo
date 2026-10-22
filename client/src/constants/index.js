export const ROLES = Object.freeze({
  ADMINISTRATOR: 'Administrator',
  SALES: 'Sales',
})

export const ORDER_STATUSES = Object.freeze({
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  READY_FOR_COLLECTION: 'Ready for Collection/Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
})

export const ACCESS_TOKEN_KEY = 'batloung_access_token'
export const AUTH_UNAUTHORIZED_EVENT = 'batloung:unauthorized'
