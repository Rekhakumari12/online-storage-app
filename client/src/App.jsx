import { useEffect, useState } from "react";
import "./App.css";

const basePath = "http://localhost:8080";

function App() {
  const [currentPath, setCurrentPath] = useState("/");
  const [directoryItems, setDirectoryItems] = useState([]);
  const [progress, setProgress] = useState(0);
  const [edit, setEdit] = useState({ isEdit: false, id: null });
  const [newFileName, setNewFileName] = useState();

  const getDirectoryItems = async () => {
    const response = await fetch(`${basePath}${encodeURI(currentPath)}`);
    const json = await response.json();
    setDirectoryItems(json);
  };

  useEffect(() => {
    getDirectoryItems();
  }, [currentPath]);

  const joinPath = (base, itemName) =>
    `${base.endsWith("/") ? base.slice(0, -1) : base}/${itemName}`;

  function handleOnChange(e) {
    const file = e.target.files[0]; // e.target.files - gives you array od files
    const xhr = new XMLHttpRequest(); // XHR used for progress instead of fetch
    xhr.open("POST", `${basePath}/${file.name}`, true); // Post request

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
    try {
      const response = await fetch(`${basePath}/${oldFileName}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: newFileName
          ? JSON.stringify({ newFileName })
          : JSON.stringify({ newFileName: oldFileName }),
      });

      const res = await response.json();
      console.log(res);
      getDirectoryItems();
    } catch (e) {
      console.log(e);
    }
  };

  const handleDelete = async (fileName) => {
    try {
      let doubleCheck = confirm("Are you sure you want to delete this file?");
      if (doubleCheck) {
        const response = await fetch(`${basePath}/${fileName}`, {
          method: "DELETE",
        });
        const resp = await response.json();
        if (response.status === 200) {
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

  return (
    <main className="storage-app">
      <header className="app-header">
        <div>
          <p className="eyebrow">ONLINE STORAGE</p>
          <h1>My Files</h1>
        </div>
        <label className="upload-button">
          Upload file
          <input type="file" onChange={handleOnChange} />
        </label>
      </header>

      <div className="progress-row">
        <span>Upload progress</span>
        <strong>{progress}%</strong>
      </div>

      <section className="file-panel">
        <div className="path-row">
          <span>Location</span>
          <code>{currentPath}</code>
        </div>
        <ul className="file-list">
          {directoryItems.map((item, i) => {
            const itemPath = joinPath(currentPath, item.name);
            const encodedPath = encodeURI(itemPath);

            return (
              <li key={item.id} className="file-item">
                <div className="file-name">
                  <span className="file-icon">
                    {item.isDirectory ? "DIR" : "FILE"}
                  </span>
                  {!item.isDirectory && edit.isEdit && edit.id === item.id ? (
                    <input
                      type="text"
                      onChange={(e) => setNewFileName(e.target.value)}
                      value={newFileName || item.name}
                    />
                  ) : (
                    item.name
                  )}
                </div>
                {item.isDirectory ? (
                  <button
                    className="action-button"
                    onClick={() => {
                      setCurrentPath(itemPath);
                      window.history.pushState({}, "", itemPath);
                    }}
                  >
                    Open
                  </button>
                ) : (
                  <>
                    <div className="file-actions">
                      <a href={`${basePath}${encodedPath}?action=open`}>Open</a>
                      <a href={`${basePath}${encodedPath}?action=download`}>
                        Download
                      </a>
                      {edit.isEdit && edit.id === item.id ? (
                        <button
                          className="action-button"
                          onClick={() =>
                            handleRenameFileSave(item.name, item.id)
                          }
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
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

export default App;
