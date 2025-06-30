'use client';

import {CortiAuth} from "@corti/core";
import {useContext } from "react";
import {AuthContext} from "@/app/AuthContext";
import Link from "next/link";
import {devEnvironment} from "@/app/devEnvironment";

export default function Home() {
  const { accessToken } = useContext(AuthContext);

  async function handleAuthorize() {
    const auth = new CortiAuth({
      environment: devEnvironment,
      tenantName: process.env.NEXT_PUBLIC_TENANT_NAME!,
    });

    await auth.authorizeURL({
      client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
      redirect_uri: 'http://localhost:3000/callback',
    });
  }

  if (accessToken) {
    return (
        <div className={'flex flex-col gap-4'}>
          <div>Authorized with accessToken : <pre>{JSON.stringify(accessToken, null, 2)}</pre></div>
          <div><Link href={'/interactions'}>/interactions</Link></div>
          <div><Link href={'/records'}>/records</Link></div>
          <div><Link href={'/stream'}>/stream</Link></div>
          <div><Link href={'/transcribe'}>/transcribe</Link></div>
        </div>
    )
  }

  return (
    <button onClick={handleAuthorize}>Authorize</button>
  );
}
