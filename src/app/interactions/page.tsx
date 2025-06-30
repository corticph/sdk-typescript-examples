'use client';

import {useContext, useEffect, useState} from "react";
import { Corti } from "@corti/core";
import {AuthContext} from "@/app/AuthContext";

export default function Page() {
    const { cortiClient, refreshToken } = useContext(AuthContext);
    const [interactions, setInteractions] = useState<Corti.ResponseInteraction[]>([]);
    const [createInteraction, setCreateInteraction] = useState<Corti.ResponseInteractionCreate | null>(null);
    const [interactionGet, setInteractionGet] = useState<Corti.ResponseInteraction | null>(null);
    const [interactionUpdate, setInteractionUpdate] = useState<Corti.ResponseInteraction | null>(null);

    const handleUpdate = async () => {
        setInteractions([]);
        setCreateInteraction(null);
        setInteractionGet(null);
        setInteractionUpdate(null);

        if (!cortiClient) return;

        try {
            const list = await cortiClient.interactions.list();
            const collectedData = [];

            for await (const item of list) {
                collectedData.push(item);
            }

            setInteractions(collectedData);

            const interactionCreate = await cortiClient.interactions.create({
                encounter: {
                    identifier: Date.now().toString(),
                    status: 'planned',
                    type: 'first_consultation'
                }
            });

            setCreateInteraction(interactionCreate);

            const interactionGet = await cortiClient.interactions.get(interactionCreate.interactionId);

            setInteractionGet(interactionGet);

            const interactionUpdate = await cortiClient.interactions.update(interactionCreate.interactionId, {
                encounter: {
                    status: 'in-progress',
                }
            });

            setInteractionUpdate(interactionUpdate);

            await cortiClient.interactions.delete(interactionCreate.interactionId);
        } catch (error) {
            console.error('Error fetching interactions:', error);
        }
    }

    useEffect(() => {
        void handleUpdate();
    }, []);

    return (
        <div>
            <button onClick={handleUpdate}>Update again</button>
            {refreshToken && <div>Token has been refreshed : <pre>{JSON.stringify(refreshToken, null, 2)}</pre></div>}
            <div>Interactions: {interactions.length}</div>
            <div>Created: <pre>{JSON.stringify(createInteraction, null, '\t')}</pre></div>
            <div>Get: <pre>{JSON.stringify(interactionGet, null, '\t')}</pre></div>
            <div>Update: <pre>{JSON.stringify(interactionUpdate, null, '\t')}</pre></div>
        </div>
    );
}