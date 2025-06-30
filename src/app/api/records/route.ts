import {NextResponse} from "next/server";
import {CortiClient} from "@corti/core";
import {createReadStream, createWriteStream} from "node:fs";
import {devEnvironment} from "@/app/devEnvironment";

export async function GET() {
    try {
        const client = new CortiClient({
            tenantName: process.env.TENANT_NAME!,
            environment: devEnvironment,
            auth: {
                clientId: process.env.CLIENT_ID!,
                clientSecret: process.env.CLIENT_SECRET!,
            },
        });

        const interaction = await client.interactions.create({
            encounter: {
                identifier: Date.now().toString(),
                status: 'planned',
                type: 'first_consultation'
            }
        });

        const recordsList = await client.recordings.list(interaction.interactionId);

        const file = createReadStream('public/trouble-breathing.mp3', {
            autoClose: true
        });
        const res = await client.recordings.upload(file, interaction.interactionId);
        const fileName = res.recordingId || '';

        const readable = await client.recordings.get(interaction.interactionId, fileName);
        const stream = createWriteStream(`public/${fileName}.mp3`);

        readable.pipe(stream, {
            end: true
        });

        await client.recordings.delete(interaction.interactionId, fileName);

        await client.interactions.delete(interaction.interactionId);

        return NextResponse.json({
            recordsList,
        });
    } catch (error) {
        return NextResponse.json({
            error: error,
        });
    }
}
