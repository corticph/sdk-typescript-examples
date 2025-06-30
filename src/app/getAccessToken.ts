'use server'

const TOKEN_URL = `https://auth.${process.env.ENVIRONMENT_ID}.corti.app/realms/${process.env.TENANT_NAME}/protocol/openid-connect/token`;

export async function getAccessToken() {
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.CLIENT_ID as string,
            client_secret: process.env.CLIENT_SECRET as string,
            grant_type: 'client_credentials',
            scope: 'openid',
        }),
    });
    if (!res.ok) throw new Error(`Token request failed (${res.status})`);
    const data = await res.json();

    return data.access_token;
}