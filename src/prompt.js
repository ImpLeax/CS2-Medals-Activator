'use strict';

const readline = require('node:readline');

/** Asks a question on stdin and resolves with the raw answer. */
function ask(query) {
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        let answered = false;

        rl.on('close', () => {
            if (!answered) {
                reject(new Error('Input was closed before an answer was provided.'));
            }
        });
        rl.question(query, (answer) => {
            answered = true;
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * Asks a question without echoing the typed characters (for passwords).
 * Falls back to a regular prompt when stdin is not an interactive terminal.
 */
function askHidden(query) {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) {
        return ask(query);
    }

    return new Promise((resolve) => {
        let value = '';

        const cleanup = () => {
            stdin.off('keypress', onKeypress);
            stdin.setRawMode(false);
            stdin.pause();
            stdout.write('\n');
        };

        function onKeypress(str, key = {}) {
            if (key.ctrl && key.name === 'c') {
                // Raw mode swallows SIGINT, so handle Ctrl+C explicitly.
                cleanup();
                process.exit(130);
            }
            if (key.name === 'return' || key.name === 'enter') {
                cleanup();
                resolve(value);
                return;
            }
            if (key.name === 'backspace') {
                value = value.slice(0, -1);
                return;
            }
            if (str && !key.ctrl && !key.meta) {
                value += str;
            }
        }

        stdout.write(query);
        readline.emitKeypressEvents(stdin);
        stdin.setRawMode(true);
        stdin.resume();
        stdin.on('keypress', onKeypress);
    });
}

module.exports = { ask, askHidden };
