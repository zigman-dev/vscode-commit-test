import * as vscode from 'vscode';

import verifyEnvironment from "./verify";
import { preCommitTest } from "./cooper"

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'commit-test.verifyEnvironment', verifyEnvironment));
    context.subscriptions.push(vscode.commands.registerCommand(
        'commit-test.preCommitTest', preCommitTest));
}

// this method is called when your extension is deactivated
export function deactivate() { }
