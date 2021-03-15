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
    // FIXME: Handle multi-folder workspace
    let folder = await workspace.selectFolder();
    if (folder == null) {
        vscode.window.showWarningMessage("No workspace folder selected");
        return;
    }

    let config = vscode.workspace.getConfiguration(
        "commit-test.jenkins",
        folder.folder
    );
    let job = config.get<string>("commit-test.jobName");
    if (!job) {
        vscode.window.showErrorMessage("Invalid jobName");
        return;
    }

    try {
        let result = await getJob(folder.folder, job);
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
