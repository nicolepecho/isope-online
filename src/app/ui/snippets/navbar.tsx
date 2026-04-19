'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, ArrowRightStartOnRectangleIcon, UserGroupIcon, UserIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useSession, signOut } from "next-auth/react";

interface LinkType {
  name: string;
  href?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick?: () => void;
}

const links: LinkType[] = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  { name: 'Orgs', href: '/navorgs', icon: UserGroupIcon },
  { name: 'User', href: '/user', icon: UserIcon },
  { name: 'Log Out', icon: ArrowRightStartOnRectangleIcon, onClick: ()=> signOut({ callbackUrl: "/login" })},  
];

const Navbar: FC = () => {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session, status } = useSession();

   return ( 
    <>
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 md:hidden text-black bg-white rounded-md p-1 shadow"
          aria-label="Open menu"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 z-50 h-screen w-30 bg-white border-r px-4 py-6 shadow transition-transform duration-300',
          {
            '-translate-x-full': !sidebarOpen,
            'translate-x-0': sidebarOpen,
            'md:translate-x-0 md:static md:block': true,
          }
        )}
      >
        <div className="flex items-center justify-between mb-8 md:justify-center">
          <img
            src="/img/iaclogo.png"
            alt="Logo"
            className="w-24 h-auto object-contain items-center"
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute top-0 right-0 text-black rounded-md p-1 hover:bg-gray-200"
            aria-label="Close menu"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex flex-col gap-4 w-full items-center text-black">
          {links.map((link) => {
            const LinkIcon = link.icon;
            const isActive = pathname === link.href;
            if (link.onClick) {
              return (
                <button
                  key={link.name}
                  onClick={() => {
                    link.onClick?.();
                    setSidebarOpen(false);
                  }}
                  className={clsx(
                    'flex flex-col items-center gap-1 w-full px-[0.8rem] py-2 rounded-md text-mid font-medium transition-colors text-black',
                    'hover:bg-gray-100 cursor-pointer'
                  )}
                >
                  <LinkIcon className="w-10 h-10 text-black" />
                  <span>{link.name}</span>
                </button>
              );
            }

            return (
              <Link
                key={link.name}
                href={link.href!}
                className={clsx(
                  'flex flex-col items-center gap-1 w-full px-[0.8rem] py-2 rounded-md text-mid font-medium transition-colors text-black',
                  {
                    'bg-sky-100': isActive,
                    'hover:bg-gray-100': !isActive,
                  }
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <LinkIcon className="w-10 h-10 text-black" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-opacity-30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Navbar;
