import * as vscode from 'vscode';

import verifyEnvironment from "./verify";
import { commitTest, commitTestChangelist, getTicketChangelist } from "./modem";
import { preCommitTest } from "./cooper"

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        'commit-test.verifyEnvironment', verifyEnvironment));
    context.subscriptions.push(vscode.commands.registerCommand(
        'commit-test.commitTest', commitTest));
    context.subscriptions.push(vscode.commands.registerCommand(
        'commit-test.commitTestChangelist', commitTestChangelist));
    context.subscriptions.push(vscode.commands.registerCommand(
        'commit-test.getTicketChangelist', getTicketChangelist));
    context.subscriptions.push(vscode.commands.registerCommand(
        'commit-test.preCommitTest', preCommitTest));
}

// this method is called when your extension is deactivated
export function deactivate() { }
