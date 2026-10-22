import { cloneElement, isValidElement } from 'react'

export function FormField({
  id,
  name,
  label,
  error,
  required = false,
  children,
}) {
  const fieldId = id ?? name
  const errorId = `${fieldId}-error`
  const control =
    isValidElement(children) && typeof children.type === 'string'
      ? cloneElement(children, {
          id: fieldId,
          name,
          required,
          'aria-invalid': Boolean(error),
          'aria-describedby': error ? errorId : undefined,
        })
      : children

  return (
    <div className="form-field">
      <label htmlFor={fieldId}>
        {label}
        {required && <span className="required-marker"> *</span>}
      </label>
      {control}
      {error && (
        <span className="field-error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
