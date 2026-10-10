import {
  faFile,
  faFileArchive,
  faFileAudio,
  faFileCode,
  faFileExcel,
  faFileImage,
  faFilePdf,
  faFileVideo,
  faFileWord,
} from "@fortawesome/free-solid-svg-icons";

export const getBaseName = (fileName) => {
  if (!fileName || !fileName.includes(".")) return fileName;
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
};

export const getFileIcon = (fileName) => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
    return faFileImage;
  }
  if (extension === "pdf") return faFilePdf;
  if (["doc", "docx"].includes(extension)) return faFileWord;
  if (["xls", "xlsx", "csv"].includes(extension)) return faFileExcel;
  if (["mp4", "mov", "avi", "mkv"].includes(extension)) return faFileVideo;
  if (["mp3", "wav", "aac"].includes(extension)) return faFileAudio;
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
    return faFileArchive;
  }
  if (["js", "jsx", "ts", "tsx", "json", "html", "css"].includes(extension)) {
    return faFileCode;
  }

  return faFile;
};

export const getFileIconColor = (fileName) => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "pdf") return "#dc2626";
  return "#2563eb";
};
