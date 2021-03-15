//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import { URL } from 'url';
import vscode from 'vscode';

// project
import * as workspace from './workspace'
import { getBranches, submitBuild, BuildError } from './jenkins'
import * as scm from './scm'

//------------------------------------------------------------------------------
//  types
//------------------------------------------------------------------------------
class Tickets {
    private tickets: Record<string, string> = {}
    private context: Record<
        string,
        {
            folder: vscode.WorkspaceFolder,
            files: vscode.Uri[]
        }
    > = {};
    private watchers: Record<string, vscode.FileSystemWatcher> = {};

    private key(
        folder: vscode.WorkspaceFolder,
        changelist: string | null
    ): string {
        return folder + '/' + (changelist ? changelist : '<default>');
    }

    private handler = (uri: vscode.Uri) => {
        let toInvalidate: { folder: vscode.WorkspaceFolder, changelist: string }[] = [];
        try {
            for (let changelist in this.context) {
                let entry = this.context[changelist];
                if (entry.files.some((file: vscode.Uri) => file.path == uri.path))
                    toInvalidate.push({ folder: entry.folder, changelist });
            }
        } catch (error) {
            console.error(error);
        }
        for (let entry of toInvalidate) {
            console.log(`Invalidate ticket for ${entry.folder}/${entry.changelist}`);
            this.remove(entry.folder, entry.changelist);
        }
    }
    private watchFolder(folder: vscode.WorkspaceFolder) {
        if (!this.watchers[folder.uri.fsPath]) {
            console.log("Create watcher for: ", folder.uri.fsPath);
            this.watchers[folder.uri.fsPath] = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(folder.uri.fsPath, "**")
            );
            let watcher = this.watchers[folder.uri.fsPath];
            watcher.onDidChange(this.handler);
            watcher.onDidDelete(this.handler);
            watcher.onDidCreate(this.handler); // FIXME: Do we need to watch create?
        }
    }

    save(
        folder: vscode.WorkspaceFolder,
        changelist: string,
        ticket: string,
        files: vscode.Uri[]
    ) {
        this.tickets[this.key(folder, changelist)] = ticket;
        this.context[changelist] = { folder, files };
        vscode.commands.executeCommand('setContext', 'commit-test:tickets', this.context);
        console.log("context:", this.context);
        this.watchFolder(folder);
    }
    remove(
        folder: vscode.WorkspaceFolder,
        changelist: string,
    ) {
        delete this.tickets[this.key(folder, changelist)];
        delete this.context[changelist];
        vscode.commands.executeCommand('setContext', 'commit-test:tickets', this.context);
        console.log("context:", this.context);
    }
    retrieve(folder: vscode.WorkspaceFolder, changelist: string): string {
        return this.tickets[this.key(folder, changelist)];
    }
};

//------------------------------------------------------------------------------
//  variables
//------------------------------------------------------------------------------
let tickets = new Tickets;

//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
export async function getTicketChangelist(
    resourceGroup: vscode.SourceControlResourceGroup
) {
    // FIXME:
    //   1. Support empty change list
    //   2. DRY the following
    if (!resourceGroup)
        return;

    console.log(resourceGroup);

    if (resourceGroup.resourceStates.length == 0) {
        vscode.window.showWarningMessage("Empty changelist");
        return;
    }

    // The svn workspace is where the 1st resource resides
    let folder = vscode.workspace.getWorkspaceFolder(
        resourceGroup.resourceStates[0].resourceUri
    );
    if (!folder) {
        vscode.window.showErrorMessage("Invalid folder");
        return;
    }
    console.log(folder);
    let ticket = tickets.retrieve(folder, resourceGroup.id);
    console.log(ticket);
    vscode.window.showInformationMessage(ticket ? ticket : 'n/a');
}


