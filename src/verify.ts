//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import { URL } from 'url';
import * as vscode from 'vscode';

// project
import * as workspace from './workspace'
import { getJob, BuildError} from './jenkins'

//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
export default async function verifyEnvironment() {
    console.log("verifyEnvironment()");

    // Get user acount if supplied
    let folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length == 0) {
        vscode.window.showWarningMessage("Empty workspace");
        return;
    }
    let anyFolderInWorkspace = folders[0];

    let config = vscode.workspace.getConfiguration(
        "commit-test",
        anyFolderInWorkspace
    );
    let job = config.get<string>("sanity.jenkins.jobName");
    if (!job) {
        vscode.window.showErrorMessage("Invalid jobName");
        return;
    }

    try {
        let result = await getJob(anyFolderInWorkspace, job);
        console.log(result)
        vscode.window.showInformationMessage('OK, we are good to go');
    } catch (error) {
        console.error(error);
        if (error instanceof BuildError)
            vscode.window.showWarningMessage(error.message);
        else
            vscode.window.showWarningMessage('The environment is not ready');
    }
}
