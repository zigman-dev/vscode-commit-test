import * as vscode from 'vscode';

import verifyEnvironment from "./verify";
import * as modem from "./modem";

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'commit-test.verifyEnvironment', verifyEnvironment));
    context.subscriptions.push(vscode.commands.registerCommand(
        'commit-test.commitTest', modem.commitTest));
    context.subscriptions.push(vscode.commands.registerCommand(
        'commit-test.commitTestChangelist', modem.commitTestChangelist));
}

// this method is called when your extension is deactivated
export function deactivate() { }
