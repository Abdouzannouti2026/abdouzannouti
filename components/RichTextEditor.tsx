import React, { useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className }) => {
    
    // Core definition to avoid cursor jump issues
    const modules = useMemo(() => ({
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            ['clean']
        ],
    }), []);

    const formats = useMemo(() => [
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list',
        'size'
    ], []);

    // Helper to strip HTML if it comes from an old non-rich state, preserving content
    const handleValue = () => {
        if (!value) return '';
        // Add basic handling if value is just plain text
        return value;
    };

    return (
        <div className={`facturago-quill-wrapper ${className || ''}`}>
            <ReactQuill 
                theme="snow"
                value={handleValue()}
                onChange={onChange}
                placeholder={placeholder}
                modules={modules}
                formats={formats}
            />
            {/* Custom Styles */}
            <style>{`
                .facturago-quill-wrapper {
                    border-radius: 12px;
                    border: 1px solid #cbd5e1; /* slate-300 */
                    overflow: hidden;
                    background: #ffffff;
                    transition: all 0.2s ease-in-out;
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
                }
                .facturago-quill-wrapper:focus-within {
                    border-color: #10b981; /* emerald-500 */
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15); /* focus ring */
                }
                .facturago-quill-wrapper .ql-toolbar.ql-snow {
                    border: none;
                    border-bottom: 1px solid #e2e8f0; /* slate-200 */
                    background-color: #f8fafc; /* slate-50 */
                    padding: 8px 12px;
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                }
                .facturago-quill-wrapper .ql-container.ql-snow {
                    border: none;
                    border-bottom-left-radius: 12px;
                    border-bottom-right-radius: 12px;
                }
                .facturago-quill-wrapper .ql-editor {
                    min-height: 110px;
                    font-size: 13px;
                    color: #334155; /* slate-700 */
                    line-height: 1.6;
                    padding: 14px 16px;
                }
                .facturago-quill-wrapper .ql-editor.ql-blank::before {
                    color: #94a3b8; /* slate-400 */
                    font-style: normal;
                    font-size: 13px;
                    left: 16px;
                }
                
                /* Tweak toolbar buttons styling to look modern */
                .facturago-quill-wrapper .ql-snow .ql-picker {
                    font-size: 13px;
                    color: #475569;
                }
                .facturago-quill-wrapper .ql-snow .ql-stroke {
                    stroke: #475569;
                }
                .facturago-quill-wrapper .ql-snow .ql-fill, 
                .facturago-quill-wrapper .ql-snow .ql-stroke.ql-fill {
                    fill: #475569;
                }
                .facturago-quill-wrapper .ql-toolbar button:hover .ql-stroke,
                .facturago-quill-wrapper .ql-toolbar button.ql-active .ql-stroke,
                .facturago-quill-wrapper .ql-toolbar .ql-picker-label:hover .ql-stroke,
                .facturago-quill-wrapper .ql-toolbar .ql-picker-label.ql-active .ql-stroke,
                .facturago-quill-wrapper .ql-toolbar .ql-picker-item:hover .ql-stroke,
                .facturago-quill-wrapper .ql-toolbar .ql-picker-item.ql-selected .ql-stroke {
                    stroke: #10b981;
                }
                .facturago-quill-wrapper .ql-toolbar button:hover .ql-fill,
                .facturago-quill-wrapper .ql-toolbar button.ql-active .ql-fill,
                .facturago-quill-wrapper .ql-toolbar .ql-picker-label:hover .ql-fill,
                .facturago-quill-wrapper .ql-toolbar .ql-picker-label.ql-active .ql-fill,
                .facturago-quill-wrapper .ql-toolbar .ql-picker-item:hover .ql-fill,
                .facturago-quill-wrapper .ql-toolbar .ql-picker-item.ql-selected .ql-fill {
                    fill: #10b981;
                }
            `}</style>
        </div>
    );
};

export default RichTextEditor;
