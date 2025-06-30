import { NextResponse } from 'next/server';
import { CortiClient, CortiEnvironment } from '@corti/sdk';
import { createReadStream } from 'node:fs';

export async function GET() {
    try {
        const client = new CortiClient({
            tenantName: process.env.NEXT_PUBLIC_TENANT_NAME!,
            environment: CortiEnvironment.Eu,
            auth: {
                clientId: process.env.NEXT_PUBLIC_CLIENT_ID!,
                clientSecret: process.env.CLIENT_SECRET!,
            },
        });

        const interaction = await client.interactions.create({
            encounter: {
                identifier: Date.now().toString(),
                status: 'planned',
                type: 'first_consultation',
            },
            patient: {
                identifier: Date.now().toString(),
                gender: 'unknown'
            }
        });
        const file = createReadStream('public/trouble-breathing.mp3', {
            autoClose: true
        });
        const recording = await client.recordings.upload(file, interaction.interactionId);

        const list = await client.transcripts.list(interaction.interactionId);
        const collectedData = [];

        for await (const item of list) {
            collectedData.push(item);
        }

        const createdTranscript = await client.transcripts.create(interaction.interactionId, {
            recordingId: recording.recordingId,
            primaryLanguage: 'en',
            modelName: 'premier'
        });

        const getTranscript = await client.transcripts.get(interaction.interactionId, createdTranscript.id);

        await client.transcripts.delete(interaction.interactionId, createdTranscript.id);

        // clean up
        await client.recordings.delete(interaction.interactionId, recording.recordingId);
        await client.interactions.delete(interaction.interactionId);

        return NextResponse.json({
            list: collectedData.length,
            createdTranscript,
            getTranscript,
        });
    } catch (error) {
        return NextResponse.json({
            error: error,
        });
    }
}
