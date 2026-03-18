export const CLOUDINARY_CLOUD_NAME = 'dpv3s9goh'; // Placeholder - user might need to provide this
export const CLOUDINARY_UPLOAD_PRESET = 'photobooth'; // Placeholder - user might need to provide this

export async function uploadToCloudinary(file: Blob | string, resourceType: 'image' | 'video' | 'raw', filename: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('public_id', filename);
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message || 'Cloudinary upload failed');
    }
    
    return await response.json();
}
