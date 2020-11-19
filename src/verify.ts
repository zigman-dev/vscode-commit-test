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

export default function verifyEnvironment() {
    console.log("verifyEnvironment()")
}