//------------------------------------------------------------------------------
export async function commitTestChangelist(
    resourceGroup: vscode.SourceControlResourceGroup
) {
    if (!resourceGroup)
        return;

    if (resourceGroup.resourceStates.length == 0) {
        vscode.window.showWarningMessage("Empty changelist");
        return;
    }

    let changelist = resourceGroup.id.startsWith("changelist-") ?
        resourceGroup.id.replace(/^changelist-/, "") :
        null;

    //---------------------
    //   generate patch
    //---------------------
    // The svn workspace is where the 1st resource resides
    let folder = vscode.workspace.getWorkspaceFolder(
        resourceGroup.resourceStates[0].resourceUri
    );
    if (!folder) {
        vscode.window.showErrorMessage("Invalid folder");
        return;
    }
    let modemWorkspace = await scm.getScmWorkspace(folder);
    if (modemWorkspace.type != scm.Type.Svn) {
        vscode.window.showErrorMessage("Expect a svn workspace");
        return;
    }

    let patch = await modemWorkspace.getPatch(changelist);

    //---------------------
    //  submit to Jenkins
    //---------------------
    let config = vscode.workspace.getConfiguration(
        "commit-test.jenkins",
        folder
    );
    let relativeURL = await modemWorkspace.getBranch();
    let job = config.get<string>("commit-test.jobName");
    if (!job) {
        vscode.window.showErrorMessage("Invalid jobName");
        return;
    }

    // Verify if the branch is supported
    try {
        let branches = await getBranches(folder, job);
        if (!branches.includes(relativeURL.replace(/^\^\//, ""))) {
            vscode.window.showWarningMessage(
                `${relativeURL} is not available in ${job}.\nAvailable: (${branches.toString()})`
            );
        }
    } catch (error) {
        console.error(error);
        if (error instanceof BuildError) {
            vscode.window.showWarningMessage(error.message);
        }
        else {
            vscode.window.showWarningMessage(
                'Failed querying available branches'
            );
        }
    }
    job += "/" + encodeURIComponent(relativeURL.replace(/^\^\//, ""));

    let mail = config.get<string>("account.mail");

    let parameters: any = {
        patch: Buffer.from(patch)
    }
    if (mail)
        parameters.mail = mail;

    try {
        let result = await submitBuild(folder, job, parameters, 'ticket');
        console.log(result);
        if (result.artifact) {
            tickets.save(
                folder,
                resourceGroup.id,
                result.artifact,
                resourceGroup.resourceStates.map(s => s.resourceUri)
            );
        }
        let resultString = result.result + (
            result.result == 'SUCCESS' ? (":" + result.artifact) : ""
        )
        vscode.window.showInformationMessage(resultString);
    } catch (error) {
        console.error(error);
        if (error instanceof BuildError)
            vscode.window.showWarningMessage(error.message);
        else
            vscode.window.showWarningMessage('Failed submitting job');
    }
}

//------------------------------------------------------------------------------
export async function commitTest() {

    //------------------------
    //        modem 
    //------------------------
    let modemWorkspace = await workspace.selectFolder(workspace.Type.Svn);
    if (modemWorkspace == null) {
        vscode.window.showWarningMessage("No svn workspace folder selected");
        return;
    }
    console.log(modemWorkspace);
    let changelist = await workspace.selectChangelist(modemWorkspace);
    let patch = await modemWorkspace.getPatch(changelist);

    //---------------------
    //  submit to Jenkins
    //---------------------
    let config = vscode.workspace.getConfiguration(
        "commit-test.jenkins",
        modemWorkspace.folder
    );
    let relativeURL = await modemWorkspace.getBranch();
    let job = config.get<string>("commit-test.jobName");
    if (!job) {
        vscode.window.showErrorMessage("Invalid jobName");
        return;
    }

    // Verify if the branch is supported
    try {
        let branches = await getBranches(modemWorkspace.folder, job);
        if (!branches.includes(relativeURL.replace(/^\^\//, ""))) {
            vscode.window.showWarningMessage(
                `${relativeURL} is not available in ${job}.\nAvailable: (${branches.toString()})`
            );
        }
    } catch (error) {
        console.error(error);
        if (error instanceof BuildError) {
            vscode.window.showWarningMessage(error.message);
        }
        else {
            vscode.window.showWarningMessage(
                'Failed querying available branches'
            );
        }
    }

    job += "/" + encodeURIComponent(relativeURL.replace(/^\^\//, ""));

    let mail = config.get<string>("account.mail");

    let parameters: any = {
        patch: Buffer.from(patch)
    }
    if (mail)
        parameters.mail = mail;

    try {
        let result = await submitBuild(modemWorkspace.folder, job, parameters, 'ticket');
        console.log(result);
        if (result.artifact) {
            tickets.save(
                modemWorkspace.folder,
                changelist ? `changelist-${changelist}` : "changes",
                result.artifact,
                [] // FIXME: Supply valid file list
            );
        }
        let resultString = result.result + (
            result.result == 'SUCCESS' ? (":" + result.artifact) : ""
        )
        vscode.window.showInformationMessage(resultString);
    } catch (error) {
        console.error(error);
        if (error instanceof BuildError)
            vscode.window.showWarningMessage(error.message);
        else
            vscode.window.showWarningMessage('Failed submitting job');
    }
}
