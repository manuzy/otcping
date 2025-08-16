import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadedFile {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = useCallback(async (
    file: File,
    chatId: string,
    messageId?: string
  ): Promise<UploadedFile | null> => {
    if (!file) return null;

    setUploading(true);
    try {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return null;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "You must be logged in to upload files",
          variant: "destructive",
        });
        return null;
      }

      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${chatId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive",
        });
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      // If messageId is provided, save attachment record
      if (messageId) {
        const { error: dbError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: messageId,
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size: file.size,
            file_name: file.name,
          });

        if (dbError) {
          console.error('Database error:', dbError);
          // Still return the upload data even if DB save fails
        }
      }

      const uploadedFile: UploadedFile = {
        id: uploadData.path,
        url: urlData.publicUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };

      toast({
        title: "File uploaded",
        description: `${file.name} uploaded successfully`,
      });

      return uploadedFile;
    } catch (error) {
      console.error('Unexpected upload error:', error);
      toast({
        title: "Upload failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  }, [toast]);

  const deleteFile = useCallback(async (filePath: string) => {
    try {
      const { error } = await supabase.storage
        .from('message-attachments')
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        toast({
          title: "Delete failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "File deleted",
        description: "File deleted successfully",
      });

      return true;
    } catch (error) {
      console.error('Unexpected delete error:', error);
      toast({
        title: "Delete failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  return {
    uploadFile,
    deleteFile,
    uploading,
  };
};