'use client';

import Link from 'next/link';
import { FC, useEffect, useState } from 'react';
import { useSession } from "next-auth/react";
import { supabase } from '@/app/lib/database';
import { BellIcon, XMarkIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { fetchAccessibleOrgs } from '@/app/lib/access-control';

interface Notification {
  id: number;
  title: string;
  date: string;
}

const NotificationSidebar: FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, title: 'General Assembly', date: '9/17' },
    { id: 2, title: 'Workshop', date: '10/1' },
    { id: 3, title: 'Webinar', date: '11/5' }
  ]);

  const { data: session, status } = useSession();
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchRequirements = async () => {
      setLoading(true);
      if (status === 'loading') {
        setLoading(false);
        return;
      }
  
      const role = ((((session?.user as any)?.role) || '').toString().toLowerCase());
      const name = ((session?.user as any)?.name || '');
      const orgIdentifier = ((session?.user as any)?.username || session?.user?.name || name);


      const accessibleOrgs = await fetchAccessibleOrgs({
        role,
        name,
        orgIdentifier,
      });

      const accessibleUsernames = accessibleOrgs.map((o: any) => o.username);

      if (role !== 'osas' && accessibleUsernames.length === 0) {
        setRequirements([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('org_requirement_status')
        .select(`
          *,
          requirements ( title ),
          orgs ( name )
        `)
        .eq('active', true);

      if (role === 'adviser') {
        query = query
          .eq('submitted', true)
          .eq('graded', false)
          .eq('approved', false)
          .in('orgUsername', accessibleUsernames);
      } else if (role === 'member') {
        query = query
          .eq('submitted', false)
          .eq('graded', false)
          .in('orgUsername', accessibleUsernames);
      } else if (role === 'osas') {
        query = query
          .eq('submitted', true)
          .eq('graded', false)
          .eq('approved', true);
      } else {
        query = query
          .eq('graded', false)
          .in('orgUsername', accessibleUsernames);
      }


      const { data, error } = await query;
      console.log('TO DO role:', role);



      if (error) {
        console.error('Error fetching requirements:', error);
      } else {
        setRequirements(data || []);
      }

      setLoading(false);
    };

    fetchRequirements();
      }, [session, status]);


  const removeNotification = (id: number) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
  };

  const toggleOrg = (orgName: string) => {
    setExpandedOrgs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orgName)) {
        newSet.delete(orgName);
      } else {
        newSet.add(orgName);
      }
      return newSet;
    });
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 lg:hidden bg- text-white p-3 rounded-full shadow-lg hover:bg-blue-800 transition-colors"
        aria-label="Toggle notifications"
      >
        <BellIcon className="w-6 h-6" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-opacity-30 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed right-0 top-0 bg-[#014fb3] h-screen p-4 sm:p-6 text-white flex flex-col shadow-2xl z-50 overflow-y-auto
        w-full sm:w-96 md:w-80
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Close button for mobile */}
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-white hover:text-red-300 transition-colors cursor-pointer"
          aria-label="Close notifications"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Notifications Header */}
        <div className="flex items-center gap-2 mb-6 mt-8 lg:mt-0">
          <BellIcon className="w-6 h-6" />
          <h2 className="font-bold text-base sm:text-lg">NOTIFICATIONS</h2>
        </div>

        {/* Notification Items */}
        <div className="space-y-3 mb-6">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="bg-blue-800 rounded-lg p-3 flex items-center justify-between hover:bg-blue-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{notif.title}</p>
                  <p className="text-xs text-blue-200">{notif.date}</p>
                </div>
              </div>
              <button
                onClick={() => removeNotification(notif.id)}
                className="text-white hover:text-red-300 transition-colors ml-2 flex-shrink-0 cursor-pointer"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <button className="bg-yellow-400 text-blue-900 font-bold py-2 px-6 rounded-full hover:bg-yellow-300 transition-colors mb-8 self-start text-sm sm:text-base cursor-pointer">
          VIEW ALL
        </button>

        {/* To Do Section */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
            <h3 className="font-bold text-base sm:text-lg">TO DO</h3>
          </div>

          {/* Counter */}
          {!loading && (
            <h4 className="text-md text-blue-200 mb-4">
              {requirements.length} item{requirements.length === 1 ? '' : 's'}
            </h4>
          )}

          {/* Task Checkboxes */}
          <div className="space-y-3">
            {loading && (
              <p className="text-sm text-blue-200 italic">
                Loading notifications...
              </p>
            )}

            {!loading && requirements.length === 0 && (
              <p className="text-sm text-blue-200 italic">
                No requirements to do.
              </p>
            )}

            {!loading && requirements.length > 0 && (
              <div className="bg-blue-800/50 rounded-lg p-3 max-h-64 overflow-y-auto">
                {Object.entries(
                  requirements.reduce((acc: any, req: any) => {
                    const orgName = req.orgs?.name || req.orgUsername || 'Unknown Organization';
                    if (!acc[orgName]) acc[orgName] = [];
                    acc[orgName].push(req);
                    return acc;
                  }, {})
                ).map(([orgName, items]: any) => (
                  <div key={orgName} className="mb-4 last:mb-0">
                    <button
                      onClick={() => toggleOrg(orgName)}
                      className="w-full flex items-center gap-2 text-xs font-bold text-yellow-300 uppercase tracking-wide mb-2 hover:text-yellow-200 transition-colors cursor-pointer"
                    >
                      {expandedOrgs.has(orgName) ? (
                        <ChevronDownIcon className="w-4 h-4" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4" />
                      )}
                      {orgName}
                      <span className="text-blue-200 normal-case">({items.length})</span>
                    </button>

                    {expandedOrgs.has(orgName) && (
                      <div className="space-y-2">
                        {items.map((req: any) => (
                          <div
                            key={req.id}
                            className="flex items-start cursor-pointer group"
                          >
                            

                            <Link
                              href={`/dashboard/orgs/${req.orgUsername}/requirements/${req.requirementId}`}
                              className="text-sm leading-tight group-hover:text-blue-200 transition-colors"
                            >
                              {req.requirements?.title}
                              <br />
                              <span className={`text-xs ${req.graded ? 'text-green-200' : 'text-red-300'}`}>
                                Status: {!req.submitted ? 'Not submitted' : 'Submitted'} / {!req.graded ? 'Not graded' : 'Graded'}
                              </span>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationSidebar;