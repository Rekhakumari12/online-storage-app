export const storageBaseUrl = "http://localhost:8080";

async function request(path, options) {
  const response = await fetch(`${storageBaseUrl}${path}`, options);
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "The request failed");
  }

  return result;
}

export const getDirectory = (directoryId) =>
  request(`/directory/${directoryId}`);

export const createDirectory = (parentId, name) =>
  request(`/directory/${parentId}`, {
    method: "POST",
    headers: { dirname: name },
  });

export const renameDirectory = (directoryId, name) =>
  request(`/directory/${directoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newDirName: name }),
  });

export const deleteDirectory = (directoryId) =>
  request(`/directory/${directoryId}`, { method: "DELETE" });

export const renameFile = (fileId, name) =>
  request(`/file/${fileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newFileName: name }),
  });

export const deleteFile = (fileId) =>
  request(`/file/${fileId}`, { method: "DELETE" });