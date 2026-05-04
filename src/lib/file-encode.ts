// File → base64 helper for sending uploads through edge functions.
export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the "data:<mime>;base64," prefix
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export interface UploadFilePayload {
  name: string;
  type: string;
  data: string; // base64 (no prefix)
}

export const fileToPayload = async (file: File): Promise<UploadFilePayload> => ({
  name: file.name,
  type: file.type,
  data: await fileToBase64(file),
});
