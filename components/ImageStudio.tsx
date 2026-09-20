
import React, { useState } from 'react';
import { Sparkles, Upload, Wand2 } from 'lucide-react';
import Header from './Header';
import { generateImage, editImage, fileToBase64 } from '../services/geminiService';

type ImageSize = '1K' | '2K' | '4K';

const LoadingSpinner: React.FC = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50 rounded-lg">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-400"></div>
    </div>
);

const ImageStudio: React.FC = () => {
    // Generation state
    const [generationPrompt, setGenerationPrompt] = useState<string>('');
    const [imageSize, setImageSize] = useState<ImageSize>('1K');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    
    // Editing state
    const [editingPrompt, setEditingPrompt] = useState<string>('');
    const [originalImage, setOriginalImage] = useState<{file: File, url: string} | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!generationPrompt) {
            setError('Veuillez entrer un prompt pour la génération.');
            return;
        }
        setIsGenerating(true);
        setError(null);
        setGeneratedImage(null);
        try {
            const imageUrl = await generateImage(generationPrompt, imageSize);
            setGeneratedImage(imageUrl);
        } catch (e) {
            setError('Erreur lors de la génération de l\'image. Veuillez réessayer.');
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setOriginalImage({ file, url: URL.createObjectURL(file) });
            setEditedImage(null);
        }
    };

    const handleEdit = async () => {
        if (!editingPrompt || !originalImage) {
            setError('Veuillez télécharger une image et entrer un prompt pour l\'édition.');
            return;
        }
        setIsEditing(true);
        setError(null);
        setEditedImage(null);
        try {
            const base64Data = await fileToBase64(originalImage.file);
            const imageUrl = await editImage(editingPrompt, base64Data, originalImage.file.type);
            setEditedImage(imageUrl);
        } catch (e) {
            setError('Erreur lors de l\'édition de l\'image. Veuillez réessayer.');
            console.error(e);
        } finally {
            setIsEditing(false);
        }
    };

    return (
        <div>
            <Header title="Studio Image IA" />
            {error && <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Image Generation */}
                <div className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-neutral-200">
                    <h3 className="text-xl font-semibold mb-4 flex items-center"><Sparkles className="mr-2 text-emerald-500" /> Générer une Image</h3>
                    <div className="space-y-4">
                        <textarea
                            value={generationPrompt}
                            onChange={(e) => setGenerationPrompt(e.target.value)}
                            placeholder="Ex: Un logo moderne pour une entreprise de café, style minimaliste..."
                            className="w-full p-2 border rounded-lg bg-neutral-50 border-neutral-300 focus:ring-emerald-500 focus:border-emerald-500"
                            rows={3}
                        />
                        <div className="flex items-center space-x-4">
                            <label className="text-sm font-medium">Taille :</label>
                            {(['1K', '2K', '4K'] as ImageSize[]).map(size => (
                                <label key={size} className="flex items-center space-x-2">
                                    <input type="radio" name="imageSize" value={size} checked={imageSize === size} onChange={() => setImageSize(size)} className="focus:ring-emerald-500 h-4 w-4 text-emerald-600 border-neutral-300" />
                                    <span>{size}</span>
                                </label>
                            ))}
                        </div>
                        <button onClick={handleGenerate} disabled={isGenerating} className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-300 transition-all duration-200 ease-in-out">
                            {isGenerating ? 'Génération...' : 'Générer'}
                        </button>
                    </div>
                    <div className="mt-4 relative min-h-[256px] bg-neutral-100 rounded-lg flex items-center justify-center">
                        {isGenerating && <LoadingSpinner />}
                        {generatedImage ? <img src={generatedImage} alt="Generated" className="rounded-lg max-h-96" /> : <p className="text-neutral-500">L'image générée apparaîtra ici.</p>}
                    </div>
                </div>

                {/* Image Editing */}
                <div className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-neutral-200">
                    <h3 className="text-xl font-semibold mb-4 flex items-center"><Wand2 className="mr-2 text-emerald-500" /> Modifier une Image</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block w-full cursor-pointer text-center p-4 border-2 border-dashed rounded-lg border-neutral-300 hover:border-emerald-500 transition-colors duration-200">
                                <Upload className="mx-auto h-8 w-8 text-neutral-400" />
                                <span className="mt-2 block text-sm font-semibold text-neutral-900">
                                    {originalImage ? `Fichier: ${originalImage.file.name}` : 'Télécharger une image'}
                                </span>
                                <input type='file' className="sr-only" onChange={handleFileChange} accept="image/*"/>
                            </label>
                        </div>
                         <textarea
                            value={editingPrompt}
                            onChange={(e) => setEditingPrompt(e.target.value)}
                            placeholder="Ex: Ajoute un filtre retro, supprime l'arrière-plan..."
                            className="w-full p-2 border rounded-lg bg-neutral-50 border-neutral-300 focus:ring-emerald-500 focus:border-emerald-500"
                            rows={3}
                            disabled={!originalImage}
                        />
                         <button onClick={handleEdit} disabled={isEditing || !originalImage} className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-300 transition-all duration-200 ease-in-out">
                            {isEditing ? 'Édition...' : 'Modifier'}
                        </button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative min-h-[200px] bg-neutral-100 rounded-lg flex items-center justify-center">
                            {originalImage ? <img src={originalImage.url} alt="Original" className="rounded-lg max-h-80" /> : <p className="text-neutral-500">Original</p>}
                        </div>
                         <div className="relative min-h-[200px] bg-neutral-100 rounded-lg flex items-center justify-center">
                            {isEditing && <LoadingSpinner />}
                            {editedImage ? <img src={editedImage} alt="Edited" className="rounded-lg max-h-80" /> : <p className="text-neutral-500">Modifiée</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageStudio;
