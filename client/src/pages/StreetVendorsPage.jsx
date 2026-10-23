import { useState } from 'react'
import { ConfirmModal } from '../components/ConfirmModal'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { MapPicker } from '../components/MapPicker'
import { Modal } from '../components/Modal'
import { SearchFilterBar } from '../components/SearchFilterBar'
import { StatusBadge } from '../components/StatusBadge'
import { ROLES } from '../constants'
import { useAuth } from '../context/useAuth'
import { useApiList, buildQuery, getServerFieldErrors } from '../hooks/useApiList'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { api } from '../services/api'
import { formatDate } from '../utils/formatters'
import { validateTelephone } from '../utils/formValidation'

function localDateString() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)
}

const emptyVendor = {
  vendor_name: '',
  business_name: '',
  telephone: '',
  location_area: '',
  latitude: null,
  longitude: null,
  registration_date: localDateString(),
  status: 'Active',
}

export function StreetVendorsPage() {
  const { user } = useAuth()
  const canManageVendors = user.role === ROLES.ADMINISTRATOR
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [viewingVendor, setViewingVendor] = useState(null)
  const [vendorToDeactivate, setVendorToDeactivate] = useState(null)
  const [mapSession, setMapSession] = useState(null)
  const [form, setForm] = useState(emptyVendor)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const debouncedSearch = useDebouncedValue(search)
  const query = buildQuery({ search: debouncedSearch.trim(), status })
  const {
    rows: vendors,
    isLoading,
    error,
    refresh,
  } = useApiList('/vendors', 'vendors', query)

  function openVendorModal(vendor = null) {
    setEditingVendor(vendor)
    setForm(
      vendor
        ? {
            vendor_name: vendor.vendor_name,
            business_name: vendor.business_name ?? '',
            telephone: vendor.telephone ?? '',
            location_area: vendor.location_area,
            latitude: vendor.latitude,
            longitude: vendor.longitude,
            registration_date: String(vendor.registration_date).slice(0, 10),
            status: vendor.status,
          }
        : { ...emptyVendor, registration_date: localDateString() },
    )
    setFieldErrors({})
    setFormError('')
    setIsModalOpen(true)
  }

  function validateForm() {
    const errors = {}
    if (!form.vendor_name.trim()) errors.vendor_name = 'Enter a vendor name.'
    if (form.vendor_name.trim().length > 150) {
      errors.vendor_name = 'Vendor name must be 150 characters or fewer.'
    }
    if (!form.telephone.trim()) errors.telephone = 'Enter a telephone number.'
    else if (!validateTelephone(form.telephone.trim())) {
      errors.telephone = 'Enter a valid telephone number.'
    }
    if (!form.location_area.trim()) errors.location_area = 'Enter a location or area name.'
    if (!form.registration_date) errors.registration_date = 'Choose a registration date.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function saveVendor(event) {
    event.preventDefault()
    if (!validateForm()) return
    setIsSaving(true)
    setFormError('')
    setActionError('')
    const payload = {
      vendor_name: form.vendor_name.trim(),
      business_name: form.business_name.trim() || null,
      telephone: form.telephone.trim(),
      location_area: form.location_area.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
      registration_date: form.registration_date,
      ...(editingVendor ? { status: form.status } : {}),
    }
    try {
      if (editingVendor) {
        await api.put(`/vendors/${editingVendor.id}`, payload)
      } else {
        await api.post('/vendors', payload)
      }
      setIsModalOpen(false)
      refresh()
    } catch (saveError) {
      setFieldErrors(getServerFieldErrors(saveError))
      setFormError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function deactivateVendor() {
    if (!vendorToDeactivate) return
    setIsDeactivating(true)
    setActionError('')
    try {
      await api.delete(`/vendors/${vendorToDeactivate.id}`)
      setVendorToDeactivate(null)
      refresh()
    } catch (requestError) {
      setActionError(requestError.message)
      setVendorToDeactivate(null)
    } finally {
      setIsDeactivating(false)
    }
  }

  function openMapPicker(readOnly, vendor = null) {
    setMapSession({
      readOnly,
      initialLocation: vendor
        ? {
            location_area: vendor.location_area,
            latitude: vendor.latitude,
            longitude: vendor.longitude,
          }
        : {
            location_area: form.location_area,
            latitude: form.latitude,
            longitude: form.longitude,
          },
    })
  }

  const columns = [
    { key: 'vendor_name', header: 'Vendor' },
    {
      key: 'business_name',
      header: 'Business',
      render: (vendor) => vendor.business_name || '—',
    },
    { key: 'telephone', header: 'Telephone' },
    { key: 'location_area', header: 'Location / area' },
    {
      key: 'registration_date',
      header: 'Registered',
      render: (vendor) => formatDate(vendor.registration_date),
    },
    {
      key: 'status',
      header: 'Status',
      render: (vendor) => <StatusBadge status={vendor.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (vendor) => (
        <div className="table-actions">
          <button
            className="button button--secondary"
            onClick={() => setViewingVendor(vendor)}
            type="button"
          >
            Details
          </button>
          <button
            className="button button--secondary"
            disabled={vendor.latitude == null || vendor.longitude == null}
            onClick={() => openMapPicker(true, vendor)}
            title={
              vendor.latitude == null || vendor.longitude == null
                ? 'No map coordinates saved'
                : undefined
            }
            type="button"
          >
            View on map
          </button>
          {canManageVendors && (
            <>
              <button
                className="button button--secondary"
                onClick={() => openVendorModal(vendor)}
                type="button"
              >
                Edit
              </button>
              {vendor.status === 'Active' && (
                <button
                  className="button button--danger"
                  onClick={() => setVendorToDeactivate(vendor)}
                  type="button"
                >
                  Deactivate
                </button>
              )}
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <section aria-labelledby="vendors-heading" className="management-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Vendor management</p>
          <h2 id="vendors-heading">Street Vendors</h2>
          <p className="page-description">
            Register vendors and manage their contact and location details.
          </p>
        </div>
        <button
          className="button button--primary"
          onClick={() => openVendorModal()}
          type="button"
        >
          Register vendor
        </button>
      </div>
      {actionError && (
        <div className="form-message form-message--error" role="alert">
          {actionError}
        </div>
      )}
      <SearchFilterBar
        filters={[
          {
            name: 'status',
            label: 'Status',
            value: status,
            options: [
              { value: '', label: 'All statuses' },
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ],
          },
        ]}
        onFilterChange={(name, value) => {
          if (name === 'status') setStatus(value)
        }}
        onSearchChange={setSearch}
        searchLabel="Search vendors"
        searchValue={search}
      />
      <DataTable
        columns={columns}
        emptyMessage="No vendors found."
        error={error}
        loading={isLoading}
        onRetry={refresh}
        rows={vendors}
      />

      <Modal
        footer={
          <>
            <button
              className="button button--secondary"
              onClick={() => setIsModalOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button button--primary"
              disabled={isSaving}
              form="vendor-form"
              type="submit"
            >
              {isSaving ? 'Saving...' : editingVendor ? 'Save changes' : 'Register vendor'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVendor ? 'Edit vendor' : 'Register vendor'}
      >
        <form
          className="record-form vendor-form-grid"
          id="vendor-form"
          noValidate
          onSubmit={saveVendor}
        >
          {formError && (
            <div className="form-message form-message--error vendor-location-field" role="alert">
              {formError}
            </div>
          )}
          <FormField error={fieldErrors.vendor_name} label="Vendor name" name="vendor_name" required>
            <input
              maxLength={150}
              onChange={(event) =>
                setForm((current) => ({ ...current, vendor_name: event.target.value }))
              }
              value={form.vendor_name}
            />
          </FormField>
          <FormField error={fieldErrors.business_name} label="Business name" name="business_name">
            <input
              maxLength={150}
              onChange={(event) =>
                setForm((current) => ({ ...current, business_name: event.target.value }))
              }
              value={form.business_name}
            />
          </FormField>
          <FormField error={fieldErrors.telephone} label="Telephone" name="telephone" required>
            <input
              maxLength={40}
              onChange={(event) =>
                setForm((current) => ({ ...current, telephone: event.target.value }))
              }
              value={form.telephone}
            />
          </FormField>
          <FormField
            error={fieldErrors.registration_date}
            label="Registration date"
            name="registration_date"
            required
          >
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, registration_date: event.target.value }))
              }
              type="date"
              value={form.registration_date}
            />
          </FormField>
          {editingVendor && (
            <FormField error={fieldErrors.status} label="Status" name="status">
              <select
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
                value={form.status}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </FormField>
          )}
          <div className="form-field vendor-location-field">
            <FormField
              error={fieldErrors.location_area}
              label="Location / area in Maseru"
              name="location_area"
              required
            >
              <input
                maxLength={255}
                onChange={(event) =>
                  setForm((current) => ({ ...current, location_area: event.target.value }))
                }
                value={form.location_area}
              />
            </FormField>
            <div className="inline-control">
              <button
                className="button button--secondary"
                onClick={() => openMapPicker(false)}
                type="button"
              >
                Select on map
              </button>
              {form.latitude != null && form.longitude != null && (
                <span className="map-coordinate">
                  {Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)}
                </span>
              )}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        footer={
          <button
            className="button button--secondary"
            onClick={() => setViewingVendor(null)}
            type="button"
          >
            Close
          </button>
        }
        isOpen={Boolean(viewingVendor)}
        onClose={() => setViewingVendor(null)}
        title="Vendor details"
      >
        {viewingVendor && (
          <dl className="order-detail-grid">
            <dt>Vendor</dt><dd>{viewingVendor.vendor_name}</dd>
            <dt>Business</dt><dd>{viewingVendor.business_name || '—'}</dd>
            <dt>Telephone</dt><dd>{viewingVendor.telephone}</dd>
            <dt>Location / area</dt><dd>{viewingVendor.location_area}</dd>
            <dt>Registered</dt><dd>{formatDate(viewingVendor.registration_date)}</dd>
            <dt>Status</dt><dd><StatusBadge status={viewingVendor.status} /></dd>
            <div className="vendor-location-field">
              <button
                className="button button--secondary"
                disabled={viewingVendor.latitude == null || viewingVendor.longitude == null}
                onClick={() => openMapPicker(true, viewingVendor)}
                type="button"
              >
                View on map
              </button>
              {viewingVendor.latitude == null && (
                <p className="map-coordinate">No map coordinates saved.</p>
              )}
            </div>
          </dl>
        )}
      </Modal>
      {mapSession && (
        <MapPicker
          initialLocation={mapSession.initialLocation}
          isOpen
          onCancel={() => setMapSession(null)}
          onConfirm={(location) => {
            setForm((current) => ({
              ...current,
              location_area: location.location_area,
              latitude: location.latitude,
              longitude: location.longitude,
            }))
            setFieldErrors((current) => ({ ...current, location_area: undefined }))
            setMapSession(null)
          }}
          readOnly={mapSession.readOnly}
        />
      )}
      <ConfirmModal
        confirmLabel="Deactivate vendor"
        isConfirming={isDeactivating}
        isDestructive
        isOpen={Boolean(vendorToDeactivate)}
        message={`Deactivate ${vendorToDeactivate?.vendor_name}? It will remain in the records but cannot be used for new orders.`}
        onClose={() => setVendorToDeactivate(null)}
        onConfirm={deactivateVendor}
        title="Deactivate vendor"
      />
    </section>
  )
}
