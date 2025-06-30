export const devEnvironment = {
    base: `https://api.${process.env.NEXT_PUBLIC_ENVIRONMENT_ID}.corti.app/v2`,
    wss: `wss://api.${process.env.NEXT_PUBLIC_ENVIRONMENT_ID}.corti.app`,
    login: `https://auth.${process.env.NEXT_PUBLIC_ENVIRONMENT_ID}.corti.app/realms`,
}