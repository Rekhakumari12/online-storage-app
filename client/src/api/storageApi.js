export const storageBaseUrl = "http://localhost:8080";

async function request(path, options) {
  const response = await fetch(`${storageBaseUrl}${path}`, {
    ...options,
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.message || "The request failed");
    error.status = response.status;
    throw error;
  }

  return result;
}

export const logout = () =>
  request("/user/logout", {
    method: "POST",
    credentials: "include",
  });

export const getCurrentUser = () =>
  request("/user/me", {
    credentials: "include",
  });

export const getDirectory = (directoryId) =>
  request(`/directory/${directoryId}`, {
    credentials: "include",
  });

export const createDirectory = (parentId, name) =>
  request(`/directory/${parentId}`, {
    method: "POST",
    headers: { dirname: name },
    credentials: "include",
  });

export const renameDirectory = (directoryId, name) =>
  request(`/directory/${directoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newDirName: name }),
    credentials: "include",
  });

export const deleteDirectory = (directoryId) =>
  request(`/directory/${directoryId}`, {
    method: "DELETE",
    credentials: "include",
  });

export const renameFile = (fileId, name) =>
  request(`/file/${fileId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newFileName: name }),
    credentials: "include",
  });

export const deleteFile = (fileId) =>
  request(`/file/${fileId}`, { method: "DELETE", credentials: "include" });
