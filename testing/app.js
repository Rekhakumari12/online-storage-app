const input = document.querySelector('input');
input.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'http://localhost:8080', true);
  xhr.setRequestHeader('filename', file.name);

  xhr.upload.addEventListener('progress', (ev) => {
    const cal = ((ev.loaded / ev.total) * 100).toFixed(2);
    console.log(`${cal}% uploaded`);
  });

  xhr.addEventListener('load', () => {
    console.log('Upload complete:', xhr.responseText);
  });

  xhr.send(file);
});
// env -u GITHUB_TOKEN git push
