import type { SecureDocument } from "./types";

interface SignedUploadResponse {
  document: SecureDocument;
  upload: {
    method: "PUT";
    url: string;
    headers: Record<string, string>;
  };
}

export async function uploadApplicationDocument(
  applicationId: string,
  file: File,
  documentType: "AADHAAR" | "SELFIE" | "ID_CARD"
): Promise<SecureDocument> {
  const createResponse = await fetch(
    `/api/applications/${encodeURIComponent(applicationId)}/documents/upload-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_type: documentType,
        file_name: file.name,
        content_type: file.type || "application/octet-stream",
        size_bytes: file.size
      })
    }
  );
  const signed = await createResponse.json() as SignedUploadResponse & { message?: string };
  if (!createResponse.ok) throw new Error(signed.message || `Could not prepare ${file.name} for secure upload`);

  const uploadResponse = await fetch(signed.upload.url, {
    method: signed.upload.method,
    headers: signed.upload.headers,
    body: file
  });
  if (!uploadResponse.ok) throw new Error(`Secure upload failed for ${file.name}`);

  const completeResponse = await fetch(
    `/api/applications/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(signed.document.id)}/complete`,
    { method: "POST" }
  );
  const completed = await completeResponse.json() as { document?: SecureDocument; message?: string };
  if (!completeResponse.ok || !completed.document) {
    throw new Error(completed.message || `Could not confirm secure storage for ${file.name}`);
  }
  return completed.document;
}
