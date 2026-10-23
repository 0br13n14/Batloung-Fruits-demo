import { useEffect, useState } from 'react'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { Modal } from '../components/Modal'
import { SearchFilterBar } from '../components/SearchFilterBar'
import { StatusBadge } from '../components/StatusBadge'
import { ORDER_STATUSES, ROLES } from '../constants'
import { useAuth } from '../context/useAuth'
import { buildQuery, getServerFieldErrors, useApiList } from '../hooks/useApiList'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { api } from '../services/api'
import { formatCurrency, formatDate } from '../utils/formatters'

const emptyOrderForm = () => ({
  vendor_id: '',
  items: [{ product_id: '', quantity_boxes: '' }],
})

const nextOrderStatus = Object.freeze({
  [ORDER_STATUSES.PENDING]: ORDER_STATUSES.CONFIRMED,
  [ORDER_STATUSES.CONFIRMED]: ORDER_STATUSES.PROCESSING,
  [ORDER_STATUSES.PROCESSING]: ORDER_STATUSES.READY_FOR_COLLECTION,
  [ORDER_STATUSES.READY_FOR_COLLECTION]: ORDER_STATUSES.COMPLETED,
})

export function OrdersPage() {
  const { user } = useAuth()
  const isAdministrator = user.role === ROLES.ADMINISTRATOR
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [form, setForm] = useState(emptyOrderForm)
  const [vendorSearch, setVendorSearch] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [order, setOrder] = useState(null)
  const [orderError, setOrderError] = useState('')
  const [isOrderLoading, setIsOrderLoading] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [orderRevision, setOrderRevision] = useState(0)
  const debouncedSearch = useDebouncedValue(search)
  const dateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate)
  const query = buildQuery({
    search: debouncedSearch.trim(),
    status,
    vendor: vendorId,
    from: dateRangeInvalid ? '' : fromDate,
    to: dateRangeInvalid ? '' : toDate,
  })
  const {
    rows: orders,
    isLoading,
    error,
    refresh,
  } = useApiList('/orders', 'orders', query)
  const {
    rows: vendors,
    isLoading: vendorsLoading,
    error: vendorsError,
  } = useApiList('/vendors', 'vendors')
  const {
    rows: stock,
    isLoading: stockLoading,
    error: stockError,
    refresh: refreshStock,
  } = useApiList('/stock', 'stock')

  useEffect(() => {
    if (selectedOrderId == null) return undefined
    const controller = new AbortController()
    api
      .get(`/orders/${selectedOrderId}`, { signal: controller.signal })
      .then((result) => setOrder(result.order))
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') {
          setOrder(null)
          setOrderError(requestError.message)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsOrderLoading(false)
      })
    return () => controller.abort()
  }, [orderRevision, selectedOrderId])

  function openCreateModal() {
    setForm(emptyOrderForm())
    setVendorSearch('')
    setFieldErrors({})
    setFormError('')
    setIsCreateModalOpen(true)
  }

  function updateOrderItem(index, changes) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    }))
    setFieldErrors({})
  }

  function validateOrderForm() {
    const errors = {}
    if (!form.vendor_id) errors.vendor_id = 'Choose an active vendor.'
    if (form.items.length === 0) errors.items = 'Add at least one order item.'
    const selectedProducts = new Set()

    form.items.forEach((item, index) => {
      const productId = Number(item.product_id)
      const product = stock.find((record) => record.product_id === productId)
      const quantity = Number(item.quantity_boxes)
      if (!item.product_id || !product) {
        errors[`product-${index}`] = 'Choose a product.'
      } else if (selectedProducts.has(productId)) {
        errors[`product-${index}`] = 'Choose each product only once.'
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        errors[`quantity-${index}`] = 'Enter a positive whole number of boxes.'
      } else if (product && quantity > product.quantity_available) {
        errors[`quantity-${index}`] =
          `Only ${product.quantity_available} box(es) are available.`
      }
      selectedProducts.add(productId)
    })

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function createOrder(event) {
    event.preventDefault()
    if (!validateOrderForm()) return
    setIsSaving(true)
    setFormError('')
    try {
      await api.post('/orders', {
        vendor_id: Number(form.vendor_id),
        items: form.items.map((item) => ({
          product_id: Number(item.product_id),
          quantity_boxes: Number(item.quantity_boxes),
        })),
      })
      setIsCreateModalOpen(false)
      refresh()
      refreshStock()
    } catch (saveError) {
      setFieldErrors(getServerFieldErrors(saveError))
      setFormError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function updateStatus(nextStatus) {
    if (!order) return
    setIsUpdatingStatus(true)
    setStatusError('')
    try {
      const result = await api.put(`/orders/${order.id}`, { status: nextStatus })
      setOrder(result.order)
      refresh()
      if (nextStatus === ORDER_STATUSES.COMPLETED) refreshStock()
    } catch (requestError) {
      setStatusError(
        `The server rejected this status change: ${requestError.message}`,
      )
      setIsOrderLoading(true)
      setOrderRevision((revision) => revision + 1)
      refresh()
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  function canCancelOrder(currentOrder) {
    if (isAdministrator) return true
    return [ORDER_STATUSES.PENDING, ORDER_STATUSES.CONFIRMED].includes(
      currentOrder.status,
    )
  }

  const activeVendors = vendors.filter((vendor) => vendor.status === 'Active')
  const visibleVendors = activeVendors.filter((vendor) =>
    `${vendor.vendor_name} ${vendor.business_name ?? ''}`
      .toLowerCase()
      .includes(vendorSearch.trim().toLowerCase()),
  )
  const availableProducts = stock.filter((product) => product.is_active)
  const orderTotal = form.items.reduce((total, item) => {
    const product = availableProducts.find(
      (record) => record.product_id === Number(item.product_id),
    )
    const quantity = Number(item.quantity_boxes)
    return product && Number.isFinite(quantity) && quantity > 0
      ? total + Number(product.selling_price) * quantity
      : total
  }, 0)

  const columns = [
    {
      key: 'id',
      header: 'Order',
      render: (record) => `#${record.id}`,
    },
    { key: 'vendor_name', header: 'Vendor' },
    {
      key: 'order_date',
      header: 'Order date',
      render: (record) => formatDate(record.order_date),
    },
    {
      key: 'status',
      header: 'Status',
      render: (record) => <StatusBadge status={record.status} />,
    },
    {
      key: 'total_amount',
      header: 'Total',
      numeric: true,
      render: (record) => formatCurrency(record.total_amount),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (record) => (
        <button
          className="button button--secondary"
          onClick={() => {
            setOrder(null)
            setOrderError('')
            setStatusError('')
            setIsOrderLoading(true)
            setSelectedOrderId(record.id)
          }}
          type="button"
        >
          View order
        </button>
      ),
    },
  ]

  return (
    <section aria-labelledby="orders-heading" className="management-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Sales management</p>
          <h2 id="orders-heading">Orders</h2>
          <p className="page-description">
            Create vendor orders, review items and update order status.
          </p>
        </div>
        <button className="button button--primary" onClick={openCreateModal} type="button">
          Create order
        </button>
      </div>
      <SearchFilterBar
        filters={[
          {
            name: 'vendor',
            label: 'Vendor',
            value: vendorId,
            options: [
              { value: '', label: 'All vendors' },
              ...vendors.map((vendor) => ({
                value: String(vendor.id),
                label: vendor.vendor_name,
              })),
            ],
          },
          {
            name: 'status',
            label: 'Status',
            value: status,
            options: [
              { value: '', label: 'All statuses' },
              ...Object.values(ORDER_STATUSES).map((value) => ({
                value,
                label: value,
              })),
            ],
          },
        ]}
        onFilterChange={(name, value) => {
          if (name === 'vendor') setVendorId(value)
          if (name === 'status') setStatus(value)
        }}
        onSearchChange={setSearch}
        searchLabel="Search orders"
        searchMaxLength={100}
        searchValue={search}
      />
      <div className="date-range-filters">
        <FormField label="From date" name="orders-from-date">
          <input
            id="orders-from-date"
            onChange={(event) => setFromDate(event.target.value)}
            type="date"
            value={fromDate}
          />
        </FormField>
        <FormField label="To date" name="orders-to-date">
          <input
            id="orders-to-date"
            onChange={(event) => setToDate(event.target.value)}
            type="date"
            value={toDate}
          />
        </FormField>
      </div>
      {dateRangeInvalid && (
        <div className="form-message form-message--error" role="alert">
          The start date must be on or before the end date.
        </div>
      )}
      {vendorsError && (
        <div className="form-message form-message--error" role="alert">
          {vendorsError}
        </div>
      )}
      <DataTable
        columns={columns}
        emptyMessage="No orders found."
        error={error}
        loading={isLoading || vendorsLoading}
        onRetry={refresh}
        rows={orders}
      />

      <Modal
        footer={
          <>
            <button
              className="button button--secondary"
              onClick={() => setIsCreateModalOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button button--primary"
              disabled={isSaving || vendorsLoading || stockLoading || Boolean(vendorsError || stockError)}
              form="order-form"
              type="submit"
            >
              {isSaving ? 'Creating...' : 'Create order'}
            </button>
          </>
        }
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create order"
      >
        <form className="record-form" id="order-form" noValidate onSubmit={createOrder}>
          {formError && (
            <div className="form-message form-message--error" role="alert">
              {formError}
            </div>
          )}
          {(vendorsError || stockError) && (
            <div className="form-message form-message--error" role="alert">
              {[vendorsError, stockError].filter(Boolean).join(' ')}
            </div>
          )}
          <FormField error={fieldErrors.vendor_id} label="Vendor" name="vendor_id" required>
            <input
              autoComplete="off"
              onChange={(event) => {
                setVendorSearch(event.target.value)
                setForm((current) => ({ ...current, vendor_id: '' }))
              }}
              placeholder={
                form.vendor_id
                  ? activeVendors.find((vendor) => vendor.id === Number(form.vendor_id))
                      ?.vendor_name
                  : 'Search active vendors'
              }
              value={vendorSearch}
            />
          </FormField>
          <label className="form-field" htmlFor="order-vendor-choice">
            <span>Matching vendors</span>
            <select
              id="order-vendor-choice"
              onChange={(event) => {
                const selected = activeVendors.find(
                  (vendor) => String(vendor.id) === event.target.value,
                )
                setForm((current) => ({
                  ...current,
                  vendor_id: event.target.value,
                }))
                setVendorSearch(selected?.vendor_name ?? '')
                setFieldErrors((current) => ({ ...current, vendor_id: undefined }))
              }}
              size={Math.min(4, Math.max(2, visibleVendors.length))}
              value={form.vendor_id}
            >
              <option value="">Choose a vendor</option>
              {visibleVendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.vendor_name}{vendor.business_name ? ` — ${vendor.business_name}` : ''}
                </option>
              ))}
            </select>
          </label>
          {activeVendors.length === 0 && !vendorsLoading && (
            <p className="map-coordinate">No active vendors are available for new orders.</p>
          )}
          <div className="order-builder">
            <h3>Order items</h3>
            {form.items.map((item, index) => {
              const selectedProduct = availableProducts.find(
                (product) => product.product_id === Number(item.product_id),
              )
              const quantity = Number(item.quantity_boxes)
              const rowSubtotal =
                selectedProduct && Number.isFinite(quantity) && quantity > 0
                  ? Number(selectedProduct.selling_price) * quantity
                  : 0
              const usedProductIds = form.items
                .filter((_, itemIndex) => itemIndex !== index)
                .map((row) => Number(row.product_id))

              return (
                <div className="order-item-row" key={index}>
                  <div className="order-item-row__product">
                    <FormField
                      error={fieldErrors[`product-${index}`] ?? fieldErrors.items}
                      label={`Fruit and box size ${index + 1}`}
                      name={`product-${index}`}
                      required
                    >
                      <select
                        onChange={(event) =>
                          updateOrderItem(index, {
                            product_id: event.target.value,
                            quantity_boxes: '',
                          })
                        }
                        value={item.product_id}
                      >
                        <option value="">Choose a product</option>
                        {availableProducts.map((product) => (
                          <option
                            disabled={usedProductIds.includes(product.product_id)}
                            key={product.product_id}
                            value={product.product_id}
                          >
                            {product.fruit_name} — {product.box_size}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                  <FormField
                    error={fieldErrors[`quantity-${index}`]}
                    label="Boxes"
                    name={`quantity-${index}`}
                    required
                  >
                    <input
                      disabled={!selectedProduct || selectedProduct.quantity_available < 1}
                      max={selectedProduct?.quantity_available}
                      min="1"
                      onChange={(event) =>
                        updateOrderItem(index, { quantity_boxes: event.target.value })
                      }
                      type="number"
                      value={item.quantity_boxes}
                    />
                  </FormField>
                  <div className="order-row-summary">
                    {selectedProduct ? (
                      <>
                        <p>
                          Available: {selectedProduct.quantity_available} box(es)
                          {' · '}Unit price: {formatCurrency(selectedProduct.selling_price)}
                        </p>
                        <p>Row total: {formatCurrency(rowSubtotal)}</p>
                      </>
                    ) : (
                      <p>Select a product to view its stock and price.</p>
                    )}
                  </div>
                  <div className="order-item-row__actions">
                    <span />
                    {form.items.length > 1 && (
                      <button
                        className="button button--secondary"
                        onClick={() => {
                          setForm((current) => ({
                            ...current,
                            items: current.items.filter((_, rowIndex) => rowIndex !== index),
                          }))
                          setFieldErrors({})
                        }}
                        type="button"
                      >
                        Remove row
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {fieldErrors.items && (
              <p className="inline-error" role="alert">{fieldErrors.items}</p>
            )}
            <div className="inline-control">
              <button
                className="button button--secondary"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    items: [...current.items, { product_id: '', quantity_boxes: '' }],
                  }))
                }
                type="button"
              >
                Add item
              </button>
              <span className="order-row-summary">Each product can be added once.</span>
            </div>
            <div aria-live="polite" className="order-total">
              <span>Estimated total</span>
              <span>{formatCurrency(orderTotal)}</span>
            </div>
            <p className="order-row-summary">
              The server calculates and saves the final order total.
            </p>
          </div>
        </form>
      </Modal>

      <Modal
        footer={
          <button
            className="button button--secondary"
            onClick={() => setSelectedOrderId(null)}
            type="button"
          >
            Close
          </button>
        }
        isOpen={selectedOrderId != null}
        onClose={() => setSelectedOrderId(null)}
        title={order ? `Order #${order.id}` : 'Order details'}
      >
        {isOrderLoading && <p>Loading order details...</p>}
        {orderError && (
          <div className="form-message form-message--error" role="alert">{orderError}</div>
        )}
        {statusError && (
          <div className="form-message form-message--error" role="alert">{statusError}</div>
        )}
        {order && (
          <>
            <dl className="order-detail-grid">
              <dt>Vendor</dt><dd>{order.vendor_name}</dd>
              <dt>Order date</dt><dd>{formatDate(order.order_date)}</dd>
              <dt>Status</dt><dd><StatusBadge status={order.status} /></dd>
              <dt>Total</dt><dd>{formatCurrency(order.total_amount)}</dd>
            </dl>
            <DataTable
              columns={[
                { key: 'fruit_name', header: 'Fruit' },
                { key: 'box_size', header: 'Box size' },
                { key: 'quantity_boxes', header: 'Boxes', numeric: true },
                {
                  key: 'unit_price',
                  header: 'Unit price',
                  numeric: true,
                  render: (item) => formatCurrency(item.unit_price),
                },
                {
                  key: 'subtotal',
                  header: 'Subtotal',
                  numeric: true,
                  render: (item) => formatCurrency(item.subtotal),
                },
              ]}
              emptyMessage="This order has no items."
              rows={order.items}
            />
            {![
              ORDER_STATUSES.COMPLETED,
              ORDER_STATUSES.CANCELLED,
            ].includes(order.status) && (
              <div className="table-actions">
                {nextOrderStatus[order.status] && (
                  <button
                    className="button button--primary"
                    disabled={isUpdatingStatus}
                    onClick={() => updateStatus(nextOrderStatus[order.status])}
                    type="button"
                  >
                    {isUpdatingStatus
                      ? 'Updating...'
                      : `Move to ${nextOrderStatus[order.status]}`}
                  </button>
                )}
                {canCancelOrder(order) && (
                  <button
                    className="button button--danger"
                    disabled={isUpdatingStatus}
                    onClick={() => updateStatus(ORDER_STATUSES.CANCELLED)}
                    type="button"
                  >
                    Cancel order
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </Modal>
    </section>
  )
}
