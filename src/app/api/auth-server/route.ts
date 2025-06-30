import {NextResponse} from "next/server";
import {CortiClient} from "@corti/core";
import {getAccessToken} from "@/app/getAccessToken";
import {devEnvironment} from "@/app/devEnvironment";

export async function GET() {
    try {
        const credentialsClient = new CortiClient({
            tenantName: process.env.TENANT_NAME!,
            environment: devEnvironment,
            auth: {
                clientId: process.env.CLIENT_ID!,
                clientSecret: process.env.CLIENT_SECRET!,
            },
        });

        const bearerClient = new CortiClient({
            tenantName: process.env.TENANT_NAME!,
            environment: devEnvironment,
            auth: {
                access_token: await getAccessToken(),
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
