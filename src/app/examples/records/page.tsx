'use client';

import {ChangeEvent, useContext, useState} from "react";
import {Corti} from "@corti/core";
import {AuthContext} from "@/app/AuthContext";
import {useInteraction} from "@/app/useInteraction";

export default function Page() {
    const [file, setFile] = useState<Corti.ResponseRecordingCreate | null>(null);
    const { cortiClient } = useContext(AuthContext);
    const { interaction, setInteraction } = useInteraction();

    async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
        try {
            if (!e.target.files || !interaction || !cortiClient) {
                return;
            }

            for (const file of e.target.files) {
                const res = await cortiClient.recordings.upload(file, interaction.id);

                setFile(res);
            }
        } catch (e) {
            console.error("Error uploading recording:", e);
        }
    }

    async function handleDownload() {
        if (!cortiClient || !interaction || !file) {
            return;
        }

        const fileData = await cortiClient.recordings.get(interaction.id, file.recordingId);

        const anchor: HTMLAnchorElement = document.createElement('a');
        const isString = typeof fileData === 'string';
        // @ts-expect-error : recording doesn't generate Blob yet
        const url = isString ? fileData : URL.createObjectURL(fileData);
        anchor.href = url;
        anchor.download = 'file.mp3';
        anchor.target = '_blank';
        anchor.click();
        anchor.remove();

        if (!isString) {
            URL.revokeObjectURL(url);
        }
    }

    async function handleDelete() {
        if (!cortiClient || !interaction || !file) {
            return;
        }

        await cortiClient.recordings.delete(interaction.id, file.recordingId);
        await cortiClient.interactions.delete(interaction.id);

        setInteraction(null);
        setFile(null);
    }

    return (
        <div>
            <input name={'file'} type={'file'} onChange={handleFileUpload} />
            {file && <div>Recording uploaded: <pre>{JSON.stringify(file, null, 2)}</pre></div>}
            {file && <button onClick={handleDownload}>Download file back</button>}
            {file && <button onClick={handleDelete}>Delete recording</button>}
        </div>
    );
}