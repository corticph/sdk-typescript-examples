import { NextResponse } from 'next/server';
import { CortiAuth, CortiClient, CortiEnvironment } from '@corti/sdk';

export async function GET() {
    try {
        const credentialsClient = new CortiClient({
            tenantName: process.env.NEXT_PUBLIC_TENANT_NAME!,
            environment: CortiEnvironment.Eu,
            auth: {
                clientId: process.env.NEXT_PUBLIC_CLIENT_ID!,
                clientSecret: process.env.CLIENT_SECRET!,
            },
        });

        const auth = new CortiAuth({
            environment: CortiEnvironment.Eu,
            tenantName: process.env.NEXT_PUBLIC_TENANT_NAME!,
        });

        const token = await auth.getToken({
            clientId: process.env.NEXT_PUBLIC_CLIENT_ID!,
            clientSecret: process.env.CLIENT_SECRET!,
        });

        const bearerClient = new CortiClient({
            tenantName: process.env.NEXT_PUBLIC_TENANT_NAME!,
            environment: CortiEnvironment.Eu,
            auth: {
                ...token,
                refreshAccessToken: async () => {
                    return auth.getToken({
                        clientId: process.env.NEXT_PUBLIC_CLIENT_ID!,
                        clientSecret: process.env.CLIENT_SECRET!,
                    });
                }
            },
        });

        const credentialsList = await credentialsClient.interactions.list();
        const bearerList = await bearerClient.interactions.list();

        return NextResponse.json({
            clientCredentials: credentialsList.data.length,
            bearer: bearerList.data.length,
        });
    } catch (error) {
        return NextResponse.json({
            error: error,
        });
    }
}
