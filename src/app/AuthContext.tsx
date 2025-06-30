'use client';

import {createContext, useEffect, useState} from "react";
import {CortiClient, Corti} from "@corti/core";
import {devEnvironment} from "@/app/devEnvironment";
import {getAccessToken} from "@/app/getAccessToken";

type AuthContext = {
    accessToken: Corti.GetTokenResponse | null;
    setAccessToken: (token: Corti.GetTokenResponse | null) => void;
    cortiClient: CortiClient | null;
    refreshToken: string | null;
}

export const AuthContext = createContext<AuthContext>({ accessToken: null, setAccessToken: () => null, cortiClient: null, refreshToken: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [accessToken, setAccessToken] = useState<Corti.GetTokenResponse | null>(null);
    const [cortiClient, setCortiClient] = useState<CortiClient | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);

    useEffect(() => {
        if (!accessToken) return;

        setCortiClient(new CortiClient({
            tenantName: process.env.NEXT_PUBLIC_TENANT_NAME!,
            environment: devEnvironment,
            auth: {
                ...accessToken,
                // expiresIn: 10,
                refreshAccessToken: async (refreshToken) => {
                    return fetch(`/api/auth-refresh?refresh_token=${refreshToken}`)
                        .then(res => {
                            if (!res.ok) throw new Error(`Refresh token request failed (${res.status})`);
                            return res.json();
                        }).then(res => {
                            setRefreshToken(res.refresh_token);
                            return {
                                ...res,
                                // expiresIn: 10
                            };
                        })
                },
            },
        }));
    }, [accessToken]);

    // useEffect(() => {
    //     getAccessToken()
    //         .then(token => setAccessToken({
    //             access_token: token,
    //             expires_in: 300,
    //             token_type: 'Bearer',
    //         }))
    // }, []);

    return (
        <AuthContext.Provider value={{ accessToken, setAccessToken, cortiClient, refreshToken }}>
            {children}
        </AuthContext.Provider>
    );
}
