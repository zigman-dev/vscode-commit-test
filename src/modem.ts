//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import { URL } from 'url';
import vscode from 'vscode';

let util = require('util');

// project
import svn from "./svn"
import workspace from "./workspace"
import { submitBuild, BuildError } from "./jenkins"

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
export default { commitTest, commitTestChangelist, getTicketChangelist }

//------------------------------------------------------------------------------
async function getTicketChangelist(
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
async function commitTestChangelist(
    resourceGroup: vscode.SourceControlResourceGroup
) {
    if (!resourceGroup)
        return;

    console.log(resourceGroup);

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
    let cwd = process.cwd()
    process.chdir(folder.uri.fsPath);
    let diff = await svn.get_patch(".", changelist);
    process.chdir(cwd);
    console.log(diff);

    //---------------------
    //  submit to Jenkins
    //---------------------
    let config = vscode.workspace.getConfiguration(
        "commit-test.jenkins",
        folder
    );
    let job = config.get<string>("jobName");
    if (!job) {
        vscode.window.showErrorMessage("Invalid jobName");
        return;
    }
    let mail = config.get<string>("account.mail");

    let parameters: any = {
        patch: Buffer.from(diff)
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
async function commitTest() {

    //------------------------
    //  select svn workspace
    //------------------------
    let folder = await workspace.selectFolder(true);

    if (folder == null) {
        vscode.window.showWarningMessage("No svn workspace folder selected");
        return;
    }
    console.log(`folder: ${folder.name}`);

    //---------------------
    //  select changelist
    //---------------------
    let changelists = await svn.get_changelists(folder.uri.fsPath);
    let changelist: string | null = null;
    if (changelists.length > 0) {
        let pick = await vscode.window.showQuickPick(
            changelists.concat('<default>'),
            { placeHolder: "Pick a changelist" }
        );
        if (!pick)
            return;
        changelist = pick == '<default>' ? null : pick;
    }

    console.log(`changelist: ${changelist}`);

    //---------------------
    //   generate patch
    //---------------------
    let cwd = process.cwd()
    process.chdir(folder.uri.fsPath);
    let diff = await svn.get_patch(".", changelist);
    process.chdir(cwd);
    console.log(diff);

    //---------------------
    //  submit to Jenkins
    //---------------------
    let config = vscode.workspace.getConfiguration(
        "commit-test.jenkins",
        folder
    );
    let job = config.get<string>("jobName");
    if (!job) {
        vscode.window.showErrorMessage("Invalid jobName");
        return;
    }
    let mail = config.get<string>("account.mail");
    let parameters: any = {
        patch: Buffer.from(diff)
    }
    if (mail)
        parameters.mail = mail;

    try {
        let result = await submitBuild(folder, job, parameters, 'ticket');
        console.log(result);
        if (result.artifact) {
            tickets.save(
                folder,
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
