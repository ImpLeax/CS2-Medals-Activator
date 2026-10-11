# Steam Medals Activator

A small Node.js CLI for claiming the **5/10 Year Veteran Coin** in Counter-Strike 2 without installing or launching the game.

It signs into your Steam account, reports that you are playing CS2, connects to the CS2 Game Coordinator and stays online for a short time. That gives Steam the chance to grant any Veteran Coin your account is eligible for. Then it logs off.

## How it works

1. Sign in to Steam through [`steam-user`](https://github.com/DoctorMcKay/node-steam-user), using a refresh token or an account name and password, with Steam Guard support.
2. Report Counter-Strike 2 (AppID `730`) as the game being played.
3. Wait for a connection to the CS2 Game Coordinator through [`globaloffensive`](https://github.com/DoctorMcKay/node-globaloffensive). This times out after 60 seconds.
4. Stay connected for `IDLE_SECONDS` and log every item received in that window.
5. Log off and exit.

## Requirements

- Node.js **20.12** or newer. `.env` files are loaded with the built-in `process.loadEnvFile`, so there is no `dotenv` dependency.
- A Steam account that owns Counter-Strike 2.

## Setup

```bash
npm install
cp .env.example .env   # on Windows: copy .env.example .env
```

Put your credentials in `.env` (see [Configuration](#configuration)). Any value left empty is asked for at startup. The password prompt hides what you type.

## Usage

```bash
npm start
```

### Getting a refresh token, so your password isn't stored

```bash
npm start -- --print-refresh-token
```

Sign in once with your account name and password. The tool prints a refresh token. Put it in `.env` as `STEAM_REFRESH_TOKEN` and delete `STEAM_PASSWORD`. Later runs sign in with the token alone. Steam refresh tokens are valid for about 200 days.

## Configuration

| Variable              | Required | Description                                                                 |
| --------------------- | -------- | --------------------------------------------------------------------------- |
| `STEAM_REFRESH_TOKEN` | No       | Preferred sign-in method. When set, the account name and password are ignored. |
| `STEAM_ACCOUNT_NAME`  | No       | Steam account name. You are prompted if it's empty and no token is set.    |
| `STEAM_PASSWORD`      | No       | Steam password. You are prompted (hidden input) if it's empty and no token is set. |
| `IDLE_SECONDS`        | No       | Seconds to stay connected to the Game Coordinator. Default: `25`.           |

## Security notes

- `.env` holds your credentials in **plain text**. It is listed in `.gitignore`, and only `.env.example`, which has no real values, goes into the repository.
- A refresh token is better than a stored password. Even so, it gives full access to sign in to your account, so keep it as private as a password.
- The tool never logs your password. The refresh token is printed only when you pass `--print-refresh-token`.
- Steam Guard codes are always typed in by hand. If a mobile authenticator code is rejected, wait for the next code before you enter it again. Retrying too fast can get your IP rate-limited.
- `steam-user` keeps its own machine-auth data in its default data directory under your user profile, not in this project folder.