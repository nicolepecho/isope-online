'use client';

import React, { useState, useEffect } from "react";
import { supabase, supabaseAdmin } from '@/app/lib/database';
import { useSearchParams } from "next/navigation";
import OrgsRequirementArchive from "./orgs/OrgsRequirementsArchive";
import OrgsRequirement from "./orgs/OrgsRequirement";
import OrgsMembers from "./orgs/OrgsMembers";
import { useSession } from "next-auth/react";

type OrgsProp = {
  org: any;
};

type LinkType = {
  name: string;
  href: string;
};

const links: LinkType[] = [
  { name: 'Overview', href: '/' },
  { name: 'Members', href: '/' },
  { name: 'Requirements', href: '/' },
  { name: 'Archive', href: '/' },
];

export default function OrgsPage({ org }: OrgsProp) {
  const { data: session, status } = useSession();
  const role = (((session?.user as any)?.role) || '').toString().toLowerCase();

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [active, setActive] = useState(
    tabParam && links.some(l => l.name === tabParam)
      ? tabParam
      : 'Overview'
  );

  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [bio, setBio] = useState(org.bio ?? '');
  const [bioDraft, setBioDraft] = useState(org.bio ?? '');

  // ✅ ADDED: org email state/draft
  const [orgEmail, setOrgEmail] = useState(org.email ?? '');
  const [orgEmailDraft, setOrgEmailDraft] = useState(org.email ?? '');

  const [adviser, setAdviser] = useState(org.adviser ?? '');
  const [adviserDraft, setAdviserDraft] = useState(org.adviser ?? '');

  const [adviserEmail, setAdviserEmail] = useState(org.adviseremail ?? '');
  const [adviserEmailDraft, setAdviserEmailDraft] = useState(org.adviseremail ?? '');

  const [accreditlvl, setAccreditlvl] = useState(org.accreditlvl ?? 1);
  const [accreditlvlDraft, setAccreditlvlDraft] = useState(org.accreditlvl ?? 1);

  const [saving, setSaving] = useState(false);

  const [isActive, setIsActive] = useState(org.active ?? true);
  const [archiving, setArchiving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('image/(jpeg|jpg|png)')) {
      alert('Please select a JPG or PNG image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${org.username}-${Date.now()}.${fileExt}`;
      const filePath = `org-logos/${fileName}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin
        .storage
        .from('orglogos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Failed to upload image: ' + uploadError.message);
        setUploading(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin
        .storage
        .from('orglogos')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update org table with new avatar URL
      const { error: updateError } = await supabase
        .from('orgs')
        .update({ avatar: publicUrl })
        .eq('username', org.username);

      if (updateError) {
        console.error('Database update error:', updateError);
        alert('Failed to update organization avatar');
        setUploading(false);
        return;
      }

      // Update local org object
      org.avatar = publicUrl;
      alert('Logo updated successfully!');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred');
    }

    setUploading(false);
  };

  const saveOrg = async () => {
    setSaving(true);

    const { error } = await supabase
      .from('orgs')
      .update({
        bio: bioDraft || null,
        adviser: adviserDraft || null,
        adviseremail: adviserEmailDraft || null,
        email: orgEmailDraft || null, // ✅ ADDED: save org email
        accreditlvl: accreditlvlDraft,
      })
      .eq('username', org.username); 

    if (error) {
      console.error('Failed to update organization:', error.message);
      alert('Failed to save changes');
    } else {
      setBio(bioDraft);
      setOrgEmail(orgEmailDraft); // ✅ ADDED: update local state
      setAdviser(adviserDraft);
      setAdviserEmail(adviserEmailDraft);
      setAccreditlvl(accreditlvlDraft);
      setIsEditingOrg(false);
    }

    setSaving(false);
  };

  const toggleArchive = async () => {
  const confirmed = window.confirm(
    isActive
      ? "Are you sure you want to archive this organization?"
      : "Are you sure you want to unarchive this organization?"
  );

  if (!confirmed) return;

  setArchiving(true);

  const { error } = await supabase
    .from("orgs")
    .update({ active: !isActive })
    .eq("username", org.username);

  if (error) {
    console.error("Failed to update archive status:", error.message);
    alert("Failed to update organization status.");
  } else {
    setIsActive(!isActive);
  }

  setArchiving(false);
  };


  const content: Record<string, React.ReactNode[]> = {
    Overview: [
      <div key="overview" className="space-y-4">
        {/* Bio Section */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">About</h3>
          {isEditingOrg && (
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
              Organization Description
            </label>
          )}
          {isEditingOrg ? (
            <>
              <textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#014fb3] focus:border-transparent resize-none text-gray-900 cursor-text"
                placeholder="Tell us about your organization..."
              />

              {/* ✅ ADDED: Organization Email INSIDE About card (editable) */}
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                  Organization Email
                </label>
                <input
                  type="email"
                  value={orgEmailDraft}
                  onChange={(e) => setOrgEmailDraft(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#014fb3] focus:border-transparent text-gray-900 cursor-text"
                  placeholder="organization@example.com"
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {bio || <span className="text-gray-400 italic">No bio provided yet.</span>}
              </p>

              {/* ✅ ADDED: Organization Email INSIDE About card (view) */}
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                  Organization Email
                </label>
                <p className="text-gray-900">
                  {orgEmail || <span className="text-gray-400 italic">Not provided</span>}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Adviser Information Card */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Adviser Information</h3>
          
          <div className="space-y-4">
            {/* Adviser Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                Adviser Name
              </label>
              {isEditingOrg ? (
                <input
                  type="text"
                  value={adviserDraft}
                  onChange={(e) => setAdviserDraft(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#014fb3] focus:border-transparent text-gray-900 cursor-text"
                  placeholder="Enter adviser name"
                />
              ) : (
                <p className="text-gray-900 font-medium">
                  {adviser || <span className="text-gray-400 font-normal italic">Not assigned</span>}
                </p>
              )}
            </div>

            {/* Adviser Email */}
            <div>
              <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
                Contact Email
              </label>
              {isEditingOrg ? (
                <input
                  type="email"
                  value={adviserEmailDraft}
                  onChange={(e) => setAdviserEmailDraft(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#014fb3] focus:border-transparent text-gray-900 cursor-text"
                  placeholder="adviser@example.com"
                />
              ) : (
                <p className="text-gray-900">
                  {adviserEmail || <span className="text-gray-400 italic">Not provided</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Accreditation Card */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Accreditation</h3>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-1.5">
              Current Level
            </label>
            {isEditingOrg ? (
              <select
                value={accreditlvlDraft}
                onChange={(e) => setAccreditlvlDraft(Number(e.target.value))}
                className="w-full p-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#014fb3] focus:border-transparent text-gray-900 cursor-pointer"
              >
                <option value={1}>Level 1</option>
                <option value={2}>Level 2</option>
                <option value={3}>Level 3</option>
              </select>
            ) : (
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                accreditlvl === 1 ? 'bg-yellow-100 text-yellow-800' :
                accreditlvl === 2 ? 'bg-[#e6f0ff] text-[#014fb3]' :
                'bg-green-100 text-green-800'
              }`}>
                Level {accreditlvl}
              </span>
            )}
          </div>
        </div>

        {/* Organization Logo Card - Only visible in edit mode */}
        {isEditingOrg && (
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Logo</h3>
            
            <div className="space-y-4">
              {/* Current Logo Preview */}
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                  Current Logo
                </label>
                <div className="flex items-center gap-4">
                  <img
                    src={org.avatar}
                    alt="Organization Logo"
                    className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200"
                  />
                  <div className="text-sm text-gray-600">
                    <p>Recommended: Square image (1:1 ratio)</p>
                    <p>Maximum size: 5MB</p>
                  </div>
                </div>
              </div>

              {/* Upload Button */}
              <div>
                <label className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                  Change Logo
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#014fb3] hover:bg-[#013584] rounded-lg transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Upload New Logo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons at the bottom */}
        <div className="flex justify-end gap-2 pt-2">
          {!isEditingOrg ? (
            role === 'osas' && (
              <div className="flex gap-2">
                {/* Edit Button */}
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-[#014fb3] rounded-lg hover:bg-[#013584] transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
                  onClick={() => setIsEditingOrg(true)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Overview
                </button>

                {/* Archive / Unarchive Button */}
                <button
                  disabled={archiving}
                  onClick={toggleArchive}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                    ${
                      isActive
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                >
                  {archiving ? (
                    "Processing..."
                  ) : isActive ? (
                    "Archive Org"
                  ) : (
                    "Unarchive Org"
                  )}
                </button>
              </div>
            )
          ) : (

            <>
              <button
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                onClick={() => {
                  setBioDraft(bio);
                  setOrgEmailDraft(orgEmail); // ✅ ADDED: reset email on cancel
                  setAdviserDraft(adviser);
                  setAdviserEmailDraft(adviserEmail);
                  setAccreditlvlDraft(accreditlvl);
                  setIsEditingOrg(false);
                }}
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                onClick={saveOrg}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    ],

    Members: [
      <div key="members" className="w-full">
        <OrgsMembers username={org.username} />
      </div>
    ],

    Requirements: [
      <div key="requirements" className="w-full">
        <OrgsRequirement username={org.username} role={role}/>
      </div>
    ],

    Archive: [
      <div key="archive-1" className="w-full">
        <OrgsRequirementArchive username={org.username} />
      </div>
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="text-black flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 p-4 sm:p-6 rounded mx-auto max-w-xl">
        <img
          src={org.avatar}
          alt={org.name}
          className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover shadow-md border-2 border-white"
        />
        <h1 className="text-2xl sm:text-3xl font-semibold text-center sm:text-left">{org.name}</h1>
        {!isActive && (
          <span className="mt-2 inline-block px-3 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            Archived
          </span>
        )}
      </div>

      <nav className="rounded-lg mt-6 p-2 bg-white shadow-sm border border-gray-200">
        <ul className="flex flex-wrap sm:flex-nowrap justify-start gap-2 overflow-x-auto">
          {links
            .filter(({ name }) => {
              // Hide Requirements and Archive for members
              if (role === 'member' && (name === 'Requirements' || name === 'Archive')) {
                return false;
              }
              return true;
            })
            .map(({ name }) => (
            <li key={name} className="flex-shrink-0">
              <button
                type="button"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap focus:outline-none cursor-pointer
                  ${ 
                    active === name 
                      ? "bg-[#014fb3] text-white shadow-sm" 
                      : "bg-transparent text-gray-600 hover:bg-gray-100"
                  }`}
                onClick={() => setActive(name)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 w-full bg-gray-50 p-4 sm:p-6 rounded-lg min-h-[400px]">
        {content[active] ? content[active] : <p className="text-gray-500">No content available.</p>}
      </div>
    </div>
  );
}