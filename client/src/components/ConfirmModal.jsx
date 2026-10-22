import { Modal } from './Modal'

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  isDestructive = false,
}) {
  return (
    <Modal
      footer={
        <>
          <button
            className="button button--secondary"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`button ${isDestructive ? 'button--danger' : 'button--primary'}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <p>{message}</p>
    </Modal>
  )
}
