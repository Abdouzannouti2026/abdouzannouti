
import React from 'react';
import Header from './Header';

interface PlaceholderProps {
    title: string;
}

const Placeholder: React.FC<PlaceholderProps> = ({ title }) => {
    return (
        <div>
            <Header title={title} />
            <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
                <div className="text-center">
                    <h3 className="text-lg font-medium text-slate-900">Page en construction</h3>
                    <p className="mt-1 text-sm text-slate-500">
                        La fonctionnalité "{title}" sera bientôt disponible.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Placeholder;
