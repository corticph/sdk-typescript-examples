import {NextResponse} from "next/server";
import {CortiAuth, CortiEnvironment} from "@corti/sdk";
import {devEnvironment} from "@/dev/devEnvironment";

export async function GET() {
    try {
        const auth = new CortiAuth({
            environment: devEnvironment,
            // environment: CortiEnvironment.Eu,
            tenantName: process.env.NEXT_PUBLIC_TENANT_NAME!,
        });

        const token = await auth.getToken({
            client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
            client_secret: process.env.CLIENT_SECRET!,
        });

        return NextResponse.json(token);
    } catch (error) {
        return NextResponse.json({
            error: error,
        });
    }
}
