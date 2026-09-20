
import { GoogleGenAI } from "@google/genai";

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // remove "data:mime/type;base64," prefix
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

const getFreshAiClient = () => {
    // This function creates a new client on each call. This is important for models
    // like `gemini-3-pro-image-preview` that may require a user-selected API key,
    // ensuring the latest key from `process.env` is used.
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

type ImageSize = '1K' | '2K' | '4K';

export const generateImage = async (prompt: string, imageSize: ImageSize): Promise<string> => {
    const ai = getFreshAiClient();
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [{ text: prompt }],
        },
        config: {
            imageConfig: {
                aspectRatio: "1:1",
                imageSize: imageSize,
            },
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64EncodeString: string = part.inlineData.data;
            return `data:image/png;base64,${base64EncodeString}`;
        }
    }

    throw new Error('No image data found in the response.');
};

export const editImage = async (prompt: string, base64ImageData: string, mimeType: string): Promise<string> => {
    const ai = getFreshAiClient();
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64ImageData,
                        mimeType: mimeType,
                    },
                },
                { text: prompt },
            ],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64EncodeString: string = part.inlineData.data;
            return `data:image/png;base64,${base64EncodeString}`;
        }
    }

    throw new Error('No image data found in the response.');
};
