import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  createDirectory,
  deleteDirectory,
  deleteFile,
  getDirectory,
  renameDirectory,
  renameFile,
  storageBaseUrl,
} from "../api/storageApi";
import { DirectoryEntry, FileEntry } from "./DirectoryEntries";
import { Modal } from "./Modal";

function DirectoryView() {
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [directory, setDirectory] = useState({ files: [], directories: [] });
  const [progress, setProgress] = useState(0);
  const [editing, setEditing] = useState({ type: null, id: null });
  const [newName, setNewName] = useState("");

  const { dirId = "" } = useParams();

  const getDirectoryItems = useCallback(async () => {
    try {
      setDirectory(await getDirectory(dirId));
    } catch (error) {
      alert(error.message);
    }
  }, [dirId]);

  useEffect(() => {
    getDirectoryItems();
  }, [getDirectoryItems]);

  function handleUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${storageBaseUrl}/file/${dirId}`, true);
    xhr.setRequestHeader("filename", file.name);
    xhr.addEventListener("load", () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        alert(xhr.responseText || "File upload failed");
      }
      getDirectoryItems();
    });
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        setProgress(Math.floor((event.loaded / event.total) * 100));
      }
    });
    xhr.send(file);
  }

  const startRename = (type, item) => {
    setEditing({ type, id: item.id });
    setNewName(item.name);
  };

  const saveRename = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      alert("Please enter a name");
      return;
    }

    try {
      if (editing.type === "directory") {
        await renameDirectory(editing.id, trimmedName);
      } else {
        await renameFile(editing.id, trimmedName);
      }
      setEditing({ type: null, id: null });
      setNewName("");
      await getDirectoryItems();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (type, item) => {
    const message =
      type === "directory"
        ? "Delete this folder and all files and subfolders inside it? This cannot be undone."
        : "Are you sure you want to delete this file?";
    if (!confirm(message)) return;

    try {
      if (type === "directory") {
        await deleteDirectory(item.id);
      } else {
        await deleteFile(item.id);
      }
      await getDirectoryItems();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleCreateFolder = async (folderName) => {
    const trimmedName = folderName.trim();
    if (!trimmedName) {
      alert("Please enter folder name");
      return;
    }

    try {
      await createDirectory(dirId, trimmedName);
      setIsCreateFolderOpen(false);
      await getDirectoryItems();
    } catch (error) {
      alert(error.message);
    }
  };
  return (
    <main className="storage-app">
      <header className="app-header">
        <div>
          <p className="eyebrow">ONLINE STORAGE</p>
          <h1>My Files</h1>
        </div>
        <div className="header-actions">
          <button
            className="create-folder-button"
            type="button"
            onClick={() => setIsCreateFolderOpen(true)}
          >
            <span aria-hidden="true">+</span>
            Create folder
          </button>
          <label className="upload-button">
            Upload file
            <input type="file" onChange={handleUpload} />
          </label>
        </div>
      </header>

      <div className="progress-row">
        <span>Upload progress</span>
        <strong>{progress}%</strong>
      </div>

      <section className="file-panel">
        <div className="path-row">
          <span>Location</span>
        </div>
        <ul className="file-list">
          {directory.directories.map((item) => (
            <DirectoryEntry
              key={item.id}
              item={item}
              isEditing={editing.type === "directory" && editing.id === item.id}
              name={newName}
              onNameChange={setNewName}
              onRename={() => startRename("directory", item)}
              onSave={saveRename}
              onDelete={() => handleDelete("directory", item)}
            />
          ))}
          {directory.files.map((item) => (
            <FileEntry
              key={item.id}
              item={item}
              isEditing={editing.type === "file" && editing.id === item.id}
              name={newName}
              onNameChange={setNewName}
              onRename={() => startRename("file", item)}
              onSave={saveRename}
              onDelete={() => handleDelete("file", item)}
            />
          ))}
        </ul>
      </section>

      {isCreateFolderOpen && (
        <Modal
          handleCreateFolder={handleCreateFolder}
          setIsCreateFolderOpen={setIsCreateFolderOpen}
        />
      )}
    </main>
  );
}

export default DirectoryView;
