'use strict';

const SteamUser = require('steam-user');
const GlobalOffensive = require('globaloffensive');
const { loadConfig } = require('./config');
const { ask, askHidden } = require('./prompt');

const CS2_APP_ID = 730;
const GC_CONNECT_TIMEOUT_MS = 60_000;
const LOGOFF_TIMEOUT_MS = 5_000;

/**
 * Steam rejects logon details that mix a refresh token with an account name/password,
 * so exactly one of the two sets is returned.
 */
async function resolveLogOnDetails(config) {
    if (config.refreshToken) {
        return { refreshToken: config.refreshToken };
    }

    const accountName = config.accountName ?? (await ask('Steam account name: ')).trim();
    const password = config.password ?? (await askHidden('Steam password: '));
    if (!accountName || !password) {
        throw new Error('Steam account name and password are required.');
    }
    return { accountName, password };
}

async function main() {
    console.log('=== CS2 Veteran Medal Activator ===\n');

    const config = loadConfig();
    const printRefreshToken = process.argv.includes('--print-refresh-token');
    const logOnDetails = await resolveLogOnDetails(config);

    const client = new SteamUser();
    const csgo = new GlobalOffensive(client);

    let gcTimer;
    let idleTimer;
    let idleStarted = false;
    let shuttingDown = false;
    let itemsReceived = 0;

    const clearTimers = () => {
        clearTimeout(gcTimer);
        clearTimeout(idleTimer);
    };

    const fail = (message) => {
        clearTimers();
        console.error(`\n[-] ${message}`);
        process.exit(1);
    };

    /** Logs off cleanly and waits for the disconnect before exiting. */
    const shutdown = (exitCode) => {
        if (shuttingDown) {
            return;
        }
        shuttingDown = true;
        clearTimers();

        const exit = () => process.exit(exitCode);
        if (!client.steamID) {
            exit();
            return;
        }

        console.log('[*] Logging off...');
        client.once('disconnected', exit);
        setTimeout(exit, LOGOFF_TIMEOUT_MS);
        client.logOff();
    };

    client.on('steamGuard', async (domain, callback, lastCodeWrong) => {
        if (lastCodeWrong) {
            console.log('\n[!] The last code was wrong. Wait for a new code before entering it.');
        }
        const query = domain
            ? `\nSteam Guard email code (sent to ${domain}): `
            : '\nSteam Guard mobile authenticator code: ';

        try {
            callback((await ask(query)).trim());
        } catch (err) {
            fail(err.message);
        }
    });

    client.on('refreshToken', (token) => {
        if (!printRefreshToken) {
            return;
        }
        console.log('\n[!] Refresh token below. Treat it like a password and store it only in .env as STEAM_REFRESH_TOKEN:');
        console.log(token);
    });

    client.on('loggedOn', () => {
        console.log('\n[+] Logged into Steam.');
        client.setPersona(SteamUser.EPersonaState.Online);
        client.gamesPlayed([CS2_APP_ID]);

        // loggedOn fires again after an automatic relogin; only wait for the GC if idling has not started.
        if (!idleStarted) {
            console.log(`[*] Launching Counter-Strike 2 (AppID ${CS2_APP_ID}) and waiting for the Game Coordinator...`);
            clearTimeout(gcTimer);
            gcTimer = setTimeout(() => {
                console.error(`[-] Could not connect to the CS2 Game Coordinator within ${GC_CONNECT_TIMEOUT_MS / 1000} seconds.`);
                shutdown(1);
            }, GC_CONNECT_TIMEOUT_MS);
        }
    });

    // The GC may emit connectedToGC again after a restart, so idling is started only once.
    csgo.on('connectedToGC', () => {
        if (idleStarted) {
            return;
        }
        idleStarted = true;
        clearTimeout(gcTimer);

        console.log('[+] Connected to the CS2 Game Coordinator.');
        console.log(`[*] Idling for ${config.idleSeconds} seconds so Steam can grant eligible Veteran Coins...`);

        idleTimer = setTimeout(() => {
            console.log(`\n[+] Done. Items received during this session: ${itemsReceived}.`);
            console.log('[*] If your account is eligible, the 5/10 Year Veteran Coin should now be in your CS2 inventory.');
            shutdown(0);
        }, config.idleSeconds * 1000);
    });

    csgo.on('itemAcquired', (item) => {
        itemsReceived += 1;
        console.log(`[+] New item received (def_index ${item.def_index}, id ${item.id}).`);
    });

    client.on('error', (err) => {
        const reason = SteamUser.EResult[err.eresult];
        fail(`Steam error: ${err.message}${reason && reason !== err.message ? ` (${reason})` : ''}`);
    });

    process.on('SIGINT', () => {
        console.log('\n[*] Interrupted.');
        shutdown(130);
    });

    console.log('\n[*] Connecting to Steam...');
    client.logOn(logOnDetails);
}

main().catch((err) => {
    console.error(`\n[-] ${err.message}`);
    process.exit(1);
});
