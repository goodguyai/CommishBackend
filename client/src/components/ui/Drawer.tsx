import { Fragment, ReactNode } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  position?: 'left' | 'right';
}

export function Drawer({ open, onClose, title, children, position = 'right' }: DrawerProps) {
  return (
    <Transition show={open} as={Fragment}>
      <HeadlessDialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className={clsx('absolute inset-0 overflow-hidden', position === 'left' ? 'pr-10' : 'pl-10')}>
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-in-out duration-300"
              enterFrom={position === 'left' ? '-translate-x-full' : 'translate-x-full'}
              enterTo="translate-x-0"
              leave="transform transition ease-in-out duration-200"
              leaveFrom="translate-x-0"
              leaveTo={position === 'left' ? '-translate-x-full' : 'translate-x-full'}
            >
              <HeadlessDialog.Panel
                className={clsx(
                  'pointer-events-auto w-screen max-w-md h-full',
                  position === 'left' ? 'pr-0' : 'pl-0'
                )}
              >
                <div className="flex h-full flex-col bg-white shadow-xl">
                  {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                      <HeadlessDialog.Title className="text-lg font-semibold text-gray-900">
                        {title}
                      </HeadlessDialog.Title>
                      <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        data-testid="drawer-close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  <div className="relative flex-1 overflow-y-auto px-6 py-6">{children}</div>
                </div>
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );
}
