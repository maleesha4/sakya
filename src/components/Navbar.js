// ============================================
// FILE: src/components/Navbar.js
// ============================================
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar({ user: propUser }) {
  const router = useRouter();
  const [user, setUser] = useState(propUser);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const defaultAvatar = "/default-avatar.png";
  const [preview, setPreview] = useState(defaultAvatar);
  const [uploading, setUploading] = useState(false);

  const getAuthHeaders = () => ({
    ...(localStorage.getItem('auth_token') && { Authorization: `Bearer ${localStorage.getItem('auth_token')}` })
  });

  // Fetch current user/profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/me", { 
          headers: getAuthHeaders(),
          credentials: "same-origin" 
        });
        if (!res.ok) {
          setUser(null);
          return;
        }
        const json = await res.json();
        const me = json.user || json;
        setUser(me);
        const photo = me?.profile_photo;
        if (photo) {
          const path = photo.startsWith("http") ? photo : `${photo}?t=${Date.now()}`;
          setPreview(path);
        } else {
          setPreview(defaultAvatar);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    if (!propUser) {
      loadProfile();
    } else {
      setUser(propUser);
      setLoading(false);
    }
  }, [propUser]);

  const handleLogout = async () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    router.push("/login");
  };

  const profilePhoto = preview || defaultAvatar;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      alert("Please select a file");
      return;
    }
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(selectedFile.type)) {
      alert("Only .jpg, .jpeg, or .png files are allowed!");
      return;
    }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("profile_photo", file);
    formData.append("user_id", user?.id);

    try {
      const res = await fetch("/api/auth/upload-profile", {
        method: "POST",
        body: formData,
        headers: getAuthHeaders(),
        credentials: "same-origin"
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const newPath = data.path && !data.path.startsWith("http") ? `${data.path}?t=${Date.now()}` : data.path;
        setPreview(newPath || defaultAvatar);
        setShowModal(false);
        setFile(null);
        alert("Profile picture updated successfully!");
      } else {
        alert("Upload failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <nav className="bg-black text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-xl font-bold">Home</Link>
            <span>Loading...</span>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-black text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* LEFT SIDE: Profile + Welcome (visible on all screens, but stacked on mobile) */}
          {user ? (
            <div className="flex items-center gap-4 flex-1">
              {/* Profile Picture */}
              <div className="relative">
                <img
                  src={profilePhoto}
                  alt="Profile"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-gray-500 cursor-pointer"
                  onClick={() => setShowDropdown(!showDropdown)}
                />
                {/* Dropdown */}
                {showDropdown && (
                  <div className="absolute left-0 mt-2 w-48 bg-white text-black rounded shadow-lg z-50">
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-200"
                      onClick={() => {
                        setShowModal(true);
                        setShowDropdown(false);
                      }}
                    >
                      Update Profile Picture
                    </button>
                  </div>
                )}
              </div>
              {/* Welcome + Role (stacked on mobile, inline on larger) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="text-xs sm:text-sm">Hello, {user.full_name}</span>
                <span className="text-xs bg-blue-500 px-2 py-1 rounded">
                  {user.role?.toUpperCase()}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-sm">Not Logged In</span>
          )}
          
          {/* RIGHT SIDE: Hamburger on mobile, buttons on desktop */}
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Button (visible on mobile) */}
            <button
              className="sm:hidden text-white text-2xl"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              ☰
            </button>
            
            {/* Desktop Links (hidden on mobile) */}
            <div className="hidden sm:flex items-center gap-3">
              <Link
                href="/"
                className="bg-gray-700 hover:bg-gray-800 px-4 py-2 rounded text-sm font-semibold"
              >
                Home
              </Link>
              {user && (
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm font-semibold"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && user && (
          <div className="sm:hidden bg-gray-800 rounded-lg mt-2 p-4 space-y-2">
            <Link
              href="/"
              className="block w-full text-left bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm font-semibold"
              onClick={() => setShowMobileMenu(false)}
            >
              Home
            </Link>
            <button
              onClick={() => {
                handleLogout();
                setShowMobileMenu(false);
              }}
              className="block w-full text-left bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Modal for profile picture */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 relative">
            {/* Close button */}
            <button
              className="absolute top-2 right-2 text-black text-xl font-bold"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>

            <h2 className="text-lg font-bold mb-4 text-center text-black">Update Profile Picture</h2>

            <img
              src={preview}
              alt="Profile Preview"
              className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border border-gray-300"
            />

            <label className="block mb-4">
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="w-full p-2 border border-gray-300 rounded text-black"
                disabled={uploading}
              />
            </label>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white w-full py-2 rounded font-semibold"
            >
              {uploading ? "Uploading..." : "Update"}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}