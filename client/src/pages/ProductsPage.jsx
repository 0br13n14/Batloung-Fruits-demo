import { useState } from 'react'
import { DataTable } from '../components/DataTable'
import { FormField } from '../components/FormField'
import { Modal } from '../components/Modal'
import { SearchFilterBar } from '../components/SearchFilterBar'
import { StatusBadge } from '../components/StatusBadge'
import { ConfirmModal } from '../components/ConfirmModal'
import { useApiList, buildQuery, getServerFieldErrors } from '../hooks/useApiList'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useAuth } from '../context/useAuth'
import { ROLES } from '../constants'
import { api } from '../services/api'
import { formatCurrency } from '../utils/formatters'

const emptyProduct = {
  fruit_id: '',
  box_size_id: '',
  quantity_per_box: '',
  selling_price: '',
  is_active: true,
}

export function ProductsPage() {
  const { user } = useAuth()
  const isAdministrator = user.role === ROLES.ADMINISTRATOR
  const [search, setSearch] = useState('')
  const [fruitId, setFruitId] = useState('')
  const [boxSizeId, setBoxSizeId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productToDeactivate, setProductToDeactivate] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const debouncedSearch = useDebouncedValue(search)
  const query = buildQuery({
    search: debouncedSearch.trim(),
    fruit: fruitId,
    boxSize: boxSizeId,
  })
  const {
    rows: products,
    isLoading,
    error,
    refresh,
  } = useApiList('/products', 'products', query)
  const {
    rows: fruits,
    isLoading: fruitsLoading,
    error: fruitsError,
  } = useApiList('/fruits', 'fruits')
  const { rows: boxSizes, isLoading: boxSizesLoading, error: boxSizesError } =
    useApiList('/box-sizes', 'boxSizes')

  function openModal(product = null) {
    setEditingProduct(product)
    setForm(
      product
        ? {
            fruit_id: String(product.fruit_id),
            box_size_id: String(product.box_size_id),
            quantity_per_box: String(product.quantity_per_box),
            selling_price: String(product.selling_price),
            is_active: Boolean(product.is_active),
          }
        : emptyProduct,
    )
    setFieldErrors({})
    setFormError('')
    setIsModalOpen(true)
  }

  function validateForm() {
    const errors = {}
    if (!form.fruit_id) errors.fruit_id = 'Choose a fruit.'
    if (!form.box_size_id) errors.box_size_id = 'Choose a box size.'
    if (!Number.isInteger(Number(form.quantity_per_box)) || Number(form.quantity_per_box) < 1) {
      errors.quantity_per_box = 'Enter a positive whole number.'
    }
    if (!Number.isFinite(Number(form.selling_price)) || Number(form.selling_price) <= 0) {
      errors.selling_price = 'Enter a price greater than zero.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function saveProduct(event) {
    event.preventDefault()
    if (!validateForm()) return
    setIsSaving(true)
    setFormError('')
    const payload = {
      fruit_id: Number(form.fruit_id),
      box_size_id: Number(form.box_size_id),
      quantity_per_box: Number(form.quantity_per_box),
      selling_price: Number(form.selling_price),
    }
    if (editingProduct) payload.is_active = form.is_active
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload)
      } else {
        await api.post('/products', payload)
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

  async function deactivateProduct() {
    if (!productToDeactivate) return
    setIsDeactivating(true)
    setActionError('')
    try {
      await api.delete(`/products/${productToDeactivate.id}`)
      setProductToDeactivate(null)
      refresh()
    } catch (requestError) {
      setActionError(requestError.message)
      setProductToDeactivate(null)
    } finally {
      setIsDeactivating(false)
    }
  }

  const columns = [
    { key: 'fruit_name', header: 'Fruit' },
    { key: 'box_size', header: 'Box size' },
    { key: 'quantity_per_box', header: 'Quantity per box', numeric: true },
    {
      key: 'selling_price',
      header: 'Selling price',
      numeric: true,
      render: (product) => formatCurrency(product.selling_price),
    },
    {
      key: 'status',
      header: 'Status',
      render: (product) => (
        <StatusBadge status={product.is_active ? 'Active' : 'Inactive'} />
      ),
    },
  ]
  if (isAdministrator) {
    columns.push({
      key: 'actions',
      header: 'Actions',
      render: (product) => (
        <div className="table-actions">
          <button className="button button--secondary" onClick={() => openModal(product)} type="button">
            Edit
          </button>
          {product.is_active && (
            <button
              className="button button--danger"
              onClick={() => setProductToDeactivate(product)}
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
    <section className="management-page" aria-labelledby="products-heading">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Inventory setup</p>
          <h2 id="products-heading">Box Sizes and Products</h2>
          <p className="page-description">Box sizes are reference data; products pair a fruit with a box size.</p>
        </div>
        {isAdministrator && (
          <button className="button button--primary" onClick={() => openModal()} type="button">
            Add product
          </button>
        )}
      </div>
      <section className="reference-card" aria-labelledby="box-sizes-heading">
        <h3 id="box-sizes-heading">Box sizes</h3>
        {boxSizesLoading && <p>Loading box sizes...</p>}
        {boxSizesError && <p className="inline-error" role="alert">{boxSizesError}</p>}
        {!boxSizesLoading && !boxSizesError && boxSizes.length === 0 && <p>No box sizes found.</p>}
        {!boxSizesLoading && !boxSizesError && boxSizes.length > 0 && (
          <ul className="box-size-list">
            {boxSizes.map((boxSize) => <li key={boxSize.id}>{boxSize.name}</li>)}
          </ul>
        )}
      </section>
      {actionError && <div className="form-message form-message--error" role="alert">{actionError}</div>}
      {fruitsError && <div className="form-message form-message--error" role="alert">{fruitsError}</div>}
      {boxSizesError && <div className="form-message form-message--error" role="alert">{boxSizesError}</div>}
      <SearchFilterBar
        filters={[
          {
            name: 'fruit',
            label: 'Fruit',
            value: fruitId,
            options: [
              { value: '', label: 'All fruits' },
              ...fruits.map((fruit) => ({ value: String(fruit.id), label: fruit.name })),
            ],
          },
          {
            name: 'boxSize',
            label: 'Box size',
            value: boxSizeId,
            options: [
              { value: '', label: 'All box sizes' },
              ...boxSizes.map((boxSize) => ({ value: String(boxSize.id), label: boxSize.name })),
            ],
          },
        ]}
        onFilterChange={(name, value) => {
          if (name === 'fruit') setFruitId(value)
          if (name === 'boxSize') setBoxSizeId(value)
        }}
        onSearchChange={setSearch}
        searchLabel="Search products"
        searchValue={search}
      />
      <DataTable
        columns={columns}
        emptyMessage="No products found."
        error={error}
        loading={isLoading || fruitsLoading || boxSizesLoading}
        onRetry={refresh}
        rows={products}
      />

      <Modal
        footer={
          <>
            <button className="button button--secondary" onClick={() => setIsModalOpen(false)} type="button">Cancel</button>
            <button
              className="button button--primary"
              disabled={isSaving || fruitsLoading || boxSizesLoading || Boolean(fruitsError || boxSizesError)}
              form="product-form"
              type="submit"
            >
              {isSaving ? 'Saving...' : editingProduct ? 'Save changes' : 'Add product'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit product' : 'Add product'}
      >
        <form className="record-form" id="product-form" noValidate onSubmit={saveProduct}>
          {formError && <div className="form-message form-message--error" role="alert">{formError}</div>}
          {fruitsError && <div className="form-message form-message--error" role="alert">{fruitsError}</div>}
          <FormField error={fieldErrors.fruit_id} label="Fruit" name="fruit_id" required>
            <select onChange={(event) => setForm((current) => ({ ...current, fruit_id: event.target.value }))} value={form.fruit_id}>
              <option value="">Choose a fruit</option>
              {fruits.filter((fruit) => fruit.is_active || String(fruit.id) === form.fruit_id).map((fruit) => (
                <option key={fruit.id} value={fruit.id}>{fruit.name}</option>
              ))}
            </select>
          </FormField>
          <FormField error={fieldErrors.box_size_id} label="Box size" name="box_size_id" required>
            <select onChange={(event) => setForm((current) => ({ ...current, box_size_id: event.target.value }))} value={form.box_size_id}>
              <option value="">Choose a box size</option>
              {boxSizes.map((boxSize) => <option key={boxSize.id} value={boxSize.id}>{boxSize.name}</option>)}
            </select>
          </FormField>
          <FormField error={fieldErrors.quantity_per_box} label="Quantity per box" name="quantity_per_box" required>
            <input min="1" onChange={(event) => setForm((current) => ({ ...current, quantity_per_box: event.target.value }))} type="number" value={form.quantity_per_box} />
          </FormField>
          <FormField error={fieldErrors.selling_price} label="Selling price (M)" name="selling_price" required>
            <input min="0.01" onChange={(event) => setForm((current) => ({ ...current, selling_price: event.target.value }))} step="0.01" type="number" value={form.selling_price} />
          </FormField>
          {editingProduct && (
            <FormField label="Status" name="is_active">
              <select onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.value === 'true' }))} value={String(form.is_active)}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </FormField>
          )}
        </form>
      </Modal>
      <ConfirmModal
        confirmLabel={isDeactivating ? 'Deactivating...' : 'Deactivate product'}
        isDestructive
        isConfirming={isDeactivating}
        isOpen={Boolean(productToDeactivate)}
        message={`Deactivate ${productToDeactivate?.fruit_name} — ${productToDeactivate?.box_size}?`}
        onClose={() => setProductToDeactivate(null)}
        onConfirm={deactivateProduct}
        title="Deactivate product"
      />
    </section>
  )
}
