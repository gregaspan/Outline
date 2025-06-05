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
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {formData.image ? (
              <img
                src={formData.image}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover border-4 border-gray-100"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center border-4 border-gray-100">
                <span className="text-white font-semibold text-xl">
                  {formData.name?.charAt(0)?.toUpperCase() || formData.email?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {formData.name || 'Unnamed User'}
            </h2>
            <p className="text-gray-600">{formData.email}</p>
            {profile && (
              <p className="text-sm text-gray-500 mt-1">
                Member since {new Date(profile.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Edit Profile</h3>
        
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Note: Changing your email may require verification
            </p>
          </div>

          {/* Profile Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Profile Picture
            </label>
            
            <div className="flex items-start space-x-6">
              {/* Current Image Preview */}
              <div className="flex-shrink-0">
                {formData.image ? (
                  <img
                    src={formData.image}
                    alt="Profile preview"
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center border-4 border-gray-100 shadow-sm">
                    <span className="text-white font-semibold text-2xl">
                      {formData.name?.charAt(0)?.toUpperCase() || formData.email?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-3">
                  {/* Upload Button */}
                  <label className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer transition-colors duration-200">
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload New
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>

                  {/* Remove Button */}
                  {formData.image && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="inline-flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors duration-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </button>
                  )}
                </div>

                <p className="text-sm text-gray-500">
                  JPG, PNG or GIF. Max size 5MB. Recommended: 400x400px
                </p>

                {/* URL Input as Alternative */}
                <div className="pt-2">
                  <label htmlFor="image" className="block text-xs font-medium text-gray-600 mb-1">
                    Or paste image URL:
                  </label>
                  <div className="relative">
                    <Camera className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="url"
                      id="image"
                      name="image"
                      value={formData.image}
                      onChange={handleInputChange}
                      placeholder="https://example.com/image.jpg"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">User ID:</span>
            <span className="font-mono text-gray-900">{user?.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Account Status:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              profile?.has_access 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {profile?.has_access ? 'Active' : 'Inactive'}
            </span>
          </div>
          {profile?.customer_id && (
            <div className="flex justify-between">
              <span className="text-gray-600">Customer ID:</span>
              <span className="font-mono text-gray-900">{profile.customer_id}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;