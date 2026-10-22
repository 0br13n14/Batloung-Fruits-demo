export const MIN_PASSWORD_LENGTH = 5;
export const MAX_UNSIGNED_INT = 4_294_967_295;
export const MAX_DECIMAL_VALUE = 9_999_999_999.99;

export const ROLES = Object.freeze({
  ADMINISTRATOR: 'Administrator',
  SALES: 'Sales'
});

export const ORDER_STATUSES = Object.freeze({
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  READY_FOR_COLLECTION: 'Ready for Collection/Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
});

export const ORDER_STATUS_VALUES = Object.freeze(Object.values(ORDER_STATUSES));

export const VENDOR_STATUSES = Object.freeze({
  ACTIVE: 'Active',
  INACTIVE: 'Inactive'
});
