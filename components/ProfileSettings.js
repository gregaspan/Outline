"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/libs/supabase/client";
import { User, Mail, Camera, Save, Loader2, Check, X, Upload, Trash2 } from "lucide-react";

const ProfileSettings = () => {
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    image: ''
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) throw userError;

        setUser(user);

        if (user) {
          // Fetch profile data
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
          }

          setProfile(profileData);

          // Set form data with existing profile or user metadata
          setFormData({
            name: profileData?.name || user?.user_metadata?.name || '',
            email: profileData?.email || user?.email || '',
            image: profileData?.image || user?.user_metadata?.avatar_url || ''
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setMessage({ type: 'error', text: 'Failed to load profile data' });
      } finally {
        setIsLoading(false);
      }
    };

    getUser();
  }, [supabase]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    setIsUploading(true);
    setMessage({ type: '', text: '' });

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update form data with new image URL
      setFormData(prev => ({
        ...prev,
        image: publicUrl
      }));

      setMessage({ type: 'success', text: 'Image uploaded successfully!' });

    } catch (error) {
      console.error('Error uploading image:', error);
      setMessage({ type: 'error', text: 'Failed to upload image. Please try again.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: ''
    }));
    setMessage({ type: 'success', text: 'Image removed' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Update or insert profile
      const profileUpdate = {
        id: user.id,
        name: formData.name || null,
        email: formData.email || null,
        image: formData.image || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileUpdate, {
          onConflict: 'id'
        });

      if (error) throw error;

      // Update auth metadata if needed
      const metadataUpdate = {};
      if (formData.name !== user?.user_metadata?.name) {
        metadataUpdate.name = formData.name;
      }
      if (formData.image !== user?.user_metadata?.avatar_url) {
        metadataUpdate.avatar_url = formData.image;
      }

      if (Object.keys(metadataUpdate).length > 0) {
        const { error: authError } = await supabase.auth.updateUser({
          data: metadataUpdate
        });

        if (authError) console.warn('Auth metadata update failed:', authError);
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });

      // Refresh profile data
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(updatedProfile);

    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-black-500" />
      </div>
    );
  }


  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-12">
        <div className="flex items-center space-x-6 mb-8">
          <div className="relative group">
            {formData.image ? (
              <img
                src={formData.image}
                alt="Profile"
                className="w-20 h-20 rounded-lg object-cover hover:opacity-80 transition-opacity"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                <span className="text-gray-600 font-medium text-2xl">
                  {formData.name?.charAt(0)?.toUpperCase() || formData.email?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}

            <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 rounded-lg cursor-pointer transition-all duration-200 opacity-0 group-hover:opacity-100">
              <Camera className="w-6 h-6 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <h1 className="text-3xl font-medium text-gray-900 mb-1">
              {formData.name || 'Untitled'}
            </h1>
            <p className="text-gray-500">{formData.email}</p>
          </div>
        </div>

        {message.text && (
          <div className={`text-sm px-0 py-2 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}>
            {message.text}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="group">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter your name"
            className="w-full px-0 py-2 text-lg border-0 border-b border-transparent hover:border-gray-200 focus:border-gray-400 focus:outline-none focus:ring-0 bg-transparent transition-colors"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email"
            className="w-full px-0 py-2 text-lg border-0 border-b border-transparent hover:border-gray-200 focus:border-gray-400 focus:outline-none focus:ring-0 bg-transparent transition-colors"
          />
          <p className="text-xs text-gray-400 mt-1">
            Email changes may require verification
          </p>
        </div>

        <div className="group">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profile Image URL
          </label>
          <input
            type="url"
            name="image"
            value={formData.image}
            onChange={handleInputChange}
            placeholder="Paste image URL"
            className="w-full px-0 py-2 text-lg border-0 border-b border-transparent hover:border-gray-200 focus:border-gray-400 focus:outline-none focus:ring-0 bg-transparent transition-colors"
          />
          <div className="flex items-center space-x-4 mt-2">
            <p className="text-xs text-gray-400">
              Or upload an image (max 5MB)
            </p>
            {formData.image && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Remove image
              </button>
            )}
          </div>
        </div>

        <div className="pt-8">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 rounded-md transition-colors duration-200"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </button>
        </div>
      </form>

      <div className="border-t border-gray-100 pt-12 mt-16">
        <h3 className="text-sm font-medium text-gray-500 mb-6">Account Details</h3>
        <div className="space-y-4 text-sm text-gray-600">
          <div className="flex justify-between items-center">
            <span>User ID</span>
            <code className="text-xs font-mono bg-gray-50 px-2 py-1 rounded">
              {user?.id?.slice(0, 8)}...
            </code>
          </div>
          <div className="flex justify-between items-center">
            <span>Status</span>
            <span className={`text-xs px-2 py-1 rounded-full ${profile?.has_access
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-50 text-gray-600'
              }`}>
              {profile?.has_access ? 'Active' : 'Inactive'}
            </span>
          </div>
          {profile?.created_at && (
            <div className="flex justify-between items-center">
              <span>Member since</span>
              <span>{new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;