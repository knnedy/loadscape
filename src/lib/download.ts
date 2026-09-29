export function downloadUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
}

export function downloadText(text: string, filename: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  downloadUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
