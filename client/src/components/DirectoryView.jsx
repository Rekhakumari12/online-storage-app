import {
  faFolder,
  faFolderPlus,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  createDirectory,
  deleteDirectory,
  deleteFile,
  getDirectory,
  renameDirectory,
  renameFile,
  storageBaseUrl,
} from "../api/storageApi";
import { getBaseName, getFileIcon, getFileIconColor } from "../utils/fileUtils";
import { Modal } from "./Modal";
import ProfileMenu from "./ProfileMenu";

function DirectoryView() {
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [directory, setDirectory] = useState({ files: [], directories: [] });
  const [uploadQueue, setUploadQueue] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [editing, setEditing] = useState({ type: null, id: null });
  const [newName, setNewName] = useState("");
  const [nameSelectionEnd, setNameSelectionEnd] = useState(null);

  const { dirId = "" } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        menuOpenId &&
        !event.target.closest(".more-menu") &&
        !event.target.closest(".menu-button")
      ) {
        setMenuOpenId(null);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [menuOpenId]);

  const getDirectoryItems = useCallback(async () => {
    try {
      setDirectory(await getDirectory(dirId));
    } catch (error) {
      if (error.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      alert(error.message);
    }
  }, [dirId, navigate]);

  useEffect(() => {
    getDirectoryItems();
  }, [getDirectoryItems]);

  const allItems = useMemo(
    () => [...directory.directories, ...directory.files],
    [directory],
  );

  function handleUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const uploadId = `${Date.now()}-${file.name}`;
    setUploadQueue((prev) => [
      ...prev,
      { id: uploadId, name: file.name, percent: 0 },
    ]);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${storageBaseUrl}/file/${dirId}`, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("filename", file.name);
    xhr.addEventListener("load", () => {
      if (xhr.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        alert(xhr.responseText || "File upload failed");
      }
      setUploadQueue((prev) => prev.filter((item) => item.id !== uploadId));
      getDirectoryItems();
    });
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.floor((event.loaded / event.total) * 100);
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === uploadId ? { ...item, percent } : item,
          ),
        );
      }
    });
    xhr.send(file);
  }

  const startRename = (type, item) => {
    setEditing({ type, id: item.id });
    setNewName(item.name);
    setNameSelectionEnd(
      type === "file" ? getBaseName(item.name).length : item.name.length,
    );
    setMenuOpenId(null);
  };

  const closeNameModal = () => {
    setIsCreateFolderOpen(false);
    setEditing({ type: null, id: null });
    setNewName("");
    setNameSelectionEnd(null);
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
      setMenuOpenId(null);
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

  const openItem = (type, item, event) => {
    if (
      event.target.closest("button") ||
      event.target.closest("input") ||
      event.target.closest("a")
    ) {
      return;
    }

    if (type === "directory") {
      navigate(`/directory/${item.id}`);
      return;
    }

    window.open(
      `${storageBaseUrl}/file/${item.id}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const renderMenu = (type, item) => (
    <div className="more-menu">
      {type === "directory" ? (
        <>
          <button type="button" onClick={() => startRename("directory", item)}>
            Rename
          </button>
          <button type="button" onClick={() => handleDelete("directory", item)}>
            Delete
          </button>
        </>
      ) : (
        <>
          <a href={`${storageBaseUrl}/file/${item.id}?action=download`}>
            Download
          </a>
          <button type="button" onClick={() => startRename("file", item)}>
            Rename
          </button>
          <button type="button" onClick={() => handleDelete("file", item)}>
            Delete
          </button>
        </>
      )}
    </div>
  );

  return (
    <main className="drive-layout">
      <section className="drive-main">
        <header className="drive-header">
          <div>
            <h1>My Drive</h1>
          </div>

          <div className="drive-actions">
            <button
              className="ghost-button"
              type="button"
              onClick={() => setIsCreateFolderOpen(true)}
            >
              <FontAwesomeIcon icon={faFolderPlus} />
              <span>New folder</span>
            </button>

            <label className="upload-button" title="Upload file">
              <FontAwesomeIcon icon={faUpload} />
              <span>Upload file</span>
              <input type="file" onChange={handleUpload} />
            </label>

            <ProfileMenu />
          </div>
        </header>

        {uploadQueue.length > 0 && (
          <div className="upload-status-list">
            {uploadQueue.map((item) => (
              <div className="upload-status-item" key={item.id}>
                <span>{item.name}</span>
                <div className="upload-progress">
                  <div
                    className="upload-progress-bar"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="drive-content">
          {allItems.length === 0 ? (
            <div className="empty-state">
              <p>Upload files or create a folder to get started.</p>
            </div>
          ) : (
            <div className="item-grid">
              {directory.directories.map((item) => (
                <div
                  className="drive-item"
                  key={item.id}
                  onClick={(event) => openItem("directory", item, event)}
                >
                  <div className="item-row">
                    <div className="file-name-box">
                      <div className="file-icon folder">
                        <FontAwesomeIcon
                          icon={faFolder}
                          style={{ color: "#eab308" }}
                        />
                      </div>
                      <span>{item.name}</span>
                    </div>

                    <button
                      className="menu-button"
                      type="button"
                      onClick={() =>
                        setMenuOpenId(menuOpenId === item.id ? null : item.id)
                      }
                    >
                      ⋮
                    </button>
                  </div>

                  {menuOpenId === item.id && renderMenu("directory", item)}
                </div>
              ))}

              {directory.files.map((item) => (
                <div
                  className="drive-item"
                  key={item.id}
                  onClick={(event) => openItem("file", item, event)}
                >
                  <div className="item-row">
                    <div className="file-name-box">
                      <div className="file-icon file">
                        <FontAwesomeIcon
                          icon={getFileIcon(item.name)}
                          style={{ color: getFileIconColor(item.name) }}
                        />
                      </div>
                      <span>{item.name}</span>
                    </div>

                    <button
                      className="menu-button"
                      type="button"
                      onClick={() =>
                        setMenuOpenId(menuOpenId === item.id ? null : item.id)
                      }
                    >
                      ⋮
                    </button>
                  </div>

                  {menuOpenId === item.id && renderMenu("file", item)}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {(isCreateFolderOpen || editing.type) && (
        <Modal
          title={
            editing.type
              ? `Rename ${editing.type === "file" ? "file" : "folder"}`
              : "Create folder"
          }
          label={editing.type === "file" ? "File name" : "Folder name"}
          value={newName}
          onChange={setNewName}
          onSubmit={
            editing.type ? saveRename : () => handleCreateFolder(newName)
          }
          onCancel={closeNameModal}
          submitLabel={editing.type ? "Save" : "Create folder"}
          selectionEnd={editing.type ? nameSelectionEnd : null}
        />
      )}
    </main>
  );
}

export default DirectoryView;
