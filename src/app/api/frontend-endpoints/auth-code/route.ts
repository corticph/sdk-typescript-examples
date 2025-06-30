import { NextRequest, NextResponse } from 'next/server';
import { CortiAuth, CortiEnvironment } from '@corti/sdk';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        const auth = new CortiAuth({
            environment: CortiEnvironment.Eu,
            tenantName: process.env.NEXT_PUBLIC_TENANT_NAME!,
        });

        const token = await auth.getCodeFlowToken({
            client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
            client_secret: process.env.CLIENT_SECRET!,
            code: searchParams.get('code') || '',
            redirect_uri: 'http://localhost:3000/callback',
        });

        return NextResponse.json(token);
    } catch (error) {
        return NextResponse.json({
            error: error,
        });
    }
}
