//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import * as vscode from 'vscode';
import { URL } from 'url';
import jenkins from 'jenkins';

let util = require('util');

//------------------------------------------------------------------------------
//  variables
//------------------------------------------------------------------------------
let loggingChannel: vscode.OutputChannel | null = null;
let executable: {
    number: number | null,
    url: string
} | null = null;

//------------------------------------------------------------------------------
//  interface
//------------------------------------------------------------------------------
// FIXME: Create a class for svn operations
export async function submitBuild(
    scope: vscode.Uri | vscode.WorkspaceFolder,
    job: string,
    parameters: any): Promise<string> {

    let config = vscode.workspace.getConfiguration(
        "commit-test.jenkins",
        scope
    );
    let user = config.get<string>("account.user");
    let password = config.get<string>("account.password");
    let host = config.get<string>("hostAddress");

    if (!host)
        return Promise.reject(new Error("Missing host URL"));

    if (!user || !password)
        return Promise.reject(new Error("Missing username/password"));

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

        let queueItem = await jenkinsInstance.job.build({
            name: job,
            parameters
        });

        // Get real build from the queued item
        console.log(`queue item: ${queueItem}`);
        let retry = 30;
        do {
            await new Promise(resolve => setTimeout(resolve, 1000));
            let build: any = await jenkinsInstance.queue.item(Number(queueItem));
            console.log(util.inspect(build, { depth: null }));
            if (build.executable) {
                executable = {
                    number: build.executable.number,
                    url: build.executable.url
                };
            }
            retry--;
            if (retry == 0)
                return Promise.reject(new Error(`Failed to retrieve queued item ${queueItem}`));
        } while (executable == null || executable.number == null || retry == 0);
        console.log(retry, executable.number, executable.url);

        vscode.window.showInformationMessage(`Submitted: ${executable.url}`);

        // Live logging
        if (!loggingChannel)
            loggingChannel = vscode.window.createOutputChannel("commit-test: jenkins logging");
        if (loggingChannel == null)
            return Promise.reject(new Error("Failed creating output channel"));
        let logStream = jenkinsInstance.build.logStream(job, executable.number);
        logStream.on("data", (text: string) => loggingChannel?.append(text));
        logStream.on("error", (error: Error) => {
            console.error(error);
        });
        logStream.on("end", () => { });
        loggingChannel.show();

        vscode.window.showInformationMessage(`Submitted: ${executable.url}`);

        // Wait for completion
        let buildResult: string | null = null;
        do {
            await new Promise(resolve => setTimeout(resolve, 5000));
            let build: any = await jenkinsInstance.build.get(
                job,
                executable?.number
            );
            console.log(util.inspect(build, { depth: null }));
        } while (buildResult == null);

        executable = null;

        return Promise.resolve(buildResult);
    } catch (error) {
        return Promise.reject(error);
    }
}
