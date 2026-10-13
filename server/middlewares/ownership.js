import directoriesData from "../directoriesDB.json" with { type: "json" };

export const normalizeDirectoryId = (parentDirId) =>
  Array.isArray(parentDirId) ? parentDirId[0] : parentDirId;

export const isDirectoryOwnedByUser = (directory, user) => {
  if (directory?._id) {
    return (
      directory.userId != null &&
      user?._id != null &&
      directory.userId.toString() === user._id.toString()
    );
  }

  const visitedDirectoryIds = new Set();
  let currentDirectory = directory;

  while (currentDirectory) {
    if (visitedDirectoryIds.has(currentDirectory.id)) return false;
    if (currentDirectory.id === user.rootDirId) return true;

    visitedDirectoryIds.add(currentDirectory.id);
    const parentId = normalizeDirectoryId(currentDirectory.parentDirId);
    currentDirectory = directoriesData.find((dir) => dir.id === parentId);
  }

  return false;
};
