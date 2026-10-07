import { Link } from "react-router";
import { storageBaseUrl } from "../api/storageApi";

export function DirectoryEntry({
  item,
  isEditing,
  name,
  onNameChange,
  onRename,
  onSave,
  onDelete,
}) {
  return (
    <li className="file-item">
      <div className="file-name">
        <span className="file-icon">DIR</span>
        {isEditing ? (
          <input
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            aria-label={`Rename ${item.name}`}
          />
        ) : (
          item.name
        )}
      </div>
      <div className="file-actions">
        <Link to={`/directory/${item.id}`}>Open</Link>
        <button className="action-button" onClick={isEditing ? onSave : onRename}>
          {isEditing ? "Save" : "Rename"}
        </button>
        <button className="action-button danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  );
}

export function FileEntry({
  item,
  isEditing,
  name,
  onNameChange,
  onRename,
  onSave,
  onDelete,
}) {
  return (
    <li className="file-item">
      <div className="file-name">
        <span className="file-icon">FILE</span>
        {isEditing ? (
          <input
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            aria-label={`Rename ${item.name}`}
          />
        ) : (
          item.name
        )}
      </div>
      <div className="file-actions">
        <a href={`${storageBaseUrl}/file/${item.id}`}>Open</a>
        <a href={`${storageBaseUrl}/file/${item.id}?action=download`}>
          Download
        </a>
        <button className="action-button" onClick={isEditing ? onSave : onRename}>
          {isEditing ? "Save" : "Rename"}
        </button>
        <button className="action-button danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  );
}