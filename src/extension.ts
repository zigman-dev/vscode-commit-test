import * as vscode from 'vscode';

import verifyEnvironment from "./verify";
import commitTest from "./modem";

export function activate(context: vscode.ExtensionContext) {

    console.log("activate()")

    context.subscriptions.push(vscode.commands.registerCommand(
        'commit-test.verifyEnvironment', verifyEnvironment));
    context.subscriptions.push(vscode.commands.registerCommand(
        'commit-test.commitTest', commitTest));
}

// this method is called when your extension is deactivated
export function deactivate() { }
