'use strict';

const path = require('node:path');

const ENV_FILE = path.join(__dirname, '..', '.env');
const DEFAULT_IDLE_SECONDS = 25;

/**
 * Loads variables from the project's .env file into process.env.
 * A missing file is fine: variables may come from the real environment
 * or be entered interactively.
 */
function loadEnvFile(file = ENV_FILE) {
    try {
        process.loadEnvFile(file);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
}

function parseIdleSeconds(raw) {
    if (raw === undefined || raw.trim() === '') {
        return DEFAULT_IDLE_SECONDS;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`IDLE_SECONDS must be a positive integer, got "${raw}".`);
    }
    return value;
}

/** Builds a config object from environment variables. Never logs secret values. */
function parseConfig(env) {
    const read = (name) => (env[name] ?? '').trim() || undefined;

    return Object.freeze({
        accountName: read('STEAM_ACCOUNT_NAME'),
        // Passwords may legitimately contain leading/trailing spaces, so they are not trimmed.
        password: env.STEAM_PASSWORD || undefined,
        refreshToken: read('STEAM_REFRESH_TOKEN'),
        idleSeconds: parseIdleSeconds(env.IDLE_SECONDS),
    });
}

function loadConfig() {
    loadEnvFile();
    return parseConfig(process.env);
}

module.exports = { loadConfig, parseConfig };
