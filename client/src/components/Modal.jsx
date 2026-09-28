import { useState } from "react";
export const Modal = ({ handleCreateFolder, setIsCreateFolderOpen }) => {
  const [folderName, setFolderName] = useState("");
  return (
    <div className="modal-backdrop">
      <section
        className="folder-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-modal-title"
      >
        <h2 id="folder-modal-title">Create folder</h2>
        <label className="folder-name-label" htmlFor="folder-name">
          Folder name
        </label>
        <input
          autoFocus
          id="folder-name"
          className="folder-name-input"
          type="text"
          placeholder="Enter a folder name"
          onChange={(e) => setFolderName(e.target.value)}
          value={folderName}
        />
        <div className="folder-modal-actions">
          <button
            className="action-button"
            type="button"
            onClick={() => setIsCreateFolderOpen(false)}
          >
            Cancel
          </button>
          <button
            className="folder-submit-button"
            type="button"
            onClick={() => handleCreateFolder(folderName)}
          >
            Create folder
          </button>
        </div>
      </section>
    </div>
  );
};
