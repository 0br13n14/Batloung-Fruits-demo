import { useState } from 'react'
import { ConfirmModal } from '../components/ConfirmModal'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { Modal } from '../components/Modal'
import { SearchFilterBar } from '../components/SearchFilterBar'
import { StatusBadge } from '../components/StatusBadge'
import { useApiList, buildQuery, getServerFieldErrors } from '../hooks/useApiList'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useAuth } from '../context/useAuth'
import { ROLES } from '../constants'
import { api } from '../services/api'

const emptyFruit = {
  name: '',
  description: '',
  source_province_ids: [],
  is_active: true,
}

export function FruitsPage() {
  const { user } = useAuth()
  const isAdministrator = user.role === ROLES.ADMINISTRATOR
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFruit, setEditingFruit] = useState(null)
  const [form, setForm] = useState(emptyFruit)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [fruitToDeactivate, setFruitToDeactivate] = useState(null)
  const [actionError, setActionError] = useState('')
  const [isDeactivating, setIsDeactivating] = useState(false)
  const debouncedSearch = useDebouncedValue(search)
  const query = buildQuery({
    search: debouncedSearch.trim(),
    status,
  })
  const {
    rows: fruits,
    isLoading,
    error,
    refresh,
  } = useApiList('/fruits', 'fruits', query)
  const {
    rows: provinces,
    isLoading: provincesLoading,
    error: provincesError,
  } = useApiList('/provinces', 'provinces')

  function openAddModal() {
    setEditingFruit(null)
    setForm(emptyFruit)
    setFieldErrors({})
    setFormError('')
    setIsModalOpen(true)
  }

  function openEditModal(fruit) {
    setEditingFruit(fruit)
    setForm({
      name: fruit.name,
      description: fruit.description ?? '',
      source_province_ids: (fruit.source_provinces ?? []).map((province) =>
        Number(province.id),
      ),
      is_active: Boolean(fruit.is_active),
    })
    setFieldErrors({})
    setFormError('')
    setIsModalOpen(true)
  }

  function validateForm() {
    const errors = {}
    if (!form.name.trim()) errors.name = 'Enter a fruit name.'
    if (form.name.trim().length > 80) {
      errors.name = 'Fruit names must be 80 characters or fewer.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function saveFruit(event) {
    event.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    setFormError('')
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        source_province_ids: form.source_province_ids,
      }
      if (editingFruit) payload.is_active = form.is_active
      if (editingFruit) {
        await api.put(`/fruits/${editingFruit.id}`, payload)
      } else {
        await api.post('/fruits', payload)
      }
      setIsModalOpen(false)
      refresh()
    } catch (saveError) {
      const serverFieldErrors = getServerFieldErrors(saveError)
      if (saveError.status === 409 && !serverFieldErrors.name) {
        serverFieldErrors.name = saveError.message
      }
      setFieldErrors(serverFieldErrors)
      setFormError(saveError.status === 409 ? '' : saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function deactivateFruit() {
    if (!fruitToDeactivate) return
    setIsDeactivating(true)
    setActionError('')
    try {
      await api.delete(`/fruits/${fruitToDeactivate.id}`)
      setFruitToDeactivate(null)
      refresh()
    } catch (requestError) {
      setActionError(requestError.message)
      setFruitToDeactivate(null)
    } finally {
      setIsDeactivating(false)
    }
  }

  const columns = [
    { key: 'name', header: 'Fruit' },
    {
      key: 'description',
      header: 'Description',
      render: (fruit) => fruit.description || '—',
    },
    {
      key: 'source_provinces',
      header: 'Source provinces',
      render: (fruit) =>
        fruit.source_provinces?.map(({ name }) => name).join(', ') || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (fruit) => (
        <StatusBadge status={fruit.is_active ? 'Active' : 'Inactive'} />
      ),
    },
  ]
  if (isAdministrator) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      render: (fruit) => (
        <div className="table-actions">
          <button
            className="button button--secondary"
            onClick={() => openEditModal(fruit)}
            type="button"
          >
            Edit
          </button>
          {fruit.is_active && (
            <button
              className="button button--danger"
              onClick={() => setFruitToDeactivate(fruit)}
              type="button"
            >
              Deactivate
            </button>
          )}
        </div>
      ),
    })
  }

  return (
    <section className="management-page" aria-labelledby="fruits-heading">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Inventory setup</p>
          <h2 id="fruits-heading">Fruits</h2>
          <p className="page-description">Manage fruits and their source provinces.</p>
        </div>
        {isAdministrator && (
          <button className="button button--primary" onClick={openAddModal} type="button">
            Add fruit
          </button>
        )}
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
        searchLabel="Search fruits"
        searchValue={search}
      />
      <DataTable
        columns={columns}
        emptyMessage="No fruits found."
        error={error}
        loading={isLoading}
        onRetry={refresh}
        rows={fruits}
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
              disabled={isSaving || provincesLoading || Boolean(provincesError)}
              form="fruit-form"
              type="submit"
            >
              {isSaving ? 'Saving...' : editingFruit ? 'Save changes' : 'Add fruit'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFruit ? 'Edit fruit' : 'Add fruit'}
      >
        <form className="record-form" id="fruit-form" noValidate onSubmit={saveFruit}>
          {formError && (
            <div className="form-message form-message--error" role="alert">
              {formError}
            </div>
          )}
          <FormField error={fieldErrors.name} label="Fruit name" name="name" required>
            <input
              autoComplete="off"
              maxLength={80}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              value={form.name}
            />
          </FormField>
          <FormField label="Description" name="description">
            <textarea
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={3}
              value={form.description}
            />
          </FormField>
          <fieldset className="province-options">
            <legend>Allowed source provinces</legend>
            {provincesLoading && <p>Loading provinces...</p>}
            {provincesError && (
              <p className="field-error" role="alert">{provincesError}</p>
            )}
            {!provincesLoading && !provincesError && provinces.map((province) => {
              const id = Number(province.id)
              return (
                <label className="checkbox-option" key={province.id}>
                  <input
                    checked={form.source_province_ids.includes(id)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        source_province_ids: event.target.checked
                          ? [...current.source_province_ids, id]
                          : current.source_province_ids.filter(
                              (provinceId) => provinceId !== id,
                            ),
                      }))
                    }
                    type="checkbox"
                  />
                  {province.name}
                </label>
              )
            })}
            {fieldErrors.source_province_ids && (
              <span className="field-error" role="alert">
                {fieldErrors.source_province_ids}
              </span>
            )}
          </fieldset>
          {editingFruit && (
            <FormField label="Status" name="is_active">
              <select
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    is_active: event.target.value === 'true',
                  }))
                }
                value={String(form.is_active)}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </FormField>
          )}
        </form>
      </Modal>
      <ConfirmModal
        confirmLabel={isDeactivating ? 'Deactivating...' : 'Deactivate fruit'}
        isDestructive
        isConfirming={isDeactivating}
        isOpen={Boolean(fruitToDeactivate)}
        message={`Deactivate ${fruitToDeactivate?.name}? Historical records will be retained.`}
        onClose={() => setFruitToDeactivate(null)}
        onConfirm={deactivateFruit}
        title="Deactivate fruit"
      />
    </section>
  )
}
