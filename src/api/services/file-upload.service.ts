import { http } from '../../lib/http';

export interface FileUploadResult {
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

export const fileUploadService = {
  upload: (file: File, category?: string): Promise<FileUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    return http.upload<FileUploadResult>('/files/upload', formData, {
      params: category ? { category } : undefined,
    });
  },
};
