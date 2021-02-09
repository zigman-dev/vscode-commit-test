//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import { URL } from 'url';
import * as vscode from 'vscode';

let util = require('util');

// project
import svn from "./svn"
import workspace from "./workspace"
import { submitBuild, BuildError } from "./jenkins"

//------------------------------------------------------------------------------
//  types
//------------------------------------------------------------------------------
class Tickets {
    tickets: Record<string, string> = {};
    private key(folder: string, changelist: string | null): string {
        return folder + '/' + (changelist ? changelist : '<default>');
    }
    save(folder: string, changelist: string | null, ticket: string) {
        this.tickets[this.key(folder, changelist)] = ticket;
    }
    retrievesss(folder: string, changelist: string | null): string { 
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

    let changelist = resourceGroup.id.startsWith("changelist-") ?
        resourceGroup.id.replace(/^changelist-/, "") :
        null;

    // The svn workspace is where the 1st resource resides
    let folder = vscode.workspace.getWorkspaceFolder(
        resourceGroup.resourceStates[0].resourceUri
    );
    if (!folder) {
        vscode.window.showErrorMessage("Invalid folder");
        return;
    }
    console.log(folder, changelist);
    let ticket = tickets.retrievesss(folder.name, changelist);
    console.log(folder, changelist, ticket);
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
        if (result.artifact)
            tickets.save(folder.name, changelist, result.artifact);
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
        if (result.artifact)
            tickets.save(folder.name, changelist, result.artifact);
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
