/*
let jenkins = require('jenkins')({
    baseUrl: "http://jy.hsu:maru27!$@172.26.6.130:8080",
    crumbIssuer: true,
    formData: require('form-data')
})

let callback = (err: Error, data: string) => {
    if (err) console.error(err);
    console.log(data)
}
*/

/*
jenkins.info((err: Error, data: string) => {
    if(err) console.error(err);
    console.log(data);
})
jenkins.job.get('sandbox', (err: Error, data: string) => {
    if (err) console.error(err);
    console.log(data);
})
jenkins.build.get('sandbox', 2083, (err: Error, data: string) => {
    if (err) console.error(err);
    console.log(data);
})
*/

/*
let fs = require('fs')
console.log(process.cwd())
//let p = new Map([['ss', 'aa']])
jenkins.job.build(
    {
        name: 'mainline/commit_test',
        //parameters: { file: fs.createReadStream('package.json') }
        parameters: {patch: fs.createReadStream('/home/zigman/Downloads/disable-cg.1.patch'), mail: 'jy.hsu@realtek.com'}
    },
    callback
)
*/

import * as vscode from 'vscode';

let jenkins = require('jenkins')

//------------------------------------------------------------------------------
export default async function verifyEnvironment() {
    console.log("verifyEnvironment()")

    try {
        let jenkinsInstance = jenkins({
            baseUrl: "http://jy.hsu:xxxxx@172.26.6.130:8080",
            crumbIssuer: true,
            formData: require('form-data'),
            promisify: true
        })
        let response = await jenkinsInstance.job.get('mainline/commit_test')
        console.log(response)
        vscode.window.showInformationMessage('OK, we are good to go');
    } catch (error) {
        console.error(error)
        vscode.window.showWarningMessage('Oops, the required job is not found');
    }

    console.log("OK")
}
