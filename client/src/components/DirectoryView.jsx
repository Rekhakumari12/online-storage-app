import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Modal } from "./Modal";

const basePath = "http://localhost:8080";

function DirectoryView() {
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  const [directoryItems, setDirectoryItems] = useState([]);

  const [progress, setProgress] = useState(0);
  const [edit, setEdit] = useState({ isEdit: false, id: null });
  const [newFileName, setNewFileName] = useState();

  console.log(edit, newFileName);

  const { "*": dirname } = useParams();
  const dirPath = dirname ? `${dirname}/` : "";
  // console.log(dirname);

  const getDirectoryItems = async () => {
    const response = await fetch(`${basePath}/directory/${dirPath}`);
    const json = await response.json();
    setDirectoryItems(json);
  };

  useEffect(() => {
    getDirectoryItems();
  }, [dirPath]);

  function handleOnChange(e) {
    const file = e.target.files[0]; // e.target.files - gives you array od files
    const xhr = new XMLHttpRequest(); // XHR used for progress instead of fetch
    xhr.open("POST", `${basePath}/files/${dirPath}${file.name}`, true); // Post request

    // xhr.setRequestHeader("filename", file.name); // #1 File name will be send from here to server
    xhr.addEventListener("load", () => {
      console.log(xhr.status, xhr.responseText);
      if (xhr.status === 409) {
        // if file already exists on server, then alert user
        alert(xhr.responseText);
      }
      getDirectoryItems();
    });
    // track upload progress, without upload object track download progress, shows bytes uploaded
    xhr.upload.addEventListener("progress", (e) => {
      const totalProgress = `${Math.floor((e.loaded / e.total) * 100)}`;
      console.log(totalProgress);
      setProgress(totalProgress);
    });
    xhr.send(file);
  }

  const handleFileRename = (itemId) => {
    setEdit((prev) => ({ ...prev, isEdit: true, id: itemId }));
  };

  const handleRenameFileSave = async (oldFileName, fileId) => {
    setEdit((prev) => ({ ...prev, isEdit: false, id: fileId }));
    setNewFileName("");
    try {
      const response = await fetch(`${basePath}/${dirPath}${oldFileName}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: newFileName
          ? JSON.stringify({ newFileName: `${dirPath}${newFileName}` })
          : JSON.stringify({ newFileName: oldFileName }),
      });

      const res = await response.json();
      console.log(res.message);
      getDirectoryItems();
    } catch (e) {
      console.log(e);
    }
  };

  const handleDelete = async (fileName) => {
    try {
      let doubleCheck = confirm("Are you sure you want to delete this file?");
      if (doubleCheck) {
        const response = await fetch(
          `${basePath}/files/${dirPath}${fileName}`,
          {
            method: "DELETE",
          },
        );
        const resp = await response.json();
        if (response.status === 200) {
          console.log(resp.message);
          getDirectoryItems();
        } else {
          alert("Error while deleting the file, Try again");
        }
      } else {
        console.log("Deletion cancelled.");
      }
    } catch (e) {
      console.log(e);
    }
  };

  // console.log(`${basePath} ${dirname}`);

  const handleCreateFolder = async (foldername) => {
    console.log(foldername);
    const URL = `${basePath}/directory/${dirPath}${foldername}`;
    try {
      const response = await fetch(URL, {
        method: "POST",
      });

      const res = await response.json();
      console.log(res.message);
      getDirectoryItems();
    } catch (e) {
      console.log(e);
    }
    setIsCreateFolderOpen(false);
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
            <input type="file" onChange={handleOnChange} />
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
          {directoryItems.map((item, i) => {
            const encodedPath = encodeURI(item.name);

            return (
              <li key={item.id} className="file-item">
                <div className="file-name">
                  <span className="file-icon">
                    {item.isDirectory ? "DIR" : "FILE"}
                  </span>
                  {item.name}
                  {edit.isEdit && edit.id === item.id && (
                    <input
                      type="text"
                      onChange={(e) => setNewFileName(e.target.value)}
                      value={newFileName}
                    />
                  )}
                </div>
                <>
                  <div className="file-actions">
                    {item.isDirectory ? (
                      <div className="file-actions">
                        <Link to={`./${encodedPath}`}>Open</Link>
                      </div>
                    ) : (
                      <a
                        href={`${basePath}/files/${dirPath}${encodedPath}?action=open`}
                      >
                        Open
                      </a>
                    )}
                    {!item.isDirectory && (
                      <a
                        href={`${basePath}/files/${dirPath}${encodedPath}?action=download`}
                      >
                        Download
                      </a>
                    )}
                    {edit.isEdit && edit.id === item.id ? (
                      <button
                        className="action-button"
                        onClick={() => handleRenameFileSave(item.name, item.id)}
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        className="action-button"
                        onClick={() => handleFileRename(item.id)}
                      >
                        Rename
                      </button>
                    )}
                    <button
                      className="action-button danger"
                      onClick={() => handleDelete(item.name)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              </li>
            );
          })}
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
