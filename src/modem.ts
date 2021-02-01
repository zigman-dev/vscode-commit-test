//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import { URL } from 'url';
import * as vscode from 'vscode';

let jenkins = require('jenkins')
let fs = require('fs')

// project
import svn from "./svn"
import workspace from "./workspace"

//------------------------------------------------------------------------------
//  functions
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
export default async function commitTest() {
    console.log("commitTest()")

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
    if (changelists.length > 1) {
        let pick = await vscode.window.showQuickPick(
            changelists,
            { placeHolder: "Pick a changelist" }
        );
        if (!pick)
            return
        changelist = pick
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
    // FIXME: DRY these jenkins configuration reading
    let config = vscode.workspace.getConfiguration(
        "commit-test.jenkins",
        folder
    );
    let user = config.get<string>("account.user");
    let password = config.get<string>("account.password");
    let host = config.get<string>("hostAddress");
    let job = config.get<string>("jobName");

    if (!host) {
        vscode.window.showErrorMessage('Missing host URL');
        return
    }

    if (!user || !password) {
        vscode.window.showErrorMessage('Missing username/password');
        return
    }

    let url = new URL(host);
    url.username = user;
    url.password = password;

    try {
        let jenkinsInstance = jenkins({
            baseUrl: url.href,
            crumbIssuer: true,
            formData: require('form-data'),
            promisify: true
        })
        let queueItem = await new Promise<number>(
            (resolve, reject) => {
                jenkinsInstance.job.build(
                    {
                        name: job,
                        parameters: {
                            patch: Buffer.from(diff),
                            // FIXME: Read from user configurations
                            mail: 'jy.hsu@realtek.com'
                        }
                    },
                    (error: Error, result: any) => {
                        resolve(Number(result));
                    }
                )
            }
        );
        console.log(`queue item: ${queueItem}`);
        let jobUrl: string = await new Promise(
            (resolve, reject) => {
                jenkinsInstance.queue.item(
                    Number(queueItem),
                    (error: Error, result: any) => {
                        resolve(result.executable.url);
                    }
                )
            }
        );
        console.log(jobUrl);

        vscode.window.showInformationMessage(`Submitted: ${jobUrl}`);
    } catch (error) {
        console.error(error)
        vscode.window.showWarningMessage('Failed submitting job');
    }
}
