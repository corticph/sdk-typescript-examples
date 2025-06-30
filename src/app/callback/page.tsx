'use client';

import {useContext, useEffect} from "react";
import {useSearchParams, useRouter} from "next/navigation";
import {AuthContext} from "@/app/AuthContext";

export default function Page() {
    const { setAccessToken } = useContext(AuthContext);
    const params = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        (async () => {
            const res = await fetch('/api/auth-code?' + params.toString());
            const data = await res.json();

            setAccessToken(data);

            router.replace('/');
        })()
    }, []);

    return (
        <div>
            Callback page. Waiting for access token...
        </div>
    );
}