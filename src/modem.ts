//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import { URL } from 'url';
import * as vscode from 'vscode';

let jenkins = require('jenkins')
let fs = require('fs')

let util = require('util');

// project
import svn from "./svn"
import workspace from "./workspace"

//------------------------------------------------------------------------------
//  variables
//------------------------------------------------------------------------------
let loggingChannel: vscode.OutputChannel | null = null;
let executable: {
    number: number | null,
    url: string
} | null = null;

//------------------------------------------------------------------------------
//  functions
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
export default async function commitTest() {
    console.log("commitTest()")

    if (executable != null) {
        console.error(`${executable.url} is still active`);
        vscode.window.showWarningMessage(
            `A build is already submitted and not finished yet (${executable.url})`);
        return;
    }

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
    let mail = config.get<string>("account.mail");
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
        let parameters: any = {
            patch: Buffer.from(diff)
        }
        if (mail)
            parameters.mail = mail;
        let queueItem = await new Promise<number>(
            (resolve, reject) => {
                jenkinsInstance.job.build(
                    {
                        name: job,
                        parameters
                    },
                    (error: Error, result: any) => {
                        resolve(Number(result));
                    }
                )
            }
        );
        console.log(`queue item: ${queueItem}`);
        let retry = 30;
        do {
            await setTimeout(function () { }, 1000);
            let build: any = await new Promise(
                (resolve, reject) => {
                    jenkinsInstance.queue.item(
                        Number(queueItem),
                        (error: Error, result: any) => {
                            resolve(result);
                        }
                    )
                }
            );
            console.log(util.inspect(build, { depth: null }));
            if (build.executable) {
                executable = {
                    number: build.executable.number,
                    url: build.executable.url
                };
            }
            retry--;
        } while (executable == null || retry == 0);
        console.log(retry, executable.number, executable.url);

        vscode.window.showInformationMessage(`Submitted: ${executable.url}`);

        if (!loggingChannel)
            loggingChannel = vscode.window.createOutputChannel("commit-test: jenkins logging");
        if (loggingChannel == null) {
            vscode.window.showErrorMessage("Failed creating output channel");
            return;
        }
        let logStream = jenkinsInstance.build.logStream(job, executable.number);
        logStream.on("data", (text: string) => loggingChannel?.append(text));
        logStream.on("error", (error: Error) => {
            console.error(error);
            executable = null;
        });
        logStream.on("end", () => { executable = null; });
        loggingChannel.show();
    } catch (error) {
        console.error(error)
        vscode.window.showWarningMessage('Failed submitting job');
    }
}
