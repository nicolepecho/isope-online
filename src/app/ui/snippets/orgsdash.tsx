'use client';
import { useEffect, useState, FC } from 'react';
import { BellIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/app/lib/database';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Orgs } from '@/app/lib/definitions';
import { fetchAccessibleOrgs } from '@/app/lib/access-control'; 

const OrgCard: FC<{ org: any }> = ({ org }) => {
  const router = useRouter();

  // Use real progress from org object
  const progress = org.progress ?? 0;

  // Navigate to org dashboard
  const goToOrg = () => router.push(`./dashboard/orgs/${org.username}`);

  // Navigate to dues tab
  const goToDues = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/orgs/${org.username}?tab=Requirements`);
  };

  return (
    <div
      onClick={goToOrg}
      className="group flex flex-col bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 h-full cursor-pointer"
    >
      {/* Avatar + Name */}
      <div className="flex flex-col items-center text-center mt-6 flex-grow">
        <div className="w-20 h-20 rounded-full border-2 border-gray-300 mb-4 overflow-hidden bg-white">
          {org.avatar ? (
            <img
              src={org.avatar}
              alt={org.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-3xl">
              {org.name[0]}
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-4 group-hover:underline line-clamp-2">
          {org.name}
        </h2>

        {org.active === false && (
          <span className="mt-1 inline-block text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">
            Archived
          </span>
        )}

      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="text-xs font-semibold text-[#014fb3] mb-1 text-center">
          {progress}%
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#014fb3] h-full rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 pt-3 grid grid-cols-[1fr_auto] gap-2">
        {/* Requirements */}
        <button
          onClick={goToDues}
          className="flex items-center justify-center gap-2 bg-[#014fb3] hover:bg-[#013db3] text-white px-3 py-2 rounded-md text-sm font-medium transition cursor-pointer"
        >
          <DocumentIcon className="w-5 h-5" />
          <span>Requirements</span>
        </button>

        {/* Notifications */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center bg-[#014fb3] hover:bg-[#013db3] text-white p-2 rounded-md transition cursor-pointer"
        >
          <BellIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};


// Create Organization Modal
const CreateOrgModal: FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, email: string) => Promise<void>;
}> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (name.trim() && email.trim()) {
      await onCreate(name, email);
      setName('');
      setEmail('');
    }
  };


  return (
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-black">Create Organization</h2>
          <button
            onClick={onClose}
            className="cursor-pointer text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          {/* Organization Name */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter organization name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#014fb3] outline-none text-black"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>

          {/* Organization Email */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Organization Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#014fb3] outline-none text-black"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="cursor-pointer text-black px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="cursor-pointer text-white px-4 py-2 bg-[#014fb3] hover:bg-[#013db3] rounded-md transition"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

// Dashboard
const OrgsDashboard: FC = () => {
  const { data: session, status } = useSession();

  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const filteredActiveOrgs = orgs.filter((org) =>
    org.active === true &&
    (
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.username.toLowerCase().includes(search.toLowerCase())
    )
  );

  const filteredArchivedOrgs = orgs.filter((org) =>
    org.active === false &&
    (
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.username.toLowerCase().includes(search.toLowerCase())
    )
  );


  useEffect(() => {
    const fetchOrgs = async () => {
      if (status === 'loading') return;
      try {
        const role = (((session?.user as any)?.role) || '').toString().toLowerCase();
        const name = (session?.user as any)?.name;
        const email = ((session?.user as any)?.email || '').toString().trim().toLowerCase();
        const orgIdentifier =
          role === 'org'
            ? session?.user?.email
            : (session?.user as any)?.username || session?.user?.name;
          if(role=='osas') setRole('osas');
        const fetchedOrgs: Orgs[] = await fetchAccessibleOrgs({
          role,
          name,
          orgIdentifier,
          email
        });

        if (fetchedOrgs.length === 0) {
          setOrgs([]);
          return;
        }
        
        // Fetch requirement status for all orgs
        const usernames = fetchedOrgs.map((o) => o.username);
        const { data: reqStatus } = await supabase
          .from('org_requirement_status')
          .select('orgUsername, submitted')
          .in('orgUsername', usernames)
          .eq('active', true);

        const orgsWithProgress = fetchedOrgs.map((org) => {
          const rows = reqStatus?.filter((r) => r.orgUsername === org.username) || [];
          const total = rows.length;
          const submitted = rows.filter((r) => r.submitted).length;
          const progress = total === 0 ? 0 : Math.round((submitted / total) * 100);
          return { ...org, progress };
        });

        setOrgs(orgsWithProgress);
      } catch (err: any) {
        console.error('Error fetching orgs:', err?.message ?? err);
        setOrgs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrgs();
  }, [status, session]);

  const handleCreateOrg = async (name: string, email: string) => {
    if (!name.trim() || !email.trim()) {
      alert(
        'Failed to create organization. Organization not made due to existing or invalid input.'
      );
      return;
    }

    const username = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const { data: existingOrg } = await supabase
      .from('orgs')
      .select('username')
      .or(`email.eq.${email},username.eq.${username}`)
      .maybeSingle();

    if (existingOrg) {
      alert(
        'Failed to create organization. Organization not made due to existing or invalid input.'
      );
      return;
    }

    const { data, error } = await supabase
      .from('orgs')
      .insert([
        {
          username,
          name,
          email,
          bio: null,
          adviser: null,
          accreditlvl: null,
          avatar: null,
        },
      ])
      .select()
      .single();

    if (error) {
      alert(
        'Failed to create organization. Organization not made due to existing or invalid input.'
      );
      console.error('Error creating org:', error);
      return;
    }

    setOrgs((prev) => [...prev, data]);
    setShowModal(false);
  };

  if (loading) return <div className="p-4 text-black">Loading organizations...</div>;
  
  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black">ALL ORGANIZATIONS</h1>
          <p className="text-black">Hello, {session?.user?.name}</p>
        </div>
      
        <div className="flex items-center gap-3 ml-auto">
          <input
            type="text"
            placeholder="Search organization"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 min-w-[16rem] max-w-[16rem] flex-shrink-0
                       bg-white px-4 py-2 rounded-md border border-gray-300 text-black
                       focus:bg-white focus:ring-2 focus:ring-[#014fb3] outline-none"
          />
      {role === 'osas' &&
          <button
            onClick={() => setShowModal(true)}
            className="cursor-pointer flex-shrink-0 bg-[#014fb3] hover:bg-[#013db3] text-white
                       px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Create Organization
          </button>}
        </div>
      </div>

      {/* ACTIVE ORGS */}
        {filteredActiveOrgs.length === 0 ? (
          <p className="text-black">No active organizations found.</p>
        ) : (
          <>
            <h2 className="text-xl font-bold text-black mb-4">Active Organizations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {filteredActiveOrgs.map((org) => (
                <OrgCard key={org.username} org={org} />
              ))}
            </div>
          </>
        )}

        {/* ARCHIVED ORGS */}
        {filteredArchivedOrgs.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-black mb-4">Archived Organizations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArchivedOrgs.map((org) => (
                <OrgCard key={org.username} org={org} />
              ))}
            </div>
          </>
        )}

        {role == 'osas' && 
            <CreateOrgModal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              onCreate={handleCreateOrg}
            />
          }
          
        
      
    </div>
  );
};

export default OrgsDashboard;