import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Uploads a file to Cloudinary using unsigned upload.
 * Returns the secure URL of the uploaded file.
 */
export async function uploadToCloudinary(file: File, resourceType: 'image' | 'video' = 'image'): Promise<string> {
  const cloudName = "b8dwxlwp";
  const uploadPreset = "Sports";

  if (!cloudName || !uploadPreset) {
    console.warn("Cloudinary configuration missing. Returning fake URL.");
    // Return a fake URL for prototyping if not configured
    return `https://fakeimg.pl/400x400/?text=${encodeURIComponent(file.name)}`;
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
}
