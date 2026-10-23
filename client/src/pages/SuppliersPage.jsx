import { useState } from 'react'
import { ConfirmModal } from '../components/ConfirmModal'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { Modal } from '../components/Modal'
import { SearchFilterBar } from '../components/SearchFilterBar'
import { useApiList, buildQuery, getServerFieldErrors } from '../hooks/useApiList'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { api } from '../services/api'
import { validateEmail, validateTelephone } from '../utils/formValidation'

const emptySupplier = {
  name: '',
  province_id: '',
  contact_person: '',
  telephone: '',
  email: '',
  physical_address: '',
}

export function SuppliersPage() {
  const [search, setSearch] = useState('')
  const [provinceId, setProvinceId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [supplierToDelete, setSupplierToDelete] = useState(null)
  const [form, setForm] = useState(emptySupplier)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const debouncedSearch = useDebouncedValue(search)
  const query = buildQuery({ search: debouncedSearch.trim(), province: provinceId })
  const {
    rows: suppliers,
    isLoading,
    error,
    refresh,
  } = useApiList('/suppliers', 'suppliers', query)
  const {
    rows: provinces,
    isLoading: provincesLoading,
    error: provincesError,
  } = useApiList('/provinces', 'provinces')

  function openModal(supplier = null) {
    setEditingSupplier(supplier)
    setForm(
      supplier
        ? {
            name: supplier.name,
            province_id: String(supplier.province_id),
            contact_person: supplier.contact_person ?? '',
            telephone: supplier.telephone ?? '',
            email: supplier.email ?? '',
            physical_address: supplier.physical_address ?? '',
          }
        : emptySupplier,
    )
    setFieldErrors({})
    setFormError('')
    setIsModalOpen(true)
  }

  function validateForm() {
    const errors = {}
    if (!form.name.trim()) errors.name = 'Enter a supplier name.'
    if (form.name.trim().length > 150) errors.name = 'Supplier name must be 150 characters or fewer.'
    if (!form.province_id) errors.province_id = 'Choose a province.'
    if (!validateEmail(form.email.trim())) errors.email = 'Enter a valid email address.'
    if (!validateTelephone(form.telephone.trim())) errors.telephone = 'Enter a valid telephone number.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function saveSupplier(event) {
    event.preventDefault()
    if (!validateForm()) return
    setIsSaving(true)
    setFormError('')
    const payload = {
      name: form.name.trim(),
      province_id: Number(form.province_id),
      contact_person: form.contact_person.trim() || null,
      telephone: form.telephone.trim() || null,
      email: form.email.trim() || null,
      physical_address: form.physical_address.trim() || null,
    }
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, payload)
      } else {
        await api.post('/suppliers', payload)
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

  async function deleteSupplier() {
    if (!supplierToDelete) return
    setIsDeleting(true)
    setActionError('')
    try {
      await api.delete(`/suppliers/${supplierToDelete.id}`)
      setSupplierToDelete(null)
      refresh()
    } catch (requestError) {
      setActionError(requestError.message)
      setSupplierToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const columns = [
    { key: 'name', header: 'Supplier' },
    { key: 'province_name', header: 'Province' },
    { key: 'contact_person', header: 'Contact person', render: (supplier) => supplier.contact_person || '—' },
    { key: 'telephone', header: 'Telephone', render: (supplier) => supplier.telephone || '—' },
    { key: 'email', header: 'Email', render: (supplier) => supplier.email || '—' },
    { key: 'physical_address', header: 'Address', render: (supplier) => supplier.physical_address || '—' },
    {
      key: 'actions',
      header: 'Actions',
      render: (supplier) => (
        <div className="table-actions">
          <button className="button button--secondary" onClick={() => openModal(supplier)} type="button">Edit</button>
          <button className="button button--danger" onClick={() => setSupplierToDelete(supplier)} type="button">Delete</button>
        </div>
      ),
    },
  ]

  return (
    <section className="management-page" aria-labelledby="suppliers-heading">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Supply chain</p>
          <h2 id="suppliers-heading">Suppliers</h2>
          <p className="page-description">Maintain supplier contacts and operating provinces.</p>
        </div>
        <button className="button button--primary" onClick={() => openModal()} type="button">Add supplier</button>
      </div>
      {actionError && <div className="form-message form-message--error" role="alert">{actionError}</div>}
      <SearchFilterBar
        filters={[
          {
            name: 'province',
            label: 'Province',
            value: provinceId,
            options: [
              { value: '', label: 'All provinces' },
              ...provinces.map((province) => ({ value: String(province.id), label: province.name })),
            ],
          },
        ]}
        onFilterChange={(name, value) => {
          if (name === 'province') setProvinceId(value)
        }}
        onSearchChange={setSearch}
        searchLabel="Search suppliers"
        searchValue={search}
      />
      {provincesError && <div className="form-message form-message--error" role="alert">{provincesError}</div>}
      <DataTable
        columns={columns}
        emptyMessage="No suppliers found."
        error={error}
        loading={isLoading || provincesLoading}
        onRetry={refresh}
        rows={suppliers}
      />

      <Modal
        footer={
          <>
            <button className="button button--secondary" onClick={() => setIsModalOpen(false)} type="button">Cancel</button>
            <button
              className="button button--primary"
              disabled={isSaving || provincesLoading || Boolean(provincesError)}
              form="supplier-form"
              type="submit"
            >
              {isSaving ? 'Saving...' : editingSupplier ? 'Save changes' : 'Add supplier'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Edit supplier' : 'Add supplier'}
      >
        <form className="record-form" id="supplier-form" noValidate onSubmit={saveSupplier}>
          {formError && <div className="form-message form-message--error" role="alert">{formError}</div>}
          {provincesError && <div className="form-message form-message--error" role="alert">{provincesError}</div>}
          <FormField error={fieldErrors.name} label="Supplier name" name="name" required>
            <input maxLength={150} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} />
          </FormField>
          <FormField error={fieldErrors.province_id} label="Province" name="province_id" required>
            <select onChange={(event) => setForm((current) => ({ ...current, province_id: event.target.value }))} value={form.province_id}>
              <option value="">Choose a province</option>
              {provinces.map((province) => <option key={province.id} value={province.id}>{province.name}</option>)}
            </select>
          </FormField>
          <FormField error={fieldErrors.contact_person} label="Contact person" name="contact_person">
            <input maxLength={150} onChange={(event) => setForm((current) => ({ ...current, contact_person: event.target.value }))} value={form.contact_person} />
          </FormField>
          <FormField error={fieldErrors.telephone} label="Telephone" name="telephone">
            <input maxLength={40} onChange={(event) => setForm((current) => ({ ...current, telephone: event.target.value }))} type="tel" value={form.telephone} />
          </FormField>
          <FormField error={fieldErrors.email} label="Email" name="email">
            <input maxLength={254} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} type="email" value={form.email} />
          </FormField>
          <FormField error={fieldErrors.physical_address} label="Physical address" name="physical_address">
            <textarea maxLength={255} onChange={(event) => setForm((current) => ({ ...current, physical_address: event.target.value }))} rows={3} value={form.physical_address} />
          </FormField>
        </form>
      </Modal>
      <ConfirmModal
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete supplier'}
        isDestructive
        isConfirming={isDeleting}
        isOpen={Boolean(supplierToDelete)}
        message={`Delete ${supplierToDelete?.name}? Suppliers with recorded purchases cannot be deleted.`}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={deleteSupplier}
        title="Delete supplier"
      />
    </section>
  )
}
