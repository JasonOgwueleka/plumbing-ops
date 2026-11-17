// A button that asks "Are you sure?" inline before running onConfirm.
import { useState } from 'react'

export default function ConfirmButton({ onConfirm, children, className = 'btn-danger' }) {
  const [asking, setAsking] = useState(false)

  if (!asking) {
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {children}
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 text-sm">
      Are you sure?
      <button
        type="button"
        className="btn-danger"
        onClick={() => {
          setAsking(false)
          onConfirm()
        }}
      >
        Yes
      </button>
      <button type="button" className="btn-secondary" onClick={() => setAsking(false)}>
        No
      </button>
    </span>
  )
}
