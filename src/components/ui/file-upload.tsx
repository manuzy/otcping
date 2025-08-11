import React, { useState, useRef } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { Button } from './button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { notifications } from '@/lib/notifications';

interface FileUploadProps {
  currentImage?: string;
  onImageUpload: (url: string) => void;
  onImageSaved?: (success: boolean) => void;
  maxSizeInMB?: number;
  accept?: string;
  className?: string;
}

export function FileUpload({
  currentImage,
  onImageUpload,
  onImageSaved,
  maxSizeInMB = 5,
  accept = "image/*",
  className = ""
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const resizeImage = (file: File, maxWidth: number = 400, maxHeight: number = 400): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = document.createElement('img');
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        const aspectRatio = width / height;
        
        if (width > height) {
          if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
          }
        } else {
          if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          const resizedFile = new File([blob!], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        }, file.type, 0.85); // 85% quality
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      notifications.validationError('file type');
      return;
    }

    // Validate file size
    if (file.size > maxSizeInMB * 1024 * 1024) {
      notifications.error({
        title: "File too large",
        description: `Please select an image smaller than ${maxSizeInMB}MB.`
      });
      return;
    }

    try {
      setUploading(true);
      
      // Resize image
      const resizedFile = await resizeImage(file);
      
      // Create preview
      const previewUrl = URL.createObjectURL(resizedFile);
      setPreview(previewUrl);
      
      // Delete old image if it exists and it's a storage URL
      if (currentImage && currentImage.includes('supabase')) {
        const oldPath = currentImage.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('profile-images')
            .remove([`${user.id}/${oldPath}`]);
        }
      }
      
      // Upload new image
      const fileExt = resizedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, resizedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL with cache busting
      const { data } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const cachebustedUrl = `${data.publicUrl}?t=${Date.now()}`;
      
      // Immediately update the avatar in the database
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar: cachebustedUrl })
          .eq('id', user.id);

        if (updateError) throw updateError;

        onImageUpload(cachebustedUrl);
        onImageSaved?.(true);
        
        notifications.success({
          description: "Your profile image has been updated."
        });

        logger.info('Profile image uploaded successfully', {
          operation: 'upload_profile_image',
          userId: user.id
        });
      } catch (dbError) {
        logger.error('Database update error during image upload', {
          operation: 'upload_profile_image',
          userId: user.id
        }, dbError as Error);
        
        // Rollback: Delete the uploaded file
        await supabase.storage
          .from('profile-images')
          .remove([fileName]);
          
        onImageSaved?.(false);
        throw new Error('Failed to save avatar to profile');
      }
      
    } catch (error) {
      logger.error('Upload error', {
        operation: 'upload_profile_image',
        userId: user?.id
      }, error as Error);
      
      onImageSaved?.(false);
      notifications.error({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again."
      });
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePreview = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayImage = preview || currentImage;

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="flex items-center gap-4">
        {displayImage && (
          <div className="relative">
            <img
              src={displayImage}
              alt="Profile preview"
              className="w-20 h-20 rounded-full object-cover border-2 border-border"
            />
            {preview && (
              <button
                onClick={handleRemovePreview}
                className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                disabled={uploading}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-fit"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </>
            )}
          </Button>
          
          <p className="text-sm text-muted-foreground">
            JPG, PNG, GIF up to {maxSizeInMB}MB
          </p>
        </div>
      </div>
    </div>
  );
}