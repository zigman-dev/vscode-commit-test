import * as vscode from 'vscode';

import verifyEnvironment from "./verify";

export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand(
        'commit-test.verifyEnvironment', verifyEnvironment);

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
