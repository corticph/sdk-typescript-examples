'use client';

import {useEffect,} from "react";
import {getAccessToken} from "../getAccessToken";

export default function Page() {
    useEffect(() => {
        (async () => {
            const ws = new WebSocket(`wss://api.${process.env.NEXT_PUBLIC_ENVIRONMENT_ID}.corti.app/audio-bridge/v2/transcribe?tenant-name=${process.env.NEXT_PUBLIC_TENANT_NAME}&token=Bearer%20${await getAccessToken()}`);

            ws.onopen = e => {
                console.log('WebSocket connection opened:', e);

                ws.send(JSON.stringify({
                    type: 'config',
                    configuration: {
                        "primaryLanguage": "sv",
                        "interimResults": true,
                        "spokenPunctuation": false,
                        "automaticPunctuation": true,
                        "commands": []
                    }
                }));

                console.log('Message sent to WebSocket:');

                // ws.send(JSON.stringify({"primaryLanguage":"sv","interimResults":true,"spokenPunctuation":false,"automaticPunctuation":true,"commands":[]}))
            };
            ws.onmessage = e => console.log('WebSocket message received:', e.data);
            ws.onerror = e => console.error('WebSocket error:', e);
        })()
    }, []);

    return (
        <div>
            WS
        </div>
    );
}
