//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import { URL } from 'url';
import vscode from 'vscode';

// project
import * as workspace from "./workspace"
import { submitBuild, BuildError } from "./jenkins"
import { Scm } from './scm';

//------------------------------------------------------------------------------
//  types
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
//  variables
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
export default { preCommitTest };

//------------------------------------------------------------------------------
export async function preCommitTest() {

    let patches: {
        modem: string | null,
        ap: string | null
    } = { modem: null, ap: null };

    //---------------------
    //       modem
    //---------------------
    let modemWorkspace = await workspace.selectFolder(workspace.Type.Svn);
    if (modemWorkspace != null) {
        let changelist = await workspace.selectChangelist(modemWorkspace);
        patches.modem = await modemWorkspace.getPatch(changelist);
    } else {
        vscode.window.showInformationMessage("No svn workspace folder selected");
    }

    //---------------------
    //         ap
    //---------------------
    let apWorkspace = await workspace.selectFolder(workspace.Type.Git);
    if (apWorkspace != null) {
        let changelist = await workspace.selectChangelist(apWorkspace);
        patches.ap = await apWorkspace.getPatch(changelist);
    } else {
        vscode.window.showInformationMessage("No git workspace folder selected");
    }
    console.log(patches);

    let configWorkspace = apWorkspace ? apWorkspace : modemWorkspace; // AP as main
    if (!configWorkspace)
        return;

    //---------------------
    //  submit to Jenkins
    //---------------------
    let config = vscode.workspace.getConfiguration(
        "commit-test.jenkins",
        configWorkspace.folder
    );
    let job = config.get<string>("pre-commit.jobName");
    if (!job) {
        vscode.window.showErrorMessage("Invalid jobName");
        return;
    }
    let mail = config.get<string>("account.mail");
    let parameters: any = config.get<object>("pre-commit.parameters");
    if (patches.modem)
        parameters.modem_patch = Buffer.from(patches.modem);
    if (patches.ap)
        parameters.ap_patch = Buffer.from(patches.ap);
    if (mail)
        parameters.mail = mail;

    try {
        let result = await submitBuild(configWorkspace.folder, job, parameters, 'ticket');
        console.log(result);
        vscode.window.showInformationMessage(result.result);
    } catch (error) {
        console.error(error);
        if (error instanceof BuildError)
            vscode.window.showWarningMessage(error.message);
        else
            vscode.window.showWarningMessage('Failed submitting job');
    }
}
