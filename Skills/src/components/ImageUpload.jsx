import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function ImageUpload({ value, onChange, label = "Image" }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(value || "");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Update preview when value prop changes
  useEffect(() => {
    setPreviewUrl(value || "");
  }, [value]);

  const handleFileUpload = async (event) => {
    console.log("🎯 handleFileUpload triggered");
    
    try {
      const file = event.target.files?.[0];
      console.log("📁 File selected:", file ? file.name : "none");
      
      if (!file) {
        console.log("❌ No file selected");
        return;
      }

      console.log("📊 File details:", {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
      });

      // Validate file type
      if (!file.type.startsWith("image/")) {
        console.error("❌ Invalid file type:", file.type);
        toast.error("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.error("❌ File too large:", file.size);
        toast.error("Image must be less than 5MB");
        return;
      }

      console.log("✅ File validation passed");
      setUploading(true);

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log("🔼 Starting upload to assets bucket:", filePath);
      console.log("🔑 Supabase client exists:", !!supabase);

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("❌ Upload error:", uploadError);
        console.error("Error details:", {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError.error
        });
        throw uploadError;
      }

      console.log("✅ Upload successful:", data);
      console.log("📦 Upload data:", JSON.stringify(data, null, 2));

      // Get public URL
      console.log("🔗 Getting public URL for:", filePath);
      const {
        data: { publicUrl },
      } = supabase.storage.from("assets").getPublicUrl(filePath);

      console.log("📎 Public URL generated:", publicUrl);
      
      if (!publicUrl) {
        console.error("❌ Failed to generate public URL");
        throw new Error("Failed to generate public URL");
      }

      // Update state and trigger onChange
      console.log("💾 Setting preview URL and calling onChange");
      setPreviewUrl(publicUrl);
      onChange(publicUrl);
      setUploadSuccess(true);
      
      // Show success toast
      toast.success("✅ Image uploaded successfully!", {
        description: "URL has been set automatically",
        duration: 3000,
      });

      console.log("🎉 Upload complete! URL:", publicUrl);

      // Reset success indicator after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
      
      // Reset file input so same file can be uploaded again
      event.target.value = '';
    } catch (error) {
      console.error("❌ Error uploading image:", error);
      console.error("Error stack:", error.stack);
      setUploadSuccess(false);
      
      // More specific error messages
      let errorMessage = "Failed to upload image. Please try again.";
      
      if (error.message?.includes("Bucket not found")) {
        errorMessage = "Storage bucket 'assets' not found. Please create it in Supabase Dashboard.";
      } else if (error.message?.includes("permission")) {
        errorMessage = "Permission denied. Please check storage bucket policies.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        description: "Check the browser console for details",
        duration: 5000,
      });
    } finally {
      console.log("🏁 Upload process finished");
      setUploading(false);
    }
  };

  const handleClear = () => {
    setPreviewUrl("");
    onChange("");
    setUploadSuccess(false);
  };

  const handleManualUrlChange = (url) => {
    setPreviewUrl(url);
    onChange(url);
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {/* Preview */}
      {previewUrl && (
        <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-contain"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
          <div
            className="hidden w-full h-full items-center justify-center bg-gray-100"
            style={{ display: "none" }}
          >
            <ImageIcon className="w-12 h-12 text-gray-400" />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleClear}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Upload Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            id="image-upload-input"
          />
          <Button
            type="button"
            variant={uploadSuccess ? "default" : "outline"}
            className={`w-full ${uploadSuccess ? "bg-green-600 hover:bg-green-700" : ""}`}
            disabled={uploading}
            onClick={() => document.getElementById("image-upload-input").click()}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : uploadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Uploaded Successfully!
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Image URL Display/Input */}
      <div>
        <Label className="text-xs text-gray-500">Image URL</Label>
        <Input
          type="url"
          value={previewUrl}
          onChange={(e) => handleManualUrlChange(e.target.value)}
          placeholder="https://... (or upload above)"
          className="mt-1"
          readOnly={uploadSuccess}
        />
        {uploadSuccess && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            URL set automatically from upload
          </p>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Upload an image file or manually paste an image URL
      </p>
    </div>
  );
}
