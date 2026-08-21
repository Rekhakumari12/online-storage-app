import { useEffect, useState } from 'react';
import './App.css';

const basePath = 'http://localhost:8080';

function App() {
  const [currentPath, setCurrentPath] = useState('/');
  const [directoryItems, setDirectoryItems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(`${basePath}`);
      const json = await response.json();
      // console.log(json);
      setDirectoryItems(json);
    };
    fetchData();
  }, []);

  const joinPath = (base, itemName) =>
    `${base.endsWith('/') ? base.slice(0, -1) : base}/${itemName}`;

  function handleOnChange(e) {
    const file = e.target.files[0];
    const xhr = new XMLHttpRequest();
    xhr.open('POST', basePath, true);
    xhr.addEventListener('load', () => {
      console.log(xhr.response);
    });
    
    xhr.upload.addEventListener('progress', (e) => {
      console.log(e);
    });
    xhr.send(file);
  }
  return (
    <>
      <h1>My Files</h1>
      <input type='file' onChange={handleOnChange} />
      {directoryItems.map((item, i) => {
        const itemPath = joinPath(currentPath, item.name);
        const encodedPath = encodeURI(itemPath);

        return (
          <li key={i}>
            {item.name}
            {item.isDirectory ? (
              <button onClick={() => setCurrentPath(`${itemPath}`)}>
                Open
              </button>
            ) : (
              <>
                <a href={`${basePath}${encodedPath}?action=open`}> Open</a>{' '}
                <a href={`${basePath}${encodedPath}?action=download`}>
                  Download
                </a>
              </>
            )}
          </li>
        );
      })}
    </>
  );
}

export default App;
