
import React, { ReactNode } from 'react';

interface HeaderProps {
    title: string;
    subtitle?: string;
    children?: ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, children }) => {
    return (
        <div className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-1 text-sm text-slate-500 font-normal">
                        {subtitle}
                    </p>
                )}
            </div>
            {children && (
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {children}
                </div>
            )}
        </div>
    );
};

export default Header;
