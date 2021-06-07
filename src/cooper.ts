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
export default { sanityTest };

//------------------------------------------------------------------------------
export async function sanityTest() {

    let patches: {
        modem: string | null,
        ap: string | null
    } = { modem: null, ap: null };

    //---------------------
    //     workspace   
    //---------------------
    let folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length == 0) {
        vscode.window.showWarningMessage("Empty workspace");
        return;
    }
    let anyFolderInWorkspace = folders[0];

    let workspaceConfig = vscode.workspace.getConfiguration(
        "commit-test.workspace",
        anyFolderInWorkspace // Configuration should come from workspace level
    );

    // modem
    let modemFolders = folders.filter(folder =>
        folder.name == workspaceConfig.get<string>("modem")
    )
    let modemWorkspace = await workspace.selectFolder(
        workspace.Type.Git,
        modemFolders.length > 0 ? modemFolders : null,
        "Pick modem folder"
    );
    if (modemWorkspace != null) {
        let changelist = await workspace.selectChangelist(
            modemWorkspace,
            "Pick changelist for modem"
        );
        patches.modem = await modemWorkspace.getPatch(changelist);
    } else {
        vscode.window.showInformationMessage("Modem workspace is absent");
    }

    // ap
    let apFolders = folders.filter(folder =>
        folder.name == workspaceConfig.get<string>("ap")
    )
    let apWorkspace = await workspace.selectFolder(
        workspace.Type.Git,
        apFolders.length > 0 ? apFolders : null,
        "Pick AP folder"
    );
    if (apWorkspace != null) {
        let changelist = await workspace.selectChangelist(
            apWorkspace,
            "Pick changelist for AP"
        );
        patches.ap = await apWorkspace.getPatch(changelist);
    } else {
        vscode.window.showInformationMessage("AP workspace is absent");
    }

    console.log(patches);

    //---------------------
    //  submit to Jenkins
    //---------------------
    let sanityConfig = vscode.workspace.getConfiguration(
        "commit-test.sanity",
        anyFolderInWorkspace
    );

    let job = sanityConfig.get<string>("jenkins.jobName");
    if (!job) {
        vscode.window.showErrorMessage("Invalid jobName");
        return;
    }
    let config = vscode.workspace.getConfiguration(
        "commit-test",
        anyFolderInWorkspace
    );
    let mail = config.get<string>("account.mail");
    let parameters: any = {
        modem_revision: sanityConfig.get<string>("parameters.modem.revision"),
        modem_config: sanityConfig.get<string>("parameters.modem.config"),
        modem_cppflags: sanityConfig.get<string>("parameters.modem.cppflags"),
        ap_revision: sanityConfig.get<string>("parameters.ap.revision"),
        ap_config: sanityConfig.get<string>("parameters.ap.config"),
        ap_cppflags: sanityConfig.get<string>("parameters.ap.cppflags"),
        testcase: sanityConfig.get<string>("parameters.testcase")
    }
    if (patches.modem)
        parameters.modem_patch = Buffer.from(patches.modem);
    if (patches.ap)
        parameters.ap_patch = Buffer.from(patches.ap);
    if (mail)
        parameters.mail = mail;

    console.log(parameters);

    try {
        let result = await submitBuild(anyFolderInWorkspace, job, parameters, 'ticket');
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
