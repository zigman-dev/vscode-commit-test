import * as vscode from 'vscode';

import verifyEnvironment from "./verify";
import { sanityTest } from "./cooper"

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'commit-test.verifyEnvironment', verifyEnvironment));
    context.subscriptions.push(vscode.commands.registerCommand(
        'commit-test.sanityTest', sanityTest));
}

// this method is called when your extension is deactivated
export function deactivate() { }
