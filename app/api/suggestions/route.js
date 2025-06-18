export async function POST(request) {
    try {
        const body = await request.json();
        
        const response = await fetch("https://api.ish.junioralive.in/v1/chat/completions", {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${process.env.ISH_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error('Error in suggestions API:', error);
        return Response.json(
            { error: 'Failed to fetch suggestions' },
            { status: 500 }
        );
    }
} 