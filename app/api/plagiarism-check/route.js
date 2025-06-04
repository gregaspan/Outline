import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { text, excluded_sources = [] } = await request.json();

        if (!text || text.trim().length === 0) {
            return NextResponse.json(
                { error: 'Text is required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.WINSTON_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Winston AI API key not configured' },
                { status: 500 }
            );
        }

        const response = await fetch('https://api.gowinston.ai/v2/plagiarism', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text.trim(),
                excluded_sources: excluded_sources,
                language: 'en',
                country: 'us'
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Winston AI Plagiarism API Error:', response.status, errorData);
            return NextResponse.json(
                { error: `Winston AI Plagiarism API request failed: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Plagiarism Check API Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}