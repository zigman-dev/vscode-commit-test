//------------------------------------------------------------------------------
//  dependencies
//------------------------------------------------------------------------------
import * as vscode from 'vscode';
import { URL } from 'url';
import jenkins from 'jenkins';

let util = require('util');

// project
import http from "./http"

//------------------------------------------------------------------------------
//  types
//------------------------------------------------------------------------------
type BuildResult = {
    result: string,
    artifact: string | null
};

export class BuildError extends Error {};

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
    parameters: any,
    artifact?: string
): Promise<BuildResult> {

    if (executable != null) {
        return Promise.reject(
            new BuildError(
                `A build is already submitted and not finished yet (${executable.url})`
            )
        );
    }

    //---------------------
    //   configurations
    //---------------------
    let config = vscode.workspace.getConfiguration(
        "commit-test.jenkins",
        scope
    );
    let user = config.get<string>("account.user");
    let password = config.get<string>("account.password");
    let host = config.get<string>("hostAddress");

    if (!host)
        return Promise.reject(new BuildError("Missing host URL"));

    if (!user || !password)
        return Promise.reject(new BuildError("Missing username/password"));

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

        //---------------------
        //    submit build
        //---------------------
        let queueItem = await jenkinsInstance.job.build({
            name: job,
            parameters
        });

        //---------------------
        //   get real build
        //---------------------
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
                return Promise.reject(new BuildError(`Failed to retrieve queued item ${queueItem}`));
        } while (executable == null || executable.number == null || retry == 0);
        console.log(retry, executable.number, executable.url);

        vscode.window.showInformationMessage(`Submitted: ${executable.url}`);

        //---------------------
        //    Live logging
        //---------------------
        if (!loggingChannel)
            loggingChannel = vscode.window.createOutputChannel("commit-test: jenkins logging");
        if (loggingChannel == null)
            return Promise.reject(new BuildError("Failed creating output channel"));
        let logStream = await jenkinsInstance.build.logStream(job, executable.number);
        logStream.on("data", (text: string) => loggingChannel?.append(text));
        logStream.on("error", (error: Error) => {
            console.error(error);
        });
        logStream.on("end", () => { });
        loggingChannel.show();

        vscode.window.showInformationMessage(`Submitted: ${executable.url}`);

        //---------------------
        // Wait for completion
        //---------------------
        let buildResult: BuildResult | null = null;
        do {
            await new Promise(resolve => setTimeout(resolve, 5000));
            let build: any = await jenkinsInstance.build.get(
                job,
                executable?.number
            );
            console.log(util.inspect(build, { depth: null }));
            if (build.result) {
                buildResult = {
                    result: build.result,
                    artifact: null
                };
                if (build.result == 'SUCCESS' && artifact) {
                    let artifacts = build.artifacts.filter((v: any) => {
                        return v.relativePath == artifact;
                    });
                    if (artifacts.length > 0) {
                        let artifactUrl = new URL(build.url);
                        artifactUrl.username = user;
                        artifactUrl.password = password;
                        artifactUrl.pathname += `artifact/${artifact}/*view*/`
                        buildResult.artifact = await http.download(artifactUrl);
                    }
                    retry--;
                }
            }
        } while (buildResult == null || (
            buildResult.result == 'SUCCESS' && artifact && buildResult.artifact == null && retry > 0
        ));

        executable = null;

        return Promise.resolve(buildResult);
    } catch (error) {
        return Promise.reject(error);
    }
}
