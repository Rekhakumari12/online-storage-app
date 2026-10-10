import { useEffect, useRef } from "react";

export const Modal = ({
  title,
  label,
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  selectionEnd,
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.focus();
    const end = selectionEnd ?? input.value.length;
    input.setSelectionRange(0, Math.min(end, input.value.length));
  }, [selectionEnd]);

  return (
    <div className="modal-backdrop">
      <section
        className="folder-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-modal-title"
      >
        <h2 id="folder-modal-title">{title}</h2>
        <label className="folder-name-label" htmlFor="name-input">
          {label}
        </label>
        <input
          required
          ref={inputRef}
          id="name-input"
          className="folder-name-input"
          type="text"
          placeholder={`Enter ${label.toLowerCase()}`}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
        <div className="folder-modal-actions">
          <button className="action-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="folder-submit-button"
            type="button"
            onClick={onSubmit}
          >
            {submitLabel}
          </button>
        </div>
      </section>
    </div>
  );
};
