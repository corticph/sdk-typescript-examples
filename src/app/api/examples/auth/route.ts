import {NextResponse} from "next/server";
import {CortiAuth, CortiClient, CortiEnvironment} from "@corti/sdk";
import {devEnvironment} from "@/dev/devEnvironment";

export async function GET() {
    try {
        const credentialsClient = new CortiClient({
            tenantName: process.env.NEXT_PUBLIC_TENANT_NAME!,
            environment: devEnvironment,
            // environment: CortiEnvironment.Eu,
            auth: {
                clientId: process.env.NEXT_PUBLIC_CLIENT_ID!,
                clientSecret: process.env.CLIENT_SECRET!,
            },
        });

        const auth = new CortiAuth({
            environment: devEnvironment,
            // environment: CortiEnvironment.Eu,
            tenantName: process.env.NEXT_PUBLIC_TENANT_NAME!,
        });

        const token = await auth.getToken({
            client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
            client_secret: process.env.CLIENT_SECRET!,
        });

        const bearerClient = new CortiClient({
            tenantName: process.env.NEXT_PUBLIC_TENANT_NAME!,
            environment: devEnvironment,
            // environment: CortiEnvironment.Eu,
            auth: {
                ...token,
                refreshAccessToken: async () => {
                    return auth.getToken({
                        client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
                        client_secret: process.env.CLIENT_SECRET!,
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
